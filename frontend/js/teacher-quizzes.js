// Teacher Quizzes Management JavaScript
let currentTeacher = null;
let allQuizzes = [];
let allModules = [];

// Check if user is teacher
function checkTeacher() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role === "teacher";
}
// Load teacher's modules for quiz creation
async function loadTeacherModules() {
    try {
        const response = await apiCall('/modules/teacher/list');
        allModules = response.data;
        
        // Populate module dropdown for module-based quizzes
        const moduleSelect = document.getElementById('quizModule');
        moduleSelect.innerHTML = '<option value="">Select a module...</option>';
        
        allModules.forEach(module => {
            const option = document.createElement('option');
            option.value = module._id;
            option.textContent = module.title;
            moduleSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading modules:', error);
    }
}

// Create or update module-based quiz
async function saveQuiz() {
    const quizId = document.getElementById('quizId').value;
    const moduleId = document.getElementById('quizModule').value;
    
    if (!moduleId) {
        alert('Please select a module for this quiz');
        return;
    }

    // Collect questions data
    const questions = [];
    const questionItems = document.querySelectorAll('#questions-container .question-item');
    
    questionItems.forEach(item => {
        const options = item.querySelector('.question-options').value.split('\n')
            .map(opt => opt.trim())
            .filter(opt => opt !== '');
        
        if (options.length < 2) {
            alert('Each question must have at least 2 options');
            return;
        }

        questions.push({
            question: item.querySelector('.question-text').value,
            options: options,
            correctAnswer: parseInt(item.querySelector('.correct-answer').value) - 1, // Convert to 0-based index
            points: parseInt(item.querySelector('.question-points').value)
        });
    });

    if (questions.length === 0) {
        alert('Please add at least one question to the quiz');
        return;
    }

    const quizData = {
        title: document.getElementById('quizTitle').value,
        description: document.getElementById('quizDescription').value,
        module: moduleId,
        timeLimit: parseInt(document.getElementById('quizTimeLimit').value),
        requiresModuleCompletion: true, // This is a module-based quiz
        questions: questions,
        school: currentTeacher.school
    };

    try {
        if (quizId) {
            // Update existing quiz
            await apiCall(`/quizzes/${quizId}`, {
                method: 'PUT',
                body: quizData
            });
            alert('Quiz updated successfully!');
        } else {
            // Create new quiz
            await apiCall(`/quizzes/module/${moduleId}`, {
                method: 'POST',
                body: quizData
            });
            alert('Quiz created successfully!');
        }
        
        // Close modal and refresh list
        bootstrap.Modal.getInstance(document.getElementById('quizModal')).hide();
        await loadModuleQuizzes();
        
    } catch (error) {
        alert('Error saving quiz: ' + error.message);
    }
}

// Load module-based quizzes (requiresModuleCompletion: true)
async function loadModuleQuizzes() {
    try {
        const container = document.getElementById('module-quizzes-container');
        container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-success"></div><p>Loading quizzes...</p></div>';
        
        // Get all quizzes for teacher's school
    const response = await apiCall('/quizzes');
    allQuizzes = response.data;
        
        // Filter for module-based quizzes (requiresModuleCompletion: true) from teacher's school
        const moduleQuizzes = allQuizzes.filter(quiz => 
            quiz.requiresModuleCompletion === true && 
            quiz.school === currentTeacher.school
        );
        
        if (moduleQuizzes.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-question-circle fa-3x text-muted mb-3"></i>
                    <h4>No module-based quizzes created yet</h4>
                    <p class="text-muted">Create your first module-based quiz to get started</p>
                </div>
            `;
            return;
        }

        let html = '';
        
        moduleQuizzes.forEach(quiz => {
            // Get module title
            const moduleTitle = quiz.module ? quiz.module.title : 'No module';
            
            html += `
                <div class="col-md-6 mb-4">
                    <div class="card quiz-card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <h5 class="card-title">${quiz.title}</h5>
                                <span class="badge ${quiz.isActive ? 'bg-success' : 'bg-secondary'}">
                                    ${quiz.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p class="card-text">${quiz.description || 'No description'}</p>
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <span class="badge bg-info">${moduleTitle}</span>
                                <span class="badge bg-warning">${quiz.totalPoints} points</span>
                                <span class="badge bg-primary">${quiz.questions.length} Qs</span>
                            </div>
                            <div class="btn-group w-100">
                                <button class="btn btn-outline-primary btn-sm" onclick="editQuiz('${quiz._id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" onclick="toggleQuizStatus('${quiz._id}')">
                                    ${quiz.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="deleteQuiz('${quiz._id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading module quizzes:', error);
        document.getElementById('module-quizzes-container').innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Error loading quizzes: ${error.message}
                </div>
            </div>
        `;
    }
}

// Load general quizzes (requiresModuleCompletion: false)
async function loadGeneralQuizzes() {
    try {
        const container = document.getElementById('general-quizzes-container');
        container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-success"></div><p>Loading general quizzes...</p></div>';
        
        // Get all quizzes for teacher's school
    const response = await apiCall('/quizzes');
    allQuizzes = response.data;
        
        // Filter for general quizzes (requiresModuleCompletion: false) from teacher's school
        const generalQuizzes = allQuizzes.filter(quiz => 
            quiz.requiresModuleCompletion === false && 
            quiz.school === currentTeacher.school
        );
        
        if (generalQuizzes.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-question-circle fa-3x text-muted mb-3"></i>
                    <h4>No general quizzes created yet</h4>
                    <p class="text-muted">Create your first general quiz to get started</p>
                </div>
            `;
            return;
        }

        let html = '';
        
        generalQuizzes.forEach(quiz => {
            html += `
                <div class="col-md-6 mb-4">
                    <div class="card quiz-card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <h5 class="card-title">${quiz.title}</h5>
                                <span class="badge ${quiz.isActive ? 'bg-success' : 'bg-secondary'}">
                                    ${quiz.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p class="card-text">${quiz.description || 'No description'}</p>
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <span class="badge bg-info">General Quiz</span>
                                <span class="badge bg-warning">${quiz.totalPoints} points</span>
                                <span class="badge bg-primary">${quiz.questions.length} Qs</span>
                            </div>
                            <div class="btn-group w-100">
                                <button class="btn btn-outline-primary btn-sm" onclick="editGeneralQuiz('${quiz._id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-outline-secondary btn-sm" onclick="toggleQuizStatus('${quiz._id}')">
                                    ${quiz.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="deleteQuiz('${quiz._id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading general quizzes:', error);
        document.getElementById('general-quizzes-container').innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Error loading general quizzes: ${error.message}
                </div>
            </div>
        `;
    }
}


// Create general quiz
async function saveGeneralQuiz() {
    const quizId = document.getElementById('generalQuizId').value;
    
    // Collect questions data
    const questions = [];
    const questionItems = document.querySelectorAll('#general-questions-container .question-item');
    
    questionItems.forEach(item => {
        const options = item.querySelector('.question-options').value.split('\n')
            .map(opt => opt.trim())
            .filter(opt => opt !== '');
        
        questions.push({
            question: item.querySelector('.question-text').value,
            options: options,
            correctAnswer: parseInt(item.querySelector('.correct-answer').value) - 1, // Convert to 0-based index
            points: parseInt(item.querySelector('.question-points').value)
        });
    });
    
    const quizData = {
        title: document.getElementById('generalQuizTitle').value,
        description: document.getElementById('generalQuizDescription').value,
        timeLimit: parseInt(document.getElementById('generalQuizTimeLimit').value),
        requiresModuleCompletion: false, // General quizzes don't require module completion
        questions: questions,
        school: currentTeacher.school
    };

    try {
        if (quizId) {
            // Update existing quiz
            await apiCall(`/quizzes/${quizId}`, {
                method: 'PUT',
                body: quizData
            });
        } else {
            // Create new general quiz
            await apiCall('/quizzes', {
                method: 'POST',
                body: quizData
            });
        }

        // Close modal and refresh list
        bootstrap.Modal.getInstance(document.getElementById('generalQuizModal')).hide();
        await loadGeneralQuizzes();
        
    } catch (error) {
        alert('Error saving general quiz: ' + error.message);
    }
}

// Update the loadTeacherQuizzes function to load both types
async function loadTeacherQuizzes() {
    if (!checkTeacher()) {
        window.location.href = 'login.html';
        return;
    }
    
    currentTeacher = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
        // Load modules for quiz creation
        await loadTeacherModules();
        
        // Load both types of quizzes
        await loadModuleQuizzes();
        await loadGeneralQuizzes();
        
    } catch (error) {
        console.error('Error loading quizzes:', error);
    }
}

// Add event listener for general quiz creation
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Add event listener for general quiz save button
    document.getElementById('saveGeneralQuizBtn').addEventListener('click', saveGeneralQuiz);
    
    // Add event listener for general quiz add question button
    document.getElementById('add-general-question-btn').addEventListener('click', function() {
        addGeneralQuestion();
    });
    
    // ... rest of existing code ...
});

// Function to add question to general quiz form
function addGeneralQuestion(questionData = {}) {
    const container = document.getElementById('general-questions-container');
    const questionCount = container.children.length;
    
    const questionHtml = `
        <div class="question-item">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">Question ${questionCount + 1}</h6>
                <button type="button" class="btn btn-sm btn-outline-danger remove-question">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mb-3">
                <label class="form-label">Question Text</label>
                <input type="text" class="form-control question-text" 
                       value="${questionData.question || ''}" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Options (one per line)</label>
                <textarea class="form-control question-options" rows="3" 
                          placeholder="Option 1&#10;Option 2&#10;Option 3&#10;Option 4" required>${questionData.options ? questionData.options.join('\n') : ''}</textarea>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Correct Answer (option number 1-4)</label>
                        <input type="number" class="form-control correct-answer" 
                               value="${questionData.correctAnswer !== undefined ? questionData.correctAnswer + 1 : 1}" 
                               min="1" max="4" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Points</label>
                        <input type="number" class="form-control question-points" 
                               value="${questionData.points || 10}" required>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', questionHtml);
    
    // Add event listener to remove button
    const newQuestion = container.lastElementChild;
    newQuestion.querySelector('.remove-question').addEventListener('click', function() {
        newQuestion.remove();
        renumberGeneralQuestions();
    });
}

// Renumber questions for general quiz
function renumberGeneralQuestions() {
    const questions = document.querySelectorAll('#general-questions-container .question-item');
    questions.forEach((question, index) => {
        question.querySelector('h6').textContent = `Question ${index + 1}`;
    });
}
// Add question to quiz form
function addQuestion() {
    const container = document.getElementById('questions-container');
    const questionCount = container.children.length;
    
    const questionHtml = `
        <div class="question-item">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">Question ${questionCount + 1}</h6>
                <button type="button" class="btn btn-sm btn-outline-danger remove-question">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mb-3">
                <label class="form-label">Question Text</label>
                <input type="text" class="form-control question-text" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Options (one per line)</label>
                <textarea class="form-control question-options" rows="3" placeholder="Option 1&#10;Option 2&#10;Option 3&#10;Option 4" required></textarea>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Correct Answer (option number)</label>
                        <input type="number" class="form-control correct-answer" min="1" max="4" value="1" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Points</label>
                        <input type="number" class="form-control question-points" value="10" required>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', questionHtml);
    
    // Add event listener to remove button
    const newQuestion = container.lastElementChild;
    newQuestion.querySelector('.remove-question').addEventListener('click', function() {
        newQuestion.remove();
        renumberQuestions();
    });
}

// Renumber questions after removal
function renumberQuestions() {
    const questions = document.querySelectorAll('.question-item');
    questions.forEach((question, index) => {
        question.querySelector('h6').textContent = `Question ${index + 1}`;
    });
}
// Edit quiz
function editQuiz(quizId) {
    const quiz = allQuizzes.find(q => q._id === quizId);
    if (!quiz) return;

    document.getElementById('quizId').value = quiz._id;
    document.getElementById('quizTitle').value = quiz.title;
    document.getElementById('quizDescription').value = quiz.description || '';
    document.getElementById('quizModule').value = quiz.module;
    document.getElementById('quizTimeLimit').value = quiz.timeLimit;
    document.getElementById('requiresModuleCompletion').checked = quiz.requiresModuleCompletion !== false;

    document.getElementById('quizModalTitle').textContent = 'Edit Quiz';

    // Clear existing questions
    document.getElementById('questions-container').innerHTML = '';

    // Add questions
    quiz.questions.forEach((question, index) => {
        addQuestion();
        const lastQuestion = document.getElementById('questions-container').lastElementChild;
        lastQuestion.querySelector('.question-text').value = question.question;
        lastQuestion.querySelector('.question-options').value = question.options.join('\n');
        lastQuestion.querySelector('.correct-answer').value = question.correctAnswer + 1; // Convert to 1-based
        lastQuestion.querySelector('.question-points').value = question.points;
    });

    const modal = new bootstrap.Modal(document.getElementById('quizModal'));
    modal.show();
}

// Edit general quiz
function editGeneralQuiz(quizId) {
    const quiz = allQuizzes.find(q => q._id === quizId);
    if (!quiz) return;

    document.getElementById('generalQuizId').value = quiz._id;
    document.getElementById('generalQuizTitle').value = quiz.title;
    document.getElementById('generalQuizDescription').value = quiz.description || '';
    document.getElementById('generalQuizTimeLimit').value = quiz.timeLimit;

    document.getElementById('generalQuizModalTitle').textContent = 'Edit General Quiz';

    // Clear existing questions
    document.getElementById('general-questions-container').innerHTML = '';

    // Add questions
    quiz.questions.forEach((question, index) => {
        addGeneralQuestion();
        const lastQuestion = document.getElementById('general-questions-container').lastElementChild;
        lastQuestion.querySelector('.question-text').value = question.question;
        lastQuestion.querySelector('.question-options').value = question.options.join('\n');
        lastQuestion.querySelector('.correct-answer').value = question.correctAnswer + 1; // Convert to 1-based
        lastQuestion.querySelector('.question-points').value = question.points;
    });

    const modal = new bootstrap.Modal(document.getElementById('generalQuizModal'));
    modal.show();
}

// Toggle quiz status
async function toggleQuizStatus(quizId) {
    try {
        await apiCall(`/quizzes/${quizId}/toggle`, {
            method: 'PUT'
        });
        // Reload both module and general quizzes since we don't know which type this quiz is
        await loadModuleQuizzes();
        await loadGeneralQuizzes();
    } catch (error) {
        alert('Error updating quiz status: ' + error.message);
    }
}

// Delete quiz
async function deleteQuiz(quizId) {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
        return;
    }

    try {
        await apiCall(`/quizzes/${quizId}`, {
            method: 'DELETE'
        });
        // Reload both module and general quizzes since we don't know which type this quiz is
        await loadModuleQuizzes();
        await loadGeneralQuizzes();
    } catch (error) {
        alert('Error deleting quiz: ' + error.message);
    }
}

// Load daily question
async function loadDailyQuestion() {
    try {
        // Populate quiz select for daily question
        const quizSelect = document.getElementById('daily-quiz-select');
        quizSelect.innerHTML = '<option value="">Choose a quiz...</option>';
        
        allQuizzes.forEach(quiz => {
            const option = document.createElement('option');
            option.value = quiz._id;
            option.textContent = `${quiz.title} (${quiz.questions.length} questions)`;
            quizSelect.appendChild(option);
        });
        
        // Load current daily question
        const response = await apiCall('/quizzes/daily');
        if (response.success && response.data) {
            document.getElementById('current-daily-quiz').innerHTML = `
                <h6>${response.data.question}</h6>
                <p><strong>Options:</strong></p>
                <ul>
                    ${response.data.options.map((opt, idx) => `<li>${String.fromCharCode(65 + idx)}. ${opt}</li>`).join('')}
                </ul>
                <p class="mb-0"><strong>Points:</strong> ${response.data.points}</p>
            `;
        }
        
    } catch (error) {
        console.error('Error loading daily question:', error);
    }
}

// Set daily question
async function setDailyQuestion() {
    const quizId = document.getElementById('daily-quiz-select').value;
    if (!quizId) {
        alert('Please select a quiz first');
        return;
    }

    try {
        await apiCall(`/quizzes/${quizId}/daily`, {
            method: 'POST'
        });
        alert('Daily question set successfully!');
        await loadDailyQuestion();
    } catch (error) {
        alert('Error setting daily question: ' + error.message);
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    if (!checkTeacher()) {
        alert('Teacher access required. Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }

    loadTeacherQuizzes();

    // Set up event listeners
    document.getElementById('add-question-btn').addEventListener('click', addQuestion);
    document.getElementById('saveQuizBtn').addEventListener('click', saveQuiz);
    document.getElementById('set-daily-quiz-btn').addEventListener('click', setDailyQuestion);

    // Add initial question
    addQuestion();

    // Reset modal when hidden
    document.getElementById('quizModal').addEventListener('hidden.bs.modal', function() {
        document.getElementById('quizForm').reset();
        document.getElementById('quizId').value = '';
        document.getElementById('questions-container').innerHTML = '';
        document.getElementById('quizModalTitle').textContent = 'Create New Quiz';
        addQuestion(); // Add one initial question
    });

    // Reset general quiz modal when hidden
    document.getElementById('generalQuizModal').addEventListener('hidden.bs.modal', function() {
        document.getElementById('generalQuizForm').reset();
        document.getElementById('generalQuizId').value = '';
        document.getElementById('general-questions-container').innerHTML = '';
        document.getElementById('generalQuizModalTitle').textContent = 'Create General Quiz';
        addGeneralQuestion(); // Add one initial question
    });

    // Handle remove question events using event delegation
    document.getElementById('questions-container').addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-question')) {
            e.target.closest('.question-item').remove();
            renumberQuestions();
        }
    });

    updateUIForLoginStatus();
});