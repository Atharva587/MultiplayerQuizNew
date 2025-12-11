
import { parseQuestionsFromText } from "../server/questionParser";

const chatgptOutput = `
### **Q. A 22-year-old male falls off a bike and is unable to abduct his arm beyond 15°. Which nerve is most likely injured?**

a. Suprascapular nerve
b. Axillary nerve*
c. Radial nerve
d. Musculocutaneous nerve

---

### **Q. A patient presents with “wrist drop” after sleeping with his arm hanging over a chair. Which structure is compressed?**

a. Median nerve in carpal tunnel
b. Ulnar nerve in cubital tunnel
c. Radial nerve in spiral groove*
d. Axillary nerve in quadrangular space
`;

console.log("Running Parser Tests on ChatGPT Output...\n");

const results = parseQuestionsFromText(chatgptOutput);
console.log(JSON.stringify(results, null, 2));
console.log(`\nFound ${results.length} questions.`);
