import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import {
  type Player,
  type GameRoom,
  type WSMessage,
  type Question,
  type AnswerRecord,
  type PlayerAnswerHistory,
  anatomyQuestions,
  calculateScore,
  savedQuestions,
  questionFolders,
  QUESTION_TIME_LIMIT,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { generateQuestionsFromText, validateQuestion } from "./questionGenerator";
import { parseQuestionsFromText, extractTextFromPDF, validateParsedQuestion } from "./questionParser";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

interface GameState {
  rooms: Map<string, GameRoom>;
  playerSockets: Map<string, WebSocket>;
  socketPlayers: Map<WebSocket, { roomCode: string; playerId: string }>;
  questionTimeouts: Map<string, ReturnType<typeof setTimeout>>;
  answerHistory: Map<string, Map<string, AnswerRecord[]>>; // roomCode -> playerId -> answers
}

const gameState: GameState = {
  rooms: new Map(),
  playerSockets: new Map(),
  socketPlayers: new Map(),
  questionTimeouts: new Map(),
  answerHistory: new Map(),
};

const SERVER_TIMEOUT_BUFFER = 3; // Extra seconds to allow for network latency

function clearQuestionTimeout(roomCode: string) {
  const existingTimeout = gameState.questionTimeouts.get(roomCode);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    gameState.questionTimeouts.delete(roomCode);
  }
}

function startQuestionTimeout(roomCode: string) {
  clearQuestionTimeout(roomCode);
  
  const timeout = setTimeout(() => {
    const room = gameState.rooms.get(roomCode);
    if (!room || room.status !== "playing") return;
    
    const questions = getQuestionsForRoom(room);
    const question = questions[room.currentQuestionIndex];
    
    // Force all unanswered players to have answered with timeout
    let anyForced = false;
    room.players.forEach((player) => {
      if (!player.hasAnswered) {
        player.hasAnswered = true;
        player.lastAnswerCorrect = false;
        player.lastAnswerTime = 0;
        anyForced = true;
        
        // Record timeout in answer history
        const roomHistory = gameState.answerHistory.get(roomCode);
        if (roomHistory && question) {
          const playerHistory = roomHistory.get(player.id) || [];
          playerHistory.push({
            questionIndex: room.currentQuestionIndex,
            questionText: question.question,
            selectedAnswer: -1,
            correctAnswer: question.correctIndex,
            isCorrect: false,
            points: 0,
            timeRemaining: 0,
          });
          roomHistory.set(player.id, playerHistory);
        }
        
        // Send timeout result to the player
        if (question) {
          sendToPlayer(player.id, {
            type: "answer_result",
            payload: {
              correct: false,
              points: 0,
              correctIndex: question.correctIndex,
            },
          });
        }
      }
    });
    
    if (anyForced) {
      showQuestionResults(roomCode);
    }
    
    gameState.questionTimeouts.delete(roomCode);
  }, (QUESTION_TIME_LIMIT + SERVER_TIMEOUT_BUFFER) * 1000);
  
  gameState.questionTimeouts.set(roomCode, timeout);
}

function getQuestionsForRoom(room: GameRoom): Question[] {
  if (room.useCustomQuestions && room.customQuestions && room.customQuestions.length > 0) {
    return room.customQuestions;
  }
  return anatomyQuestions;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return gameState.rooms.has(code) ? generateRoomCode() : code;
}

function broadcastToRoom(roomCode: string, message: WSMessage, excludePlayerId?: string) {
  const room = gameState.rooms.get(roomCode);
  if (!room) return;

  room.players.forEach((player) => {
    if (excludePlayerId && player.id === excludePlayerId) return;
    const socket = gameState.playerSockets.get(player.id);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  });
}

function sendToPlayer(playerId: string, message: WSMessage) {
  const socket = gameState.playerSockets.get(playerId);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function handleCreateRoom(ws: WebSocket, payload: { playerName: string }) {
  const roomCode = generateRoomCode();
  const playerId = randomUUID();
  
  const player: Player = {
    id: playerId,
    name: payload.playerName,
    score: 0,
    isHost: true,
    hasAnswered: false,
  };

  const room: GameRoom = {
    code: roomCode,
    players: [player],
    status: "waiting",
    currentQuestionIndex: 0,
    customQuestions: [],
    useCustomQuestions: false,
  };

  gameState.rooms.set(roomCode, room);
  gameState.playerSockets.set(playerId, ws);
  gameState.socketPlayers.set(ws, { roomCode, playerId });

  sendToPlayer(playerId, {
    type: "room_created",
    payload: { room, playerId },
  });
}

function handleJoinRoom(ws: WebSocket, payload: { roomCode: string; playerName: string }) {
  const room = gameState.rooms.get(payload.roomCode);
  
  if (!room) {
    ws.send(JSON.stringify({
      type: "error",
      payload: { message: "Room not found. Please check the code and try again." },
    }));
    return;
  }

  if (room.status !== "waiting" && room.status !== "configuring") {
    ws.send(JSON.stringify({
      type: "error",
      payload: { message: "Game has already started." },
    }));
    return;
  }

  if (room.players.length >= 8) {
    ws.send(JSON.stringify({
      type: "error",
      payload: { message: "Room is full. Maximum 8 players allowed." },
    }));
    return;
  }

  const playerId = randomUUID();
  const player: Player = {
    id: playerId,
    name: payload.playerName,
    score: 0,
    isHost: false,
    hasAnswered: false,
  };

  room.players.push(player);
  gameState.playerSockets.set(playerId, ws);
  gameState.socketPlayers.set(ws, { roomCode: payload.roomCode, playerId });

  sendToPlayer(playerId, {
    type: "player_joined",
    payload: { room, playerId },
  });

  broadcastToRoom(payload.roomCode, {
    type: "room_update",
    payload: { room },
  }, playerId);
}

function handleSetCustomQuestions(
  ws: WebSocket, 
  payload: { roomCode: string; questions: Question[]; useCustom: boolean }
) {
  const room = gameState.rooms.get(payload.roomCode);
  if (!room) return;

  const playerInfo = gameState.socketPlayers.get(ws);
  if (!playerInfo) return;

  const player = room.players.find((p) => p.id === playerInfo.playerId);
  if (!player?.isHost) return;

  room.customQuestions = payload.questions;
  room.useCustomQuestions = payload.useCustom;

  const effectiveCount = payload.useCustom ? payload.questions.length : anatomyQuestions.length;
  broadcastToRoom(payload.roomCode, {
    type: "questions_updated",
    payload: { 
      questionCount: effectiveCount,
      useCustom: payload.useCustom,
    },
  });
}

function handleStartGame(ws: WebSocket, payload: { roomCode: string }) {
  const room = gameState.rooms.get(payload.roomCode);
  if (!room) return;

  const playerInfo = gameState.socketPlayers.get(ws);
  if (!playerInfo) return;

  const player = room.players.find((p) => p.id === playerInfo.playerId);
  if (!player?.isHost) return;

  const questions = getQuestionsForRoom(room);
  if (questions.length === 0) {
    sendToPlayer(playerInfo.playerId, {
      type: "error",
      payload: { message: "No questions available. Add custom questions or use default." },
    });
    return;
  }

  room.status = "playing";
  room.currentQuestionIndex = 0;
  room.questionStartTime = Date.now();

  // Initialize answer history for this room
  const roomHistory = new Map<string, AnswerRecord[]>();
  room.players.forEach((p) => {
    p.score = 0;
    p.hasAnswered = false;
    roomHistory.set(p.id, []);
  });
  gameState.answerHistory.set(payload.roomCode, roomHistory);

  const question = questions[room.currentQuestionIndex];
  broadcastToRoom(payload.roomCode, {
    type: "question",
    payload: { question, questionIndex: room.currentQuestionIndex, totalQuestions: questions.length },
  });
  
  // Start server-side timeout for the question
  startQuestionTimeout(payload.roomCode);
}

function handleAnswer(
  ws: WebSocket,
  payload: { roomCode: string; questionId: number; answerIndex: number; timeRemaining: number }
) {
  const room = gameState.rooms.get(payload.roomCode);
  if (!room) return;

  const playerInfo = gameState.socketPlayers.get(ws);
  if (!playerInfo) return;

  const player = room.players.find((p) => p.id === playerInfo.playerId);
  if (!player || player.hasAnswered) return;

  const questions = getQuestionsForRoom(room);
  const question = questions[room.currentQuestionIndex];
  if (!question || question.id !== payload.questionId) return;

  // Handle timeout case (answerIndex = -1) or regular answer
  const isTimeout = payload.answerIndex === -1;
  const isCorrect = !isTimeout && payload.answerIndex === question.correctIndex;
  const points = calculateScore(payload.timeRemaining, isCorrect);

  player.hasAnswered = true;
  player.lastAnswerCorrect = isCorrect;
  player.lastAnswerTime = payload.timeRemaining;
  player.score += points;

  // Record answer history
  const roomHistory = gameState.answerHistory.get(payload.roomCode);
  if (roomHistory) {
    const playerHistory = roomHistory.get(playerInfo.playerId) || [];
    playerHistory.push({
      questionIndex: room.currentQuestionIndex,
      questionText: question.question,
      selectedAnswer: payload.answerIndex,
      correctAnswer: question.correctIndex,
      isCorrect,
      points,
      timeRemaining: payload.timeRemaining,
    });
    roomHistory.set(playerInfo.playerId, playerHistory);
  }

  sendToPlayer(playerInfo.playerId, {
    type: "answer_result",
    payload: {
      correct: isCorrect,
      points,
      correctIndex: question.correctIndex,
    },
  });

  const allAnswered = room.players.every((p) => p.hasAnswered);
  if (allAnswered) {
    showQuestionResults(payload.roomCode);
  }
}

function showQuestionResults(roomCode: string) {
  const room = gameState.rooms.get(roomCode);
  if (!room) return;

  // Clear any pending timeout for this question
  clearQuestionTimeout(roomCode);

  room.status = "question_results";
  const leaderboard = [...room.players].sort((a, b) => b.score - a.score);

  broadcastToRoom(roomCode, {
    type: "question_results",
    payload: { leaderboard },
  });
}

function handleNextQuestion(ws: WebSocket, payload: { roomCode: string }) {
  const room = gameState.rooms.get(payload.roomCode);
  if (!room) return;

  const playerInfo = gameState.socketPlayers.get(ws);
  if (!playerInfo) return;

  const player = room.players.find((p) => p.id === playerInfo.playerId);
  if (!player?.isHost) return;

  const questions = getQuestionsForRoom(room);
  room.currentQuestionIndex++;

  if (room.currentQuestionIndex >= questions.length) {
    clearQuestionTimeout(payload.roomCode);
    room.status = "finished";
    const leaderboard = [...room.players].sort((a, b) => b.score - a.score);
    
    // Build answer history for all players
    const roomHistory = gameState.answerHistory.get(payload.roomCode);
    const answerHistories: PlayerAnswerHistory[] = room.players.map((p) => ({
      playerId: p.id,
      playerName: p.name,
      answers: roomHistory?.get(p.id) || [],
      totalScore: p.score,
    }));
    
    broadcastToRoom(payload.roomCode, {
      type: "game_over",
      payload: { leaderboard, answerHistories, questions },
    });
    
    // Clean up answer history
    gameState.answerHistory.delete(payload.roomCode);
    return;
  }

  room.status = "playing";
  room.questionStartTime = Date.now();
  room.players.forEach((p) => {
    p.hasAnswered = false;
    p.lastAnswerCorrect = undefined;
    p.lastAnswerTime = undefined;
  });

  const question = questions[room.currentQuestionIndex];
  broadcastToRoom(payload.roomCode, {
    type: "question",
    payload: { question, questionIndex: room.currentQuestionIndex, totalQuestions: questions.length },
  });
  
  // Start server-side timeout for the question
  startQuestionTimeout(payload.roomCode);
}

function handleDisconnect(ws: WebSocket) {
  const playerInfo = gameState.socketPlayers.get(ws);
  if (!playerInfo) return;

  const { roomCode, playerId } = playerInfo;
  const room = gameState.rooms.get(roomCode);

  gameState.playerSockets.delete(playerId);
  gameState.socketPlayers.delete(ws);

  if (!room) return;

  const playerIndex = room.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return;

  const wasHost = room.players[playerIndex].isHost;
  room.players.splice(playerIndex, 1);

  if (room.players.length === 0) {
    clearQuestionTimeout(roomCode);
    gameState.rooms.delete(roomCode);
    return;
  }

  if (wasHost && room.players.length > 0) {
    room.players[0].isHost = true;
  }

  broadcastToRoom(roomCode, {
    type: "player_left",
    payload: { room },
  });

  if (room.status === "playing") {
    const allAnswered = room.players.every((p) => p.hasAnswered);
    if (allAnswered) {
      showQuestionResults(roomCode);
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/generate-questions", upload.single("pdf"), async (req, res) => {
    try {
      let sourceText = "";
      const questionCount = parseInt(req.body.questionCount) || 5;

      if (req.file) {
        sourceText = await extractTextFromPDF(req.file.buffer);
      } else if (req.body.text) {
        sourceText = req.body.text;
      } else {
        return res.status(400).json({ message: "Please provide a PDF file or text content" });
      }

      if (sourceText.length < 50) {
        return res.status(400).json({ message: "Source content is too short. Please provide more content." });
      }

      const questions = await generateQuestionsFromText(sourceText, questionCount);
      
      if (questions.length === 0) {
        return res.status(500).json({ message: "Failed to generate questions. Please try again." });
      }

      res.json({ questions, generatedCount: questions.length });
    } catch (error) {
      console.error("Question generation error:", error);
      res.status(500).json({ message: "Failed to generate questions: " + (error as Error).message });
    }
  });

  app.post("/api/validate-question", (req, res) => {
    const question = req.body;
    const isValid = validateQuestion(question);
    res.json({ valid: isValid });
  });

  app.post("/api/parse-questions", upload.single("pdf"), async (req, res) => {
    try {
      let sourceText = "";

      if (req.file) {
        sourceText = await extractTextFromPDF(req.file.buffer);
      } else if (req.body.text) {
        sourceText = req.body.text;
      } else {
        return res.status(400).json({ message: "Please provide a PDF file or text content" });
      }

      if (sourceText.length < 20) {
        return res.status(400).json({ message: "Source content is too short." });
      }

      const parsedQuestions = parseQuestionsFromText(sourceText);
      const validQuestions = parsedQuestions.filter(validateParsedQuestion);
      
      if (validQuestions.length === 0) {
        return res.status(400).json({ 
          message: "No valid questions found. Please format questions like:\nQ: Question text?\nA) Option 1\nB) Option 2*\nC) Option 3\nD) Option 4\n(* marks correct answer)" 
        });
      }

      res.json({ questions: validQuestions, parsedCount: validQuestions.length });
    } catch (error) {
      console.error("Question parsing error:", error);
      res.status(500).json({ message: "Failed to parse questions: " + (error as Error).message });
    }
  });

  app.post("/api/saved-questions", async (req, res) => {
    try {
      const questionsToSave = req.body.questions;
      
      if (!Array.isArray(questionsToSave) || questionsToSave.length === 0) {
        return res.status(400).json({ message: "Please provide questions to save" });
      }

      const insertedQuestions = await db.insert(savedQuestions).values(
        questionsToSave.map((q: any) => ({
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          category: q.category || "General",
        }))
      ).returning();

      res.json({ saved: insertedQuestions.length, questions: insertedQuestions });
    } catch (error) {
      console.error("Error saving questions:", error);
      res.status(500).json({ message: "Failed to save questions: " + (error as Error).message });
    }
  });

  app.get("/api/saved-questions", async (req, res) => {
    try {
      const questions = await db.select().from(savedQuestions).orderBy(desc(savedQuestions.createdAt));
      
      const formattedQuestions: Question[] = questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options as string[],
        correctIndex: q.correctIndex,
        category: q.category,
      }));
      
      res.json({ questions: formattedQuestions, total: formattedQuestions.length });
    } catch (error) {
      console.error("Error fetching saved questions:", error);
      res.status(500).json({ message: "Failed to fetch questions: " + (error as Error).message });
    }
  });

  app.delete("/api/saved-questions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(savedQuestions).where(eq(savedQuestions.id, id));
      res.json({ deleted: true });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Failed to delete question: " + (error as Error).message });
    }
  });

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        switch (message.type) {
          case "create_room":
            handleCreateRoom(ws, message.payload);
            break;
          case "join_room":
            handleJoinRoom(ws, message.payload);
            break;
          case "set_custom_questions":
            handleSetCustomQuestions(ws, message.payload);
            break;
          case "start_game":
            handleStartGame(ws, message.payload);
            break;
          case "answer":
            handleAnswer(ws, message.payload);
            break;
          case "next_question":
            handleNextQuestion(ws, message.payload);
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      handleDisconnect(ws);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      handleDisconnect(ws);
    });
  });

  return httpServer;
}
