// Bulk Question Import Script
// Run this in the browser console on admin.html to import questions

const questions = [
  {
    "text": "What is the purpose of cout in C++?",
    "type": "single",
    "options": [
      "Read input from keyboard",
      "Print output to the console",
      "Declare variables",
      "Store data"
    ],
    "correct": [1],
    "marks": 1,
    "level": "easy"
  },
  {
    "text": "Which data type stores whole numbers only?",
    "type": "single",
    "options": ["float", "double", "int", "string"],
    "correct": [2],
    "marks": 1,
    "level": "easy"
  },
  {
    "text": "Select all floating-point data types.",
    "type": "multi",
    "options": ["int", "float", "double", "char"],
    "correct": [1, 2],
    "marks": 2,
    "level": "easy"
  },
  {
    "text": "What does the operator % return?",
    "type": "single",
    "options": [
      "Division result",
      "Multiplication result",
      "Remainder of division",
      "Power of number"
    ],
    "correct": [2],
    "marks": 2,
    "level": "medium"
  },
  {
    "text": "Which function reads a full line including spaces?",
    "type": "single",
    "options": ["cin", "cout", "getline", "printf"],
    "correct": [2],
    "marks": 2,
    "level": "medium"
  },
  {
    "text": "Select all true statements about bool.",
    "type": "multi",
    "options": [
      "Stores only true or false",
      "Used in conditions",
      "Stores decimal numbers",
      "Takes 8 bytes always"
    ],
    "correct": [0, 1],
    "marks": 2,
    "level": "medium"
  },
  {
    "text": "What is the result of: int x = 10 / 3;",
    "type": "single",
    "options": ["3.33", "3", "4", "0"],
    "correct": [1],
    "marks": 3,
    "level": "medium"
  },
  {
    "text": "Choose the correct statements about using namespace std;",
    "type": "multi",
    "options": [
      "Allows using cout without std::",
      "Mandatory for every program",
      "May cause name conflicts in large projects",
      "Improves program speed"
    ],
    "correct": [0, 2],
    "marks": 3,
    "level": "hard"
  },
  {
    "text": "After executing: int x = 5; int y = x++; What is y?",
    "type": "single",
    "options": ["6", "5", "4", "Undefined"],
    "correct": [1],
    "marks": 3,
    "level": "hard"
  },
  {
    "text": "Select all arithmetic operators in C++.",
    "type": "multi",
    "options": ["+", "-", "&&", "%"],
    "correct": [0, 1, 3],
    "marks": 3,
    "level": "hard"
  }
];

// Import function
async function importQuestions() {
  if (!window.db) {
    console.error('Firebase not initialized');
    return;
  }

  console.log('Starting import of', questions.length, 'questions...');
  
  try {
    const batch = db.batch();
    const questionsRef = db.collection('questions');
    
    questions.forEach((question, index) => {
      const docRef = questionsRef.doc(); // Auto-generate ID
      const questionWithTimestamp = {
        ...question,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      batch.set(docRef, questionWithTimestamp);
      console.log(`Added question ${index + 1}: ${question.text.substring(0, 50)}...`);
    });
    
    await batch.commit();
    console.log('✅ All questions imported successfully!');
    
    // Refresh the questions list in admin dashboard
    if (window.adminDashboard) {
      await window.adminDashboard.loadQuestions();
    }
    
  } catch (error) {
    console.error('❌ Error importing questions:', error);
  }
}

// Auto-run the import
importQuestions();
