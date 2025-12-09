export interface ParsedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
}

export function parseQuestionsFromText(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let currentOptions: string[] = ["", "", "", ""];
  let correctIndex = -1;

  const saveCurrentQuestion = () => {
    if (currentQuestion && currentQuestion.question && 
        currentOptions.filter(o => o.length > 0).length === 4 && 
        correctIndex >= 0) {
      questions.push({
        question: currentQuestion.question,
        options: [...currentOptions],
        correctIndex: correctIndex,
        category: currentQuestion.category || "General",
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/^Q[:.]?\s+/i) || line.match(/^\d+[\.\)]\s+/)) {
      saveCurrentQuestion();
      
      currentQuestion = {
        question: line.replace(/^Q[:.]?\s+/i, '').replace(/^\d+[\.\)]\s+/, '').trim(),
        category: "General",
      };
      currentOptions = ["", "", "", ""];
      correctIndex = -1;
    }
    else if (line.match(/^[A-Da-d][\.\)\:]\s*/)) {
      const optionLetter = line.charAt(0).toUpperCase();
      const optionIndex = optionLetter.charCodeAt(0) - 65;
      let optionText = line.replace(/^[A-Da-d][\.\)\:]\s*/i, '').trim();
      
      const hasAsterisk = optionText.includes('*');
      if (hasAsterisk) {
        optionText = optionText.replace(/\*/g, '').trim();
        correctIndex = optionIndex;
      }
      
      if (optionIndex >= 0 && optionIndex < 4) {
        currentOptions[optionIndex] = optionText;
      }
    }
    else if (line.match(/^Category[:.]?\s*/i)) {
      if (currentQuestion) {
        currentQuestion.category = line.replace(/^Category[:.]?\s*/i, '').trim();
      }
    }
  }

  saveCurrentQuestion();

  return questions;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = await import("pdf-parse");
    const parser = pdfParse.default || pdfParse;
    const data = await parser(buffer);
    return data.text;
  } catch (error) {
    throw new Error("Failed to parse PDF: " + (error as Error).message);
  }
}

export function validateParsedQuestion(question: ParsedQuestion): boolean {
  return (
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
