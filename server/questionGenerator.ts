import OpenAI from "openai";
import type { Question } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set. Please add your OpenAI API key to use AI question generation.");
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error("Failed to parse PDF: " + (error as Error).message);
  }
}


function chunkText(text: string, maxChunkSize: number = 3000): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += " " + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export async function generateQuestionsFromText(
  sourceText: string,
  questionCount: number,
  existingQuestionIds: number[] = []
): Promise<Question[]> {
  const chunks = chunkText(sourceText);
  const allQuestions: Question[] = [];
  const questionsPerChunk = Math.ceil(questionCount / Math.max(chunks.length, 1));
  
  let startId = existingQuestionIds.length > 0 
    ? Math.max(...existingQuestionIds) + 1 
    : 1;

  for (const chunk of chunks) {
    if (allQuestions.length >= questionCount) break;

    const remainingCount = Math.min(
      questionsPerChunk,
      questionCount - allQuestions.length
    );

    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are an expert medical educator specializing in anatomy. Generate multiple choice questions (MCQs) from the provided educational content. 

Your response must be valid JSON with this exact structure:
{
  "questions": [
    {
      "question": "The question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "category": "Category name"
    }
  ]
}

Guidelines:
- Each question must have exactly 4 options
- correctIndex is 0-based (0, 1, 2, or 3)
- Category should be relevant (e.g., "Bones", "Muscles", "Nerves", "Vessels", "Joints")
- Questions should test understanding, not just memorization
- Make distractors (wrong answers) plausible but clearly incorrect
- Focus on clinically relevant anatomy when possible`
          },
          {
            role: "user",
            content: `Generate ${remainingCount} anatomy MCQ questions from this content. Return only valid JSON:\n\n${chunk}`
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096,
      });

      const content = response.choices[0].message.content;
      if (!content) continue;

      const parsed = JSON.parse(content);
      const questions = parsed.questions || [];

      for (const q of questions) {
        if (allQuestions.length >= questionCount) break;
        
        if (
          q.question &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correctIndex === "number" &&
          q.correctIndex >= 0 &&
          q.correctIndex <= 3
        ) {
          allQuestions.push({
            id: startId++,
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            category: q.category || "General Anatomy",
          });
        }
      }
    } catch (error) {
      console.error("Error generating questions from chunk:", error);
    }
  }

  return allQuestions;
}

export function validateQuestion(question: Partial<Question>): question is Question {
  return (
    typeof question.id === "number" &&
    typeof question.question === "string" &&
    question.question.length > 0 &&
    Array.isArray(question.options) &&
    question.options.length === 4 &&
    question.options.every((opt) => typeof opt === "string" && opt.length > 0) &&
    typeof question.correctIndex === "number" &&
    question.correctIndex >= 0 &&
    question.correctIndex <= 3 &&
    typeof question.category === "string"
  );
}
