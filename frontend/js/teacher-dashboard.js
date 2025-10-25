// Teacher Dashboard JavaScript
let currentTeacher = null;

// Check if user is teacher
function checkTeacher() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role === "teacher";
}

// Load recent activity with real data
async function loadRecentActivity() {
    try {
        const response = await apiCall('/teacher/recent-activity');
        const activities = response.data;

        const activityContainer = document.getElementById('recent-activity');
        activityContainer.innerHTML = '';

        if (activities.length === 0) {
            activityContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-info-circle fa-2x mb-2"></i>
                    <p>No recent activity yet</p>
                    <small>Student activity will appear here as they use the platform</small>
                </div>
            `;
            return;
        }

        activities.forEach(activity => {
            const timeAgo = getTimeAgo(activity.timestamp);
            const icon = getActivityIcon(activity.type);
            const pointsText = activity.points > 0 ? ` (+${activity.points} points)` : '';
            
            const activityHtml = `
                <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                    <div class="d-flex align-items-center">
                        <div class="me-3 text-success">
                            ${icon}
                        </div>
                        <div>
                            <strong>${activity.student}</strong> ${activity.message}${pointsText}
                            <br>
                            <small class="text-muted">${timeAgo}</small>
                        </div>
                    </div>
                </div>
            `;
            activityContainer.innerHTML += activityHtml;
        });

    } catch (error) {
        console.error('Error loading recent activity:', error);
        // Fallback to showing last logins from students
        loadFallbackActivity();
    }
}

// Helper function to get time ago
function getTimeAgo(timestamp) {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - activityTime) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return activityTime.toLocaleDateString();
}

// Helper function to get activity icon
function getActivityIcon(activityType) {
    const icons = {
        'login': '<i class="fas fa-sign-in-alt"></i>',
        'module_completion': '<i class="fas fa-book"></i>',
        'milestone': '<i class="fas fa-trophy"></i>',
        'quiz_completion': '<i class="fas fa-question-circle"></i>',
        'challenge_completion': '<i class="fas fa-tasks"></i>'
    };
    
    return icons[activityType] || '<i class="fas fa-circle"></i>';
}

// Fallback activity display using student data
async function loadFallbackActivity() {
    try {
        const response = await apiCall('/teacher/students');
        const students = response.data;
        
        const activityContainer = document.getElementById('recent-activity');
        activityContainer.innerHTML = '';
        
        // Sort by last login date
        const recentStudents = students
            .filter(student => student.lastLogin)
            .sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin))
            .slice(0, 5);
        
        if (recentStudents.length === 0) {
            activityContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-info-circle fa-2x mb-2"></i>
                    <p>No recent activity data available</p>
                </div>
            `;
            return;
        }
        
        recentStudents.forEach(student => {
            const timeAgo = getTimeAgo(student.lastLogin);
            const modulesText = student.modulesCompleted > 0 ? `, completed ${student.modulesCompleted} modules` : '';
            const pointsText = student.points > 0 ? `, earned ${student.points} points` : '';
            
            const activityHtml = `
                <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                    <div class="d-flex align-items-center">
                        <div class="me-3 text-success">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <div>
                            <strong>${student.name}</strong> was active${modulesText}${pointsText}
                            <br>
                            <small class="text-muted">Last login: ${timeAgo}</small>
                        </div>
                    </div>
                </div>
            `;
            activityContainer.innerHTML += activityHtml;
        });
        
    } catch (error) {
        console.error('Error loading fallback activity:', error);
    }
}

// Update the main load function to include recent activity
async function loadTeacherDashboard() {
    if (!checkTeacher()) {
        window.location.href = 'login.html';
        return;
    }

    currentTeacher = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Update school name
    document.getElementById('school-name').textContent = `School: ${currentTeacher.school || 'Not specified'}`;
    
    // Load all data
    await loadSchoolStatistics();
    await loadStudentsList();
    await loadSchoolLeaderboard();
    await loadRecentActivity(); // Add this line
}

// Load school statistics using teacher-specific endpoint
async function loadSchoolStatistics() {
    try {
        const response = await apiCall('/teacher/stats');
        const stats = response.data;
        
        // Update UI
        document.getElementById('total-students').textContent = stats.totalStudents;
        document.getElementById('active-students').textContent = stats.activeStudents;
        document.getElementById('total-points').textContent = stats.totalPoints.toLocaleString();
        document.getElementById('avg-points').textContent = stats.avgPoints.toLocaleString();
        
        // Store totalModules for use in student display
        window.totalModules = stats.totalModules || 1; // Fallback to 1 if not available
        
    } catch (error) {
        console.error('Error loading school statistics:', error);
        // Fallback values
        window.totalModules = 1;
    }
}

// Load students list using teacher-specific endpoint
async function loadStudentsList() {
    try {
        const response = await apiCall('/teacher/students');
        const students = response.data;
        const tbody = document.getElementById('students-table');
        tbody.innerHTML = '';
        
        if (students.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="fas fa-users fa-2x mb-2"></i><br>
                        No students found in your school
                    </td>
                </tr>
            `;
            return;
        }

        // Sort by points descending
        students.sort((a, b) => (b.points || 0) - (a.points || 0));
        
        students.forEach((student, index) => {
            // Determine modules completed (try multiple schemas returned by API)
            const schoolModulesCompleted = Number(
                student.schoolModulesCompleted ??
                student.modulesCompleted ??
                (student.progress && student.progress.completedModules ? student.progress.completedModules.length : undefined) ??
                (student.userProgress && student.userProgress.completedModules ? student.userProgress.completedModules.length : undefined) ??
                0
            );

            const totalSchoolModules = Number(
                student.totalSchoolModules ?? window.totalModules ??
                (student.progress && typeof student.progress.totalModules === 'number' ? student.progress.totalModules : undefined) ??
                1
            );

            const progressPercentage = totalSchoolModules > 0 ?
                Math.min(100, (schoolModulesCompleted / totalSchoolModules) * 100) : 0;

            // Calculate quizzes completed robustly (handle object, array, map-like shapes)
            let quizzesCompleted = 0;
            const qa = student.quizAttempts;
            if (Array.isArray(qa)) {
                // Could be array of attempt objects
                quizzesCompleted = qa.filter(a => a && ((a.score && a.score > 0) || a > 0 || a.passed)).length;
            } else if (qa && typeof qa === 'object') {
                // Could be object map { quizId: score } or { quizId: { score } }
                try {
                    quizzesCompleted = Object.keys(qa).filter(k => {
                        const v = qa[k];
                        if (v == null) return false;
                        if (typeof v === 'number') return v > 0;
                        if (typeof v === 'object') return (v.score && v.score > 0) || (v.passed === true) || (v.points && v.points > 0);
                        return true;
                    }).length;
                } catch (e) {
                    quizzesCompleted = 0;
                }
            }
            
            // Format last login
            const lastLogin = student.lastLogin ? 
                new Date(student.lastLogin).toLocaleDateString() : 'Never';
            
            const roundedProgress = Math.round(progressPercentage);
            const row = `
                <tr>
                    <td>
                        <strong>${student.name}</strong>
                        ${index < 3 ? `<span class="badge bg-warning ms-1">#${index + 1}</span>` : ''}
                    </td>
                    <td>
                        <span class="badge bg-success">${student.points || 0}</span>
                    </td>
                    <td>
                        <small>${schoolModulesCompleted}/${totalSchoolModules} modules</small>
                        <br>
                        <small>${quizzesCompleted} quizzes</small>
                    </td>
                    <td>
                        <div class="progress progress-sm mb-1">
                            <div class="progress-bar bg-success" role="progressbar" style="width: ${progressPercentage}%;" aria-valuenow="${roundedProgress}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <small>${roundedProgress}%</small>
                        <br>
                        <small class="text-muted">Last active: ${lastLogin}</small>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('Error loading students list:', error);
        // Fallback display
        const tbody = document.getElementById('students-table');
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-danger py-4">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>
                    Error loading students data
                </td>
            </tr>
        `;
    }
}

// Load school leaderboard using teacher-specific endpoint
async function loadSchoolLeaderboard() {
    try {
        const response = await apiCall('/teacher/leaderboard');
        const leaderboard = response.data;

        const leaderboardContainer = document.getElementById('school-leaderboard');
        leaderboardContainer.innerHTML = '';

        if (leaderboard.length === 0) {
            leaderboardContainer.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-trophy fa-3x mb-3"></i>
                    <p>No students in the leaderboard yet</p>
                </div>
            `;
            return;
        }

        leaderboard.forEach((student, index) => {
            const rank = index + 1;
            const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';

            const leaderboardItem = `
                <div class="leaderboard-item ${rankClass}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <span class="fw-bold me-3">${rank}.</span>
                            <div>
                                <h6 class="mb-0">${student.name}</h6>
                                <small class="text-muted">${student.modulesCompleted || 0} modules</small>
                            </div>
                        </div>
                        <span class="badge bg-success">${student.points || 0} pts</span>
                    </div>
                    <div class="mt-2">
                        <small class="text-muted">Streak: ${student.streak || 0} days</small>
                    </div>
                </div>
            `;
            leaderboardContainer.innerHTML += leaderboardItem;
        });

    } catch (error) {
        console.error('Error loading school leaderboard:', error);
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (!checkTeacher()) {
        alert('Teacher access required. Redirecting to login.');
        window.location.href = 'login.html';
        return;
    }

    loadTeacherDashboard();

    // Set up refresh button
    document.getElementById('refresh-students').addEventListener('click', loadTeacherDashboard);

    // Update UI for login status
    updateUIForLoginStatus();
});