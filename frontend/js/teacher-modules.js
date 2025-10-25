// Teacher Modules Management JavaScript
let currentTeacher = null;
let allModules = [];

// Check if user is teacher
function checkTeacher() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role === "teacher";
}

// Load teacher modules
async function loadTeacherModules() {
    if (!checkTeacher()) {
        window.location.href = 'login.html';
        return;
    }

    currentTeacher = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
        const response = await apiCall('/modules/teacher/list');
        allModules = response.data;
        displayModules();
    } catch (error) {
        console.error('Error loading modules:', error);
        document.getElementById('modules-container').innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Error loading modules. Please try again.
                </div>
            </div>
        `;
    }
}

// Display modules
function displayModules() {
    const container = document.getElementById('modules-container');
    
    if (allModules.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-book-open fa-3x text-muted mb-3"></i>
                <h4>No modules created yet</h4>
                <p class="text-muted">Create your first module to get started</p>
            </div>
        `;
        return;
    }

    let html = '';
    
    allModules.forEach(module => {
        html += `
            <div class="col-md-6 mb-4">
                <div class="card module-card ${module.isActive ? '' : 'inactive-module'}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <h5 class="card-title">${module.title}</h5>
                            <span class="badge ${module.isActive ? 'bg-success' : 'bg-secondary'}">
                                ${module.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p class="card-text">${module.description}</p>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="badge bg-info">${module.category}</span>
                            <span class="badge bg-warning">${module.points} points</span>
                            <span class="badge bg-primary">${module.lessons?.length || 0} lessons</span>
                        </div>
                        <div class="btn-group w-100">
                            <button class="btn btn-outline-primary btn-sm" onclick="editModule('${module._id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="toggleModuleStatus('${module._id}')">
                                ${module.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteModule('${module._id}')">
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

// Create or update module with lessons
async function saveModule() {
    const moduleId = document.getElementById('moduleId').value;
    
    // Collect lessons data
    const lessons = [];
    const lessonItems = document.querySelectorAll('.lesson-item');
    
    lessonItems.forEach((item, index) => {
        lessons.push({
            title: item.querySelector('.lesson-title').value,
            content: item.querySelector('.lesson-content').value,
            duration: parseInt(item.querySelector('.lesson-duration').value),
            order: parseInt(item.querySelector('.lesson-order').value)
        });
    });
    
    // Validate that we have at least one lesson
    if (lessons.length === 0) {
        alert('Please add at least one lesson to the module.');
        return;
    }
    
    const moduleData = {
        title: document.getElementById('moduleTitle').value,
        description: document.getElementById('moduleDescription').value,
        category: document.getElementById('moduleCategory').value,
        points: parseInt(document.getElementById('modulePoints').value),
        lessons: lessons,
        estimatedTime: lessons.reduce((total, lesson) => total + lesson.duration, 0),
        isActive: document.getElementById('moduleActive').checked,
        school: currentTeacher.school
    };

    try {
        if (moduleId) {
            // Update existing module
            await apiCall(`/modules/${moduleId}`, {
                method: 'PUT',
                body: moduleData
            });
            alert('Module updated successfully!');
        } else {
            // Create new module
            await apiCall('/modules', {
                method: 'POST',
                body: moduleData
            });
            alert('Module created successfully!');
        }

        // Close modal and refresh list
        bootstrap.Modal.getInstance(document.getElementById('moduleModal')).hide();
        await loadTeacherModules();
        
    } catch (error) {
        alert('Error saving module: ' + error.message);
    }
}

// Edit module - populate with existing lessons
function editModule(moduleId) {
    const module = allModules.find(m => m._id === moduleId);
    if (!module) return;

    document.getElementById('moduleId').value = module._id;
    document.getElementById('moduleTitle').value = module.title;
    document.getElementById('moduleDescription').value = module.description;
    document.getElementById('moduleCategory').value = module.category;
    document.getElementById('modulePoints').value = module.points;
    document.getElementById('moduleActive').checked = module.isActive;
    
    document.getElementById('moduleModalTitle').textContent = 'Edit Module';
    
    // Clear existing lessons
    document.getElementById('lessons-container').innerHTML = '';
    
    // Add lessons from the module
    if (module.lessons && module.lessons.length > 0) {
        module.lessons.forEach(lesson => {
            addLesson(lesson);
        });
    } else {
        // Add one empty lesson if no lessons exist
        addLesson();
    }
    
    const modal = new bootstrap.Modal(document.getElementById('moduleModal'));
    modal.show();
}

// Toggle module status
async function toggleModuleStatus(moduleId) {
    try {
        await apiCall(`/modules/${moduleId}/toggle`, {
            method: 'PUT'
        });
        await loadTeacherModules();
    } catch (error) {
        alert('Error updating module status: ' + error.message);
    }
}

// Delete module
async function deleteModule(moduleId) {
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) {
        return;
    }

    try {
        await apiCall(`/modules/${moduleId}`, {
            method: 'DELETE'
        });
        await loadTeacherModules();
    } catch (error) {
        alert('Error deleting module: ' + error.message);
    }
}

// Initialize page - add event listeners
document.addEventListener('DOMContentLoaded', function() {
    if (!checkTeacher()) {
        alert('Teacher access required. Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }

    loadTeacherModules();

    // Set up form submission
    document.getElementById('saveModuleBtn').addEventListener('click', saveModule);

    // Add lesson button
    document.getElementById('add-lesson-btn').addEventListener('click', () => addLesson());

    // Reset modal when hidden
    document.getElementById('moduleModal').addEventListener('hidden.bs.modal', function() {
        document.getElementById('moduleForm').reset();
        document.getElementById('moduleId').value = '';
        document.getElementById('lessons-container').innerHTML = '<p class="text-muted text-center">No lessons added yet. Click "Add Lesson" to start.</p>';
        document.getElementById('moduleModalTitle').textContent = 'Create New Module';
    });

    updateUIForLoginStatus();
});

// Add lesson to module form
function addLesson(lessonData = {}) {
    const container = document.getElementById('lessons-container');
    
    // Remove the placeholder text if it exists
    const placeholder = container.querySelector('p.text-muted');
    if (placeholder) {
        placeholder.remove();
    }
    
    const lessonCount = container.querySelectorAll('.lesson-item').length;
    const lessonIndex = lessonCount + 1;
    
    const lessonHtml = `
        <div class="lesson-item border p-3 mb-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0">Lesson ${lessonIndex}</h6>
                <button type="button" class="btn btn-sm btn-outline-danger remove-lesson">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Lesson Title</label>
                        <input type="text" class="form-control lesson-title" 
                               value="${lessonData.title || ''}" 
                               placeholder="Enter lesson title" required>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="mb-3">
                        <label class="form-label">Duration (minutes)</label>
                        <input type="number" class="form-control lesson-duration" 
                               value="${lessonData.duration || 10}" min="1" required>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="mb-3">
                        <label class="form-label">Order</label>
                        <input type="number" class="form-control lesson-order" 
                               value="${lessonData.order || lessonIndex}" min="1" required>
                    </div>
                </div>
            </div>
            <div class="mb-3">
                <label class="form-label">Lesson Content</label>
                <textarea class="form-control lesson-content" rows="4" 
                          placeholder="Enter the lesson content here..." required>${lessonData.content || ''}</textarea>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', lessonHtml);
    
    // Add event listener to remove button
    const newLesson = container.lastElementChild;
    newLesson.querySelector('.remove-lesson').addEventListener('click', function() {
        newLesson.remove();
        renumberLessons();
    });
}
// Renumber lessons after removal
function renumberLessons() {
    const container = document.getElementById('lessons-container');
    const lessons = container.querySelectorAll('.lesson-item');
    
    if (lessons.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No lessons added yet. Click "Add Lesson" to start.</p>';
        return;
    }
    
    lessons.forEach((lesson, index) => {
        const lessonNumber = index + 1;
        lesson.querySelector('h6').textContent = `Lesson ${lessonNumber}`;
        lesson.querySelector('.lesson-order').value = lessonNumber;
    });
}

