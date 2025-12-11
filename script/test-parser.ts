
import { parseQuestionsFromText } from "../server/questionParser";

const testCases = [
    // Standard format
    `Q: What is the capital of France?
  A) London
  B) Paris*
  C) Berlin
  D) Madrid`,

    // Numbered format
    `1. What is 2+2?
  A. 3
  B. 4 (Correct)
  C. 5
  D. 6`,

    // Implicit Q, messy options
    `What is the color of the sky?
  a) Green
  b) Blue*
  c) Red
  d) Yellow`,

    // LLM style with header
    `Here are your questions:
  
  1. Who wrote Hamlet?
  A. Shakespeare [Correct]
  B. Dickens
  C. Orwell
  D. Hemingway`
];

console.log("Running Parser Tests...\n");

testCases.forEach((text, i) => {
    console.log(`--- Test Case ${i + 1} ---`);
    const results = parseQuestionsFromText(text);
    console.log(JSON.stringify(results, null, 2));
});
