// js/script.js
// Auto-detect API URL based on environment
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : `${window.location.origin}/api`;
    
console.log('Using API Base URL:', API_BASE_URL);

// Check if user is logged in
function checkLogin() {
    return localStorage.getItem('token') !== null;
}

// Get current user data
function getCurrentUser() {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}

// API call function with enhanced debugging
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  };
  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };
  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }
  console.log(`🔗 API Call: ${endpoint}`, {
    method: config.method || 'GET',
    body: config.body
  });
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    console.log(`📨 API Response: ${endpoint}`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        const errorText = await response.text();
        errorData = { message: errorText || `HTTP error! status: ${response.status}` };
      }
      console.error('❌ API Error Response:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ API Success Response:', data);
    return data;
  } catch (error) {
    console.error('❌ API call error:', error);
    throw error;
  }
}
// Register function
async function register(userData) {
    try {
        // Determine the endpoint based on user type
        const endpoint = userData.role === 'teacher' ? '/auth/register/teacher' : '/auth/register';
        
        // Remove role from data for student registration (will use default)
        if (userData.role === 'student') {
            delete userData.role;
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        // Check if response is OK
        if (!response.ok) {
            // Try to get error message from response
            let errorMessage = 'Registration failed';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // If we can't parse JSON, use status text
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        // Parse response as JSON
        const data = await response.json();
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Update UI immediately after registration
        updateUIForLoginStatus();
        
        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}// Get user profile
async function getProfile() {
    try {
        const data = await apiCall('/auth/me');
        
        // Update the user data in localStorage
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = {
            ...currentUser,
            ...data.user
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        return data;
    } catch (error) {
        console.error('Get profile error:', error);
        throw error;
    }
}

// Update user profile with additional teacher fields
async function updateProfile(profileData) {
    try {
        const data = await apiCall('/auth/updatedetails', {
            method: 'PUT',
            body: profileData,
        });
        
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    } catch (error) {
        console.error('Update profile error:', error);
        throw error;
    }
}

// Update password
async function updatePassword(currentPassword, newPassword) {
    try {
        const data = await apiCall('/auth/updatepassword', {
            method: 'PUT',
            body: { currentPassword, newPassword },
        });
        
        localStorage.setItem('token', data.token);
        return data;
    } catch (error) {
        console.error('Update password error:', error);
        throw error;
    }
}

// Get modules
async function getModules() {
    try {
        const data = await apiCall('/modules');
        return data;
    } catch (error) {
        console.error('Get modules error:', error);
        throw error;
    }
}

// Get module progress
async function getModuleProgress(moduleId) {
    try {
        const data = await apiCall(`/modules/${moduleId}/progress`);
        return data;
    } catch (error) {
        console.error('Get module progress error:', error);
        throw error;
    }
}

// Update lesson progress
async function updateLessonProgress(moduleId, lessonIndex, isCompleted = false) {
    try {
        const data = await apiCall(`/modules/${moduleId}/progress`, {
            method: 'PUT',
            body: { lessonIndex, isCompleted },
        });
        return data;
    } catch (error) {
        console.error('Update lesson progress error:', error);
        throw error;
    }
}

// Complete module
async function completeModule(moduleId) {
    try {
        const data = await apiCall(`/modules/${moduleId}/complete`, {
            method: 'PUT',
        });
        return data;
    } catch (error) {
        console.error('Complete module error:', error);
        throw error;
    }
}

// Get quizzes
async function getQuizzes() {
    try {
        const data = await apiCall('/quizzes');
        return data;
    } catch (error) {
        console.error('Get quizzes error:', error);
        throw error;
    }
}

// Get daily question
async function getDailyQuestion() {
    try {
        const data = await apiCall('/quizzes/daily');
        return data;
    } catch (error) {
        console.error('Get daily question error:', error);
        throw error;
    }
}

// Submit daily question
async function submitDailyQuestion(quizId, answerIndex) {
    try {
        const data = await apiCall('/quizzes/daily/submit', {
            method: 'POST',
            body: { quizId, answerIndex },
        });
        return data;
    } catch (error) {
        console.error('Submit daily question error:', error);
        throw error;
    }
}

// Submit quiz
async function submitQuiz(quizId, answers) {
    try {
        const data = await apiCall(`/quizzes/${quizId}/submit`, {
            method: 'POST',
            body: { answers },
        });
        return data;
    } catch (error) {
        console.error('Submit quiz error:', error);
        throw error;
    }
}

// Get quiz history
async function getQuizHistory() {
    try {
        const data = await apiCall('/quizzes/history');
        return data;
    } catch (error) {
        console.error('Get quiz history error:', error);
        throw error;
    }
}
function getQuizAttemptStatus(quizId) {
  const user = getCurrentUser();
  if (!user || !user.quizAttempts) return { attempted: false, score: 0 };
  
  const attempts = user.quizAttempts instanceof Map ?
    Object.fromEntries(user.quizAttempts) : user.quizAttempts;
  
  return {
    attempted: !!attempts[quizId],
    score: attempts[quizId] || 0
  };
}
// Get user leaderboard
async function getUserLeaderboard(timeframe = 'all') {
    try {
        const data = await apiCall(`/leaderboard/users?timeframe=${timeframe}`);
        return data;
    } catch (error) {
        console.error('Get user leaderboard error:', error);
        throw error;
    }
}
// Submit work for a challenge
async function submitChallengeWork(challengeId, submissionData) {
  try {
    const data = await apiCall(`/submissions/challenge/${challengeId}/submit`, {
      method: 'POST',
      body: submissionData
    });
    return data;
  } catch (error) {
    console.error('Submit challenge work error:', error);
    throw error;
  }
}

// Get my submissions
async function getMySubmissions() {
  try {
    const data = await apiCall('/submissions/my-submissions');
    return data;
  } catch (error) {
    console.error('Get my submissions error:', error);
    throw error;
  }
}

// Get challenge submissions (teacher)
async function getChallengeSubmissions(challengeId) {
  try {
    const data = await apiCall(`/submissions/challenge/${challengeId}/submissions`);
    return data;
  } catch (error) {
    console.error('Get challenge submissions error:', error);
    throw error;
  }
}

// Review submission (teacher)
async function reviewSubmission(challengeId, participantId, submissionId, reviewData) {
  try {
    const data = await apiCall(
      `/submissions/challenge/${challengeId}/participant/${participantId}/submission/${submissionId}/review`,
      {
        method: 'PUT',
        body: reviewData
      }
    );
    return data;
  } catch (error) {
    console.error('Review submission error:', error);
    throw error;
  }
}

// Get school leaderboard
async function getSchoolLeaderboard(timeframe = 'weekly') {
    try {
        const data = await apiCall(`/leaderboard/schools?timeframe=${timeframe}`);
        return data;
    } catch (error) {
        console.error('Get school leaderboard error:', error);
        throw error;
    }
}

// Get top performers
async function getTopPerformers(month, year) {
    try {
        let url = '/leaderboard/top-performers';
        if (month && year) {
            url += `?month=${month}&year=${year}`;
        }
        const data = await apiCall(url);
        return data;
    } catch (error) {
        console.error('Get top performers error:', error);
        throw error;
    }
}

// Get rewards
async function getRewards() {
    try {
        const data = await apiCall('/redeem');
        return data;
    } catch (error) {
        console.error('Get rewards error:', error);
        throw error;
    }
}

// Redeem reward
async function redeemReward(rewardId) {
    try {
        const data = await apiCall(`/redeem/${rewardId}`, {
            method: 'POST',
        });
        return data;
    } catch (error) {
        console.error('Redeem reward error:', error);
        throw error;
    }
}

// Get redemption history
async function getRedemptionHistory() {
    try {
        const data = await apiCall('/redeem/history');
        return data;
    } catch (error) {
        console.error('Get redemption history error:', error);
        throw error;
    }
}

// Check if user is teacher
function isTeacher() {
    const user = getCurrentUser();
    return user && user.role === 'teacher';
}

// Get teacher modules
async function getTeacherModules() {
    try {
        const data = await apiCall('/modules/teacher/list');
        return data;
    } catch (error) {
        console.error('Get teacher modules error:', error);
        throw error;
    }
}

// Create module
async function createModule(moduleData) {
    try {
        const data = await apiCall('/modules', {
            method: 'POST',
            body: moduleData,
        });
        return data;
    } catch (error) {
        console.error('Create module error:', error);
        throw error;
    }
}

// Update module
async function updateModule(moduleId, moduleData) {
    try {
        const data = await apiCall(`/modules/${moduleId}`, {
            method: 'PUT',
            body: moduleData,
        });
        return data;
    } catch (error) {
        console.error('Update module error:', error);
        throw error;
    }
}

// Delete module
async function deleteModule(moduleId) {
    try {
        const data = await apiCall(`/modules/${moduleId}`, {
            method: 'DELETE',
        });
        return data;
    } catch (error) {
        console.error('Delete module error:', error);
        throw error;
    }
}

// Toggle module status
async function toggleModuleStatus(moduleId) {
    try {
        const data = await apiCall(`/modules/${moduleId}/toggle`, {
            method: 'PUT',
        });
        return data;
    } catch (error) {
        console.error('Toggle module status error:', error);
        throw error;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateUIForLoginStatus();
    window.location.href = 'index.html';
}

// Update UI based on login status
// Update UI based on login status
// Update UI based on login status
function updateUIForLoginStatus() {
    const isLoggedIn = checkLogin();
    const currentUser = getCurrentUser();
    
    console.log('Updating UI, isLoggedIn:', isLoggedIn, 'User:', currentUser);
    
    if (isLoggedIn && currentUser) {
        // User is logged in
        document.getElementById('auth-buttons').classList.add('d-none');
        document.getElementById('user-menu').classList.remove('d-none');
        document.getElementById('user-menu').classList.add('d-flex');
        document.getElementById('username-display').textContent = currentUser.name;
        
        // Enable all navigation items
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('nav-locked');
            link.onclick = null;
        });
        
        // Show Admin link only to admins
        if (currentUser.role === 'admin') {
            let adminLink = document.querySelector('a[href="admin.html"]');
            if (!adminLink) {
                const li = document.createElement('li');
                li.className = 'nav-item';
                li.innerHTML = '<a class="nav-link" href="admin.html">Admin</a>';
                document.querySelector('.navbar-nav').appendChild(li);
            } else {
                adminLink.classList.remove('d-none');
            }
        }

        // Show Teacher link only to teachers - update to point to new dashboard
        if (currentUser.role === 'teacher') {
            let teacherLink = document.querySelector('a[href="teacher-dashboard.html"]');
            if (!teacherLink) {
                const li = document.createElement('li');
                li.className = 'nav-item';
                li.innerHTML = '<a class="nav-link" href="teacher-dashboard.html">Teacher</a>';
                document.querySelector('.navbar-nav').appendChild(li);
            } else {
                teacherLink.classList.remove('d-none');
            }
        }
        
        // Hide guest messages
        const guestMessages = document.querySelectorAll('.guest-message');
        if (guestMessages) {
            guestMessages.forEach(msg => {
                msg.style.display = 'none';
            });
        }
        
        // Remove locked feature styling
        const lockedFeatures = document.querySelectorAll('.locked-feature');
        if (lockedFeatures) {
            lockedFeatures.forEach(item => {
                item.classList.remove('locked-feature');
            });
        }
    } else {
        // User is not logged in (guest)
        document.getElementById('auth-buttons').classList.remove('d-none');
        document.getElementById('user-menu').classList.add('d-none');
        document.getElementById('user-menu').classList.remove('d-flex');
        
        // Hide admin and teacher links
        const adminLink = document.querySelector('a[href="admin-home.html"]');
        if (adminLink) {
            adminLink.classList.add('d-none');
        }
        const teacherLink = document.querySelector('a[href="teacher-dashboard.html"]');
        if (teacherLink) {
            teacherLink.classList.add('d-none');
        }
        
        // Disable navigation items except Home
        document.querySelectorAll('.nav-link').forEach(link => {
            if (!link.getAttribute('href') || link.getAttribute('href') !== 'index.html') {
                link.classList.add('nav-locked');
                link.onclick = function(e) {
                    e.preventDefault();
                    alert('Please login to access this feature');
                    return false;
                };
            }
        });
        
        // Show guest messages
        const guestMessages = document.querySelectorAll('.guest-message');
        if (guestMessages) {
            guestMessages.forEach(msg => {
                msg.style.display = 'block';
            });
        }
    }
}
// Handle navigation clicks for guest users
function handleNavClick(page, featureName) {
    if (!checkLogin()) {
        alert(`Please login to access ${featureName}`);
        return false;
    }
    window.location.href = page;
    return true;
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    updateUIForLoginStatus();
    notifyProgressUpdate();
    
    // Update progress indicators if user is logged in
    if (checkLogin()) {
        const currentUser = getCurrentUser();
        if (currentUser) {
            const modulesCompleted = document.getElementById('modules-completed');
            const totalPoints = document.getElementById('total-points');
            
            if (modulesCompleted) {
                modulesCompleted.textContent = `${currentUser.modulesCompleted || 0}/8`;
            }
            
            if (totalPoints) {
                totalPoints.textContent = currentUser.points || 0;
            }
        }
    }
    window.addEventListener('storage', function(e) {
  if (e.key === 'moduleCompleted' || e.key === 'quizCompleted' || e.key === 'pointsUpdated') {
    refreshQuizData();
  }
});

// Update user progress when modules/quizzes are completed
function notifyProgressUpdate() {
  localStorage.setItem('pointsUpdated', Date.now().toString());
}

    // Load and display reviews
    loadReviews();
    
    // Setup review form based on login status
    setupReviewForm();
    
    // Listen for login status changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                setupReviewForm();
            }
        });
    });
    
    // Observe the auth buttons for changes
    const authButtons = document.getElementById('auth-buttons');
    if (authButtons) {
        observer.observe(authButtons, { attributes: true });
    }
});
// Utility function to trigger points update from other parts of the app
function triggerPointsUpdate() {
    window.dispatchEvent(new CustomEvent('pointsEarned'));
}

// Function to check if user data is stale and refresh if needed
function checkAndRefreshStaleData() {
    const lastUpdate = localStorage.getItem('lastUserDataUpdate');
    const now = Date.now();
    
    // Refresh if data is older than 5 minutes
    if (!lastUpdate || (now - parseInt(lastUpdate)) > 5 * 60 * 1000) {
        refreshUserData();
    }
}

// Periodic refresh every 10 minutes
setInterval(() => {
    if (checkLogin()) {
        refreshUserData();
    }
}, 10 * 60 * 1000);

// Refresh when page becomes visible again
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && checkLogin()) {
        console.log('👀 Page visible, refreshing user data...');
        refreshUserData();
    }
});
// Challenge-related functions
// Get challenges
async function getChallenges() {
    try {
        const data = await apiCall('/challenges');
        return data;
    } catch (error) {
        console.error('Get challenges error:', error);
        throw error;
    }
}

// Get user challenge progress
async function getUserChallengeProgress() {
    try {
        const data = await apiCall('/challenges/user-progress');
        return data;
    } catch (error) {
        console.error('Get challenge progress error:', error);
        throw error;
    }
}

// Create challenge
async function createChallenge(challengeData) {
    try {
        const data = await apiCall('/challenges', {
            method: 'POST',
            body: challengeData,
        });
        return data;
    } catch (error) {
        console.error('Create challenge error:', error);
        throw error;
    }
}

// Complete challenge
async function completeChallenge(challengeId) {
    try {
        const data = await apiCall(`/challenges/${challengeId}/complete`, {
            method: 'POST',
        });
        return data;
    } catch (error) {
        console.error('Complete challenge error:', error);
        throw error;
    }
}

// Get challenge statistics
async function getChallengeStats() {
    try {
        const data = await apiCall('/challenges/stats');
        return data;
    } catch (error) {
        console.error('Get challenge stats error:', error);
        throw error;
    }
}

// Load reviews from backend
async function loadReviews() {
    try {
        const response = await apiCall('/reviews/latest');
        displayReviews(response.data);
    } catch (error) {
        console.error('Error loading reviews:', error);
        document.getElementById('reviews-container').innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">Error loading reviews. Please try again later.</p>
            </div>
        `;
    }
}

// Display reviews in the testimonials section
function displayReviews(reviews) {
    const container = document.getElementById('reviews-container');
    
    if (!reviews || reviews.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center">
                <p>No reviews yet. Be the first to share your experience!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    reviews.forEach(review => {
        // Generate star rating HTML
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= review.rating) {
                starsHtml += '<i class="fas fa-star text-warning"></i>';
            } else {
                starsHtml += '<i class="far fa-star text-warning"></i>';
            }
        }
        
        html += `
            <div class="col-md-4 mb-4">
                <div class="testimonial-card">
                    <div class="d-flex mb-3">
                        ${starsHtml}
                    </div>
                    <p class="fst-italic">"${review.comment}"</p>
                    <div class="d-flex align-items-center">
                        <div>
                            <h5 class="mb-0">${review.user.name}</h5>
                            <small class="text-muted">${formatDate(review.createdAt)}</small>
                        </div>
                    </div>
                    ${review.user.badges && review.user.badges.length > 0 ? `
                    <div class="mt-3">
                        ${review.user.badges.map(badge => `
                            <span class="badge bg-info me-1">${typeof badge === 'object' ? badge.name : badge}</span>
                        `).join('')}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Handle review form submission
async function submitReview(e) {
    e.preventDefault();
    
    const rating = document.querySelector('input[name="rating"]:checked').value;
    const comment = document.getElementById('review-comment').value;
    
    try {
        const response = await apiCall('/reviews', {
            method: 'POST',
            body: { rating, comment }
        });
        
        alert('Thank you for your review! It will be visible after approval.');
        document.getElementById('review-form').reset();
        setupReviewForm(); // Reset form state
        loadReviews(); // Reload reviews
    } catch (error) {
        alert('Error submitting review: ' + error.message);
    }
}

// Check if user has already submitted a review
async function checkUserReview() {
    try {
        const response = await apiCall('/reviews/my-review');
        return response.data;
    } catch (error) {
        // If no review exists, API returns 404 which is expected
        return null;
    }
}

// Setup review form based on user login status
async function setupReviewForm() {
    const reviewForm = document.getElementById('review-form');
    const loginPrompt = document.getElementById('review-login-prompt');
    const existingReview = document.getElementById('review-existing');

    if (checkLogin()) {
        // User is logged in
        loginPrompt.classList.add('d-none');

        const userReview = await checkUserReview();

        if (userReview) {
            // User has already submitted a review
            reviewForm.classList.add('d-none');
            existingReview.classList.remove('d-none');

            // Display current review info
            displayCurrentReviewInfo(userReview);

            // Setup edit review link with proper event handling
            setupEditReviewLink();

        } else {
            // User hasn't submitted a review yet
            reviewForm.classList.remove('d-none');
            existingReview.classList.add('d-none');

            // Reset form to submit mode and add event listener
            resetReviewFormToSubmitMode();
        }
    } else {
        // User is not logged in
        reviewForm.classList.add('d-none');
        existingReview.classList.add('d-none');
        loginPrompt.classList.remove('d-none');
    }
}
// Reset form to submit mode (for new reviews)
function resetReviewFormToSubmitMode() {
    const reviewForm = document.getElementById('review-form');
    
    // Remove any existing event listeners by cloning the form
    const newForm = reviewForm.cloneNode(true);
    reviewForm.parentNode.replaceChild(newForm, reviewForm);
    
    // Add submit event listener to the new form
    document.getElementById('review-form').addEventListener('submit', submitReview);
    
    // Reset button text and style
    const submitBtn = document.querySelector('#review-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Submit Review';
        submitBtn.className = 'btn btn-success w-100';
    }
    
    // Remove cancel button if it exists
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.remove();
    }
}
// Setup edit review link with proper event handling
function setupEditReviewLink() {
    const editLink = document.getElementById('edit-review-link');
    if (editLink) {
        // Remove any existing event listeners by cloning the element
        const newEditLink = editLink.cloneNode(true);
        editLink.parentNode.replaceChild(newEditLink, editLink);
        
        // Add new event listener
        newEditLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            editReview();
        });
    }
}
// Display current review information
function displayCurrentReviewInfo(review) {
    const existingReview = document.getElementById('review-existing');
    
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= review.rating) {
            starsHtml += '<i class="fas fa-star text-warning"></i>';
        } else {
            starsHtml += '<i class="far fa-star text-warning"></i>';
        }
    }
    
    const statusBadge = review.status === 'approved' ? 
        '<span class="badge bg-success ms-2">Approved</span>' :
        review.status === 'pending' ?
        '<span class="badge bg-warning ms-2">Pending Approval</span>' :
        '<span class="badge bg-danger ms-2">Rejected</span>';
    
    existingReview.innerHTML = `
        <div class="alert alert-info">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6>Your Current Review</h6>
                    <div class="d-flex mb-2">
                        ${starsHtml}
                    </div>
                    <p class="mb-1 fst-italic">"${review.comment}"</p>
                    <small class="text-muted">
                        Submitted: ${formatDate(review.createdAt)}
                        ${review.updatedAt ? ` | Last updated: ${formatDate(review.updatedAt)}` : ''}
                        ${statusBadge}
                    </small>
                </div>
            </div>
            <hr>
            <p class="mb-0">
                <a href="#" id="edit-review-link" class="btn btn-sm btn-outline-warning">
                    <i class="fas fa-edit me-1"></i>Edit Review
                </a>
            </p>
        </div>
    `;
}

// Admin: Get all users
async function getAllUsers() {
    try {
        const data = await apiCall('/admin/users');
        return data;
    } catch (error) {
        console.error('Get all users error:', error);
        throw error;
    }
}

// Admin: Get all schools with statistics
async function getAllSchools() {
    try {
        const data = await apiCall('/admin/schools');
        return data;
    } catch (error) {
        console.error('Get all schools error:', error);
        throw error;
    }
}

// Admin: Get users by school
async function getUsersBySchool(schoolName) {
    try {
        const encodedSchoolName = encodeURIComponent(schoolName);
        const data = await apiCall(`/admin/schools/${encodedSchoolName}/users`);
        return data;
    } catch (error) {
        console.error('Get users by school error:', error);
        throw error;
    }
}

// Admin: Update user
async function updateUser(userId, userData) {
    try {
        const data = await apiCall(`/admin/users/${userId}`, {
            method: 'PUT',
            body: userData
        });
        return data;
    } catch (error) {
        console.error('Update user error:', error);
        throw error;
    }
}

// Admin: Delete user
async function deleteUser(userId) {
    try {
        const data = await apiCall(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
        return data;
    } catch (error) {
        console.error('Delete user error:', error);
        throw error;
    }
}
// Admin Reward Management Functions

// Get all rewards with filters
async function getAllRewards(filters = {}) {
    try {
        const queryParams = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                queryParams.append(key, filters[key]);
            }
        });
        
        const queryString = queryParams.toString();
        const url = `/admin/rewards${queryString ? `?${queryString}` : ''}`;
        
        const data = await apiCall(url);
        return data;
    } catch (error) {
        console.error('Get all rewards error:', error);
        throw error;
    }
}

// Create a new reward
async function createReward(rewardData) {
    try {
        const data = await apiCall('/admin/rewards', {
            method: 'POST',
            body: rewardData
        });
        return data;
    } catch (error) {
        console.error('Create reward error:', error);
        throw error;
    }
}

// Update a reward
async function updateReward(rewardId, rewardData) {
    try {
        const data = await apiCall(`/admin/rewards/${rewardId}`, {
            method: 'PUT',
            body: rewardData
        });
        return data;
    } catch (error) {
        console.error('Update reward error:', error);
        throw error;
    }
}

// Delete a reward
async function deleteReward(rewardId) {
    try {
        const data = await apiCall(`/admin/rewards/${rewardId}`, {
            method: 'DELETE'
        });
        return data;
    } catch (error) {
        console.error('Delete reward error:', error);
        throw error;
    }
}

// Get all redemptions with filters
async function getAllRedemptions(filters = {}) {
    try {
        const queryParams = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                queryParams.append(key, filters[key]);
            }
        });
        
        const queryString = queryParams.toString();
        const url = `/admin/redemptions${queryString ? `?${queryString}` : ''}`;
        
        const data = await apiCall(url);
        return data;
    } catch (error) {
        console.error('Get all redemptions error:', error);
        throw error;
    }
}

// Get redemption statistics
async function getRedemptionStats() {
    try {
        const data = await apiCall('/admin/redemptions/stats');
        return data;
    } catch (error) {
        console.error('Get redemption stats error:', error);
        throw error;
    }
}

// Update redemption status
async function updateRedemptionStatus(redemptionId, status) {
    try {
        const data = await apiCall(`/redeem/admin/redemptions/${redemptionId}`, {
            method: 'PUT',
            body: { status }
        });
        return data;
    } catch (error) {
        console.error('Update redemption status error:', error);
        throw error;
    }
}
// Eco Pin API functions
async function getEcoPins(filters = {}) {
    try {
        const queryParams = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
                queryParams.append(key, filters[key]);
            }
        });
        const queryString = queryParams.toString();
        const url = `/eco-pins${queryString ? `?${queryString}` : ''}`;
        const data = await apiCall(url);
        return data;
    } catch (error) {
        console.error('Get eco pins error:', error);
        throw error;
    }
}

async function getEcoPinStats() {
    try {
        const data = await apiCall('/eco-pins/stats');
        return data;
    } catch (error) {
        console.error('Get eco pin stats error:', error);
        throw error;
    }
}

async function createEcoPin(pinData) {
    try {
        const data = await apiCall('/eco-pins', {
            method: 'POST',
            body: pinData
        });
        return data;
    } catch (error) {
        console.error('Create eco pin error:', error);
        throw error;
    }
}

async function updateEcoPin(pinId, pinData) {
    try {
        const data = await apiCall(`/eco-pins/${pinId}`, {
            method: 'PUT',
            body: pinData
        });
        return data;
    } catch (error) {
        console.error('Update eco pin error:', error);
        throw error;
    }
}

async function deleteEcoPin(pinId) {
    try {
        const data = await apiCall(`/eco-pins/${pinId}`, {
            method: 'DELETE'
        });
        return data;
    } catch (error) {
        console.error('Delete eco pin error:', error);
        throw error;
    }
}
// Student-specific module loading
async function getStudentModules() {
  try {
    const data = await apiCall('/modules/student/all');
    return data;
  } catch (error) {
    console.error('Get student modules error:', error);
    throw error;
  }
}
async function validateModuleCompletion(moduleId) {
  try {
    const data = await apiCall(`/modules/${moduleId}/can-complete`);
    return data;
  } catch (error) {
    console.error('Validate module completion error:', error);
    throw error;
  }
}

async function completeStudentModule(moduleId) {
  try {
    console.log('🚀 Calling complete module API for:', moduleId);
    
    const response = await fetch(`${API_BASE_URL}/modules/${moduleId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    console.log('📨 Raw fetch response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Complete module response data:', data);
    
    return data;
  } catch (error) {
    console.error('❌ Complete student module error:', error);
    throw error;
  }
}

// Function to redirect to module quizzes
// Function to redirect to module quizzes
function redirectToModuleQuizzes(moduleId, moduleTitle) {
    console.log('Redirecting to quizzes for module:', moduleId, moduleTitle);
    
    // Store module info for quiz page
    sessionStorage.setItem('selectedModule', JSON.stringify({
        id: moduleId,
        title: moduleTitle
    }));
    
    // Redirect to quiz page
    window.location.href = 'quiz.html';
}
// Fix the showModuleCompletionModal function
function showModuleCompletionModal(response) {
    console.log('Module completion response for modal:', response);
    
    // Extract data from the response
    const moduleData = response.data;
    const module = moduleData.module || {};
    const earnedPoints = moduleData.earnedPoints || module.points || 0;
    const quizzesAvailable = response.quizzesAvailable || false;
    const quizzes = response.quizzes || [];

    console.log('Modal data:', {
        moduleTitle: module.title,
        earnedPoints,
        quizzesAvailable,
        quizzesCount: quizzes.length
    });

    const modalHtml = `
    <div class="modal fade" id="moduleCompletionModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-success text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-trophy me-2"></i>Module Completed!
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center">
                    <div class="mb-4">
                        <i class="fas fa-check-circle text-success fa-4x mb-3"></i>
                        <h4>Congratulations!</h4>
                        <p>You've successfully completed <strong>${module.title || 'the module'}</strong></p>
                        <p class="text-success">
                            <i class="fas fa-coins me-1"></i>
                            Earned ${earnedPoints} points!
                        </p>
                    </div>
                    
                    ${quizzesAvailable ? `
                    <div class="alert alert-info">
                        <i class="fas fa-lightbulb me-2"></i>
                        <strong>Test Your Knowledge!</strong><br>
                        Take quizzes related to this module to earn more points and reinforce your learning.
                    </div>
                    ` : ''}
                    
                    <div id="module-quizzes-list" class="mt-3">
                        ${quizzes.length > 0 ? `
                            <h6>Available Quizzes:</h6>
                            ${quizzes.map(quiz => `
                                <div class="card mb-2">
                                    <div class="card-body py-2">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 class="mb-0">${quiz.title}</h6>
                                                <small class="text-muted">${quiz.description || ''}</small>
                                            </div>
                                            <a href="quiz-detail.html?id=${quiz._id}" class="btn btn-sm btn-success">
                                                Take Quiz
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        ` : `
                            <p class="text-muted">No quizzes available for this module yet.</p>
                        `}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        Continue Learning
                    </button>
                    ${quizzesAvailable ? `
                        <button type="button" class="btn btn-success" onclick="redirectToModuleQuizzes('${module._id}', '${module.title || 'this module'}')">
                            <i class="fas fa-brain me-1"></i>Take Quizzes
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('moduleCompletionModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('moduleCompletionModal'));
    modal.show();
    
    // Remove modal from DOM when hidden
    document.getElementById('moduleCompletionModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}
// Student-specific quiz loading
async function getStudentQuizzes() {
  try {
    const data = await apiCall('/student/quizzes');
    return data;
  } catch (error) {
    console.error('Get student quizzes error:', error);
    throw error;
  }
}

// Student-specific challenge loading
async function getStudentChallenges() {
  try {
    const data = await apiCall('/student/challenges');
    return data;
  } catch (error) {
    console.error('Get student challenges error:', error);
    throw error;
  }
}

// Student-specific challenge progress
async function getStudentChallengeProgress() {
  try {
    const data = await apiCall('/student/challenges/progress');
    return data;
  } catch (error) {
    console.error('Get student challenge progress error:', error);
    throw error;
  }
}

// Get general quizzes (quizzes without modules)
async function getGeneralQuizzes() {
  try {
    const data = await apiCall('/quizzes');
    if (data.data) {
      const generalQuizzes = data.data.filter(quiz => !quiz.module);
      return { ...data, data: generalQuizzes, count: generalQuizzes.length };
    }
    return data;
  } catch (error) {
    console.error('Get general quizzes error:', error);
    throw error;
  }
}
// Get user rank
async function getUserRank(timeframe = 'all') {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;

    const data = await apiCall(`/leaderboard/user-rank?timeframe=${timeframe}&userId=${currentUser.id}`);
    return data;
  } catch (error) {
    console.error('Get user rank error:', error);
    return null;
  }
}

// Get user leaderboard with pagination
async function getUserLeaderboard(timeframe = 'all', page = 1, limit = 10) {
  try {
    const data = await apiCall(`/leaderboard/users?timeframe=${timeframe}&page=${page}&limit=${limit}`);
    return data;
  } catch (error) {
    console.error('Get user leaderboard error:', error);
    throw error;
  }
}

// Get school leaderboard with pagination
async function getSchoolLeaderboard(school, page = 1, limit = 10) {
  try {
    const encodedSchool = encodeURIComponent(school);
    const data = await apiCall(`/leaderboard/schools?school=${encodedSchool}&page=${page}&limit=${limit}`);
    return data;
  } catch (error) {
    console.error('Get school leaderboard error:', error);
    throw error;
  }
}
// Points reset and management functions
function shouldResetMonthly() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Check if it's the first day of the month
    return now.getDate() === 1;
}

function shouldResetWeekly() {
    const now = new Date();
    // Check if it's Monday (0 = Sunday, 1 = Monday)
    return now.getDay() === 1;
}

function getLastResetDate(type) {
    const lastReset = localStorage.getItem(`last${type}Reset`);
    return lastReset ? new Date(lastReset) : null;
}

function setLastResetDate(type) {
    localStorage.setItem(`last${type}Reset`, new Date().toISOString());
}

async function checkAndResetPoints() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const now = new Date();
        const needsReset = {
            monthly: false,
            weekly: false
        };

        // Check monthly reset
        if (shouldResetMonthly()) {
            const lastMonthlyReset = getLastResetDate('Monthly');
            if (!lastMonthlyReset || lastMonthlyReset.getMonth() !== now.getMonth()) {
                needsReset.monthly = true;
            }
        }

        // Check weekly reset
        if (shouldResetWeekly()) {
            const lastWeeklyReset = getLastResetDate('Weekly');
            const lastResetWeek = lastWeeklyReset ? getWeekNumber(lastWeeklyReset) : null;
            const currentWeek = getWeekNumber(now);
            
            if (!lastWeeklyReset || lastResetWeek !== currentWeek) {
                needsReset.weekly = true;
            }
        }

        // If either needs reset, call the API
        if (needsReset.monthly || needsReset.weekly) {
            console.log('🔄 Points reset needed:', needsReset);
            await apiCall('/auth/reset-periodic-points', {
                method: 'POST',
                body: needsReset
            });

            // Update local storage
            if (needsReset.monthly) setLastResetDate('Monthly');
            if (needsReset.weekly) setLastResetDate('Weekly');

            // Refresh user data
            await refreshUserData();
        }
    } catch (error) {
        console.error('Error resetting points:', error);
    }
}

// Helper function to get week number
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Enhanced login function with points reset check
async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            let errorMessage = 'Login failed';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Check and reset points after login
        await checkAndResetPoints();

        updateUIForLoginStatus();

        if (data.user.role === 'admin') {
            window.location.href = 'admin-reviews.html';
        } else if (data.user.role === 'teacher') {
            window.location.href = 'teacher.html';
        } else {
            window.location.href = 'index.html';
        }

        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Enhanced refreshUserData function
async function refreshUserData() {
    try {
        if (!checkLogin()) {
            return null;
        }

        console.log('🔄 Refreshing user data...');
        
        // Get updated user profile from server
        const response = await apiCall('/auth/me');
        
        if (response && response.success) {
            const updatedUser = response.user;
            const currentUser = getCurrentUser();
            
            // Merge with existing user data
            const mergedUser = {
                ...currentUser,
                ...updatedUser,
                quizAttempts: currentUser?.quizAttempts || updatedUser.quizAttempts,
                badges: currentUser?.badges || updatedUser.badges
            };
            
            // Update localStorage
            localStorage.setItem('user', JSON.stringify(mergedUser));
            
            console.log('✅ User data refreshed:', {
                points: mergedUser.points,
                monthlyPoints: mergedUser.monthlyPoints,
                weeklyPoints: mergedUser.weeklyPoints,
                streak: mergedUser.streak
            });
            
            // Update UI elements
            updatePointsDisplay(mergedUser);
            updateUIForLoginStatus();
            
            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent('userDataUpdated', {
                detail: { user: mergedUser }
            }));
            
            return mergedUser;
        }
    } catch (error) {
        console.error('❌ Error refreshing user data:', error);
        return getCurrentUser();
    }
}

// Function to update points (call this whenever points are earned)
async function updateUserPoints(pointsToAdd, type = 'other', description = '') {
    try {
        const response = await apiCall('/auth/update-points', {
            method: 'POST',
            body: {
                points: pointsToAdd,
                type: type,
                description: description
            }
        });

        if (response.success) {
            // Update local user data
            const currentUser = getCurrentUser();
            const updatedUser = {
                ...currentUser,
                points: response.data.points,
                monthlyPoints: response.data.monthlyPoints,
                weeklyPoints: response.data.weeklyPoints
            };
            
            localStorage.setItem('user', JSON.stringify(updatedUser));
            updatePointsDisplay(updatedUser);
            
            // Trigger points update event
            window.dispatchEvent(new CustomEvent('pointsEarned', {
                detail: { 
                    points: pointsToAdd,
                    totalPoints: response.data.points,
                    type: type
                }
            }));
            
            return response.data;
        }
    } catch (error) {
        console.error('Error updating points:', error);
        throw error;
    }
}

// Enhanced page initialization
async function initializePage() {
    console.log('🚀 Initializing page...');
    
    // First, update UI with cached data for immediate display
    updateUIForLoginStatus();
    
    // Then refresh from server for latest data
    if (checkLogin()) {
        await refreshUserData();
        // Check for points reset on every page load
        await checkAndResetPoints();
    }
    
    console.log('✅ Page initialization complete');
}

// Update points display in navbar and other elements
function updatePointsDisplay(user = null) {
    const currentUser = user || getCurrentUser();
    
    if (!currentUser) return;

    const points = currentUser.points || 0;
    
    // Update navbar points
    const navbarPoints = document.getElementById('navbar-points');
    if (navbarPoints) {
        navbarPoints.textContent = points.toLocaleString();
        updatePointsLevelStyling(points, navbarPoints);
    }
    
    // Update dropdown points
    const dropdownPoints = document.getElementById('dropdown-points');
    if (dropdownPoints) {
        dropdownPoints.textContent = points.toLocaleString();
        updatePointsLevelStyling(points, dropdownPoints);
    }
    
    // Update any other points displays on the page
    const pointsDisplays = document.querySelectorAll('[data-points-display]');
    pointsDisplays.forEach(display => {
        display.textContent = points.toLocaleString();
    });
    
    // Update streak displays
    const streak = currentUser.streak || 0;
    const streakDisplays = document.querySelectorAll('[data-streak-display]');
    streakDisplays.forEach(display => {
        display.textContent = streak;
    });
    
    // Update modules completed displays
    const modulesCompleted = currentUser.modulesCompleted || 0;
    const modulesDisplays = document.querySelectorAll('[data-modules-display]');
    modulesDisplays.forEach(display => {
        display.textContent = modulesCompleted;
    });
}

// Enhanced points level styling
function updatePointsLevelStyling(points, element) {
    if (!element) return;
    
    // Remove all level classes
    element.classList.remove(
        'points-level-beginner',
        'points-level-intermediate', 
        'points-level-advanced',
        'points-level-expert',
        'points-level-master'
    );
    
    // Add appropriate level class
    let levelClass = 'points-level-beginner';
    if (points >= 1000) levelClass = 'points-level-intermediate';
    if (points >= 5000) levelClass = 'points-level-advanced';
    if (points >= 10000) levelClass = 'points-level-expert';
    if (points >= 25000) levelClass = 'points-level-master';
    
    element.classList.add(levelClass);
}

// Listen for storage events (when user data changes in other tabs)
window.addEventListener('storage', function(e) {
    if (e.key === 'user' || e.key === 'token') {
        console.log('📦 Storage updated, refreshing user data...');
        refreshUserData();
    }
});

// Listen for custom events from other parts of the app
window.addEventListener('pointsEarned', function(e) {
    console.log('🎯 Points earned event received, refreshing data...');
    refreshUserData();
});

window.addEventListener('moduleCompleted', function(e) {
    console.log('📚 Module completed event received, refreshing data...');
    refreshUserData();
});

window.addEventListener('quizCompleted', function(e) {
    console.log('🧠 Quiz completed event received, refreshing data...');
    refreshUserData();
});

// Enhanced initialization function
async function initializePage() {
    console.log('🚀 Initializing page...');
    
    // First, update UI with cached data for immediate display
    updateUIForLoginStatus();
    
    // Then refresh from server for latest data
    if (checkLogin()) {
        await refreshUserData();
    }
    
    console.log('✅ Page initialization complete');
}
// Logout Process Management
function startLogoutProcess() {
    // Close any open dropdowns
    const dropdown = bootstrap.Dropdown.getInstance(document.querySelector('.user-dropdown .nav-link'));
    if (dropdown) {
        dropdown.hide();
    }

    // Hide profile dropdown, show animated logout button
    const userMenu = document.getElementById('user-menu');
    const logoutContainer = document.getElementById('logout-button-container');
    
    if (userMenu && logoutContainer) {
        userMenu.style.display = 'none';
        logoutContainer.style.display = 'block';
        
        // Start the animation after a brief delay
        setTimeout(() => {
            performAnimatedLogout();
        }, 100);
    } else {
        // Fallback to regular logout
        logout();
    }
}

function performAnimatedLogout() {
    const logoutButton = document.getElementById('animated-logout-button');
    
    if (!logoutButton) {
        logout();
        return;
    }

    // Start the animation sequence
    if (logoutButton.state === 'default' || logoutButton.state === 'hover') {
        logoutButton.classList.add('clicked', 'animating');
        updateAnimatedButtonState(logoutButton, 'walking1');
        
        setTimeout(() => {
            logoutButton.classList.add('door-slammed');
            updateAnimatedButtonState(logoutButton, 'walking2');
            
            setTimeout(() => {
                logoutButton.classList.add('falling');
                updateAnimatedButtonState(logoutButton, 'falling1');
                
                setTimeout(() => {
                    updateAnimatedButtonState(logoutButton, 'falling2');
                    
                    setTimeout(() => {
                        updateAnimatedButtonState(logoutButton, 'falling3');
                        
                        setTimeout(() => {
                            // Complete the logout process
                            completeLogout();
                        }, 1000);
                    }, logoutButtonStates['falling2']['--walking-duration']);
                }, logoutButtonStates['falling1']['--walking-duration']);
            }, logoutButtonStates['walking2']['--figure-duration']);
        }, logoutButtonStates['walking1']['--figure-duration']);
    }
}

function completeLogout() {
    // Perform the actual logout
    if (confirm('Logging out... Click OK to confirm or Cancel to stay logged in.')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    } else {
        // If user cancels, revert to profile button
        cancelLogout();
    }
}

function cancelLogout() {
    const userMenu = document.getElementById('user-menu');
    const logoutContainer = document.getElementById('logout-button-container');
    const logoutButton = document.getElementById('animated-logout-button');
    
    if (userMenu && logoutContainer && logoutButton) {
        // Reset button state
        logoutButton.classList.remove('clicked', 'door-slammed', 'falling', 'animating');
        updateAnimatedButtonState(logoutButton, 'default');
        
        // Show profile button, hide logout button
        logoutContainer.style.display = 'none';
        userMenu.style.display = 'block';
    }
}

// Helper function to update button state
function updateAnimatedButtonState(button, state) {
    if (logoutButtonStates[state]) {
        button.state = state;
        for (let key in logoutButtonStates[state]) {
            button.style.setProperty(key, logoutButtonStates[state][key]);
        }
    }
}

// Initialize animated logout button
function initializeAnimatedLogout() {
    const logoutButton = document.getElementById('animated-logout-button');
    
    if (logoutButton) {
        logoutButton.state = 'default';

        // Mouse hover listeners
        logoutButton.addEventListener('mouseenter', () => {
            if (logoutButton.state === 'default') {
                updateAnimatedButtonState(logoutButton, 'hover');
            }
        });
        
        logoutButton.addEventListener('mouseleave', () => {
            if (logoutButton.state === 'hover') {
                updateAnimatedButtonState(logoutButton, 'default');
            }
        });

        // Click listener to cancel logout
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            cancelLogout();
        });
    }
}

// Button states configuration (same as before)
const logoutButtonStates = {
    'default': {
        '--figure-duration': '100',
        '--transform-figure': 'none',
        '--walking-duration': '100',
        '--transform-arm1': 'none',
        '--transform-wrist1': 'none',
        '--transform-arm2': 'none',
        '--transform-wrist2': 'none',
        '--transform-leg1': 'none',
        '--transform-calf1': 'none',
        '--transform-leg2': 'none',
        '--transform-calf2': 'none'
    },
    'hover': {
        '--figure-duration': '100',
        '--transform-figure': 'translateX(1.5px)',
        '--walking-duration': '100',
        '--transform-arm1': 'rotate(-5deg)',
        '--transform-wrist1': 'rotate(-15deg)',
        '--transform-arm2': 'rotate(5deg)',
        '--transform-wrist2': 'rotate(6deg)',
        '--transform-leg1': 'rotate(-10deg)',
        '--transform-calf1': 'rotate(5deg)',
        '--transform-leg2': 'rotate(20deg)',
        '--transform-calf2': 'rotate(-20deg)'
    },
    'walking1': {
        '--figure-duration': '300',
        '--transform-figure': 'translateX(11px)',
        '--walking-duration': '300',
        '--transform-arm1': 'translateX(-4px) translateY(-2px) rotate(120deg)',
        '--transform-wrist1': 'rotate(-5deg)',
        '--transform-arm2': 'translateX(4px) rotate(-110deg)',
        '--transform-wrist2': 'rotate(-5deg)',
        '--transform-leg1': 'translateX(-3px) rotate(80deg)',
        '--transform-calf1': 'rotate(-30deg)',
        '--transform-leg2': 'translateX(4px) rotate(-60deg)',
        '--transform-calf2': 'rotate(20deg)'
    },
    'walking2': {
        '--figure-duration': '400',
        '--transform-figure': 'translateX(17px)',
        '--walking-duration': '300',
        '--transform-arm1': 'rotate(60deg)',
        '--transform-wrist1': 'rotate(-15deg)',
        '--transform-arm2': 'rotate(-45deg)',
        '--transform-wrist2': 'rotate(6deg)',
        '--transform-leg1': 'rotate(-5deg)',
        '--transform-calf1': 'rotate(10deg)',
        '--transform-leg2': 'rotate(10deg)',
        '--transform-calf2': 'rotate(-20deg)'
    },
    'falling1': {
        '--figure-duration': '1600',
        '--walking-duration': '400',
        '--transform-arm1': 'rotate(-60deg)',
        '--transform-wrist1': 'none',
        '--transform-arm2': 'rotate(30deg)',
        '--transform-wrist2': 'rotate(120deg)',
        '--transform-leg1': 'rotate(-30deg)',
        '--transform-calf1': 'rotate(-20deg)',
        '--transform-leg2': 'rotate(20deg)'
    },
    'falling2': {
        '--walking-duration': '300',
        '--transform-arm1': 'rotate(-100deg)',
        '--transform-arm2': 'rotate(-60deg)',
        '--transform-wrist2': 'rotate(60deg)',
        '--transform-leg1': 'rotate(80deg)',
        '--transform-calf1': 'rotate(20deg)',
        '--transform-leg2': 'rotate(-60deg)'
    },
    'falling3': {
        '--walking-duration': '500',
        '--transform-arm1': 'rotate(-30deg)',
        '--transform-wrist1': 'rotate(40deg)',
        '--transform-arm2': 'rotate(50deg)',
        '--transform-wrist2': 'none',
        '--transform-leg1': 'rotate(-30deg)',
        '--transform-leg2': 'rotate(20deg)',
        '--transform-calf2': 'none'
    }
};

// Update your existing logout function
function logout() {
    startLogoutProcess();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeAnimatedLogout();
});
// Points reset and management functions
function shouldResetMonthly() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Check if it's the first day of the month
    return now.getDate() === 1;
}

function shouldResetWeekly() {
    const now = new Date();
    // Check if it's Monday (0 = Sunday, 1 = Monday)
    return now.getDay() === 1;
}

function getLastResetDate(type) {
    const lastReset = localStorage.getItem(`last${type}Reset`);
    return lastReset ? new Date(lastReset) : null;
}

function setLastResetDate(type) {
    localStorage.setItem(`last${type}Reset`, new Date().toISOString());
}

async function checkAndResetPoints() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const now = new Date();
        const needsReset = {
            monthly: false,
            weekly: false
        };

        // Check monthly reset
        if (shouldResetMonthly()) {
            const lastMonthlyReset = getLastResetDate('Monthly');
            if (!lastMonthlyReset || lastMonthlyReset.getMonth() !== now.getMonth()) {
                needsReset.monthly = true;
            }
        }

        // Check weekly reset
        if (shouldResetWeekly()) {
            const lastWeeklyReset = getLastResetDate('Weekly');
            const lastResetWeek = lastWeeklyReset ? getWeekNumber(lastWeeklyReset) : null;
            const currentWeek = getWeekNumber(now);
            
            if (!lastWeeklyReset || lastResetWeek !== currentWeek) {
                needsReset.weekly = true;
            }
        }

        // If either needs reset, call the API
        if (needsReset.monthly || needsReset.weekly) {
            console.log('🔄 Points reset needed:', needsReset);
            await apiCall('/auth/reset-periodic-points', {
                method: 'POST',
                body: needsReset
            });

            // Update local storage
            if (needsReset.monthly) setLastResetDate('Monthly');
            if (needsReset.weekly) setLastResetDate('Weekly');

            // Refresh user data
            await refreshUserData();
        }
    } catch (error) {
        console.error('Error resetting points:', error);
    }
}

// Helper function to get week number
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function formatPhoneNumber(phone) {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // If it's 10 digits, assume Indian number and add +91
  if (cleaned.length === 10) {
    return '+91' + cleaned;
  }
  
  // If it starts with 91 and is 12 digits, add +
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return '+' + cleaned;
  }
  
  // If it already has +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  return phone;
}
// Edit review functionality
async function editReview() {
    try {
        console.log('Edit review clicked'); // Debug log
        
        const userReview = await checkUserReview();
        if (!userReview) {
            alert('No review found to edit');
            return;
        }

        // Populate the form with existing review data
        const ratingInput = document.querySelector(`input[name="rating"][value="${userReview.rating}"]`);
        if (ratingInput) {
            ratingInput.checked = true;
        }
        document.getElementById('review-comment').value = userReview.comment;

        // Switch to edit mode
        const reviewForm = document.getElementById('review-form');
        const existingReview = document.getElementById('review-existing');
        const submitBtn = reviewForm.querySelector('button[type="submit"]');
        
        reviewForm.classList.remove('d-none');
        existingReview.classList.add('d-none');
        
        // Change submit button text and behavior
        submitBtn.textContent = 'Update Review';
        submitBtn.className = 'btn btn-warning w-100';
        
        // Remove existing event listeners and add update listener
        const newForm = reviewForm.cloneNode(true);
        reviewForm.parentNode.replaceChild(newForm, reviewForm);
        
        // Add update event listener to the new form
        document.getElementById('review-form').addEventListener('submit', updateReview);
        
        // Add cancel button if not exists
        if (!document.getElementById('cancel-edit-btn')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.id = 'cancel-edit-btn';
            cancelBtn.className = 'btn btn-outline-secondary w-100 mt-2';
            cancelBtn.textContent = 'Cancel Edit';
            cancelBtn.onclick = function(e) {
                e.preventDefault();
                cancelEdit();
            };
            document.getElementById('review-form').appendChild(cancelBtn);
        }

    } catch (error) {
        console.error('Error loading review for edit:', error);
        alert('Error loading review for editing');
    }
}
// Update review function
async function updateReview(e) {
    e.preventDefault();

    const rating = document.querySelector('input[name="rating"]:checked').value;
    const comment = document.getElementById('review-comment').value;

    try {
        const response = await apiCall('/reviews/my-review', {
            method: 'PUT',
            body: { rating, comment }
        });

        alert('Review updated successfully! It will be visible again after approval.');
        resetReviewForm();
        setupReviewForm(); // Reset form state
        loadReviews(); // Reload reviews

    } catch (error) {
        alert('Error updating review: ' + error.message);
    }
}

// Cancel edit and reset form
function cancelEdit() {
    resetReviewForm();
    setupReviewForm();
}

// Reset review form to initial state
function resetReviewForm() {
    const reviewForm = document.getElementById('review-form');
    const existingReview = document.getElementById('review-existing');
    const loginPrompt = document.getElementById('review-login-prompt');
    
    // Reset form
    reviewForm.reset();
    
    // Remove cancel button if exists
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.remove();
    }
    
    // Reset submit button
    const submitBtn = reviewForm.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Submit Review';
    submitBtn.classList.remove('btn-warning');
    submitBtn.classList.add('btn-success');
    
    // Remove update event listener and add submit listener
    reviewForm.replaceWith(reviewForm.cloneNode(true));
    const newForm = document.getElementById('review-form');
    newForm.addEventListener('submit', submitReview);
    
    // Hide form initially - setupReviewForm will handle visibility
    reviewForm.classList.add('d-none');
    existingReview.classList.add('d-none');
    loginPrompt.classList.add('d-none');
}