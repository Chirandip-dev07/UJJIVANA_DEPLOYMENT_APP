// Admin JavaScript for Ujjivana
let allModules = [];
let allQuizzes = [];
let currentEditingModule = null;
let currentEditingQuiz = null;

// Check if user is admin
function checkAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// Load admin data
async function loadAdminData() {
  if (!checkAdmin()) {
    alert('Admin access required. Redirecting to home page.');
    window.location.href = 'index.html';
    return;
  }
  
  try {
    await loadModules();
    await loadQuizzes();
    await loadChallenges();
    await loadQuizzesForDailyQuestion();
    await loadCurrentDailyQuiz();
    updateStats();
  } catch (error) {
    console.error('Error loading admin data:', error);
  }
}

// Load modules for admin
async function loadModules() {
  try {
    console.log('Loading modules for admin...');
    const response = await apiCall('/modules/teacher/list');
    allModules = response.data;
    console.log(`Loaded ${allModules.length} modules`);
    displayModules();
    
    // Update module dropdown for quizzes
    const moduleSelect = document.getElementById('quiz-module');
    if (moduleSelect) {
      moduleSelect.innerHTML = '<option value="">Select Module</option>';
      allModules.forEach(module => {
        const option = document.createElement('option');
        option.value = module._id;
        option.textContent = module.title;
        moduleSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading modules:', error);
    document.getElementById('modules-container').innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">
          Error loading modules: ${error.message}
        </div>
      </div>
    `;
  }
}
// Load quizzes for admin
async function loadQuizzes() {
  try {
    // Use endpoint that gets all quizzes without school filter
    const response = await apiCall('/quizzes?all=true');
    allQuizzes = response.data;
    displayQuizzes();
    
    const dailyQuizSelect = document.getElementById('daily-quiz-select');
    dailyQuizSelect.innerHTML = '<option value="">Choose a quiz...</option>';
    allQuizzes.forEach(quiz => {
      const option = document.createElement('option');
      option.value = quiz._id;
      option.textContent = `${quiz.title} (${quiz.questions?.length || 0} questions)`;
      dailyQuizSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading quizzes:', error);
    document.getElementById('quizzes-container').innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">
          Error loading quizzes. Please try again later.
        </div>
      </div>
    `;
  }
}

// Load daily quiz info
async function loadDailyQuiz() {
    try {
        const response = await apiCall('/quizzes/daily');
        const dailyQuiz = response.data;
        
        document.getElementById('current-daily-quiz').innerHTML = `
            <strong>${dailyQuiz.question}</strong><br>
            Options: ${dailyQuiz.options.join(', ')}<br>
            Points: ${dailyQuiz.points}
        `;
    } catch (error) {
        console.error('Error loading daily quiz:', error);
        document.getElementById('current-daily-quiz').innerHTML = `
            <div class="text-danger">Error loading current daily quiz</div>
        `;
    }
}

// Update admin statistics
function updateStats() {
  const totalModules = allModules.length;
  const activeModules = allModules.filter(m => m.isActive).length;
  const totalQuizzes = allQuizzes.length;
  const activeQuizzes = allQuizzes.filter(q => q.isActive).length;
  const totalChallenges = allChallenges.length;
  const activeChallenges = allChallenges.filter(c => c.isActive).length;

  document.getElementById('total-modules').textContent = totalModules;
  document.getElementById('active-modules').textContent = activeModules;
  document.getElementById('total-quizzes').textContent = totalQuizzes;
  document.getElementById('active-quizzes').textContent = activeQuizzes;
  document.getElementById('total-challenges').textContent = totalChallenges;
  document.getElementById('active-challenges').textContent = activeChallenges;
}

// Display modules in admin panel
function displayModules() {
    const modulesContainer = document.getElementById('modules-container');
    
    if (allModules.length === 0) {
        modulesContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    No modules found. Create your first module!
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    allModules.forEach(module => {
        html += `
            <div class="col-md-6 mb-4">
                <div class="module-card card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h5 class="card-title">${module.title}</h5>
                                <p class="card-text">${module.description}</p>
                                <span class="badge ${module.isActive ? 'bg-success' : 'bg-secondary'}">
                                    ${module.isActive ? 'Published' : 'Draft'}
                                </span>
                                <span class="badge bg-info ms-1">${module.lessons.length} lessons</span>
                                <span class="badge bg-primary ms-1">${module.points} points</span>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-outline-primary edit-module" data-id="${module._id}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-secondary toggle-module" data-id="${module._id}">
                                ${module.isActive ? 'Unpublish' : 'Publish'}
                            </button>
                            <button class="btn btn-sm btn-danger delete-module" data-id="${module._id}">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    modulesContainer.innerHTML = html;
    
    // Add event listeners
    document.querySelectorAll('.edit-module').forEach(button => {
        button.addEventListener('click', () => editModule(button.dataset.id));
    });
    
    document.querySelectorAll('.toggle-module').forEach(button => {
        button.addEventListener('click', () => toggleModuleStatus(button.dataset.id));
    });
    
    document.querySelectorAll('.delete-module').forEach(button => {
        button.addEventListener('click', () => deleteModule(button.dataset.id));
    });
}

// Display quizzes in admin panel
function displayQuizzes() {
  const quizzesContainer = document.getElementById('quizzes-container');
  if (allQuizzes.length === 0) {
    quizzesContainer.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info">
          No quizzes found. Create your first quiz!
        </div>
      </div>
    `;
    return;
  }

  let html = '';
  allQuizzes.forEach(quiz => {
    // Get module title - handle cases where module might not be populated or doesn't exist
    let moduleTitle = 'General Quiz'; // Default for quizzes without modules
    
    if (quiz.module) {
      if (typeof quiz.module === 'object' && quiz.module.title) {
        // Module is populated as an object
        moduleTitle = quiz.module.title;
      } else if (typeof quiz.module === 'string') {
        // Module is just an ID, try to find it in allModules
        const module = allModules.find(m => m._id === quiz.module);
        moduleTitle = module ? module.title : 'Module Not Found';
      }
    }

    html += `
      <div class="col-md-6 mb-4">
        <div class="quiz-card card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h5 class="card-title">${quiz.title}</h5>
                <p class="card-text">${quiz.description || 'No description'}</p>
                <span class="badge bg-info">Module: ${moduleTitle}</span>
                <span class="badge bg-primary ms-1">${quiz.questions.length} questions</span>
                <span class="badge bg-success ms-1">${quiz.totalPoints} points</span>
                <span class="badge ${quiz.isActive ? 'bg-success' : 'bg-secondary'} ms-1">
                  ${quiz.isActive ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <div class="action-buttons">
              <button class="btn btn-sm btn-outline-primary edit-quiz" data-id="${quiz._id}">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn btn-sm btn-outline-secondary toggle-quiz" data-id="${quiz._id}">
                ${quiz.isActive ? 'Unpublish' : 'Publish'}
              </button>
              <button class="btn btn-sm btn-danger delete-quiz" data-id="${quiz._id}">
                <i class="fas fa-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  quizzesContainer.innerHTML = html;

  // Re-attach event listeners
  document.querySelectorAll('.edit-quiz').forEach(button => {
    button.addEventListener('click', () => editQuiz(button.dataset.id));
  });
  document.querySelectorAll('.toggle-quiz').forEach(button => {
    button.addEventListener('click', () => toggleQuizStatus(button.dataset.id));
  });
  document.querySelectorAll('.delete-quiz').forEach(button => {
    button.addEventListener('click', () => deleteQuiz(button.dataset.id));
  });
}

// Edit module
function editModule(moduleId) {
    const module = allModules.find(m => m._id === moduleId);
    if (!module) return;
    
    currentEditingModule = module;
    
    // Populate form
    document.getElementById('module-id').value = module._id;
    document.getElementById('module-title').value = module.title;
    document.getElementById('module-description').value = module.description;
    document.getElementById('module-category').value = module.category;
    document.getElementById('module-estimated-time').value = module.estimatedTime;
    document.getElementById('module-points').value = module.points;
    document.getElementById('module-badge').value = module.badge || '';
    document.getElementById('module-active').checked = module.isActive;
    
    // Populate lessons
    const lessonsContainer = document.getElementById('lessons-container');
    lessonsContainer.innerHTML = '';
    
    module.lessons.forEach((lesson, index) => {
        addLessonField(lesson.title, lesson.content, lesson.duration, lesson.order || index + 1);
    });
    
    // Update modal title
    document.getElementById('moduleModalTitle').textContent = 'Edit Module';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('moduleModal'));
    modal.show();
}

// Toggle module status
async function toggleModuleStatus(moduleId) {
  try {
    const response = await apiCall(`/admin/modules/${moduleId}/toggle`, {
      method: 'PUT'
    });
    alert(response.message);
    loadModules();
  } catch (error) {
    console.error('Error toggling module status:', error);
    alert('Error updating module status: ' + error.message);
  }
}

// Delete module
async function deleteModule(moduleId) {
  if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await apiCall(`/admin/modules/${moduleId}`, {
      method: 'DELETE'
    });
    alert('Module deleted successfully!');
    loadModules();
  } catch (error) {
    console.error('Error deleting module:', error);
    alert('Error deleting module: ' + error.message);
  }
}

// Edit quiz
function editQuiz(quizId) {
    const quiz = allQuizzes.find(q => q._id === quizId);
    if (!quiz) return;
    
    currentEditingQuiz = quiz;
    
    // Populate form
    document.getElementById('quiz-id').value = quiz._id;
    document.getElementById('quiz-title').value = quiz.title;
    document.getElementById('quiz-description').value = quiz.description || '';
    document.getElementById('quiz-module').value = quiz.module;
    document.getElementById('quiz-time-limit').value = quiz.timeLimit || 10;
    document.getElementById('quiz-requires-completion').checked = quiz.requiresModuleCompletion !== false;
    document.getElementById('quiz-active').checked = quiz.isActive;
    
    // Populate questions
    const questionsContainer = document.getElementById('questions-container');
    questionsContainer.innerHTML = '';
    
    quiz.questions.forEach((question, index) => {
        addQuestionField(
            question.question, 
            question.options.join(','), 
            question.correctAnswer, 
            question.points
        );
    });
    
    // Update modal title
    document.getElementById('quizModalTitle').textContent = 'Edit Quiz';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('quizModal'));
    modal.show();
}

// Toggle quiz status
async function toggleQuizStatus(quizId) {
  try {
    const response = await apiCall(`/admin/quizzes/${quizId}/toggle`, {
      method: 'PUT'
    });
    alert(response.message);
    loadQuizzes();
  } catch (error) {
    console.error('Error toggling quiz status:', error);
    alert('Error updating quiz status: ' + error.message);
  }
}

// Delete quiz
async function deleteQuiz(quizId) {
  if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
    return;
  }
  
  try {
    const response = await apiCall(`/admin/quizzes/${quizId}`, {
      method: 'DELETE'
    });
    alert('Quiz deleted successfully!');
    loadQuizzes();
  } catch (error) {
    console.error('Error deleting quiz:', error);
    alert('Error deleting quiz: ' + error.message);
  }
}

// Set daily quiz
async function setDailyQuiz() {
    const quizId = document.getElementById('daily-quiz-select').value;
    
    if (!quizId) {
        alert('Please select a quiz');
        return;
    }
    
    try {
        const response = await apiCall(`/quizzes/${quizId}/daily`, {
            method: 'POST'
        });
        
        alert('Daily quiz set successfully!');
        loadDailyQuiz();
    } catch (error) {
        console.error('Error setting daily quiz:', error);
        alert('Error setting daily quiz: ' + error.message);
    }
}

// Save module
async function saveModule() {
    // Collect lesson data
    const lessons = [];
    const lessonItems = document.querySelectorAll('.lesson-item');
    
    lessonItems.forEach(item => {
        lessons.push({
            title: item.querySelector('.lesson-title').value,
            content: item.querySelector('.lesson-content').value,
            duration: parseInt(item.querySelector('.lesson-duration').value),
            order: parseInt(item.querySelector('.lesson-order').value)
        });
    });
    
    // Prepare module data
    const moduleData = {
        title: document.getElementById('module-title').value,
        description: document.getElementById('module-description').value,
        category: document.getElementById('module-category').value,
        estimatedTime: parseInt(document.getElementById('module-estimated-time').value),
        points: parseInt(document.getElementById('module-points').value),
        badge: document.getElementById('module-badge').value || undefined,
        isActive: document.getElementById('module-active').checked,
        lessons: lessons
    };
    
    const moduleId = document.getElementById('module-id').value;
    
    try {
        if (moduleId) {
            // Update existing module
            const response = await apiCall(`/modules/${moduleId}`, {
                method: 'PUT',
                body: moduleData
            });
            alert('Module updated successfully!');
        } else {
            // Create new module
            const response = await apiCall('/modules', {
                method: 'POST',
                body: moduleData
            });
            alert('Module created successfully!');
        }
        
        // Close modal and refresh
        const modal = bootstrap.Modal.getInstance(document.getElementById('moduleModal'));
        modal.hide();
        loadModules();
    } catch (error) {
        console.error('Error saving module:', error);
        alert('Error saving module: ' + error.message);
    }
}

// Save quiz
async function saveQuiz() {
    // Collect question data
    const questions = [];
    const questionItems = document.querySelectorAll('.question-item');
    
    questionItems.forEach(item => {
        const options = item.querySelector('.question-options').value.split(',').map(opt => opt.trim());
        
        questions.push({
            question: item.querySelector('.question-text').value,
            options: options,
            correctAnswer: parseInt(item.querySelector('.question-answer').value),
            points: parseInt(item.querySelector('.question-points').value)
        });
    });
    
    // Prepare quiz data
    const quizData = {
        title: document.getElementById('quiz-title').value,
        description: document.getElementById('quiz-description').value,
        module: document.getElementById('quiz-module').value,
        timeLimit: parseInt(document.getElementById('quiz-time-limit').value),
        requiresModuleCompletion: document.getElementById('quiz-requires-completion').checked,
        isActive: document.getElementById('quiz-active').checked,
        questions: questions
    };
    
    const quizId = document.getElementById('quiz-id').value;
    
    try {
        if (quizId) {
            // Update existing quiz
            const response = await apiCall(`/quizzes/${quizId}`, {
                method: 'PUT',
                body: quizData
            });
            alert('Quiz updated successfully!');
        } else {
            // Create new quiz
            const response = await apiCall(`/quizzes/module/${quizData.module}`, {
                method: 'POST',
                body: quizData
            });
            alert('Quiz created successfully!');
        }
        
        // Close modal and refresh
        const modal = bootstrap.Modal.getInstance(document.getElementById('quizModal'));
        modal.hide();
        loadQuizzes();
    } catch (error) {
        console.error('Error saving quiz:', error);
        alert('Error saving quiz: ' + error.message);
    }
}

// Add lesson field
function addLessonField(title = '', content = '', duration = '', order = '') {
    const lessonsContainer = document.getElementById('lessons-container');
    const lessonCount = lessonsContainer.children.length + 1;
    
    const lessonHtml = `
        <div class="lesson-item card mb-3">
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">Lesson Title</label>
                    <input type="text" class="form-control lesson-title" value="${title}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Lesson Content</label>
                    <textarea class="form-control lesson-content" rows="3" required>${content}</textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">Duration (minutes)</label>
                    <input type="number" class="form-control lesson-duration" value="${duration}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Order</label>
                    <input type="number" class="form-control lesson-order" value="${order || lessonCount}" required>
                </div>
                <button type="button" class="btn btn-danger btn-sm remove-lesson">
                    <i class="fas fa-trash"></i> Remove Lesson
                </button>
            </div>
        </div>
    `;
    
    lessonsContainer.insertAdjacentHTML('beforeend', lessonHtml);
}

// Add question field
function addQuestionField(question = '', options = '', answer = '', points = '') {
    const questionsContainer = document.getElementById('questions-container');
    const questionCount = questionsContainer.children.length;
    
    const questionHtml = `
        <div class="question-item card mb-3">
            <div class="card-body">
                <div class="mb-3">
                    <label class="form-label">Question</label>
                    <input type="text" class="form-control question-text" value="${question}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Options (separate with commas)</label>
                    <input type="text" class="form-control question-options" value="${options}" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Correct Answer Index (0-based)</label>
                    <input type="number" class="form-control question-answer" value="${answer}" min="0" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Points</label>
                    <input type="number" class="form-control question-points" value="${points || 10}" required>
                </div>
                <button type="button" class="btn btn-danger btn-sm remove-question">
                    <i class="fas fa-trash"></i> Remove Question
                </button>
            </div>
        </div>
    `;
    
    questionsContainer.insertAdjacentHTML('beforeend', questionHtml);
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Load admin data
    loadAdminData();
    
    // Add event listeners
    document.getElementById('add-lesson').addEventListener('click', () => addLessonField());
    document.getElementById('add-question').addEventListener('click', () => addQuestionField());
    document.getElementById('save-module').addEventListener('click', saveModule);
    document.getElementById('save-quiz').addEventListener('click', saveQuiz);
    document.getElementById('set-daily-quiz').addEventListener('click', setDailyQuiz);
    document.getElementById('set-daily-quiz').addEventListener('click', setDailyQuizFromExisting);
    document.getElementById('create-general-quiz').addEventListener('click', createAndSetGeneralQuiz);
    document.getElementById('save-challenge-btn').addEventListener('click', saveChallenge);
  
  document.getElementById('challengeModal').addEventListener('hidden.bs.modal', function() {
    document.getElementById('challenge-form').reset();
    document.getElementById('challenge-id').value = '';
    document.getElementById('challengeModalTitle').textContent = 'Add New Challenge';
    currentEditingChallenge = null;
    });
    
    // Delegate event for remove lesson buttons
    document.getElementById('lessons-container').addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-lesson')) {
            e.target.closest('.lesson-item').remove();
        }
    });
    
    // Delegate event for remove question buttons
    document.getElementById('questions-container').addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-question')) {
            e.target.closest('.question-item').remove();
        }
    });
    
    // Reset form when modal is closed
    document.getElementById('moduleModal').addEventListener('hidden.bs.modal', function() {
        document.getElementById('module-form').reset();
        document.getElementById('module-id').value = '';
        document.getElementById('lessons-container').innerHTML = '';
        addLessonField();
        document.getElementById('moduleModalTitle').textContent = 'Add New Module';
        currentEditingModule = null;
    });
    
    document.getElementById('quizModal').addEventListener('hidden.bs.modal', function() {
        document.getElementById('quiz-form').reset();
        document.getElementById('quiz-id').value = '';
        document.getElementById('questions-container').innerHTML = '';
        addQuestionField();
        document.getElementById('quizModalTitle').textContent = 'Add New Quiz';
        currentEditingQuiz = null;
    });
    
    // Update UI based on login status
    updateUIForLoginStatus();
});
async function loadDailyQuizData() {
  await loadQuizzesForDailyQuestion();
  await loadCurrentDailyQuiz();
}

async function loadQuizzesForDailyQuestion() {
  try {
    const response = await apiCall('/quizzes?all=true');
    const quizzes = response.data;
    
    const dailyQuizSelect = document.getElementById('daily-quiz-select');
    if (dailyQuizSelect) {
      dailyQuizSelect.innerHTML = '<option value="">Choose a quiz...</option>';
      
      quizzes.forEach(quiz => {
        // Only show quizzes that have at least one question
        if (quiz.questions && quiz.questions.length > 0) {
          const option = document.createElement('option');
          option.value = quiz._id;
          const questionCount = quiz.questions.length;
          // Removed the "(Current Daily)" text
          option.textContent = `${quiz.title} - ${questionCount} question(s)`;
          dailyQuizSelect.appendChild(option);
        }
      });
      
      // If no quizzes found, show message
      if (quizzes.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No quizzes available";
        dailyQuizSelect.appendChild(option);
      }
    }
  } catch (error) {
    console.error('Error loading quizzes for daily question:', error);
    const dailyQuizSelect = document.getElementById('daily-quiz-select');
    if (dailyQuizSelect) {
      dailyQuizSelect.innerHTML = '<option value="">Error loading quizzes</option>';
    }
  }
}
async function loadCurrentDailyQuiz() {
  try {
    const response = await apiCall('/quizzes/daily');
    const dailyQuiz = response.data;
    
    const container = document.getElementById('current-daily-quiz');
    if (container) {
      container.innerHTML = `
        <div class="mb-2">
          <strong>Question:</strong> ${dailyQuiz.question}
        </div>
        <div class="mb-2">
          <strong>Options:</strong> ${dailyQuiz.options.join(', ')}
        </div>
        <div class="mb-2">
          <strong>Points:</strong> ${dailyQuiz.points}
        </div>
        <div>
          <small class="text-muted">Quiz ID: ${dailyQuiz.quizId}</small>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading current daily quiz:', error);
    const container = document.getElementById('current-daily-quiz');
    if (container) {
      container.innerHTML = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i> 
          No daily question set for today. Please set one using the options above.
        </div>
      `;
    }
  }
}
async function setDailyQuizFromExisting() {
  const quizId = document.getElementById('daily-quiz-select').value;
  if (!quizId) {
    alert('Please select a quiz');
    return;
  }
  
  try {
    console.log(`Setting quiz ${quizId} as daily question...`);
    
    const response = await apiCall(`/quizzes/${quizId}/daily`, {
      method: 'POST'
    });
    
    alert('Daily quiz set successfully!');
    
    // Reload the current daily quiz display
    await loadCurrentDailyQuiz();
    
    // Also reload the quizzes dropdown to reflect any changes
    await loadQuizzesForDailyQuestion();
    
  } catch (error) {
    console.error('Error setting daily quiz:', error);
    alert('Error setting daily quiz: ' + (error.message || 'Please try again.'));
  }
}

async function createAndSetGeneralQuiz() {
  const title = document.getElementById('general-quiz-title').value;
  const question = document.getElementById('general-quiz-question').value;
  const options = document.getElementById('general-quiz-options').value;
  const answer = parseInt(document.getElementById('general-quiz-answer').value);
  const points = parseInt(document.getElementById('general-quiz-points').value);
  
  if (!title || !question || !options) {
    alert('Please fill in all required fields');
    return;
  }
  
  const optionsArray = options.split(',').map(opt => opt.trim()).filter(opt => opt);
  if (optionsArray.length < 2) {
    alert('Please provide at least 2 options');
    return;
  }
  
  if (answer < 0 || answer >= optionsArray.length) {
    alert(`Correct answer index must be between 0 and ${optionsArray.length - 1}`);
    return;
  }
  
  try {
    const quizData = {
      title: title,
      description: 'Daily question quiz',
      questions: [{
        question: question,
        options: optionsArray,
        correctAnswer: answer,
        points: points
      }],
      isDailyQuestion: true,
      requiresModuleCompletion: false
    };
    
    const response = await apiCall('/quizzes', {
      method: 'POST',
      body: quizData
    });
    
    alert('General quiz created and set as daily question successfully!');
    
    // Reset form
    document.getElementById('general-quiz-title').value = '';
    document.getElementById('general-quiz-question').value = '';
    document.getElementById('general-quiz-options').value = '';
    document.getElementById('general-quiz-answer').value = '0';
    document.getElementById('general-quiz-points').value = '10';
    
    await loadCurrentDailyQuiz();
    await loadQuizzesForDailyQuestion();
  } catch (error) {
    console.error('Error creating general quiz:', error);
    alert('Error creating general quiz: ' + error.message);
  }
}
let allChallenges = [];
let currentEditingChallenge = null;

// Load challenges for admin
async function loadChallenges() {
  try {
    // Show loading state
    const container = document.getElementById('challenges-container');
    container.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Loading challenges...</span>
        </div>
        <p class="mt-2">Loading challenges...</p>
      </div>
    `;

    // Simple API call without filters
    const response = await apiCall('/challenges/admin/all');
    allChallenges = response.data;
    console.log(`Loaded ${allChallenges.length} challenges`);
    
    displayChallenges();
  } catch (error) {
    console.error('Error loading challenges:', error);
    
    // If admin route fails, try the regular route
    try {
      console.log('Trying regular challenges route...');
      const response = await apiCall('/challenges');
      allChallenges = response.data;
      console.log(`Loaded ${allChallenges.length} challenges from regular route`);
      displayChallenges();
    } catch (fallbackError) {
      console.error('Error loading challenges from fallback route:', fallbackError);
      document.getElementById('challenges-container').innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Error loading challenges. Please try again later.
        </div>
      `;
    }
  }
}
function displayChallenges() {
  const container = document.getElementById('challenges-container');
  
  if (allChallenges.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info text-center">
        <i class="fas fa-info-circle me-2"></i>
        No challenges found.
      </div>
    `;
    return;
  }

  let html = '';
  allChallenges.forEach(challenge => {
    const startDate = new Date(challenge.startDate).toLocaleDateString();
    const endDate = challenge.endDate ? new Date(challenge.endDate).toLocaleDateString() : 'Not set';
    const participants = challenge.participants ? challenge.participants.length : 0;
    const createdBy = challenge.createdBy?.name || 'Unknown';
    const createdById = challenge.createdBy?._id || challenge.createdBy || 'Unknown';
    
    html += `
      <div class="card challenge-card mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
              <div class="d-flex align-items-center mb-2">
                <h5 class="card-title mb-0 me-3">${challenge.title}</h5>
                <span class="badge bg-${getChallengeCategoryColor(challenge.category)}">
                  ${formatChallengeCategory(challenge.category)}
                </span>
                <span class="badge ${challenge.isActive ? 'bg-success' : 'bg-secondary'} ms-2">
                  ${challenge.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p class="card-text">${challenge.description}</p>
              <div class="row text-muted small">
                <div class="col-md-3">
                  <strong>Points:</strong> ${challenge.pointsReward}
                </div>
                <div class="col-md-3">
                  <strong>Duration:</strong> ${challenge.duration} days
                </div>
                <div class="col-md-3">
                  <strong>Participants:</strong> ${participants}
                </div>
                <div class="col-md-3">
                  <strong>Created by:</strong> ${createdBy}
                </div>
              </div>
              <div class="row text-muted small mt-2">
                <div class="col-md-6">
                  <strong>Start:</strong> ${startDate}
                </div>
                <div class="col-md-6">
                  <strong>End:</strong> ${endDate}
                </div>
              </div>
              <div class="mt-2">
                <small class="text-muted">
                  <strong>Target:</strong> ${challenge.completionCriteria.target} ${getTargetUnit(challenge.completionCriteria.type)}
                  (${formatCompletionType(challenge.completionCriteria.type)})
                </small>
              </div>
              <div class="mt-1">
                <small class="text-muted">
                  <strong>Challenge ID:</strong> ${challenge._id}
                </small>
              </div>
              <div class="mt-1">
                <small class="text-muted">
                  <strong>Creator ID:</strong> ${createdById}
                </small>
              </div>
            </div>
            <div class="action-buttons ms-3">
              <button class="btn btn-sm btn-outline-primary mb-1" onclick="editChallenge('${challenge._id}')">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn btn-sm btn-outline-secondary mb-1" onclick="toggleChallengeStatus('${challenge._id}')">
                ${challenge.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteChallenge('${challenge._id}')">
                <i class="fas fa-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// Helper functions
function getChallengeCategoryColor(category) {
  const colors = {
    'waste-reduction': 'success',
    'energy-conservation': 'warning',
    'water-preservation': 'info',
    'biodiversity': 'primary',
    'sustainable-living': 'danger'
  };
  return colors[category] || 'secondary';
}

function formatChallengeCategory(category) {
  const names = {
    'waste-reduction': 'Waste Reduction',
    'energy-conservation': 'Energy Conservation',
    'water-preservation': 'Water Preservation',
    'biodiversity': 'Biodiversity',
    'sustainable-living': 'Sustainable Living'
  };
  return names[category] || category;
}

function formatCompletionType(type) {
  // Only custom type remains
  return 'Custom Challenge';
}

function getTargetUnit(type) {
  const units = {
    'modules': 'modules',
    'quizzes': 'quizzes',
    'points': 'points',
    'streak': 'days',
    'custom': 'units'
  };
  return units[type] || '';
}

// CRUD Operations
async function editChallenge(challengeId) {
  try {
    const challenge = allChallenges.find(c => c._id === challengeId);
    if (!challenge) {
      alert('Challenge not found');
      return;
    }
    
    currentEditingChallenge = challenge;
    document.getElementById('challenge-id').value = challenge._id;
    document.getElementById('challenge-title').value = challenge.title;
    document.getElementById('challenge-description').value = challenge.description;
    document.getElementById('challenge-category').value = challenge.category;
    document.getElementById('challenge-points').value = challenge.pointsReward;
    document.getElementById('challenge-duration').value = challenge.duration;
    document.getElementById('challenge-type').value = challenge.completionCriteria.type;
    document.getElementById('challenge-target').value = challenge.completionCriteria.target;
    document.getElementById('challenge-active').checked = challenge.isActive;
    
    if (challenge.startDate) {
      document.getElementById('challenge-start-date').value = new Date(challenge.startDate).toISOString().split('T')[0];
    }
    
    document.getElementById('challengeModalTitle').textContent = 'Edit Challenge';
    const modal = new bootstrap.Modal(document.getElementById('challengeModal'));
    modal.show();
  } catch (error) {
    console.error('Error loading challenge for edit:', error);
    alert('Error loading challenge details');
  }
}
async function saveChallenge() {
  const saveBtn = document.getElementById('save-challenge-btn');
  const challengeId = document.getElementById('challenge-id').value;
  
  const challengeData = {
    title: document.getElementById('challenge-title').value,
    description: document.getElementById('challenge-description').value,
    category: document.getElementById('challenge-category').value,
    pointsReward: parseInt(document.getElementById('challenge-points').value),
    duration: parseInt(document.getElementById('challenge-duration').value),
    completionCriteria: {
      // Force only 'custom' type for smooth challenge experience
      type: 'custom',
      target: parseInt(document.getElementById('challenge-target').value)
    },
    isActive: document.getElementById('challenge-active').checked
  };
  
  const startDate = document.getElementById('challenge-start-date').value;
  if (startDate) {
    challengeData.startDate = startDate;
  }
  
  if (!challengeData.title || !challengeData.description) {
    alert('Please fill in all required fields.');
    return;
  }
  
  try {
    saveBtn.classList.add('loading');
    
    let response;
    if (challengeId) {
      console.log(`Updating challenge ${challengeId}`, challengeData);
      
      // Try regular route first, then admin override if it fails
      try {
        response = await apiCall(`/challenges/${challengeId}`, {
          method: 'PUT',
          body: challengeData
        });
        console.log('✅ Challenge updated via regular route');
      } catch (regularError) {
        console.log('Regular route failed, trying admin override:', regularError);
        
        // Use admin override if regular route fails
        response = await apiCall(`/challenges/${challengeId}/admin-override`, {
          method: 'PUT',
          body: challengeData
        });
        console.log('✅ Challenge updated via admin override');
      }
    } else {
      console.log('Creating new challenge', challengeData);
      response = await apiCall('/challenges', {
        method: 'POST',
        body: challengeData
      });
    }
    
    alert(challengeId ? 'Challenge updated successfully!' : 'Challenge created successfully!');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('challengeModal'));
    modal.hide();
    
    document.getElementById('challenge-form').reset();
    document.getElementById('challenge-id').value = '';
    document.getElementById('challengeModalTitle').textContent = 'Add New Challenge';
    
    await loadChallenges();
  } catch (error) {
    console.error('Error saving challenge:', error);
    alert('Error saving challenge: ' + (error.message || 'Please check console for details.'));
  } finally {
    saveBtn.classList.remove('loading');
  }
}

// Add a function to test admin status
async function testAdminStatus() {
  try {
    const response = await apiCall('/challenges/test/admin-status');
    console.log('🔐 Admin Status Test:', response);
    return response;
  } catch (error) {
    console.error('❌ Admin status test failed:', error);
    return null;
  }
}

async function toggleChallengeStatus(challengeId) {
  try {
    const challenge = allChallenges.find(c => c._id === challengeId);
    if (!challenge) {
      alert('Challenge not found');
      return;
    }

    const newStatus = !challenge.isActive;
    console.log(`🔄 Toggling challenge ${challengeId} to ${newStatus}`);

    // Try the regular route first
    try {
      const response = await apiCall(`/challenges/${challengeId}`, {
        method: 'PUT',
        body: { isActive: newStatus }
      });
      console.log('✅ Challenge toggled via regular route');
      alert(`✅ Challenge ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      await loadChallenges();
    } catch (regularError) {
      console.log('Regular route failed, trying admin override:', regularError);
      
      // If regular route fails, try admin override
      const overrideResponse = await apiCall(`/challenges/${challengeId}/admin-override`, {
        method: 'PUT',
        body: { isActive: newStatus }
      });
      
      console.log('✅ Challenge toggled via admin override');
      alert(`✅ Challenge ${newStatus ? 'activated' : 'deactivated'} successfully! (via admin override)`);
      await loadChallenges();
    }
  } catch (error) {
    console.error('❌ Error toggling challenge status:', error);
    alert('❌ Error updating challenge status: ' + error.message);
  }
}

async function deleteChallenge(challengeId) {
  if (!confirm('Are you sure you want to delete this challenge? This action cannot be undone.')) {
    return;
  }

  try {
    console.log(`🗑️ Deleting challenge ${challengeId}`);
    
    // Try the regular route first
    try {
      await apiCall(`/challenges/${challengeId}`, {
        method: 'DELETE'
      });
      console.log('✅ Challenge deleted via regular route');
      alert('✅ Challenge deleted successfully!');
      await loadChallenges();
      return;
    } catch (regularError) {
      console.log('Regular route failed, trying admin override:', regularError);
      
      // Use admin override for deletion
      await apiCall(`/challenges/${challengeId}/admin-override`, {
        method: 'DELETE'  // Use DELETE method instead of PUT
      });
      
      alert('✅ Challenge deleted successfully! (via admin override)');
      await loadChallenges();
    }
  } catch (error) {
    console.error('❌ Error deleting challenge:', error);
    alert('❌ Error deleting challenge: ' + error.message);
  }
}
// Debug function to test all challenge routes
async function testChallengeRoutes(challengeId) {
  try {
    console.log('🧪 Testing challenge routes for:', challengeId);
    
    // Test GET
    try {
      const getResponse = await apiCall(`/challenges/${challengeId}`);
      console.log('✅ GET route works:', getResponse.success);
    } catch (error) {
      console.log('❌ GET route failed:', error.message);
    }
    
    // Test PUT (regular)
    try {
      const putResponse = await apiCall(`/challenges/${challengeId}`, {
        method: 'PUT',
        body: { isActive: true }
      });
      console.log('✅ PUT route works:', putResponse.success);
    } catch (error) {
      console.log('❌ PUT route failed:', error.message);
    }
    
    // Test PUT (admin override)
    try {
      const overrideResponse = await apiCall(`/challenges/${challengeId}/admin-override`, {
        method: 'PUT',
        body: { isActive: true }
      });
      console.log('✅ PUT admin-override works:', overrideResponse.success);
    } catch (error) {
      console.log('❌ PUT admin-override failed:', error.message);
    }
    
    // Test DELETE (admin override)
    try {
      const deleteResponse = await apiCall(`/challenges/${challengeId}/admin-override`, {
        method: 'DELETE'
      });
      console.log('✅ DELETE admin-override works:', deleteResponse.success);
    } catch (error) {
      console.log('❌ DELETE admin-override failed:', error.message);
    }
    
  } catch (error) {
    console.error('Route test error:', error);
  }
}

// You can call this function in the browser console to test routes
// testChallengeRoutes('68de89c5c6f0c8d5b00a37d9')