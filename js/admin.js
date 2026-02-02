// Admin Dashboard JavaScript
// Global admin dashboard instance
let adminDashboard;

class AdminDashboard {
    constructor() {
        this.questions = [];
        this.submissions = [];
        this.settings = {};
        this.editingQuestionId = null;
        
        this.init();
    }

    async init() {
        // Check if Firebase is initialized
        if (!window.db) {
            console.warn('Firebase not initialized. Running in demo mode.');
            this.showMessage('Firebase not configured. Running in demo mode - changes won\'t be saved.', 'warning');
            // Don't return, continue with UI functionality
        }

        // Set up event listeners
        this.setupEventListeners();
        
        // Load initial data only if Firebase is available
        if (window.db) {
            await this.loadQuestions();
            await this.loadSettings();
        } else {
            // Set default data for demo mode
            this.questions = [];
            this.settings = {
                duration: 60,
                enabled: false,
                shuffleQuestions: true,
                shuffleOptions: true
            };
            this.updateSettingsForm();
            this.displayQuestions();
        }
        
        // Set up question type change listener
        document.getElementById('questionType').addEventListener('change', () => {
            this.updateCorrectAnswersSection();
        });
        
        console.log('Admin dashboard initialized successfully');
    }

    setupEventListeners() {
        // Question form
        document.getElementById('questionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveQuestion();
        });

        // Settings form
        document.getElementById('settingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Settings toggle switches
        document.getElementById('examEnabled').addEventListener('change', (e) => {
            document.getElementById('examStatusText').textContent = e.target.checked ? 'Enabled' : 'Disabled';
        });

        document.getElementById('shuffleQuestions').addEventListener('change', (e) => {
            document.getElementById('shuffleQuestionsText').textContent = e.target.checked ? 'Enabled' : 'Disabled';
        });

        document.getElementById('shuffleOptions').addEventListener('change', (e) => {
            document.getElementById('shuffleOptionsText').textContent = e.target.checked ? 'Enabled' : 'Disabled';
        });
    }

    async loadQuestions() {
        if (!window.db) {
            console.log('Demo mode: No questions loaded');
            this.displayQuestions();
            return;
        }
        
        try {
            const questionsSnapshot = await db.collection('questions').get();
            this.questions = [];
            
            questionsSnapshot.forEach(doc => {
                this.questions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.displayQuestions();
        } catch (error) {
            console.error('Error loading questions:', error);
            this.showMessage('Failed to load questions', 'error');
        }
    }

    displayQuestions() {
        const container = document.getElementById('questionsList');
        
        if (this.questions.length === 0) {
            container.innerHTML = '<p class="text-center">No questions found. Add your first question above.</p>';
            return;
        }
        
        container.innerHTML = this.questions.map(question => `
            <div class="question-item">
                <h4>${this.escapeHtml(question.text)}</h4>
                <div class="question-meta">
                    <span>Type: ${question.type === 'single' ? 'Single Choice' : 'Multiple Choice'}</span>
                    <span>Marks: ${question.marks || 1}</span>
                    <span>Options: ${question.options.length}</span>
                </div>
                <div style="margin: 10px 0;">
                    <strong>Options:</strong>
                    <ul style="margin: 5px 0; padding-left: 20px;">
                        ${question.options.map((option, index) => 
                            `<li>${this.fromCharCode(65 + index)}. ${this.escapeHtml(option)} ${question.correct.includes(index) ? '✓' : ''}</li>`
                        ).join('')}
                    </ul>
                </div>
                <div class="question-actions">
                    <button class="btn btn-secondary" onclick="editQuestion('${question.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="deleteQuestion('${question.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async loadSettings() {
        if (!window.db) {
            console.log('Demo mode: Using default settings');
            this.updateSettingsForm();
            return;
        }
        
        try {
            const settingsDoc = await db.collection('exams').doc('settings').get();
            
            if (settingsDoc.exists) {
                this.settings = settingsDoc.data();
            } else {
                // Default settings
                this.settings = {
                    duration: 60,
                    enabled: true,
                    shuffleQuestions: true,
                    shuffleOptions: true
                };
            }
            
            this.updateSettingsForm();
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showMessage('Failed to load settings', 'error');
        }
    }

    updateSettingsForm() {
        document.getElementById('examDuration').value = this.settings.duration || 60;
        document.getElementById('examEnabled').checked = this.settings.enabled || false;
        document.getElementById('shuffleQuestions').checked = this.settings.shuffleQuestions || false;
        document.getElementById('shuffleOptions').checked = this.settings.shuffleOptions || false;
        
        // Update text labels
        document.getElementById('examStatusText').textContent = this.settings.enabled ? 'Enabled' : 'Disabled';
        document.getElementById('shuffleQuestionsText').textContent = this.settings.shuffleQuestions ? 'Enabled' : 'Disabled';
        document.getElementById('shuffleOptionsText').textContent = this.settings.shuffleOptions ? 'Enabled' : 'Disabled';
    }

    addOption() {
        const container = document.getElementById('optionsContainer');
        
        if (!container) {
            console.error('optionsContainer not found');
            return;
        }
        
        const optionGroups = container.querySelectorAll('.option-input-group');
        const optionCount = optionGroups.length;
        const optionLetter = this.fromCharCode(65 + optionCount);
        
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-input-group';
        optionDiv.innerHTML = `
            <input type="text" class="form-control" placeholder="Option ${optionLetter}" required>
            <button type="button" class="btn btn-danger" onclick="removeOption(this)">Remove</button>
        `;
        
        container.appendChild(optionDiv);
        this.updateCorrectAnswersSection();
    }

    removeOption(button) {
        const container = document.getElementById('optionsContainer');
        if (container.children.length > 2) {
            button.parentElement.remove();
            this.updateCorrectAnswersSection();
        } else {
            this.showMessage('Minimum 2 options required', 'error');
        }
    }

    updateCorrectAnswersSection() {
        const questionType = document.getElementById('questionType').value;
        const options = document.querySelectorAll('#optionsContainer input');
        const container = document.getElementById('correctAnswersContainer');
        
        container.innerHTML = '';
        
        options.forEach((input, index) => {
            const optionLetter = this.fromCharCode(65 + index);
            const div = document.createElement('div');
            div.style.marginBottom = '10px';
            
            if (questionType === 'single') {
                div.innerHTML = `
                    <label>
                        <input type="radio" name="correctAnswer" value="${index}" required>
                        Option ${optionLetter}
                    </label>
                `;
            } else {
                div.innerHTML = `
                    <label>
                        <input type="checkbox" name="correctAnswer" value="${index}">
                        Option ${optionLetter}
                    </label>
                `;
            }
            
            container.appendChild(div);
        });
    }

    async saveQuestion() {
        if (!window.db) {
            this.showMessage('Demo mode: Question not saved (Firebase not configured)', 'warning');
            // Reset form for demo
            this.resetQuestionForm();
            return;
        }
        
        try {
            const questionText = document.getElementById('questionText').value.trim();
            const questionType = document.getElementById('questionType').value;
            const questionMarks = parseInt(document.getElementById('questionMarks').value);
            
            // Get options
            const optionInputs = document.querySelectorAll('#optionsContainer input');
            const options = Array.from(optionInputs).map(input => input.value.trim()).filter(val => val);
            
            if (options.length < 2) {
                this.showMessage('Minimum 2 options required', 'error');
                return;
            }
            
            // Get correct answers
            let correctAnswers = [];
            if (questionType === 'single') {
                const selected = document.querySelector('input[name="correctAnswer"]:checked');
                if (selected) {
                    correctAnswers = [parseInt(selected.value)];
                }
            } else {
                const selected = document.querySelectorAll('input[name="correctAnswer"]:checked');
                correctAnswers = Array.from(selected).map(input => parseInt(input.value));
            }
            
            if (correctAnswers.length === 0) {
                this.showMessage('Please select at least one correct answer', 'error');
                return;
            }
            
            const questionData = {
                text: questionText,
                type: questionType,
                options: options,
                correct: correctAnswers,
                marks: questionMarks,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (this.editingQuestionId) {
                // Update existing question
                await db.collection('questions').doc(this.editingQuestionId).update(questionData);
                this.showMessage('Question updated successfully', 'success');
                this.editingQuestionId = null;
            } else {
                // Add new question
                await db.collection('questions').add(questionData);
                this.showMessage('Question added successfully', 'success');
            }
            
            // Reset form and reload questions
            this.resetQuestionForm();
            await this.loadQuestions();
            
        } catch (error) {
            console.error('Error saving question:', error);
            this.showMessage('Failed to save question', 'error');
        }
    }

    async editQuestion(questionId) {
        try {
            const questionDoc = await db.collection('questions').doc(questionId).get();
            const question = questionDoc.data();
            
            this.editingQuestionId = questionId;
            
            // Fill form with question data
            document.getElementById('questionText').value = question.text;
            document.getElementById('questionType').value = question.type;
            document.getElementById('questionMarks').value = question.marks || 1;
            
            // Clear and populate options
            const optionsContainer = document.getElementById('optionsContainer');
            optionsContainer.innerHTML = '';
            
            question.options.forEach(option => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'option-input-group';
                optionDiv.innerHTML = `
                    <input type="text" class="form-control" value="${this.escapeHtml(option)}" required>
                    <button type="button" class="btn btn-danger" onclick="removeOption(this)">Remove</button>
                `;
                optionsContainer.appendChild(optionDiv);
            });
            
            // Update correct answers section
            this.updateCorrectAnswersSection();
            
            // Select correct answers
            setTimeout(() => {
                if (question.type === 'single') {
                    const radio = document.querySelector(`input[name="correctAnswer"][value="${question.correct[0]}"]`);
                    if (radio) radio.checked = true;
                } else {
                    question.correct.forEach(index => {
                        const checkbox = document.querySelector(`input[name="correctAnswer"][value="${index}"]`);
                        if (checkbox) checkbox.checked = true;
                    });
                }
            }, 100);
            
            // Scroll to form
            document.getElementById('questionForm').scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error loading question for edit:', error);
            this.showMessage('Failed to load question for editing', 'error');
        }
    }

    async deleteQuestion(questionId) {
        if (!confirm('Are you sure you want to delete this question?')) {
            return;
        }
        
        try {
            await db.collection('questions').doc(questionId).delete();
            this.showMessage('Question deleted successfully', 'success');
            await this.loadQuestions();
        } catch (error) {
            console.error('Error deleting question:', error);
            this.showMessage('Failed to delete question', 'error');
        }
    }

    resetQuestionForm() {
        document.getElementById('questionForm').reset();
        this.editingQuestionId = null;
        
        // Reset options to 2 default options
        const optionsContainer = document.getElementById('optionsContainer');
        optionsContainer.innerHTML = `
            <div class="option-input-group">
                <input type="text" class="form-control" placeholder="Option A" required>
                <button type="button" class="btn btn-danger" onclick="removeOption(this)">Remove</button>
            </div>
            <div class="option-input-group">
                <input type="text" class="form-control" placeholder="Option B" required>
                <button type="button" class="btn btn-danger" onclick="removeOption(this)">Remove</button>
            </div>
        `;
        
        this.updateCorrectAnswersSection();
    }

    async saveSettings() {
        try {
            const settings = {
                duration: parseInt(document.getElementById('examDuration').value),
                enabled: document.getElementById('examEnabled').checked,
                shuffleQuestions: document.getElementById('shuffleQuestions').checked,
                shuffleOptions: document.getElementById('shuffleOptions').checked,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('exams').doc('settings').set(settings);
            this.settings = settings;
            this.showMessage('Settings saved successfully', 'success');
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showMessage('Failed to save settings', 'error');
        }
    }

    async loadSubmissions() {
        try {
            const submissionsSnapshot = await db.collection('submissions')
                .orderBy('submittedAt', 'desc')
                .get();
            
            this.submissions = [];
            submissionsSnapshot.forEach(doc => {
                this.submissions.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            this.displaySubmissions();
        } catch (error) {
            console.error('Error loading submissions:', error);
            this.showMessage('Failed to load submissions', 'error');
        }
    }

    displaySubmissions() {
        const tbody = document.getElementById('submissionsTableBody');
        
        if (this.submissions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No submissions found</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.submissions.map(submission => {
            const submittedAt = submission.submittedAt ? 
                new Date(submission.submittedAt.toDate()).toLocaleString() : 'N/A';
            const duration = submission.duration ? 
                `${Math.floor(submission.duration / 60)}m ${submission.duration % 60}s` : 'N/A';
            const score = this.calculateScore(submission);
            
            return `
                <tr>
                    <td>${this.escapeHtml(submission.studentName)}</td>
                    <td>${submittedAt}</td>
                    <td>${duration}</td>
                    <td>${score}/${this.getTotalMarks()}</td>
                    <td>
                        <button class="btn btn-secondary" onclick="viewSubmission('${submission.id}')">View</button>
                        <button class="btn btn-danger" onclick="deleteSubmission('${submission.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    calculateScore(submission) {
        let score = 0;
        
        for (const [questionId, answerIndices] of Object.entries(submission.answers)) {
            const question = this.questions.find(q => q.id === questionId);
            if (!question) continue;
            
            // Check if answers match correct answers
            const correctSorted = [...question.correct].sort();
            const answerSorted = [...answerIndices].sort();
            
            if (correctSorted.length === answerSorted.length && 
                correctSorted.every((val, index) => val === answerSorted[index])) {
                score += question.marks || 1;
            }
        }
        
        return score;
    }

    getTotalMarks() {
        return this.questions.reduce((total, question) => total + (question.marks || 1), 0);
    }

    async viewSubmission(submissionId) {
        try {
            const submission = this.submissions.find(s => s.id === submissionId);
            if (!submission) return;
            
            const detailsContainer = document.getElementById('submissionDetails');
            const score = this.calculateScore(submission);
            const totalMarks = this.getTotalMarks();
            
            let detailsHtml = `
                <div class="form-group">
                    <strong>Student Name:</strong> ${this.escapeHtml(submission.studentName)}
                </div>
                <div class="form-group">
                    <strong>Submitted At:</strong> ${submission.submittedAt ? new Date(submission.submittedAt.toDate()).toLocaleString() : 'N/A'}
                </div>
                <div class="form-group">
                    <strong>Duration:</strong> ${submission.duration ? `${Math.floor(submission.duration / 60)}m ${submission.duration % 60}s` : 'N/A'}
                </div>
                <div class="form-group">
                    <strong>Score:</strong> ${score}/${totalMarks} (${((score/totalMarks) * 100).toFixed(1)}%)
                </div>
                <hr>
                <h4>Answers:</h4>
            `;
            
            // Display each question and answer
            for (const [questionId, answerIndices] of Object.entries(submission.answers)) {
                const question = this.questions.find(q => q.id === questionId);
                if (!question) continue;
                
                const isCorrect = this.isAnswerCorrect(question, answerIndices);
                
                detailsHtml += `
                    <div class="question-item" style="margin-bottom: 20px;">
                        <h5>${this.escapeHtml(question.text)}</h5>
                        <div style="margin: 10px 0;">
                            <strong>Type:</strong> ${question.type === 'single' ? 'Single Choice' : 'Multiple Choice'} | 
                            <strong>Marks:</strong> ${question.marks || 1} | 
                            <strong>Status:</strong> <span style="color: ${isCorrect ? 'green' : 'red'}">${isCorrect ? 'Correct' : 'Incorrect'}</span>
                        </div>
                        <div style="margin: 10px 0;">
                            <strong>Options:</strong>
                            <ul style="margin: 5px 0; padding-left: 20px;">
                                ${question.options.map((option, index) => {
                                    const isSelected = answerIndices.includes(index);
                                    const isCorrectOption = question.correct.includes(index);
                                    let style = '';
                                    if (isSelected && isCorrectOption) style = 'color: green; font-weight: bold;';
                                    else if (isSelected && !isCorrectOption) style = 'color: red; text-decoration: line-through;';
                                    else if (isCorrectOption) style = 'color: green;';
                                    
                                    return `<li style="${style}">${this.fromCharCode(65 + index)}. ${this.escapeHtml(option)} ${isSelected ? '✓' : ''}</li>`;
                                }).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            }
            
            detailsContainer.innerHTML = detailsHtml;
            document.getElementById('submissionModal').classList.remove('hidden');
            
        } catch (error) {
            console.error('Error viewing submission:', error);
            this.showMessage('Failed to load submission details', 'error');
        }
    }

    isAnswerCorrect(question, answerIndices) {
        const correctSorted = [...question.correct].sort();
        const answerSorted = [...answerIndices].sort();
        return correctSorted.length === answerSorted.length && 
               correctSorted.every((val, index) => val === answerSorted[index]);
    }

    closeSubmissionModal() {
        document.getElementById('submissionModal').classList.add('hidden');
    }

    async deleteSubmission(submissionId) {
        if (!confirm('Are you sure you want to delete this submission?')) {
            return;
        }
        
        try {
            await db.collection('submissions').doc(submissionId).delete();
            this.showMessage('Submission deleted successfully', 'success');
            await this.loadSubmissions();
        } catch (error) {
            console.error('Error deleting submission:', error);
            this.showMessage('Failed to delete submission', 'error');
        }
    }

    async clearAllSubmissions() {
        if (!confirm('Are you sure you want to delete ALL submissions? This action cannot be undone.')) {
            return;
        }
        
        try {
            const submissionsSnapshot = await db.collection('submissions').get();
            const batch = db.batch();
            
            submissionsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            this.showMessage('All submissions deleted successfully', 'success');
            await this.loadSubmissions();
        } catch (error) {
            console.error('Error clearing submissions:', error);
            this.showMessage('Failed to clear submissions', 'error');
        }
    }

    exportSubmissions() {
        if (this.submissions.length === 0) {
            this.showMessage('No submissions to export', 'warning');
            return;
        }
        
        let csv = 'Student Name,Submitted At,Duration (seconds),Score,Total Marks,Percentage\n';
        
        this.submissions.forEach(submission => {
            const score = this.calculateScore(submission);
            const totalMarks = this.getTotalMarks();
            const percentage = totalMarks > 0 ? ((score / totalMarks) * 100).toFixed(1) : 0;
            const submittedAt = submission.submittedAt ? 
                new Date(submission.submittedAt.toDate()).toISOString() : '';
            
            csv += `"${this.escapeCsv(submission.studentName)}","${submittedAt}","${submission.duration || 0}","${score}","${totalMarks}","${percentage}%"\n`;
        });
        
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exam_submissions_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showMessage('Submissions exported successfully', 'success');
    }

    async resetExam() {
        if (!confirm('Are you sure you want to reset all exam data? This will delete ALL questions and submissions. This action cannot be undone.')) {
            return;
        }
        
        if (!confirm('This is your final warning. All data will be permanently deleted. Continue?')) {
            return;
        }
        
        try {
            // Delete all questions
            const questionsSnapshot = await db.collection('questions').get();
            const batch = db.batch();
            
            questionsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Delete all submissions
            const submissionsSnapshot = await db.collection('submissions').get();
            submissionsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
            // Reset settings to defaults
            const defaultSettings = {
                duration: 60,
                enabled: false,
                shuffleQuestions: true,
                shuffleOptions: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('exams').doc('settings').set(defaultSettings);
            
            this.showMessage('Exam data reset successfully', 'success');
            
            // Reload data
            await this.loadQuestions();
            await this.loadSubmissions();
            await this.loadSettings();
            
        } catch (error) {
            console.error('Error resetting exam:', error);
            this.showMessage('Failed to reset exam data', 'error');
        }
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

    // Utility functions
    fromCharCode(code) {
        return String.fromCharCode(code);
    }

    charFromCode(code) {
        return String.fromCharCode(code);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeCsv(text) {
        return text.replace(/"/g, '""');
    }
}

// Global functions for HTML onclick handlers
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Load data for specific tabs
    if (tabName === 'submissions' && adminDashboard) {
        adminDashboard.loadSubmissions();
    }
}

function addOption() {
    if (adminDashboard) adminDashboard.addOption();
}

function removeOption(button) {
    if (adminDashboard) adminDashboard.removeOption(button);
}

function editQuestion(questionId) {
    if (adminDashboard) adminDashboard.editQuestion(questionId);
}

function deleteQuestion(questionId) {
    if (adminDashboard) adminDashboard.deleteQuestion(questionId);
}

function resetQuestionForm() {
    if (adminDashboard) adminDashboard.resetQuestionForm();
}

function loadSubmissions() {
    if (adminDashboard) adminDashboard.loadSubmissions();
}

function exportSubmissions() {
    if (adminDashboard) adminDashboard.exportSubmissions();
}

function clearAllSubmissions() {
    if (adminDashboard) adminDashboard.clearAllSubmissions();
}

function viewSubmission(submissionId) {
    if (adminDashboard) adminDashboard.viewSubmission(submissionId);
}

function deleteSubmission(submissionId) {
    if (adminDashboard) adminDashboard.deleteSubmission(submissionId);
}

function closeSubmissionModal() {
    if (adminDashboard) adminDashboard.closeSubmissionModal();
}

function resetExam() {
    if (adminDashboard) adminDashboard.resetExam();
}

function importSampleQuestions() {
    if (adminDashboard) adminDashboard.importSampleQuestions();
}

function clearAllQuestions() {
    if (adminDashboard) adminDashboard.clearAllQuestions();
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});
