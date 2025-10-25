// Student Challenges Management
let studentChallenges = [];
let filteredChallenges = [];

// Load student challenges
async function loadStudentChallenges() {
    try {
        console.log('Loading student challenges...');
        const container = document.getElementById('challenges-container');
        
        // Show loading state
        container.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border text-success" role="status">
                    <span class="visually-hidden">Loading challenges...</span>
                </div>
                <p class="mt-2">Loading challenges...</p>
            </div>
        `;

        const user = getCurrentUser();
        let challengesResponse;
        
        if (user && user.role === 'student') {
            challengesResponse = await getStudentChallengeProgress();
        } else {
            challengesResponse = await getUserChallengeProgress();
        }
        
        if (challengesResponse && challengesResponse.data) {
            studentChallenges = challengesResponse.data;
            filteredChallenges = [...studentChallenges];
            
            console.log(`Loaded ${studentChallenges.length} challenges`);
            
            // Update statistics
            updateChallengeStatistics();
            
            // Display challenges
            displayChallenges();
            
            // Show/hide no challenges message
            const noChallengesMsg = document.getElementById('no-challenges-message');
            if (studentChallenges.length === 0) {
                container.innerHTML = '';
                noChallengesMsg.classList.remove('d-none');
            } else {
                noChallengesMsg.classList.add('d-none');
            }
        } else {
            console.error('No challenge data received');
            studentChallenges = [];
            filteredChallenges = [];
            displayChallenges();
        }
    } catch (error) {
        console.error('Error loading challenges:', error);
        const container = document.getElementById('challenges-container');
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading challenges: ${error.message}
                </div>
            </div>
        `;
    }
}

// Update challenge statistics
function updateChallengeStatistics() {
    const user = getCurrentUser();
    if (!user) return;

    // Calculate statistics
    const totalPoints = user.points || 0;
    const activeChallenges = studentChallenges.filter(c => !c.isCompleted && !c.isExpired).length;
    const completedChallenges = studentChallenges.filter(c => c.isCompleted).length;
    const totalChallenges = studentChallenges.length;
    
    // Calculate points from challenges (this would need backend support for accurate calculation)
    const pointsFromChallenges = studentChallenges
        .filter(c => c.isCompleted)
        .reduce((sum, challenge) => sum + (challenge.pointsReward || 0), 0);

    // Update DOM elements
    document.getElementById('total-points').textContent = totalPoints.toLocaleString();
    document.getElementById('active-challenges-count').textContent = activeChallenges;
    document.getElementById('completed-challenges-count').textContent = completedChallenges;
    document.getElementById('points-from-challenges').textContent = pointsFromChallenges.toLocaleString();

    // Update progress messages
    const completionRate = totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0;
    document.getElementById('challenges-progress').textContent = `${completionRate}% completion`;
    document.getElementById('completion-rate').textContent = `${completionRate}% success rate`;

    // Update level based on points
    const levelInfo = calculateUserLevel(totalPoints);
    document.getElementById('current-level').textContent = levelInfo.name;
}

// Calculate user level based on points
function calculateUserLevel(points) {
    const levels = [
        { min: 0, max: 50, name: "Eco-Seed" },
        { min: 50, max: 150, name: "Eco-Sprout" },
        { min: 150, max: 300, name: "Eco-Gardener" },
        { min: 300, max: 500, name: "Eco-Guardian" },
        { min: 500, max: 800, name: "Eco-Champion" },
        { min: 800, max: 1200, name: "Eco-Hero" },
        { min: 1200, max: 2000, name: "Eco-Legend" },
        { min: 2000, max: Infinity, name: "Eco-Master" }
    ];

    return levels.find(level => points >= level.min && points < level.max) || levels[0];
}

// Display challenges
function displayChallenges() {
    const container = document.getElementById('challenges-container');
    
    if (filteredChallenges.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No challenges match your current filters.
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    filteredChallenges.forEach(challenge => {
        // Get progress information
        // For custom submission challenges, derive progress from participant submissions
        const participantInfo = challenge.participantInfo || {};
        const requiresSubmission = challenge.completionCriteria?.requiresSubmission || false;
        let progress = 0;
        const target = challenge.completionCriteria?.target || 1;
        if (requiresSubmission) {
            const approved = (participantInfo.submissions || []).filter(s => s.status === 'approved').length;
            progress = approved;
        } else {
            progress = challenge.progress || 0;
        }
        const progressPercentage = Math.min(100, (progress / target) * 100);
        const isCompleted = challenge.isCompleted || false;
        const isExpired = challenge.isExpired || false;
        const challengeType = 'custom';
        
        // Determine card class based on status
        let cardClass = 'challenge-card';
        if (isCompleted) cardClass += ' challenge-completed';
        if (isExpired) cardClass += ' challenge-expired';

        // Progress text based on challenge type
        let progressText = '';
        // Only 'custom' challenges are supported. Show approved submission counts for submission-based challenges.
        if (requiresSubmission) {
            progressText = `Approved Submissions: ${progress}/${target}`;
        } else {
            progressText = `Progress: ${progress}/${target}`;
        }

        // Status badge
        let statusBadge = '';
        if (isCompleted) {
            statusBadge = '<span class="badge bg-success status-badge"><i class="fas fa-check-circle me-1"></i>Completed</span>';
        } else if (isExpired) {
            statusBadge = '<span class="badge bg-secondary status-badge"><i class="fas fa-clock me-1"></i>Expired</span>';
        } else {
            statusBadge = '<span class="badge bg-warning status-badge"><i class="fas fa-spinner me-1"></i>Active</span>';
        }

        // Action buttons
        let actionButtons = '';
        if (!isCompleted && !isExpired) {
            if (requiresSubmission) {
                const hasSubmissions = participantInfo.submissions && participantInfo.submissions.length > 0;
                
                actionButtons = `
                    <div class="challenge-actions mt-3">
                        <button class="btn btn-success me-2" onclick="openSubmissionModal('${challenge._id}')">
                            <i class="fas fa-upload me-1"></i>Submit Work
                        </button>
                        ${hasSubmissions ? `
                            <button class="btn btn-outline-info" onclick="viewMySubmissions('${challenge._id}')">
                                <i class="fas fa-history me-1"></i>View Submissions
                            </button>
                        ` : ''}
                    </div>
                `;
            } else {
                actionButtons = `
                    <div class="challenge-actions mt-3">
                        <button class="btn btn-outline-secondary" disabled>
                            ${getAutoTrackingMessage(challengeType)}
                        </button>
                    </div>
                `;
            }
        } else if (isCompleted) {
            actionButtons = `
                <div class="challenge-actions mt-3">
                    <button class="btn btn-outline-success" disabled>
                        <i class="fas fa-trophy me-1"></i>Challenge Completed!
                    </button>
                </div>
            `;
        } else {
            actionButtons = `
                <div class="challenge-actions mt-3">
                    <button class="btn btn-outline-secondary" disabled>
                        <i class="fas fa-clock me-1"></i>Challenge Expired
                    </button>
                </div>
            `;
        }

        // Submission info (for custom challenges)
        let submissionInfo = '';
        if (requiresSubmission) {
            const pending = (participantInfo.submissions || []).filter(s => s.status === 'pending').length;
            const approved = (participantInfo.submissions || []).filter(s => s.status === 'approved').length;
            
            submissionInfo = `
                <div class="mt-2">
                    <small class="text-muted">
                        <i class="fas fa-paper-plane me-1"></i>
                        ${pending} pending, ${approved} approved submissions
                    </small>
                </div>
            `;
        }

        // Challenge instructions (if available)
        let instructions = '';
        if (challenge.completionCriteria?.submissionInstructions) {
            instructions = `
                <div class="alert alert-light border mb-3">
                    <small><strong>Submission Instructions:</strong> ${challenge.completionCriteria.submissionInstructions}</small>
                </div>
            `;
        }

        // Days remaining
        let daysRemaining = '';
        if (challenge.daysRemaining !== undefined && challenge.daysRemaining !== null && !isCompleted && !isExpired) {
            daysRemaining = `
                <div class="mt-2">
                    <small class="text-info">
                        <i class="fas fa-calendar me-1"></i>
                        ${challenge.daysRemaining} days remaining
                    </small>
                </div>
            `;
        }

        html += `
            <div class="col-md-6 mb-4">
                <div class="card ${cardClass}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <h5 class="card-title">${challenge.title}</h5>
                            ${statusBadge}
                        </div>
                        
                        <p class="card-text">${challenge.description}</p>
                        
                        ${instructions}
                        
                        <!-- Challenge Meta -->
                        <div class="challenge-meta mb-3">
                            <span class="badge bg-info me-1">${getChallengeTypeLabel(challengeType, requiresSubmission)}</span>
                            <span class="badge bg-warning me-1">${challenge.pointsReward || 100} points</span>
                            <span class="badge bg-primary">${challenge.duration || 7} days</span>
                        </div>
                        
                        <!-- Progress Section -->
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <small class="text-muted">Progress</small>
                                <small class="text-muted">${Math.round(progressPercentage)}%</small>
                            </div>
                            <div class="progress mb-2">
                                <div class="progress-bar ${isCompleted ? 'bg-success' : 'bg-primary'}" 
                                     role="progressbar" 
                                     style="width: ${progressPercentage}%;" 
                                     aria-valuenow="${progressPercentage}" 
                                     aria-valuemin="0" 
                                     aria-valuemax="100">
                                </div>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">${progressText}</small>
                                <small class="text-success">+${challenge.pointsReward || 100} points</small>
                            </div>
                        </div>
                        
                        ${daysRemaining}
                        ${submissionInfo}
                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function getChallengeTypeLabel(type, requiresSubmission) {
  // Only show custom challenge labels
  const labels = {
    'custom': requiresSubmission ? 'Project Submission' : 'Custom Goal'
  };
  return labels[type] || 'Challenge';
}

function getAutoTrackingMessage(type) {
  // Only for custom challenges
  const messages = {
    'custom': 'Submit work for approval'
  };
  return messages[type] || 'Submit work for approval';
}

// Filter challenges
function filterChallenges() {
    const statusFilter = document.getElementById('status-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;
    
    filteredChallenges = studentChallenges.filter(challenge => {
        // Status filter
        let statusMatch = true;
        if (statusFilter === 'active') {
            statusMatch = !challenge.isCompleted && !challenge.isExpired;
        } else if (statusFilter === 'completed') {
            statusMatch = challenge.isCompleted;
        } else if (statusFilter === 'expired') {
            statusMatch = challenge.isExpired;
        }
        
        // Type filter
        let typeMatch = true;
        if (typeFilter === 'submission') {
            typeMatch = challenge.completionCriteria?.requiresSubmission || false;
        } else if (typeFilter === 'auto') {
            typeMatch = !challenge.completionCriteria?.requiresSubmission;
        }
        
        return statusMatch && typeMatch;
    });
    
    // Sort challenges
    filteredChallenges.sort((a, b) => {
        switch (sortFilter) {
            case 'deadline':
                const dateA = a.endDate ? new Date(a.endDate) : new Date();
                const dateB = b.endDate ? new Date(b.endDate) : new Date();
                return dateA - dateB;
                
            case 'points':
                return (b.pointsReward || 0) - (a.pointsReward || 0);
                
            case 'progress':
                return (b.progress || 0) - (a.progress || 0);
                
            case 'newest':
            default:
                const createdA = a.createdAt ? new Date(a.createdAt) : new Date();
                const createdB = b.createdAt ? new Date(b.createdAt) : new Date();
                return createdB - createdA;
        }
    });
    
    displayChallenges();
}

// Reset filters
function resetFilters() {
    document.getElementById('status-filter').value = 'all';
    document.getElementById('type-filter').value = 'all';
    document.getElementById('sort-filter').value = 'newest';
    
    filteredChallenges = [...studentChallenges];
    displayChallenges();
}

// Refresh challenges
async function refreshChallenges() {
    try {
        const refreshBtn = document.querySelector('button[onclick="refreshChallenges()"]');
        const originalHtml = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Refreshing...';
        refreshBtn.disabled = true;
        
        await loadStudentChallenges();
        
        refreshBtn.innerHTML = originalHtml;
        refreshBtn.disabled = false;
        
    } catch (error) {
        console.error('Error refreshing challenges:', error);
        const refreshBtn = document.querySelector('button[onclick="refreshChallenges()"]');
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Refresh';
        refreshBtn.disabled = false;
    }
}

// Open submission modal
function openSubmissionModal(challengeId) {
    const challenge = studentChallenges.find(c => c._id === challengeId);
    if (!challenge) {
        alert('Challenge not found');
        return;
    }
    
    document.getElementById('submission-challenge-id').value = challengeId;
    document.getElementById('submission-form').reset();
    
    const instructionsContainer = document.getElementById('submission-instructions');
    if (challenge.completionCriteria?.submissionInstructions) {
        instructionsContainer.innerHTML = `
            <i class="fas fa-info-circle me-2"></i>
            <strong>Submission Instructions:</strong> ${challenge.completionCriteria.submissionInstructions}
        `;
    } else {
        instructionsContainer.innerHTML = `
            <i class="fas fa-info-circle me-2"></i>
            Your submission will be reviewed by a teacher. You'll earn progress when it's approved.
        `;
    }
    
    const modal = new bootstrap.Modal(document.getElementById('submissionModal'));
    modal.show();
}

// View submission history
async function viewMySubmissions(challengeId) {
    try {
        const response = await getMySubmissions();
        const submissions = response.data.filter(sub => sub.challengeId === challengeId);
        
        const container = document.getElementById('submissions-list');
        if (submissions.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No submissions yet.</p>';
        } else {
            let html = '';
            submissions.forEach((sub, index) => {
                const statusBadge = sub.status === 'approved' ? 'bg-success' : 
                                   sub.status === 'rejected' ? 'bg-danger' : 'bg-warning';
                const statusText = sub.status === 'approved' ? 'Approved' :
                                  sub.status === 'rejected' ? 'Rejected' : 'Pending Review';
                
                html += `
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <h6>Submission #${index + 1}</h6>
                                <span class="badge ${statusBadge}">${statusText}</span>
                            </div>
                            <p class="mt-2"><strong>Work:</strong> ${sub.submission || 'No content'}</p>
                            ${sub.description ? `<p><strong>Description:</strong> ${sub.description}</p>` : ''}
                            <p class="small text-muted mb-1">Submitted: ${new Date(sub.submittedAt).toLocaleDateString()}</p>
                            ${sub.reviewedAt ? `<p class="small text-muted">Reviewed: ${new Date(sub.reviewedAt).toLocaleDateString()}</p>` : ''}
                            ${sub.feedback ? `<div class="alert alert-info mt-2"><strong>Teacher Feedback:</strong> ${sub.feedback}</div>` : ''}
                            ${sub.pointsAwarded > 0 ? `<p class="text-success"><strong>Points Awarded:</strong> ${sub.pointsAwarded}</p>` : ''}
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('submissionsHistoryModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading submissions:', error);
        alert('Error loading submission history: ' + error.message);
    }
}

// Submit work
async function submitWork() {
    const challengeId = document.getElementById('submission-challenge-id').value;
    const submission = document.getElementById('submission-text').value;
    const description = document.getElementById('submission-description').value;
    
    if (!submission.trim()) {
        alert('Please provide your work submission');
        return;
    }
    
    try {
        const submitBtn = document.getElementById('submit-work-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Submitting...';
        submitBtn.disabled = true;
        
        await submitChallengeWork(challengeId, {
            submission: submission.trim(),
            description: description.trim()
        });
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        alert('Work submitted successfully! It will be reviewed by a teacher.');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('submissionModal'));
        modal.hide();
        
        await loadStudentChallenges();
    } catch (error) {
        console.error('Error submitting work:', error);
        alert('Error submitting work: ' + error.message);
        
        const submitBtn = document.getElementById('submit-work-btn');
        submitBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Submit Work';
        submitBtn.disabled = false;
    }
}

// Auto-refresh
let autoRefreshInterval;

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(async () => {
        if (document.visibilityState === 'visible') {
            console.log('Auto-refreshing challenges...');
            await loadStudentChallenges();
        }
    }, 60000); // Refresh every minute
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    if (!checkLogin()) {
        alert('Please login to access challenges');
        window.location.href = 'login.html';
        return;
    }
    
    loadStudentChallenges();
    startAutoRefresh();
    
    // Add event listeners for filters
    document.getElementById('status-filter').addEventListener('change', filterChallenges);
    document.getElementById('type-filter').addEventListener('change', filterChallenges);
    document.getElementById('sort-filter').addEventListener('change', filterChallenges);
    
    // Add submission event listener
    document.getElementById('submit-work-btn').addEventListener('click', submitWork);
    
    updateUIForLoginStatus();
});

// Clean up on page unload
window.addEventListener('beforeunload', stopAutoRefresh);