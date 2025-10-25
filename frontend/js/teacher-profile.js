// Teacher profile management functionality
document.addEventListener('DOMContentLoaded', function() {
    if (!checkTeacher()) {
        alert('Teacher access required.');
        window.location.href = 'index.html';
        return;
    }
    
    loadTeacherProfile();
    setupEventListeners();
});

async function loadTeacherProfile() {
    try {
        // Load teacher's profile data
        const response = await apiCall('/auth/me');
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to load profile');
        }
        
        const user = response.data.user;
        displayProfileData(user);
        
        // Load teacher statistics
        await loadTeacherStatistics();
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showError('Error loading profile: ' + error.message);
    }
}

function displayProfileData(user) {
    // Update profile information
    document.getElementById('profile-name').textContent = user.name || 'Teacher';
    document.getElementById('profile-school').textContent = user.school || 'No school specified';
    document.getElementById('username-display').textContent = user.name || 'Teacher';
    
    // Update form fields
    document.getElementById('profile-fullname').value = user.name || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-phone').value = user.phone || '';
    document.getElementById('profile-school-input').value = user.school || '';
    document.getElementById('profile-bio').value = user.bio || '';
}

async function loadTeacherStatistics() {
    try {
        // Load teacher's module count
        const modulesResponse = await apiCall('/modules/teacher/list');
        const modulesCount = modulesResponse.success ? (modulesResponse.data || []).length : 0;
        
        document.getElementById('profile-modules').textContent = modulesCount;
        
        // Load student count (you might need to create an endpoint for this)
        // For now, we'll use a placeholder
        document.getElementById('profile-students').textContent = '0';
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function setupEventListeners() {
    // Profile form submission
    document.getElementById('profile-form').addEventListener('submit', updateProfile);
    
    // Password form submission
    document.getElementById('password-form').addEventListener('submit', changePassword);
}

async function updateProfile(e) {
    e.preventDefault();
    
    try {
        const profileData = {
            name: document.getElementById('profile-fullname').value,
            email: document.getElementById('profile-email').value,
            phone: document.getElementById('profile-phone').value,
            school: document.getElementById('profile-school-input').value,
            bio: document.getElementById('profile-bio').value
        };
        
        const response = await apiCall('/auth/updatedetails', {
            method: 'PUT',
            body: profileData
        });
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to update profile');
        }
        
        // Update displayed data
        displayProfileData(response.data.user);
        showSuccess('Profile updated successfully!');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showError('Error updating profile: ' + error.message);
    }
}

async function changePassword(e) {
    e.preventDefault();
    
    try {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (newPassword !== confirmPassword) {
            throw new Error('New passwords do not match');
        }
        
        const response = await apiCall('/auth/updatepassword', {
            method: 'PUT',
            body: {
                currentPassword: currentPassword,
                newPassword: newPassword
            }
        });
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to change password');
        }
        
        document.getElementById('password-form').reset();
        showSuccess('Password changed successfully!');
        
    } catch (error) {
        console.error('Error changing password:', error);
        showError('Error changing password: ' + error.message);
    }
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    alert('Success: ' + message);
}