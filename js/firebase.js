// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCpjHF3ljt2qjBVyxbuO0yO-RiJ_xY0WEk",
    authDomain: "exam-d7580.firebaseapp.com",
    projectId: "exam-d7580",
    storageBucket: "exam-d7580.firebasestorage.app",
    messagingSenderId: "414489567850",
    appId: "1:414489567850:web:9ebc61674542901e866013",
    measurementId: "G-PJGVFKJYJ8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Export for use in other files
window.db = db;
window.firebase = firebase;
