import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import type { Player, Question, GameRoom, WSMessage, PlayerAnswerHistory } from "@shared/schema";
import { QUESTION_TIME_LIMIT } from "@shared/schema";

interface GameState {
  room: GameRoom | null;
  playerId: string | null;
  currentQuestion: Question | null;
  timeRemaining: number;
  selectedAnswer: number | null;
  answerResult: { correct: boolean; points: number; correctIndex: number } | null;
  leaderboard: Player[];
  error: string | null;
  isConnected: boolean;
  totalQuestions: number;
  answerHistories: PlayerAnswerHistory[];
  gameQuestions: Question[];
}

interface GameContextType extends GameState {
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  startGame: () => void;
  submitAnswer: (answerIndex: number) => void;
  nextQuestion: () => void;
  isHost: () => boolean;
  resetGame: () => void;
  setCustomQuestions: (questions: Question[], useCustom: boolean) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>({
    room: null,
    playerId: null,
    currentQuestion: null,
    timeRemaining: QUESTION_TIME_LIMIT,
    selectedAnswer: null,
    answerResult: null,
    leaderboard: [],
    error: null,
    isConnected: false,
    totalQuestions: 3,
    answerHistories: [],
    gameQuestions: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const autoSubmitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoSubmitTimeout = useCallback(() => {
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    clearAutoSubmitTimeout();
    setState((prev) => ({ ...prev, timeRemaining: QUESTION_TIME_LIMIT }));
    timerRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.timeRemaining <= 1) {
          clearTimer();
          return { ...prev, timeRemaining: 0 };
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);
  }, [clearTimer, clearAutoSubmitTimeout]);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setState((prev) => ({ ...prev, isConnected: true, error: null }));
      };

      socket.onclose = () => {
        setState((prev) => ({ ...prev, isConnected: false }));
        wsRef.current = null;
        setTimeout(() => {
          connectWebSocket();
        }, 2000);
      };

      socket.onerror = () => {
        setState((prev) => ({ ...prev, error: "Connection error. Please try again." }));
      };

      socket.onmessage = (event) => {
        const message: WSMessage = JSON.parse(event.data);
        handleMessage(message);
      };

      wsRef.current = socket;
    } catch (error) {
      console.error("WebSocket connection error:", error);
      setState((prev) => ({ ...prev, error: "Failed to connect. Please refresh the page." }));
    }
  }, []);

  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case "room_created":
      case "player_joined":
        setState((prev) => ({
          ...prev,
          room: message.payload.room,
          playerId: message.payload.playerId || prev.playerId,
          error: null,
        }));
        break;

      case "room_update":
        setState((prev) => ({
          ...prev,
          room: message.payload.room,
        }));
        break;

      case "player_left":
        setState((prev) => ({
          ...prev,
          room: message.payload.room,
        }));
        break;

      case "questions_updated":
        setState((prev) => ({
          ...prev,
          totalQuestions: message.payload.questionCount || 3,
          room: prev.room ? {
            ...prev.room,
            useCustomQuestions: message.payload.useCustom,
          } : null,
        }));
        break;

      case "question":
        setState((prev) => ({
          ...prev,
          currentQuestion: message.payload.question,
          selectedAnswer: null,
          answerResult: null,
          totalQuestions: message.payload.totalQuestions || prev.totalQuestions,
          room: prev.room ? { 
            ...prev.room, 
            status: "playing",
            currentQuestionIndex: message.payload.questionIndex ?? prev.room.currentQuestionIndex,
          } : null,
        }));
        startTimer();
        break;

      case "answer_result":
        clearTimer();
        setState((prev) => ({
          ...prev,
          answerResult: {
            correct: message.payload.correct,
            points: message.payload.points,
            correctIndex: message.payload.correctIndex,
          },
        }));
        break;

      case "question_results":
        clearTimer();
        setState((prev) => ({
          ...prev,
          leaderboard: message.payload.leaderboard,
          room: prev.room ? { ...prev.room, status: "question_results" } : null,
        }));
        break;

      case "game_over":
        clearTimer();
        setState((prev) => ({
          ...prev,
          leaderboard: message.payload.leaderboard,
          room: prev.room ? { ...prev.room, status: "finished" } : null,
          currentQuestion: null,
          answerHistories: message.payload.answerHistories || [],
          gameQuestions: message.payload.questions || [],
        }));
        break;

      case "error":
        setState((prev) => ({
          ...prev,
          error: message.payload.message,
        }));
        break;
    }
  }, [startTimer, clearTimer]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      clearTimer();
      clearAutoSubmitTimeout();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket, clearTimer, clearAutoSubmitTimeout]);

  // Auto-submit timeout answer when timer reaches 0
  useEffect(() => {
    if (state.timeRemaining === 0 && state.selectedAnswer === null && state.currentQuestion && state.room?.status === "playing") {
      // Small delay to ensure the timer visually shows 0 before auto-submitting
      autoSubmitTimeoutRef.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && state.room?.code && state.currentQuestion?.id) {
          wsRef.current.send(JSON.stringify({
            type: "answer",
            payload: {
              roomCode: state.room.code,
              questionId: state.currentQuestion.id,
              answerIndex: -1, // -1 indicates timeout/no answer
              timeRemaining: 0,
            },
          }));
          setState((prev) => ({ ...prev, selectedAnswer: -1 }));
        }
      }, 100);
    }
    return () => clearAutoSubmitTimeout();
  }, [state.timeRemaining, state.selectedAnswer, state.currentQuestion, state.room, clearAutoSubmitTimeout]);

  const createRoom = useCallback((playerName: string) => {
    sendMessage({ type: "create_room", payload: { playerName } });
  }, [sendMessage]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    sendMessage({ type: "join_room", payload: { roomCode: roomCode.toUpperCase(), playerName } });
  }, [sendMessage]);

  const startGame = useCallback(() => {
    sendMessage({ type: "start_game", payload: { roomCode: state.room?.code } });
  }, [sendMessage, state.room?.code]);

  const submitAnswer = useCallback((answerIndex: number) => {
    if (state.selectedAnswer !== null) return;
    setState((prev) => ({ ...prev, selectedAnswer: answerIndex }));
    sendMessage({
      type: "answer",
      payload: {
        roomCode: state.room?.code,
        questionId: state.currentQuestion?.id,
        answerIndex,
        timeRemaining: state.timeRemaining,
      },
    });
  }, [sendMessage, state.room?.code, state.currentQuestion?.id, state.timeRemaining, state.selectedAnswer]);

  const nextQuestion = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedAnswer: null,
      answerResult: null,
    }));
    sendMessage({ type: "next_question", payload: { roomCode: state.room?.code } });
  }, [sendMessage, state.room?.code]);

  const isHost = useCallback(() => {
    if (!state.room || !state.playerId) return false;
    const player = state.room.players.find((p) => p.id === state.playerId);
    return player?.isHost ?? false;
  }, [state.room, state.playerId]);

  const resetGame = useCallback(() => {
    clearTimer();
    setState({
      room: null,
      playerId: null,
      currentQuestion: null,
      timeRemaining: QUESTION_TIME_LIMIT,
      selectedAnswer: null,
      answerResult: null,
      leaderboard: [],
      error: null,
      isConnected: state.isConnected,
      totalQuestions: 3,
      answerHistories: [],
      gameQuestions: [],
    });
  }, [clearTimer, state.isConnected]);

  const setCustomQuestions = useCallback((questions: Question[], useCustom: boolean) => {
    sendMessage({
      type: "set_custom_questions",
      payload: {
        roomCode: state.room?.code,
        questions,
        useCustom,
      },
    });
    setState((prev) => ({
      ...prev,
      totalQuestions: useCustom ? questions.length : 3,
      room: prev.room ? {
        ...prev.room,
        customQuestions: questions,
        useCustomQuestions: useCustom,
      } : null,
    }));
  }, [sendMessage, state.room?.code]);

  return (
    <GameContext.Provider
      value={{
        ...state,
        createRoom,
        joinRoom,
        startGame,
        submitAnswer,
        nextQuestion,
        isHost,
        resetGame,
        setCustomQuestions,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
