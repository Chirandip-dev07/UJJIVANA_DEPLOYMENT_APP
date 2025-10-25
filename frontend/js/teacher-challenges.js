let currentTeacher = null;
let allChallenges = [];
let allSubmissions = [];
let filteredSubmissions = [];
let autoRefreshInterval;

function checkTeacher() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role === "teacher";
}

async function loadTeacherChallenges() {
    if (!checkTeacher()) {
        window.location.href = 'login.html';
        return;
    }
    currentTeacher = JSON.parse(localStorage.getItem('user') || '{}');
    try {
        console.log('Loading teacher challenges...');
        // Use teacher-specific endpoint which returns challenges created by this teacher
        // and includes populated participant user info. The public /challenges route
        // intentionally excludes participants for student listing.
        const response = await apiCall('/challenges/teacher');
        // Ensure we only keep challenges from this teacher's school as a safety
        allChallenges = (response.data || []).filter(challenge => challenge.school === currentTeacher.school);
        console.log(`Loaded ${allChallenges.length} challenges for teacher`);
        displayChallenges();
        
        // Load ALL submissions after challenges are loaded
        await loadAllTeacherSubmissions();
    } catch (error) {
        console.error('Error loading challenges:', error);
        document.getElementById('challenges-container').innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Error loading challenges. Please try again.
                </div>
            </div>
        `;
    }
}

function displayChallenges() {
    const container = document.getElementById('challenges-container');
    if (allChallenges.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-tasks fa-3x text-muted mb-3"></i>
                <h4>No challenges created yet</h4>
                <p class="text-muted">Create your first challenge to engage students</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    allChallenges.forEach(challenge => {
        const participantsCount = challenge.participants?.length || 0;
        const completedCount = challenge.participants?.filter(p => p.completed)?.length || 0;
        const completionRate = participantsCount > 0 ? Math.round((completedCount / participantsCount) * 100) : 0;
        
        // Count pending submissions for this challenge
        const challengeSubmissions = allSubmissions.filter(sub => sub.challengeId === challenge._id);
        const pendingSubmissions = challengeSubmissions.filter(sub => sub.status === 'pending').length;
        
        html += `
            <div class="col-md-6 mb-4">
                <div class="card challenge-card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <h5 class="card-title">${challenge.title}</h5>
                            <span class="badge ${challenge.isActive ? 'bg-success' : 'bg-secondary'}">
                                ${challenge.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p class="card-text">${challenge.description}</p>
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="badge bg-info category-badge">${formatCategory(challenge.category)}</span>
                            <span class="badge bg-warning">${challenge.pointsReward} points</span>
                            <span class="badge bg-primary">${challenge.duration} days</span>
                        </div>
                        <div class="participant-progress">
                            <div class="d-flex justify-content-between mb-1">
                                <small>Participants: ${participantsCount}</small>
                                <small>Completed: ${completedCount}</small>
                            </div>
                            <div class="progress progress-sm mb-2">
                                <div class="progress-bar" style="width: ${completionRate}%"></div>
                            </div>
                            <small class="text-muted">Completion rate: ${completionRate}%</small>
                        </div>
                        
                        ${challenge.completionCriteria?.requiresSubmission ? `
                            <div class="mt-2">
                                <small class="text-warning">
                                    <i class="fas fa-tasks me-1"></i>
                                    ${pendingSubmissions} pending submission(s)
                                </small>
                            </div>
                        ` : ''}
                        
                        <div class="btn-group w-100">
                            <button class="btn btn-outline-primary btn-sm" onclick="editChallenge('${challenge._id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-outline-info btn-sm" onclick="viewParticipants('${challenge._id}')">
                                <i class="fas fa-users"></i> Participants
                            </button>
                            <button class="btn btn-outline-warning btn-sm" onclick="viewChallengeSubmissions('${challenge._id}')">
                                <i class="fas fa-tasks"></i> Submissions
                                ${pendingSubmissions > 0 ? `<span class="badge bg-danger ms-1">${pendingSubmissions}</span>` : ''}
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="toggleChallengeStatus('${challenge._id}')">
                                ${challenge.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteChallenge('${challenge._id}')">
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

function formatCategory(category) {
    const categories = {
        'waste-reduction': 'Waste Reduction',
        'energy-conservation': 'Energy Conservation',
        'water-preservation': 'Water Preservation',
        'biodiversity': 'Biodiversity',
        'sustainable-living': 'Sustainable Living'
    };
    return categories[category] || category;
}

// LOAD ALL SUBMISSIONS - FIXED VERSION WITH PROPER USER NAME HANDLING
async function loadAllTeacherSubmissions() {
    try {
        console.log('Loading ALL submissions for teacher...');
        const submissionsContainer = document.getElementById('teacher-submissions-list');
        
        submissionsContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-success"></div>
                <p class="mt-2">Loading all submissions...</p>
            </div>
        `;

        const submissionChallenges = allChallenges.filter(challenge => 
            challenge.completionCriteria?.requiresSubmission
        );

        console.log(`Found ${submissionChallenges.length} submission challenges`);

        if (submissionChallenges.length === 0) {
            allSubmissions = [];
            filteredSubmissions = [];
            displayTeacherSubmissions();
            return;
        }

        // Load submissions for ALL challenges in parallel
        const submissionPromises = submissionChallenges.map(async (challenge) => {
            try {
                console.log(`Loading submissions for: "${challenge.title}"`);
                const response = await apiCall(`/submissions/challenge/${challenge._id}/submissions`);
                
                if (response.data && response.data.length > 0) {
                    console.log(`Found ${response.data.length} submissions for "${challenge.title}"`);
                    
                    // Process each submission to get proper participant names
                    const processedSubmissions = await Promise.all(
                        response.data.map(async (sub) => {
                            let participantName = 'Student';
                            let participantEmail = '';
                            let participantSchool = '';

                            // Check if user data is populated or just an ID
                            const userData = sub.participant?.user;
                            
                            if (userData) {
                                if (typeof userData === 'object' && userData.name) {
                                    // User data is already populated
                                    participantName = userData.name;
                                    participantEmail = userData.email || '';
                                    participantSchool = userData.school || '';
                                } else if (typeof userData === 'string') {
                                    // User data is just an ID, we need to fetch user details
                                    try {
                                        const userResponse = await apiCall(`/admin/users/${userData}`);
                                        if (userResponse.data) {
                                            participantName = userResponse.data.name || 'Student';
                                            participantEmail = userResponse.data.email || '';
                                            participantSchool = userResponse.data.school || '';
                                        }
                                    } catch (userError) {
                                        console.error(`Error fetching user ${userData}:`, userError);
                                        participantName = `Student (${userData.substring(0, 8)}...)`;
                                    }
                                }
                            }

                            return {
                                ...sub,
                                challengeTitle: challenge.title,
                                challengeId: challenge._id,
                                challengePoints: challenge.pointsReward,
                                participantName: participantName,
                                participantEmail: participantEmail,
                                participantSchool: participantSchool
                            };
                        })
                    );
                    
                    return processedSubmissions;
                }
                return [];
            } catch (error) {
                console.error(`Error loading submissions for ${challenge.title}:`, error);
                return [];
            }
        });

        // Wait for all requests to complete
        const submissionResults = await Promise.all(submissionPromises);
        
        // Combine all submissions
        allSubmissions = submissionResults.flat();
        filteredSubmissions = [...allSubmissions];
        
        console.log(`TOTAL SUBMISSIONS LOADED: ${allSubmissions.length} from ${submissionChallenges.length} challenges`);

        // Populate filters and display
        populateChallengeFilter();
        displayTeacherSubmissions();
        
    } catch (error) {
        console.error('Error loading all submissions:', error);
        document.getElementById('teacher-submissions-list').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading submissions: ${error.message}
            </div>
        `;
    }
}

// View submissions for specific challenge - UPDATED WITH USER NAME FIX
async function viewChallengeSubmissions(challengeId) {
    try {
        const challenge = allChallenges.find(c => c._id === challengeId);
        if (!challenge) {
            alert('Challenge not found');
            return;
        }

        console.log(`Loading submissions for specific challenge: ${challenge.title}`);
        
        const submissionsContainer = document.getElementById('teacher-submissions-list');
        submissionsContainer.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-success"></div>
                <p class="mt-2">Loading submissions for "${challenge.title}"...</p>
            </div>
        `;

        // Load submissions for this specific challenge
        const response = await apiCall(`/submissions/challenge/${challengeId}/submissions`);
        
        if (response.data && response.data.length > 0) {
            // Process each submission to get proper participant names
            const processedSubmissions = await Promise.all(
                response.data.map(async (sub) => {
                    let participantName = 'Student';
                    let participantEmail = '';
                    let participantSchool = '';

                    const userData = sub.participant?.user;
                    
                    if (userData) {
                        if (typeof userData === 'object' && userData.name) {
                            // User data is already populated
                            participantName = userData.name;
                            participantEmail = userData.email || '';
                            participantSchool = userData.school || '';
                        } else if (typeof userData === 'string') {
                            // User data is just an ID, fetch user details
                            try {
                                const userResponse = await apiCall(`/admin/users/${userData}`);
                                if (userResponse.data) {
                                    participantName = userResponse.data.name || 'Student';
                                    participantEmail = userResponse.data.email || '';
                                    participantSchool = userResponse.data.school || '';
                                }
                            } catch (userError) {
                                console.error(`Error fetching user ${userData}:`, userError);
                                participantName = `Student (${userData.substring(0, 8)}...)`;
                            }
                        }
                    }

                    return {
                        ...sub,
                        challengeTitle: challenge.title,
                        challengeId: challenge._id,
                        challengePoints: challenge.pointsReward,
                        participantName: participantName,
                        participantEmail: participantEmail,
                        participantSchool: participantSchool
                    };
                })
            );
            
            allSubmissions = processedSubmissions;
            filteredSubmissions = [...allSubmissions];
            
            console.log(`Loaded ${allSubmissions.length} submissions for "${challenge.title}"`);
        } else {
            allSubmissions = [];
            filteredSubmissions = [];
            console.log(`No submissions found for "${challenge.title}"`);
        }

        // Update filter to show only this challenge
        populateChallengeFilter();
        document.getElementById('submission-challenge-filter').value = challenge.title;
        
        // Display submissions
        displayTeacherSubmissions();
        
        // Scroll to submissions section
        document.getElementById('submissions-management').scrollIntoView({ 
            behavior: 'smooth' 
        });
        
    } catch (error) {
        console.error('Error loading challenge submissions:', error);
        alert('Error loading submissions: ' + error.message);
    }
}

// Populate challenge filter dropdown
function populateChallengeFilter() {
    const filterSelect = document.getElementById('submission-challenge-filter');
    
    // Get unique challenge titles from all submissions
    const challengeTitles = [...new Set(allSubmissions.map(sub => sub.challengeTitle))];
    
    filterSelect.innerHTML = '<option value="all">All Challenges</option>';
    
    challengeTitles.forEach(challengeTitle => {
        const option = document.createElement('option');
        option.value = challengeTitle;
        option.textContent = challengeTitle;
        filterSelect.appendChild(option);
    });
}

// Filter submissions
function filterSubmissions() {
    const challengeFilter = document.getElementById('submission-challenge-filter').value;
    const statusFilter = document.getElementById('submission-status-filter').value;
    const sortOrder = document.getElementById('submission-sort').value;
    
    filteredSubmissions = allSubmissions.filter(sub => {
        const challengeMatch = challengeFilter === 'all' || sub.challengeTitle === challengeFilter;
        const statusMatch = statusFilter === 'all' || sub.status === statusFilter;
        return challengeMatch && statusMatch;
    });
    
    // Sort submissions
    filteredSubmissions.sort((a, b) => {
        const dateA = new Date(a.submittedAt);
        const dateB = new Date(b.submittedAt);
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    displayTeacherSubmissions();
}

// Display submissions
function displayTeacherSubmissions() {
    const container = document.getElementById('teacher-submissions-list');
    
    if (filteredSubmissions.length === 0) {
        let message = '';
        if (allSubmissions.length === 0) {
            // No submissions at all
            const submissionChallenges = allChallenges.filter(challenge => 
                challenge.completionCriteria?.requiresSubmission
            );
            
            message = `
                <div class="text-center py-5">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h5>No Submissions Yet</h5>
                    <p class="text-muted">
                        Students haven't submitted any work for your challenges yet.<br>
                        When they do, submissions will appear here automatically.
                    </p>
                    ${submissionChallenges.length > 0 ? `
                        <div class="mt-3">
                            <div class="alert alert-info">
                                <h6>Your Submission Challenges:</h6>
                                <ul class="mb-0">
                                    ${submissionChallenges.map(c => `<li>${c.title}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            // Submissions exist but don't match current filters
            message = `
                <div class="text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h5>No Matching Submissions</h5>
                    <p class="text-muted">
                        No submissions match your current filters.<br>
                        Try changing the challenge or status filter.
                    </p>
                    <button class="btn btn-outline-primary mt-2" onclick="resetFilters()">
                        <i class="fas fa-refresh me-1"></i> Show All Submissions
                    </button>
                </div>
            `;
        }
        
        container.innerHTML = message;
        return;
    }
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <small class="text-muted">Showing ${filteredSubmissions.length} submission(s)</small>
            <small class="text-muted">
                <span class="badge bg-warning">${filteredSubmissions.filter(s => s.status === 'pending').length} pending</span>
                <span class="badge bg-success ms-1">${filteredSubmissions.filter(s => s.status === 'approved').length} approved</span>
                <span class="badge bg-danger ms-1">${filteredSubmissions.filter(s => s.status === 'rejected').length} rejected</span>
            </small>
        </div>
    `;
    
    filteredSubmissions.forEach((submission, index) => {
        const statusBadge = {
            'pending': { class: 'bg-warning', icon: 'fa-clock', text: 'Pending Review' },
            'approved': { class: 'bg-success', icon: 'fa-check-circle', text: 'Approved' },
            'rejected': { class: 'bg-danger', icon: 'fa-times-circle', text: 'Rejected' }
        }[submission.status] || { class: 'bg-secondary', icon: 'fa-question', text: 'Unknown' };
        
        const submittedDate = new Date(submission.submittedAt).toLocaleDateString();
        const submittedTime = new Date(submission.submittedAt).toLocaleTimeString();
        
        html += `
            <div class="submission-item card mb-3 ${submission.status}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="flex-grow-1">
                            <h6 class="card-title mb-1">${submission.challengeTitle}</h6>
                            <p class="text-muted mb-1">
                                <i class="fas fa-user me-1"></i>
                                ${submission.participantName}
                                ${submission.participantEmail ? `
                                    <br><small class="text-muted">
                                        <i class="fas fa-envelope me-1"></i>
                                        ${submission.participantEmail}
                                    </small>
                                ` : ''}
                                ${submission.participantSchool ? `
                                    <br><small class="text-muted">
                                        <i class="fas fa-school me-1"></i>
                                        ${submission.participantSchool}
                                    </small>
                                ` : ''}
                            </p>
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>
                                Submitted: ${submittedDate} at ${submittedTime}
                            </small>
                        </div>
                        <span class="badge ${statusBadge.class}">
                            <i class="fas ${statusBadge.icon} me-1"></i>${statusBadge.text}
                        </span>
                    </div>
                    
                    ${submission.description ? `
                        <div class="mb-3">
                            <strong>Description:</strong>
                            <p class="mb-2 p-2 bg-light rounded">${submission.description}</p>
                        </div>
                    ` : ''}
                    
                    ${submission.submission ? `
                        <div class="mb-3">
                            <strong>Submission Content:</strong>
                            <div class="submission-content p-2 bg-light rounded">
                                ${submission.submission}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${submission.feedback ? `
                        <div class="alert alert-info">
                            <strong>Your Feedback:</strong>
                            <p class="mb-0">${submission.feedback}</p>
                            ${submission.pointsAwarded > 0 ? `
                                <small class="text-success mt-1 d-block">
                                    <i class="fas fa-star me-1"></i>
                                    Awarded ${submission.pointsAwarded} bonus points
                                </small>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    ${submission.status === 'pending' ? `
                        <div class="submission-actions">
                            <button class="btn btn-success btn-sm" onclick="openReviewModal('${submission._id}')">
                                <i class="fas fa-check me-1"></i> Review Submission
                            </button>
                        </div>
                    ` : `
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                Reviewed: ${submission.reviewedAt ? new Date(submission.reviewedAt).toLocaleDateString() : 'Not reviewed'}
                            </small>
                            <button class="btn btn-outline-primary btn-sm" onclick="openReviewModal('${submission._id}')">
                                <i class="fas fa-edit me-1"></i> Update Review
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Reset filters
function resetFilters() {
    document.getElementById('submission-challenge-filter').value = 'all';
    document.getElementById('submission-status-filter').value = 'all';
    document.getElementById('submission-sort').value = 'newest';
    
    filteredSubmissions = [...allSubmissions];
    displayTeacherSubmissions();
}

// Refresh submissions
async function refreshSubmissions() {
    try {
        const refreshBtn = document.querySelector('button[onclick="refreshSubmissions()"]');
        const originalHtml = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Refreshing...';
        refreshBtn.disabled = true;
        
        await loadAllTeacherSubmissions();
        
        refreshBtn.innerHTML = originalHtml;
        refreshBtn.disabled = false;
        
    } catch (error) {
        console.error('Error refreshing submissions:', error);
        const refreshBtn = document.querySelector('button[onclick="refreshSubmissions()"]');
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Refresh';
        refreshBtn.disabled = false;
    }
}

// Open review modal
function openReviewModal(submissionId) {
    const submission = allSubmissions.find(s => s._id === submissionId);
    if (!submission) {
        alert('Submission not found');
        return;
    }
    
    document.getElementById('review-challenge-id').value = submission.challengeId;
    document.getElementById('review-participant-id').value = submission.participant._id;
    document.getElementById('review-submission-id').value = submission._id;
    
    const contentContainer = document.getElementById('review-submission-content');
    contentContainer.innerHTML = `
        <div class="mb-4">
            <h6>${submission.challengeTitle}</h6>
            <p class="text-muted mb-2">
                <i class="fas fa-user me-1"></i>
                Student: ${submission.participantName}
                ${submission.participantEmail ? `
                    <br><small class="text-muted">
                        <i class="fas fa-envelope me-1"></i>
                        ${submission.participantEmail}
                    </small>
                ` : ''}
                ${submission.participantSchool ? `
                    <br><small class="text-muted">
                        <i class="fas fa-school me-1"></i>
                        ${submission.participantSchool}
                    </small>
                ` : ''}
            </p>
            <p class="text-muted">
                <i class="fas fa-clock me-1"></i>
                Submitted: ${new Date(submission.submittedAt).toLocaleString()}
            </p>
        </div>
        
        ${submission.description ? `
            <div class="mb-3">
                <strong>Student's Description:</strong>
                <p class="p-2 bg-light rounded">${submission.description}</p>
            </div>
        ` : ''}
        
        ${submission.submission ? `
            <div class="mb-3">
                <strong>Submission:</strong>
                <div class="p-2 bg-light rounded submission-content">
                    ${submission.submission}
                </div>
            </div>
        ` : ''}
        
        <hr>
    `;
    
    if (submission.status === 'approved') {
        document.getElementById('status-approved').checked = true;
    } else if (submission.status === 'rejected') {
        document.getElementById('status-rejected').checked = true;
    } else {
        document.querySelectorAll('input[name="reviewStatus"]').forEach(radio => {
            radio.checked = false;
        });
    }
    
    document.getElementById('review-feedback').value = submission.feedback || '';
    document.getElementById('review-points').value = submission.pointsAwarded || 0;
    
    const pointsSection = document.getElementById('points-section');
    pointsSection.style.display = 'none';
    
    document.getElementById('status-approved').addEventListener('change', function() {
        pointsSection.style.display = this.checked ? 'block' : 'none';
    });
    
    const modal = new bootstrap.Modal(document.getElementById('reviewSubmissionModal'));
    modal.show();
}

// Submit review
async function submitReview() {
    const challengeId = document.getElementById('review-challenge-id').value;
    const participantId = document.getElementById('review-participant-id').value;
    const submissionId = document.getElementById('review-submission-id').value;
    
    const status = document.querySelector('input[name="reviewStatus"]:checked')?.value;
    const feedback = document.getElementById('review-feedback').value;
    const pointsAwarded = parseInt(document.getElementById('review-points').value) || 0;
    
    if (!status) {
        alert('Please select a status (Approve or Reject)');
        return;
    }
    
    try {
        const submitBtn = document.getElementById('submit-review-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Submitting...';
        submitBtn.disabled = true;
        
        const reviewData = {
            status: status,
            feedback: feedback.trim() || undefined,
            pointsAwarded: pointsAwarded
        };
        
        await apiCall(
            `/submissions/challenge/${challengeId}/participant/${participantId}/submission/${submissionId}/review`,
            {
                method: 'PUT',
                body: reviewData
            }
        );
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        alert(`Submission ${status} successfully!`);
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('reviewSubmissionModal'));
        modal.hide();
        
        await loadAllTeacherSubmissions();
        await loadTeacherChallenges();
        
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('Error submitting review: ' + error.message);
        
        const submitBtn = document.getElementById('submit-review-btn');
        submitBtn.innerHTML = '<i class="fas fa-check me-1"></i> Submit Review';
        submitBtn.disabled = false;
    }
}

// Existing challenge functions
async function saveChallenge() {
    console.log('Starting challenge creation...');
    const challengeId = document.getElementById('challengeId').value;
    const title = document.getElementById('challengeTitle').value;
    const description = document.getElementById('challengeDescription').value;
    const category = document.getElementById('challengeCategory').value;
    const pointsReward = parseInt(document.getElementById('challengePoints').value);
    const duration = parseInt(document.getElementById('challengeDuration').value);
    const completionType = document.getElementById('completionType').value;
    const target = parseInt(document.getElementById('challengeTarget').value);
    const isActive = document.getElementById('challengeActive').checked;

    if (!title || !description) {
        alert('Please fill in all required fields: Title and Description');
        return;
    }

    if (isNaN(pointsReward) || pointsReward < 1) {
        alert('Points reward must be at least 1');
        return;
    }

    if (isNaN(duration) || duration < 1) {
        alert('Duration must be at least 1 day');
        return;
    }

    if (isNaN(target) || target < 1) {
        alert('Completion target must be at least 1');
        return;
    }

    const requiresSubmission = completionType === 'custom';
    const submissionInstructions = requiresSubmission ? 
        document.getElementById('submissionInstructions')?.value || 'Please submit your work for review' : 
        undefined;
    const submissionType = requiresSubmission ? 
        document.getElementById('submissionType')?.value || 'any' : 
        undefined;

    const challengeData = {
        title: title,
        description: description,
        category: category,
        pointsReward: pointsReward,
        duration: duration,
        completionCriteria: {
            type: completionType,
            target: target,
            requiresSubmission: requiresSubmission,
            submissionInstructions: submissionInstructions,
            submissionType: submissionType
        },
        isActive: isActive,
        school: currentTeacher.school
    };

    console.log('Sending challenge data:', challengeData);

    try {
        let response;
        if (challengeId) {
            response = await apiCall(`/challenges/${challengeId}`, {
                method: 'PUT',
                body: challengeData
            });
            alert('Challenge updated successfully!');
        } else {
            response = await apiCall('/challenges', {
                method: 'POST',
                body: challengeData
            });
            alert('Challenge created successfully!');
        }
        
        console.log('Challenge saved successfully:', response);
        const modal = bootstrap.Modal.getInstance(document.getElementById('challengeModal'));
        if (modal) {
            modal.hide();
        }
        await loadTeacherChallenges();
    } catch (error) {
        console.error('Error saving challenge:', error);
        alert('Error saving challenge: ' + error.message);
    }
}

function editChallenge(challengeId) {
    const challenge = allChallenges.find(c => c._id === challengeId);
    if (!challenge) return;

    document.getElementById('challengeId').value = challenge._id;
    document.getElementById('challengeTitle').value = challenge.title;
    document.getElementById('challengeDescription').value = challenge.description;
    document.getElementById('challengeCategory').value = challenge.category;
    document.getElementById('challengePoints').value = challenge.pointsReward;
    document.getElementById('challengeDuration').value = challenge.duration;
    document.getElementById('completionType').value = challenge.completionCriteria?.type || 'custom';
    document.getElementById('challengeTarget').value = challenge.completionCriteria?.target || 10;
    document.getElementById('challengeActive').checked = challenge.isActive;

    document.getElementById('challengeModalTitle').textContent = 'Edit Challenge';
    const modal = new bootstrap.Modal(document.getElementById('challengeModal'));
    modal.show();
}

// View participants for a challenge - FIXED VERSION
async function viewParticipants(challengeId) {
    try {
        const participantsList = document.getElementById('participants-list');
        participantsList.innerHTML = '<div class="text-center"><div class="spinner-border text-success"></div><p>Loading participants...</p></div>';

        // Find the challenge from our loaded data
        const challenge = allChallenges.find(c => c._id === challengeId);
        if (!challenge) {
            participantsList.innerHTML = '<p class="text-center text-muted">Challenge not found.</p>';
            return;
        }

        const participants = challenge.participants || [];

        let html = '';
        if (participants.length === 0) {
            html = '<p class="text-center text-muted">No participants yet.</p>';
        } else {
            // We need to fetch user details for each participant
            for (const participant of participants) {
                let userName = 'Unknown Student';
                let userEmail = '';
                let userSchool = '';

                // If participant.user is already populated (object), use it directly
                if (participant.user && typeof participant.user === 'object') {
                    userName = participant.user.name || 'Unknown Student';
                    userEmail = participant.user.email || '';
                    userSchool = participant.user.school || '';
                } 
                // If participant.user is just an ID (string), we need to fetch user details
                else if (typeof participant.user === 'string') {
                    try {
                        const userResponse = await apiCall(`/admin/users/${participant.user}`);
                        if (userResponse.data) {
                            userName = userResponse.data.name || 'Unknown Student';
                            userEmail = userResponse.data.email || '';
                            userSchool = userResponse.data.school || '';
                        }
                    } catch (error) {
                        console.error(`Error fetching user ${participant.user}:`, error);
                        // If we can't fetch user details, use the ID as fallback
                        userName = `Student (${participant.user.substring(0, 8)}...)`;
                    }
                }

                // Calculate progress percentage
                const progressPercentage = participant.progress || 0;
                const approvedSubmissions = participant.approvedSubmissions || 0;
                const totalSubmissions = participant.submissions ? participant.submissions.length : 0;

                html += `
                    <div class="participant-item card mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <div class="flex-grow-1">
                                    <h6 class="card-title mb-1">
                                        <i class="fas fa-user me-2"></i>${userName}
                                    </h6>
                                    ${userEmail ? `
                                        <p class="text-muted mb-1 small">
                                            <i class="fas fa-envelope me-1"></i>${userEmail}
                                        </p>
                                    ` : ''}
                                    ${userSchool ? `
                                        <p class="text-muted mb-1 small">
                                            <i class="fas fa-school me-1"></i>${userSchool}
                                        </p>
                                    ` : ''}
                                    <p class="text-muted mb-0 small">
                                        <i class="fas fa-calendar me-1"></i>
                                        Joined: ${new Date(participant.joinedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <span class="badge ${participant.completed ? 'bg-success' : 'bg-warning'}">
                                    ${participant.completed ? 
                                        '<i class="fas fa-check-circle me-1"></i>Completed' : 
                                        '<i class="fas fa-clock me-1"></i>In Progress'
                                    }
                                </span>
                            </div>
                            
                            <!-- Progress Section -->
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <small class="text-muted">Progress</small>
                                    <small class="text-muted">${progressPercentage}%</small>
                                </div>
                                <div class="progress mb-2" style="height: 8px;">
                                    <div class="progress-bar ${participant.completed ? 'bg-success' : 'bg-primary'}" 
                                         style="width: ${progressPercentage}%"
                                         title="Progress: ${progressPercentage}%">
                                    </div>
                                </div>
                            </div>
                            
                            ${participant.completed && participant.completedAt ? `
                                <div class="alert alert-success py-2 mb-2">
                                    <i class="fas fa-trophy me-1"></i>
                                    Completed on ${new Date(participant.completedAt).toLocaleDateString()}
                                </div>
                            ` : ''}

                            <!-- Submission Info (for custom challenges) -->
                            ${challenge.completionCriteria?.requiresSubmission ? `
                                <div class="border-top pt-2 mt-2">
                                    <div class="row text-center">
                                        <div class="col-4">
                                            <small class="text-muted d-block">Total</small>
                                            <span class="badge bg-secondary">${totalSubmissions}</span>
                                        </div>
                                        <div class="col-4">
                                            <small class="text-muted d-block">Approved</small>
                                            <span class="badge bg-success">${approvedSubmissions}</span>
                                        </div>
                                        <div class="col-4">
                                            <small class="text-muted d-block">Pending</small>
                                            <span class="badge bg-warning">${totalSubmissions - approvedSubmissions}</span>
                                        </div>
                                    </div>
                                    ${approvedSubmissions >= (challenge.completionCriteria?.target || 1) ? `
                                        <div class="mt-2">
                                            <small class="text-success">
                                                <i class="fas fa-check-circle me-1"></i>
                                                Target reached! (${approvedSubmissions}/${challenge.completionCriteria.target})
                                            </small>
                                        </div>
                                    ` : `
                                        <div class="mt-2">
                                            <small class="text-info">
                                                <i class="fas fa-target me-1"></i>
                                                Progress: ${approvedSubmissions}/${challenge.completionCriteria?.target || 1} approved
                                            </small>
                                        </div>
                                    `}
                                </div>
                            ` : ''}

                            <!-- Auto-tracking progress info -->
                            ${!challenge.completionCriteria?.requiresSubmission ? `
                                <div class="border-top pt-2 mt-2">
                                    <small class="text-muted">
                                        <i class="fas fa-sync-alt me-1"></i>
                                        Auto-tracking progress
                                    </small>
                                    <div class="mt-1">
                                        <small class="text-info">
                                            Current: ${Math.round((progressPercentage / 100) * (challenge.completionCriteria?.target || 1))}/${challenge.completionCriteria?.target || 1}
                                        </small>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
        }

        participantsList.innerHTML = html;
        const modal = new bootstrap.Modal(document.getElementById('participantsModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading participants:', error);
        const participantsList = document.getElementById('participants-list');
        participantsList.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading participants: ${error.message}
            </div>
        `;
    }
}

async function toggleChallengeStatus(challengeId) {
    try {
        const challenge = allChallenges.find(c => c._id === challengeId);
        if (!challenge) return;

        await apiCall(`/challenges/${challengeId}`, {
            method: 'PUT',
            body: {
                isActive: !challenge.isActive
            }
        });
        await loadTeacherChallenges();
    } catch (error) {
        alert('Error updating challenge status: ' + error.message);
    }
}

async function deleteChallenge(challengeId) {
    if (!confirm('Are you sure you want to delete this challenge? This action cannot be undone.')) {
        return;
    }
    try {
        await apiCall(`/challenges/${challengeId}`, {
            method: 'DELETE'
        });
        await loadTeacherChallenges();
    } catch (error) {
        alert('Error deleting challenge: ' + error.message);
    }
}

// Auto-refresh
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(async () => {
        if (document.visibilityState === 'visible') {
            console.log('Auto-refreshing submissions...');
            await loadAllTeacherSubmissions();
        }
    }, 30000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    if (!checkTeacher()) {
        alert('Teacher access required. Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }
    
    loadTeacherChallenges();
    
    const saveBtn = document.getElementById('saveChallengeBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveChallenge().catch(error => {
                console.error('Error in saveChallenge:', error);
                alert('Failed to save challenge: ' + error.message);
            });
        });
    }
    
    document.getElementById('submit-review-btn').addEventListener('click', submitReview);
    
    const challengeModal = document.getElementById('challengeModal');
    if (challengeModal) {
        challengeModal.addEventListener('hidden.bs.modal', function() {
            const form = document.getElementById('challengeForm');
            if (form) {
                form.reset();
            }
            document.getElementById('challengeId').value = '';
            document.getElementById('challengeModalTitle').textContent = 'Create New Challenge';
        });
    }
    
    updateUIForLoginStatus();
});