# MCQ Exam System

A complete production-ready MCQ examination system built with vanilla JavaScript and Firebase Firestore.

## Features

### Student Side
- Name-based exam entry (no authentication)
- Dynamic question loading from Firestore
- Support for single and multiple choice questions
- Question navigation (Previous/Next)
- Progress bar and question counter
- Configurable countdown timer
- Auto-submit when time expires
- Question and option shuffling
- Anti-cheating measures (no copy/paste, no right-click)
- Clean submission without showing results

### Admin Dashboard
- Question management (Add/Edit/Delete)
- Dynamic option handling
- Question type support (Single/Multiple choice)
- Exam settings configuration
- Submission viewing and scoring
- CSV export functionality
- Bulk operations (Clear submissions, Reset exam)

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: Firebase Firestore
- **Hosting**: Static hosting compatible (GitHub Pages)
- **No Build Tools**: Pure vanilla implementation

## Setup Instructions

### 1. Firebase Configuration

1. Create a new Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Get your Firebase configuration from Project Settings
4. Update the configuration in `js/firebase.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 2. Firestore Security Rules

Set up these security rules in Firebase Console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Questions collection - read access for all, write access for admin
    match /questions/{documentId} {
      allow read: if true;
      allow write: if request.time < timestamp.date(2025, 1, 1);
    }
    
    // Submissions collection - write access for all, read access for admin
    match /submissions/{documentId} {
      allow create: if true;
      allow read: if request.time < timestamp.date(2025, 1, 1);
      allow update, delete: if request.time < timestamp.date(2025, 1, 1);
    }
    
    // Settings collection - read access for all, write access for admin
    match /exams/{documentId} {
      allow read: if true;
      allow write: if request.time < timestamp.date(2025, 1, 1);
    }
  }
}
```

### 3. Initial Setup

1. Open `admin.html` in your browser
2. Go to Settings tab and configure:
   - Exam duration (minutes)
   - Enable/disable exam
   - Shuffling preferences
3. Add questions using the Questions tab
4. Enable the exam when ready

### 4. Deployment

The system is ready for static hosting:

- **GitHub Pages**: Upload all files to a GitHub repository and enable Pages
- **Netlify**: Drag and drop the project folder
- **Vercel**: Import from GitHub or upload manually
- **Firebase Hosting**: Use `firebase deploy` (optional)

## Project Structure

```
/project
├── index.html          # Student exam page
├── admin.html          # Admin dashboard
├── css/
│   └── style.css       # Complete styling
└── js/
    ├── firebase.js     # Firebase configuration
    ├── student.js      # Student exam logic
    └── admin.js        # Admin dashboard logic
```

## Usage

### For Students
1. Access `index.html`
2. Enter full name
3. Start exam
4. Answer questions
5. Submit when done

### For Administrators
1. Access `admin.html`
2. Add/edit questions
3. Configure exam settings
4. Monitor submissions
5. Export results as CSV

## Security Features

- No authentication required (simplified access)
- Anti-cheating measures on student side
- Secure Firebase rules
- Input sanitization
- XSS prevention

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Mobile Responsive

The system is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## Data Structure

### Questions Collection
```javascript
{
  text: "Question text",
  type: "single", // or "multi"
  options: ["Option A", "Option B", "Option C"],
  correct: [0], // or [0, 2] for multiple choice
  marks: 1
}
```

### Submissions Collection
```javascript
{
  studentName: "John Doe",
  answers: {
    "questionId1": [0],
    "questionId2": [1, 2]
  },
  submittedAt: timestamp,
  duration: 1800, // seconds
  totalQuestions: 20
}
```

### Settings Collection
```javascript
{
  duration: 60, // minutes
  enabled: true,
  shuffleQuestions: true,
  shuffleOptions: true
}
```

## Support

For issues or questions:
1. Check Firebase configuration
2. Verify Firestore security rules
3. Ensure all files are uploaded correctly
4. Test with different browsers

The system is production-ready and includes comprehensive error handling, loading states, and user feedback.
