export interface ParsedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
}

export function parseQuestionsFromText(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];

  // Clean up text: remove common header/footer junk from LLMs if needed
  // Split by newlines
  const lines = text.split('\n').map(l => {
    // Strip markdown chars like #, *, bold markers from the START of the line
    // e.g. "### **Q. Question" -> "Q. Question"
    return l.trim().replace(/^[\#\*]+\s*/, '').replace(/^\*\*/, '');
  }).filter(l => l.length > 0);

  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let currentOptions: string[] = ["", "", "", ""];
  let correctIndex = -1;

  const saveCurrentQuestion = () => {
    // Only save if we have a question text and all 4 options
    // For non-strict mode, we might want to relax this, but for now allow 4 options
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

    // Regex for Question start:
    // Matches: "Q:", "Q.", "1.", "1)", "Q1.", "Question 1:"
    // OR matches any line that ends with "?" (Implicit question)
    const questionMatch = line.match(/^(?:Q\d*[:.]?|Question\s*\d*[:.]?|\d+[\.\)])\s+(.+)|(.+\?)$/i);

    if (questionMatch) {
      saveCurrentQuestion();

      // questionMatch[1] is for explicit markers, questionMatch[2] is for implicit "?"
      const qText = questionMatch[1] || questionMatch[2];

      currentQuestion = {
        question: qText.trim().replace(/\*\*$/, ''),
        category: "General",
      };
      currentOptions = ["", "", "", ""];
      correctIndex = -1;
    }
    // Check if it's just a line starting with text but previous line was empty (could be implicit question)
    // For now, sticking to explicit markers for safety, but we can assume if we are not in options and have no question, this is it.

    // Regex for Options:
    // Matches: "A)", "A.", "a)", "a.", "(A)", "[A]"
    else if (line.match(/^[\(\[]?[A-D][\.\)\]\:]\s+/i)) {
      const match = line.match(/^[\(\[]?([A-D])[\.\)\]\:]\s+(.+)/i);
      if (match) {
        const optionLetter = match[1].toUpperCase();
        const optionIndex = optionLetter.charCodeAt(0) - 65;
        let optionText = match[2].trim();

        // Check for correct answer markers: "*", "(Correct)", "[Correct]", "<Correct>"
        // LLMs often put "**" or "(Correct)" at the end
        const hasAsterisk = optionText.includes('*') ||
          /\(Correct\)/i.test(optionText) ||
          /\[Correct\]/i.test(optionText);

        // Clean up the marker
        optionText = optionText.replace(/\*/g, '')
          .replace(/\(Correct\)/gi, '')
          .replace(/\[Correct\]/gi, '')
          .trim();

        if (hasAsterisk) {
          correctIndex = optionIndex;
        }

        if (optionIndex >= 0 && optionIndex < 4) {
          currentOptions[optionIndex] = optionText;
        }
      }
    }
    // Category detection (optional)
    else if (line.match(/^Category[:.]?\s*/i)) {
      if (currentQuestion) {
        currentQuestion.category = line.replace(/^Category[:.]?\s*/i, '').trim();
      }
    }
    // Append to current question if it's a multi-line question and we haven't started options yet
    else if (currentQuestion && !currentOptions.some(o => o.length > 0)) {
      currentQuestion.question += " " + line;
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
