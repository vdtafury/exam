// Student Exam JavaScript
class ExamSystem {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.answers = {};
        this.examSettings = {};
        this.timer = null;
        this.timeRemaining = 0;
        this.examSubmitted = false;
        
        this.init();
    }

    async init() {
        // Check if Firebase is initialized
        if (!window.db) {
            this.showMessage('Firebase not initialized. Please check configuration.', 'error');
            return;
        }

        // Set up event listeners
        this.setupEventListeners();
        
        // Prevent right click and copy/paste
        this.preventCheating();
    }

    setupEventListeners() {
        // Start form
        document.getElementById('startForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startExam();
        });

        // Navigation buttons
        document.getElementById('prevBtn').addEventListener('click', () => this.previousQuestion());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('submitBtn').addEventListener('click', () => this.submitExam());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.examSubmitted) return;
            
            if (e.key === 'ArrowLeft' && !document.getElementById('prevBtn').disabled) {
                this.previousQuestion();
            } else if (e.key === 'ArrowRight' && !document.getElementById('nextBtn').disabled) {
                this.nextQuestion();
            }
        });
    }

    preventCheating() {
        // Disable right click
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Disable copy/paste shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
                e.preventDefault();
            }
        });

        // Disable text selection on exam screen
        document.addEventListener('selectstart', (e) => {
            if (!document.getElementById('examScreen').classList.contains('hidden')) {
                e.preventDefault();
            }
        });
    }

    async startExam() {
        const studentName = document.getElementById('studentName').value.trim();
        
        if (!studentName) {
            this.showMessage('Please enter your name', 'error');
            return;
        }

        this.studentName = studentName;
        
        try {
            // Show loading screen
            document.getElementById('welcomeScreen').classList.add('hidden');
            document.getElementById('loadingScreen').classList.remove('hidden');

            // Load exam settings
            await this.loadExamSettings();
            console.log('Exam enabled status:', this.examSettings.enabled);
            
            // Check if exam is enabled
            if (!this.examSettings.enabled) {
                console.log('Exam is disabled, showing error message');
                this.showMessage('Exam is currently disabled. Please contact administrator.', 'error');
                document.getElementById('loadingScreen').classList.add('hidden');
                document.getElementById('welcomeScreen').classList.remove('hidden');
                return;
            }

            // Load questions
            await this.loadQuestions();
            console.log('Questions loaded, count:', this.questions.length);
            
            if (this.questions.length === 0) {
                console.log('No questions found, showing error message');
                this.showMessage('No questions available. Please contact administrator.', 'error');
                document.getElementById('loadingScreen').classList.add('hidden');
                document.getElementById('welcomeScreen').classList.remove('hidden');
                return;
            }

            // Shuffle questions if enabled
            if (this.examSettings.shuffleQuestions) {
                this.shuffleArray(this.questions);
            }

            // Initialize exam
            this.initializeExam();
            
        } catch (error) {
            console.error('Error starting exam:', error);
            this.showMessage('Failed to load exam. Please try again.', 'error');
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('welcomeScreen').classList.remove('hidden');
        }
    }

    async loadExamSettings() {
        console.log('Loading exam settings...');
        const settingsDoc = await db.collection('exams').doc('settings').get();
        if (settingsDoc.exists) {
            this.examSettings = settingsDoc.data();
            console.log('Exam settings loaded:', this.examSettings);
        } else {
            // Default settings
            this.examSettings = {
                duration: 60, // 60 minutes
                enabled: true,
                shuffleQuestions: true,
                shuffleOptions: true
            };
            console.log('Using default exam settings:', this.examSettings);
        }
    }

    async loadQuestions() {
        console.log('Loading questions...');
        const questionsSnapshot = await db.collection('questions').get();
        this.questions = [];
        
        console.log('Questions snapshot size:', questionsSnapshot.size);
        
        questionsSnapshot.forEach(doc => {
            const question = doc.data();
            question.id = doc.id;
            console.log('Loaded question:', question);
            
            // Shuffle options if enabled
            if (this.examSettings.shuffleOptions) {
                const optionsWithIndex = question.options.map((option, index) => ({
                    text: option,
                    originalIndex: index
                }));
                this.shuffleArray(optionsWithIndex);
                question.options = optionsWithIndex.map(item => item.text);
                question.optionMapping = optionsWithIndex.map(item => item.originalIndex);
            } else {
                question.optionMapping = question.options.map((_, index) => index);
            }
            
            this.questions.push(question);
        });
        
        console.log('Total questions loaded:', this.questions.length);
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    initializeExam() {
        // Hide loading screen and show exam
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('examScreen').classList.remove('hidden');
        
        // Add no-copy class to prevent selection
        document.getElementById('examScreen').classList.add('no-copy');
        
        // Start timer
        this.startTimer();
        
        // Display first question
        this.displayQuestion();
        
        // Update progress
        this.updateProgress();
    }

    startTimer() {
        this.timeRemaining = this.examSettings.duration * 60; // Convert to seconds
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.autoSubmitExam();
            } else if (this.timeRemaining <= 300) { // Last 5 minutes
                document.getElementById('timer').classList.add('warning');
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timeDisplay').textContent = display;
    }

    displayQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        
        // Update question number and marks
        document.getElementById('questionNumber').textContent = 
            `Q${this.currentQuestionIndex + 1}/${this.questions.length}`;
        document.getElementById('questionMarks').textContent = 
            `${question.marks || 1} Mark${question.marks !== 1 ? 's' : ''}`;
        
        // Update question text
        document.getElementById('questionText').textContent = question.text;
        
        // Update options
        this.displayOptions(question);
        
        // Update navigation buttons
        this.updateNavigationButtons();
        
        // Update progress
        this.updateProgress();
    }

    displayOptions(question) {
        const optionsList = document.getElementById('optionsList');
        optionsList.innerHTML = '';
        
        question.options.forEach((option, index) => {
            const optionId = `option_${index}`;
            const isSelected = this.answers[question.id] && 
                             this.answers[question.id].includes(index);
            
            const li = document.createElement('li');
            li.className = `option-item ${isSelected ? 'selected' : ''}`;
            
            if (question.type === 'single') {
                li.innerHTML = `
                    <label class="option-label">
                        <input type="radio" 
                               name="question_${question.id}" 
                               value="${index}" 
                               id="${optionId}"
                               ${isSelected ? 'checked' : ''}>
                        <span>${this.fromCharCode(65 + index)}. ${option}</span>
                    </label>
                `;
            } else {
                li.innerHTML = `
                    <label class="option-label">
                        <input type="checkbox" 
                               value="${index}" 
                               id="${optionId}"
                               ${isSelected ? 'checked' : ''}>
                        <span>${this.fromCharCode(65 + index)}. ${option}</span>
                    </label>
                `;
            }
            
            // Add click event to the entire option item
            li.addEventListener('click', (e) => {
                if (e.target.type !== 'radio' && e.target.type !== 'checkbox') {
                    const input = li.querySelector('input');
                    if (input) {
                        if (question.type === 'single') {
                            input.checked = true;
                        } else {
                            input.checked = !input.checked;
                        }
                        this.saveAnswer(question, input);
                    }
                }
            });
            
            // Add change event to input
            const input = li.querySelector('input');
            input.addEventListener('change', () => this.saveAnswer(question, input));
            
            optionsList.appendChild(li);
        });
    }

    fromCharCode(code) {
        return String.fromCharCode(code);
    }

    charFromCode(code) {
        return String.fromCharCode(code);
    }

    saveAnswer(question, input) {
        if (question.type === 'single') {
            if (input.checked) {
                this.answers[question.id] = [parseInt(input.value)];
            }
        } else {
            if (!this.answers[question.id]) {
                this.answers[question.id] = [];
            }
            
            const value = parseInt(input.value);
            if (input.checked) {
                if (!this.answers[question.id].includes(value)) {
                    this.answers[question.id].push(value);
                }
            } else {
                this.answers[question.id] = this.answers[question.id].filter(
                    answer => answer !== value
                );
            }
        }
        
        // Update visual state
        this.updateOptionVisualState(question);
    }

    updateOptionVisualState(question) {
        const optionsList = document.getElementById('optionsList');
        const optionItems = optionsList.querySelectorAll('.option-item');
        
        optionItems.forEach((item, index) => {
            const isSelected = this.answers[question.id] && 
                             this.answers[question.id].includes(index);
            item.classList.toggle('selected', isSelected);
        });
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');
        
        // Previous button
        prevBtn.disabled = this.currentQuestionIndex === 0;
        
        // Next/Submit button
        if (this.currentQuestionIndex === this.questions.length - 1) {
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        }
    }

    updateProgress() {
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;
    }

    async submitExam() {
        if (this.examSubmitted) return;
        
        // Confirm submission
        const confirmed = confirm('Are you sure you want to submit your exam? You cannot change your answers after submission.');
        if (!confirmed) return;
        
        await this.performSubmission();
    }

    async autoSubmitExam() {
        if (this.examSubmitted) return;
        
        this.showMessage('Time is up! Your exam is being submitted automatically.', 'warning');
        await this.performSubmission();
    }

    async performSubmission() {
        this.examSubmitted = true;
        
        // Stop timer
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        try {
            // Map answers back to original indices
            const mappedAnswers = {};
            for (const [questionId, answerIndices] of Object.entries(this.answers)) {
                const question = this.questions.find(q => q.id === questionId);
                if (question && question.optionMapping) {
                    mappedAnswers[questionId] = answerIndices.map(index => 
                        question.optionMapping[index]
                    );
                } else {
                    mappedAnswers[questionId] = answerIndices;
                }
            }
            
            // Save submission to Firestore
            await db.collection('submissions').add({
                studentName: this.studentName,
                answers: mappedAnswers,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                duration: this.examSettings.duration * 60 - this.timeRemaining,
                totalQuestions: this.questions.length
            });
            
            // Show success screen
            this.showSuccessScreen();
            
        } catch (error) {
            console.error('Error submitting exam:', error);
            this.showMessage('Failed to submit exam. Please try again.', 'error');
            this.examSubmitted = false;
        }
    }

    showSuccessScreen() {
        document.getElementById('examScreen').classList.add('hidden');
        document.getElementById('successScreen').classList.remove('hidden');
        
        // Remove no-copy class
        document.body.classList.remove('no-copy');
        
        // Clear any stored data
        this.questions = [];
        this.answers = {};
        this.currentQuestionIndex = 0;
    }

    showMessage(message, type = 'info') {
        const messageContainer = document.getElementById('messageContainer');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        
        messageContainer.appendChild(messageDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }
}

// Initialize exam system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ExamSystem();
});
