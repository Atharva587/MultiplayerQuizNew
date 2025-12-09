import { z } from "zod";

// Question schema
export const questionSchema = z.object({
  id: z.number(),
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().min(0).max(3),
  category: z.string(),
});

export type Question = z.infer<typeof questionSchema>;

// Extended question with folder support
export interface QuestionWithFolder extends Question {
  folderId?: number | null;
}

// Folder type for UI
export interface Folder {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: Date;
}

// Player schema
export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  score: z.number().default(0),
  isHost: z.boolean().default(false),
  hasAnswered: z.boolean().default(false),
  lastAnswerCorrect: z.boolean().optional(),
  lastAnswerTime: z.number().optional(),
});

export type Player = z.infer<typeof playerSchema>;

// Game room schema
export const gameRoomSchema = z.object({
  code: z.string(),
  players: z.array(playerSchema),
  status: z.enum(["waiting", "configuring", "playing", "question_results", "finished"]),
  currentQuestionIndex: z.number(),
  questionStartTime: z.number().optional(),
  customQuestions: z.array(questionSchema).optional(),
  useCustomQuestions: z.boolean().optional(),
});

export type GameRoom = z.infer<typeof gameRoomSchema>;

// Question generation request
export const questionGenerationRequestSchema = z.object({
  sourceText: z.string().min(50, "Source text must be at least 50 characters"),
  questionCount: z.number().min(1).max(500),
});

export type QuestionGenerationRequest = z.infer<typeof questionGenerationRequestSchema>;

// WebSocket message types
export type WSMessageType =
  | "create_room"
  | "join_room"
  | "room_created"
  | "player_joined"
  | "player_left"
  | "start_game"
  | "question"
  | "answer"
  | "answer_result"
  | "question_results"
  | "next_question"
  | "game_over"
  | "error"
  | "room_update"
  | "set_custom_questions"
  | "questions_updated";

export interface WSMessage {
  type: WSMessageType;
  payload?: any;
}

// Answer submission
export const answerSubmissionSchema = z.object({
  questionId: z.number(),
  answerIndex: z.number(),
  timeRemaining: z.number(),
});

export type AnswerSubmission = z.infer<typeof answerSubmissionSchema>;

// Scoring constants
export const QUESTION_TIME_LIMIT = 30; // seconds
export const MAX_POINTS_PER_QUESTION = 1000;
export const MIN_POINTS_PER_QUESTION = 100;
export const MAX_QUESTIONS_PER_QUIZ = 500; // increased for larger quizzes

// Question types
export type QuestionType = "multiple_choice" | "true_false" | "fill_in_blank";

// Answer history for tracking player responses
export interface AnswerRecord {
  questionIndex: number;
  questionText: string;
  selectedAnswer: number | string; // -1 for timeout, string for fill-in
  correctAnswer: number | string;
  isCorrect: boolean;
  points: number;
  timeRemaining: number;
}

export interface PlayerAnswerHistory {
  playerId: string;
  playerName: string;
  answers: AnswerRecord[];
  totalScore: number;
}

// Calculate score based on time remaining
export function calculateScore(timeRemaining: number, isCorrect: boolean): number {
  if (!isCorrect) return 0;
  const timeBonus = (timeRemaining / QUESTION_TIME_LIMIT) * (MAX_POINTS_PER_QUESTION - MIN_POINTS_PER_QUESTION);
  return Math.round(MIN_POINTS_PER_QUESTION + timeBonus);
}

// Upper limb anatomy questions (3 questions as requested)
export const anatomyQuestions: Question[] = [
  {
    id: 1,
    question: "Which bone forms the anatomical basis of the elbow joint on the lateral side?",
    options: ["Humerus", "Radius", "Ulna", "Scapula"],
    correctIndex: 1,
    category: "Bones",
  },
  {
    id: 2,
    question: "Which muscle is the primary flexor of the forearm at the elbow joint?",
    options: ["Triceps brachii", "Brachialis", "Deltoid", "Pronator teres"],
    correctIndex: 1,
    category: "Muscles",
  },
  {
    id: 3,
    question: "Which nerve passes through the carpal tunnel?",
    options: ["Ulnar nerve", "Radial nerve", "Median nerve", "Musculocutaneous nerve"],
    correctIndex: 2,
    category: "Nerves",
  },
];

// Keep user schema for compatibility
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Question folders for organizing questions
export const questionFolders = pgTable("question_folders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFolderSchema = createInsertSchema(questionFolders).pick({
  name: true,
  description: true,
});

export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type QuestionFolder = typeof questionFolders.$inferSelect;

export const savedQuestions = pgTable("saved_questions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctIndex: integer("correct_index").notNull(),
  category: text("category").notNull().default("General"),
  questionType: text("question_type").notNull().default("multiple_choice"),
  folderId: integer("folder_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSavedQuestionSchema = createInsertSchema(savedQuestions).pick({
  question: true,
  options: true,
  correctIndex: true,
  category: true,
  questionType: true,
  folderId: true,
});

export type InsertSavedQuestion = z.infer<typeof insertSavedQuestionSchema>;
export type SavedQuestion = typeof savedQuestions.$inferSelect;
