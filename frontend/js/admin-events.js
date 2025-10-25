let allEvents = [];
let currentEditingEvent = null;
let eventsStatistics = null;

// NEW: Fetch and display events statistics
// In the fetchEventsStatistics function, add error handling
async function fetchEventsStatistics() {
  try {
    const response = await apiCall('/events/admin/statistics');
    if (response.success) {
      eventsStatistics = response.data;
      displayEventsStatistics();
    } else {
      throw new Error(response.message || 'Failed to fetch statistics');
    }
  } catch (error) {
    console.error('Error fetching events statistics:', error);
    document.getElementById('events-statistics').innerHTML = `
      <div class="col-12">
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Unable to load statistics: ${error.message}
        </div>
      </div>
    `;
  }
}
function initializeCategoryInteractions() {
  // Add tooltips to category items
  const categoryItems = document.querySelectorAll('.chart-bar-item, .category-item');
  categoryItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
      this.style.transform = 'translateX(8px)';
    });
    
    item.addEventListener('mouseleave', function() {
      this.style.transform = 'translateX(0)';
    });
  });

  // Animate bars on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bars = entry.target.querySelectorAll('.bar-fill');
        bars.forEach(bar => {
          const width = bar.style.width;
          bar.style.width = '0%';
          setTimeout(() => {
            bar.style.width = width;
          }, 100);
        });
      }
    });
  });

  const chartContainer = document.querySelector('.category-chart-container');
  if (chartContainer) {
    observer.observe(chartContainer);
  }
}
// Enhanced function to display events statistics with proper attendance calculation
function displayEventsStatistics() {
  if (!eventsStatistics) return;

  const statsContainer = document.getElementById('events-statistics');
  
  // Calculate additional derived statistics
  const attendanceRate = eventsStatistics.averageAttendance || 0;
  const totalAttended = eventsStatistics.totalAttended || 0;
  const totalPossible = eventsStatistics.totalPossibleAttendances || 0;
  
  statsContainer.innerHTML = `
    <div class="col-xl-2 col-md-4 col-6 mb-4">
      <div class="card stat-card border-left-primary shadow h-100">
        <div class="card-body">
          <div class="row no-gutters align-items-center">
            <div class="col mr-2">
              <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                Total Events
              </div>
              <div class="h5 mb-0 font-weight-bold text-gray-800">
                ${eventsStatistics.totalEvents}
              </div>
            </div>
            <div class="col-auto">
              <i class="fas fa-calendar-alt fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-xl-2 col-md-4 col-6 mb-4">
      <div class="card stat-card border-left-success shadow h-100">
        <div class="card-body">
          <div class="row no-gutters align-items-center">
            <div class="col mr-2">
              <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                Upcoming
              </div>
              <div class="h5 mb-0 font-weight-bold text-gray-800">
                ${eventsStatistics.upcomingEvents}
              </div>
            </div>
            <div class="col-auto">
              <i class="fas fa-rocket fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-xl-2 col-md-4 col-6 mb-4">
      <div class="card stat-card border-left-info shadow h-100">
        <div class="card-body">
          <div class="row no-gutters align-items-center">
            <div class="col mr-2">
              <div class="text-xs font-weight-bold text-info text-uppercase mb-1">
                Open for Reg
              </div>
              <div class="h5 mb-0 font-weight-bold text-gray-800">
                ${eventsStatistics.eventsWithOpenRegistration}
              </div>
            </div>
            <div class="col-auto">
              <i class="fas fa-user-plus fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-xl-2 col-md-4 col-6 mb-4">
      <div class="card stat-card border-left-warning shadow h-100">
        <div class="card-body">
          <div class="row no-gutters align-items-center">
            <div class="col mr-2">
              <div class="text-xs font-weight-bold text-warning text-uppercase mb-1">
                Total Regs
              </div>
              <div class="h5 mb-0 font-weight-bold text-gray-800">
                ${eventsStatistics.totalRegistrations}
              </div>
            </div>
            <div class="col-auto">
              <i class="fas fa-users fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-xl-2 col-md-4 col-6 mb-4">
      <div class="card stat-card border-left-danger shadow h-100">
        <div class="card-body">
          <div class="row no-gutters align-items-center">
            <div class="col mr-2">
              <div class="text-xs font-weight-bold text-danger text-uppercase mb-1">
                Past Events
              </div>
              <div class="h5 mb-0 font-weight-bold text-gray-800">
                ${eventsStatistics.pastEvents}
              </div>
            </div>
            <div class="col-auto">
              <i class="fas fa-history fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-xl-2 col-md-4 col-6 mb-4">
      <div class="card stat-card border-left-secondary shadow h-100">
        <div class="card-body">
          <div class="row no-gutters align-items-center">
            <div class="col mr-2">
              <div class="text-xs font-weight-bold text-secondary text-uppercase mb-1">
                Attendance Rate
              </div>
              <div class="h5 mb-0 font-weight-bold text-gray-800">
                ${attendanceRate}%
              </div>
            </div>
            <div class="col-auto">
              <i class="fas fa-user-check fa-2x text-gray-300"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    ${eventsStatistics.registrationsByCategory && eventsStatistics.registrationsByCategory.length > 0 ? `
    <div class="col-12 mt-4">
      <div class="card shadow-sm border-0">
        <div class="card-header bg-gradient-primary text-white py-3">
          <div class="d-flex justify-content-between align-items-center">
            <h6 class="m-0 font-weight-bold">
              <i class="fas fa-chart-pie me-2"></i>Registrations by Category
            </h6>
            <div class="dropdown">
              <button class="btn btn-sm btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
                <i class="fas fa-cog"></i>
              </button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="#" onclick="exportCategoryData()"><i class="fas fa-download me-2"></i>Export Data</a></li>
                <li><a class="dropdown-item" href="#" onclick="refreshCategoryStats()"><i class="fas fa-sync me-2"></i>Refresh</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <!-- Category Chart -->
            <div class="col-lg-8">
              <div class="category-chart-container">
                <div class="chart-bars">
                  ${eventsStatistics.registrationsByCategory.map(cat => {
                    const percentage = eventsStatistics.totalRegistrations > 0 
                      ? (cat.count / eventsStatistics.totalRegistrations * 100).toFixed(1)
                      : 0;
                    return `
                      <div class="chart-bar-item" data-category="${cat._id}" onclick="filterByCategory('${cat._id}')">
                        <div class="bar-label">
                          <span class="category-name">${getCategoryDisplayName(cat._id)}</span>
                          <span class="category-count">${cat.count} regs</span>
                        </div>
                        <div class="bar-track">
                          <div class="bar-fill ${getCategoryColorClass(cat._id)}" style="width: ${percentage}%">
                            <span class="percentage">${percentage}%</span>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
            
            <!-- Category Summary -->
            <div class="col-lg-4">
              <div class="category-summary">
                <h6 class="text-muted mb-3">Category Distribution</h6>
                ${eventsStatistics.registrationsByCategory.map(cat => {
  const percentage = eventsStatistics.totalRegistrations > 0
    ? (cat.count / eventsStatistics.totalRegistrations * 100).toFixed(1)
    : 0;
  const attendanceRate = cat.attendanceRate || 0;
  
  return `
    <div class="category-item d-flex justify-content-between align-items-center mb-2 p-2 rounded hover-effect" 
         onclick="filterByCategory('${cat._id}')">
      <div class="d-flex align-items-center">
        <span class="category-color ${getCategoryColorClass(cat._id)}"></span>
        <span class="ms-2">${getCategoryDisplayName(cat._id)}</span>
      </div>
      <div class="text-end">
        <div class="fw-bold">${cat.count}</div>
        <small class="text-muted">${percentage}%</small>
        ${attendanceRate > 0 ? `
          <div class="mt-1">
            <small class="text-success">
              <i class="fas fa-user-check me-1"></i>${attendanceRate}% attended
            </small>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}).join('')}
                
                <div class="mt-4 pt-3 border-top">
                  <div class="d-flex justify-content-between">
                    <small class="text-muted">Total Registrations:</small>
                    <strong>${eventsStatistics.totalRegistrations}</strong>
                  </div>
                  <div class="d-flex justify-content-between mt-1">
                    <small class="text-muted">Categories:</small>
                    <strong>${eventsStatistics.registrationsByCategory.length}</strong>
                  </div>
                  <div class="d-flex justify-content-between mt-1">
                    <small class="text-muted">Attendance Rate:</small>
                    <strong>${attendanceRate}%</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ` : `
    <div class="col-12 mt-4">
      <div class="card shadow-sm border-0">
        <div class="card-body text-center py-5">
          <i class="fas fa-chart-pie fa-3x text-muted mb-3"></i>
          <h5 class="text-muted">No Registration Data</h5>
          <p class="text-muted">Registration data by category will appear here once events have registrations.</p>
        </div>
      </div>
    </div>
    `}
  `;

  // Initialize interactions after a short delay to allow DOM rendering
  setTimeout(initializeCategoryInteractions, 100);
}
// Helper function to get category display names
function getCategoryDisplayName(category) {
  const names = {
    'tree-planting': 'Tree Planting',
    'beach-cleanup': 'Beach Cleanup', 
    'workshop': 'Workshop',
    'conference': 'Conference',
    'protest': 'Protest',
    'fundraiser': 'Fundraiser',
    'other': 'Other Events'
  };
  return names[category] || category;
}

// Helper function to get category color classes
function getCategoryColorClass(category) {
  const colors = {
    'tree-planting': 'bg-success',
    'beach-cleanup': 'bg-info',
    'workshop': 'bg-warning',
    'conference': 'bg-primary',
    'protest': 'bg-danger',
    'fundraiser': 'bg-purple',
    'other': 'bg-secondary'
  };
  return colors[category] || 'bg-secondary';
}

// Filter events by category
function filterByCategory(category) {
  // Update the category filter in the UI
  document.getElementById('filter-all').checked = false;
  document.querySelectorAll('.category-filter').forEach(filter => {
    filter.checked = filter.value === category;
  });
  
  // Apply filters to show only events of this category
  applyFilters();
  
  // Scroll to events table
  document.getElementById('events-table-body').scrollIntoView({ 
    behavior: 'smooth',
    block: 'start'
  });
  
  // Show a toast notification
  showToast(`Showing events in: ${getCategoryDisplayName(category)}`, 'info');
}

// Export category data
function exportCategoryData() {
  if (!eventsStatistics.registrationsByCategory || eventsStatistics.registrationsByCategory.length === 0) {
    showToast('No category data to export', 'warning');
    return;
  }

  const headers = ['Category', 'Registrations', 'Percentage'];
  const csvData = eventsStatistics.registrationsByCategory.map(cat => {
    const percentage = (cat.count / eventsStatistics.totalRegistrations * 100).toFixed(1);
    return [
      getCategoryDisplayName(cat._id),
      cat.count,
      `${percentage}%`
    ];
  });

  const csvContent = [headers, ...csvData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `category-registrations-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  showToast('Category data exported successfully', 'success');
}

// Refresh category statistics
function refreshCategoryStats() {
  showToast('Refreshing category statistics...', 'info');
  fetchEventsStatistics();
}

// Show toast notification
function showToast(message, type = 'info') {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.custom-toast');
  existingToasts.forEach(toast => toast.remove());
  
  const toastHtml = `
    <div class="custom-toast position-fixed top-0 end-0 m-3" style="z-index: 1060;">
      <div class="toast align-items-center text-white bg-${type} border-0 show" role="alert">
        <div class="d-flex">
          <div class="toast-body">
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', toastHtml);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    const toast = document.querySelector('.custom-toast');
    if (toast) toast.remove();
  }, 3000);
}
// Update the existing fetchAllEvents function
async function fetchAllEvents() {
  try {
    const [eventsResponse, statsResponse] = await Promise.all([
      apiCall('/events/admin/all?limit=100'),
      apiCall('/events/admin/statistics')
    ]);
    
    allEvents = eventsResponse.data || [];
    eventsStatistics = statsResponse.data;
    
    displayEventsTable();
    displayEventsStatistics();
  } catch (error) {
    console.error('Error fetching events:', error);
    alert('Error loading events: ' + error.message);
  }
}

// Display events in table
function displayEventsTable() {
    const tableBody = document.getElementById('events-table-body');
    
    if (allEvents.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-calendar-times fa-2x text-muted mb-3"></i>
                    <p class="text-muted">No events found. Create your first event!</p>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = '';
    allEvents.forEach(event => {
        const eventDate = new Date(event.date);
        const endDate = new Date(event.endDate);
        const isUpcoming = eventDate > new Date();
        const registrationOpen = isUpcoming && event.isActive && 
                               (event.maxParticipants === 0 || event.currentParticipants < event.maxParticipants);
        
        const row = createEventTableRow(event, eventDate, endDate, isUpcoming, registrationOpen);
        tableBody.innerHTML += row;
    });
}

// Create event table row
function createEventTableRow(event, eventDate, endDate, isUpcoming, registrationOpen) {
  const dateString = formatEventDate(eventDate, endDate);
  const statusBadge = getStatusBadge(eventDate, registrationOpen, event.isActive, event.lastDateToRegister);
  
  // Calculate attendance stats for past events
  let attendanceInfo = '';
  const now = new Date();
  if (endDate < now) {
    const totalRegistrations = event.registrations.length;
    const attendedCount = event.registrations.filter(reg => reg.attended).length;
    const attendanceRate = totalRegistrations > 0 ? ((attendedCount / totalRegistrations) * 100).toFixed(1) : 0;
    
    attendanceInfo = `
      <small class="text-muted d-block">
        <i class="fas fa-user-check me-1"></i>
        ${attendedCount}/${totalRegistrations} attended (${attendanceRate}%)
      </small>
    `;
  }

  return `
    <tr data-event-id="${event._id}">
      <td>
        <div class="d-flex align-items-center">
          ${event.image ? `
            <img src="${event.image}" alt="${event.name}" class="me-3">
          ` : `
            <div class="bg-success rounded me-3 d-flex align-items-center justify-content-center"
                 style="width: 60px; height: 40px;">
              <i class="fas fa-leaf text-white"></i>
            </div>
          `}
          <div>
            <strong>${escapeHtml(event.name)}</strong>
            <br>
            <small class="text-muted">${getCategoryName(event.category)}</small>
            ${attendanceInfo}
          </div>
        </div>
      </td>
      <td>
        <small>${dateString}</small>
      </td>
      <td>
        <small>${escapeHtml(event.location)}</small>
      </td>
      <td>
        <div>
          <strong>${event.currentParticipants}</strong>
          ${event.maxParticipants > 0 ? `/ ${event.maxParticipants}` : ''}
        </div>
        <small class="text-muted">registered</small>
      </td>
      <td>
        ${statusBadge}
      </td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary" onclick="viewRegistrations('${event._id}')"
                  title="View Registrations & Attendance">
            <i class="fas fa-users"></i>
          </button>
          <button class="btn btn-outline-warning" onclick="editEvent('${event._id}')"
                  title="Edit Event">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-outline-danger" onclick="deleteEvent('${event._id}')"
                  title="Delete Event">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}


// Helper: format event date (same logic used by events.js)
function formatEventDate(startDate, endDate) {
    if (!(startDate instanceof Date)) startDate = new Date(startDate);
    if (!(endDate instanceof Date)) endDate = new Date(endDate);

    if (startDate.toDateString() === endDate.toDateString()) {
        // Same day event
        return `${startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • ${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        // Multi-day event
        return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }
}

// Helper: get human-friendly category name
function getCategoryName(category) {
    const names = {
        'tree-planting': 'Tree Planting',
        'beach-cleanup': 'Beach Cleanup',
        'workshop': 'Workshop',
        'conference': 'Conference',
        'protest': 'Protest',
        'fundraiser': 'Fundraiser',
        'other': 'Event'
    };
    return names[category] || 'Event';
}

// Helper: escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>",']/g, function (c) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];
    });
}

// Get status badge
function getStatusBadge(eventDate, registrationOpen, isActive, lastDateToRegister) {
  if (!isActive) {
    return '<span class="badge bg-secondary status-badge">Inactive</span>';
  }

  const now = new Date();
  
  // Check if registration is closed due to lastDateToRegister
  if (lastDateToRegister && new Date(lastDateToRegister) < now) {
    return '<span class="badge bg-danger status-badge">Registration Closed</span>';
  }

  if (eventDate < now) {
    return '<span class="badge bg-info status-badge">Completed</span>';
  } else if (registrationOpen) {
    return '<span class="badge bg-success status-badge">Open</span>';
  } else {
    return '<span class="badge bg-warning status-badge">Closed</span>';
  }
}

// View event registrations
async function viewRegistrations(eventId) {
    try {
        const response = await apiCall(`/events/${eventId}/registrations`);
        const data = response.data;
        
        const modalContent = document.getElementById('registrationsContent');
        modalContent.innerHTML = `
            <h6>${escapeHtml(data.event.name)}</h6>
            <p class="text-muted">
                ${new Date(data.event.date).toLocaleDateString()} • ${escapeHtml(data.event.location)}
            </p>
            
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6>Registrations (${data.totalRegistrations})</h6>
                <button class="btn btn-sm btn-outline-success" onclick="exportRegistrations('${eventId}')">
                    <i class="fas fa-download me-1"></i>Export CSV
                </button>
            </div>
            
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Registration Date</th>
                            <th>Attendance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.registrations.map(reg => `
                            <tr>
                                <td>${escapeHtml(reg.userName)}</td>
                                <td>${escapeHtml(reg.userEmail)}</td>
                                <td>${new Date(reg.registrationDate).toLocaleDateString()}</td>
                                <td>
                                    ${reg.attended ? 
                                        '<span class="badge bg-success">Attended</span>' : 
                                        '<span class="badge bg-secondary">Not Confirmed</span>'
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        const modal = new bootstrap.Modal(document.getElementById('registrationsModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error fetching registrations:', error);
        alert('Error loading registrations: ' + error.message);
    }
}

// Export registrations to CSV
// Update the existing exportRegistrations function
function exportRegistrations(eventId) {
    if (!attendanceData.length) {
        alert('No registration data available to export');
        return;
    }

    const headers = ['Name', 'Email', 'Registration Date', 'Attendance Status', 'Attendance Date'];
    const csvData = attendanceData.map(reg => [
        reg.userName,
        reg.userEmail,
        new Date(reg.registrationDate).toLocaleDateString(),
        reg.attended ? 'Present' : 'Absent',
        reg.attendanceDate ? new Date(reg.attendanceDate).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${currentEventId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Edit event
function editEvent(eventId) {
  const event = allEvents.find(e => e._id === eventId);
  if (!event) return;

  currentEditingEvent = event;
  document.getElementById('eventModalTitle').textContent = 'Edit Event';
  document.getElementById('eventId').value = event._id;
  document.getElementById('eventName').value = event.name;
  document.getElementById('eventCategory').value = event.category;
  document.getElementById('eventDescription').value = event.description;
  document.getElementById('eventDate').value = formatDateTimeLocal(event.date);
  document.getElementById('eventEndDate').value = formatDateTimeLocal(event.endDate);
  
  // NEW: Set last date to register
  document.getElementById('eventLastDateToRegister').value = formatDateTimeLocal(
    event.lastDateToRegister || event.date
  );
  
  document.getElementById('eventLocation').value = event.location;
  document.getElementById('eventAddress').value = event.address;
  document.getElementById('eventOrganizer').value = event.organizer;
  document.getElementById('eventRegistrationLink').value = event.registrationLink;
  document.getElementById('eventMaxParticipants').value = event.maxParticipants;
  document.getElementById('eventPointsReward').value = event.pointsReward;
  document.getElementById('eventImage').value = event.image || '';
  document.getElementById('eventIsActive').checked = event.isActive;

  const modal = new bootstrap.Modal(document.getElementById('createEventModal'));
  modal.show();
}

// Delete event
async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
        return;
    }
    
    try {
        await apiCall(`/events/${eventId}`, {
            method: 'DELETE'
        });
        
        alert('Event deleted successfully');
        await fetchAllEvents();
        
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event: ' + error.message);
    }
}

// Save event (create or update)
async function saveEvent() {
  const formData = {
    name: document.getElementById('eventName').value,
    category: document.getElementById('eventCategory').value,
    description: document.getElementById('eventDescription').value,
    date: document.getElementById('eventDate').value,
    endDate: document.getElementById('eventEndDate').value,
    // NEW: Include lastDateToRegister
    lastDateToRegister: document.getElementById('eventLastDateToRegister').value,
    location: document.getElementById('eventLocation').value,
    address: document.getElementById('eventAddress').value,
    organizer: document.getElementById('eventOrganizer').value,
    registrationLink: document.getElementById('eventRegistrationLink').value,
    maxParticipants: parseInt(document.getElementById('eventMaxParticipants').value),
    pointsReward: parseInt(document.getElementById('eventPointsReward').value),
    image: document.getElementById('eventImage').value,
    isActive: document.getElementById('eventIsActive').checked
  };

  // Validate dates
  const startDate = new Date(formData.date);
  const endDate = new Date(formData.endDate);
  const lastRegDate = new Date(formData.lastDateToRegister);

  if (endDate <= startDate) {
    alert('End date must be after start date');
    return;
  }

  if (lastRegDate > startDate) {
    alert('Last date to register must be before or equal to event start date');
    return;
  }

  try {
    const eventId = document.getElementById('eventId').value;
    let response;

    if (eventId) {
      response = await apiCall(`/events/${eventId}`, {
        method: 'PUT',
        body: formData
      });
    } else {
      response = await apiCall('/events', {
        method: 'POST',
        body: formData
      });
    }

    alert(response.message);
    const modal = bootstrap.Modal.getInstance(document.getElementById('createEventModal'));
    modal.hide();
    await fetchAllEvents();
  } catch (error) {
    console.error('Error saving event:', error);
    alert('Error saving event: ' + error.message);
  }
}

// Format date for datetime-local input
function formatDateTimeLocal(dateString) {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
}

// Reset form for new event
function resetEventForm() {
    document.getElementById('eventModalTitle').textContent = 'Create New Event';
    document.getElementById('eventForm').reset();
    document.getElementById('eventId').value = '';
    document.getElementById('eventMaxParticipants').value = '0';
    document.getElementById('eventPointsReward').value = '0';
    document.getElementById('eventIsActive').checked = true;
    currentEditingEvent = null;
}

// Initialize admin events
document.addEventListener('DOMContentLoaded', function() {
  if (getCurrentUser()?.role !== 'admin') {
    alert('Admin access required');
    window.location.href = 'index.html';
    return;
  }

  fetchAllEvents();
  document.getElementById('saveEventBtn').addEventListener('click', saveEvent);
  document.getElementById('createEventModal').addEventListener('hidden.bs.modal', resetEventForm);
  
  // Refresh statistics every 5 minutes
  setInterval(fetchEventsStatistics, 5 * 60 * 1000);
});
// Add these variables at the top of admin-events.js
let currentEventId = null;
let attendanceData = [];

// Update the viewRegistrations function to include attendance management
async function viewRegistrations(eventId) {
    try {
        currentEventId = eventId;
        const response = await apiCall(`/events/${eventId}/registrations`);
        const data = response.data;
        
        // Store attendance data
        attendanceData = data.registrations.map(reg => ({
            ...reg,
            _id: reg._id || reg.userId // Use registration ID or userId as fallback
        }));

        // Update modal header
        document.getElementById('modal-event-name').textContent = data.event.name;
        document.getElementById('modal-event-details').textContent = 
            `${new Date(data.event.date).toLocaleDateString()} • ${data.event.location}`;

        // Update attendance summary
        updateAttendanceSummary();

        // Load registrations content
        const modalContent = document.getElementById('registrationsContent');
        modalContent.innerHTML = createRegistrationsTable(data.registrations);

        const modal = new bootstrap.Modal(document.getElementById('registrationsModal'));
        modal.show();

    } catch (error) {
        console.error('Error fetching registrations:', error);
        alert('Error loading registrations: ' + error.message);
    }
}

// Create registrations table with attendance controls
function createRegistrationsTable(registrations) {
    if (registrations.length === 0) {
        return `
            <div class="text-center py-5">
                <i class="fas fa-users-slash fa-3x text-muted mb-3"></i>
                <h5>No Registrations</h5>
                <p class="text-muted">No users have registered for this event yet.</p>
            </div>
        `;
    }

    return `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Registration Date</th>
                        <th>Attendance Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${registrations.map((reg, index) => createRegistrationRow(reg, index)).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Create individual registration row with attendance toggle
function createRegistrationRow(registration, index) {
    const regDate = new Date(registration.registrationDate);
    const attendanceDate = registration.attendanceDate ? new Date(registration.attendanceDate) : null;
    
    return `
        <tr data-user-id="${registration.userId}" data-reg-index="${index}">
            <td>
                <div class="d-flex align-items-center">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(registration.userName)}&background=20c997&color=fff&size=32"
                         class="rounded-circle me-2" alt="${registration.userName}" width="32" height="32">
                    <div>
                        <strong>${escapeHtml(registration.userName)}</strong>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(registration.userEmail)}</td>
            <td>
                <small>${regDate.toLocaleDateString()}</small>
                <br>
                <small class="text-muted">${regDate.toLocaleTimeString()}</small>
            </td>
            <td>
                ${registration.attended ? `
                    <span class="badge bg-success">
                        <i class="fas fa-check me-1"></i>Present
                    </span>
                    ${attendanceDate ? `
                        <br>
                        <small class="text-muted">Marked on ${attendanceDate.toLocaleDateString()}</small>
                    ` : ''}
                ` : `
                    <span class="badge bg-danger">
                        <i class="fas fa-times me-1"></i>Absent
                    </span>
                `}
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-success ${registration.attended ? 'active' : ''}" 
                            onclick="toggleAttendance(${index}, true)"
                            title="Mark as Present">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-outline-danger ${!registration.attended ? 'active' : ''}" 
                            onclick="toggleAttendance(${index}, false)"
                            title="Mark as Absent">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Toggle attendance status
function toggleAttendance(index, attended) {
    attendanceData[index].attended = attended;
    attendanceData[index].attendanceDate = attended ? new Date() : null;
    
    // Update the row display
    const row = document.querySelector(`tr[data-reg-index="${index}"]`);
    if (row) {
        const statusCell = row.cells[3];
        const actionsCell = row.cells[4];
        
        // Update status badge
        statusCell.innerHTML = attended ? `
            <span class="badge bg-success">
                <i class="fas fa-check me-1"></i>Present
            </span>
            <br>
            <small class="text-muted">Marked on ${new Date().toLocaleDateString()}</small>
        ` : `
            <span class="badge bg-danger">
                <i class="fas fa-times me-1"></i>Absent
            </span>
        `;
        
        // Update button states
        const presentBtn = actionsCell.querySelector('.btn-outline-success');
        const absentBtn = actionsCell.querySelector('.btn-outline-danger');
        
        presentBtn.classList.toggle('active', attended);
        absentBtn.classList.toggle('active', !attended);
    }
    
    updateAttendanceSummary();
}

// Update attendance summary statistics
function updateAttendanceSummary() {
    const total = attendanceData.length;
    const present = attendanceData.filter(reg => reg.attended).length;
    const absent = total - present;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
    
    document.getElementById('total-registrations-count').textContent = total;
    document.getElementById('present-count').textContent = present;
    document.getElementById('absent-count').textContent = absent;
    document.getElementById('attendance-rate').textContent = `${rate}%`;
}

// Mark all users as present
function markAllPresent() {
    if (!confirm('Mark all registered users as present?')) return;
    
    attendanceData.forEach((reg, index) => {
        toggleAttendance(index, true);
    });
}

// Mark all users as absent
function markAllAbsent() {
    if (!confirm('Mark all registered users as absent?')) return;
    
    attendanceData.forEach((reg, index) => {
        toggleAttendance(index, false);
    });
}

// Save attendance changes
// Update the saveAttendance function in admin-events.js
async function saveAttendance() {
    try {
        // Prepare the attendance data with proper structure
        const preparedAttendanceData = attendanceData.map(reg => {
            // Extract just the userId string, not the entire user object
            const userId = reg.userId._id ? reg.userId._id : reg.userId;
            
            return {
                userId: userId,
                attended: reg.attended
            };
        });

        console.log('Saving attendance data:', preparedAttendanceData);

        const response = await apiCall(`/events/${currentEventId}/attendance/bulk`, {
            method: 'POST',
            body: {
                attendanceData: preparedAttendanceData
            }
        });

        alert('Attendance saved successfully!');
        
        // Refresh the events table to show updated attendance stats
        await fetchAllEvents();
        
    } catch (error) {
        console.error('Error saving attendance:', error);
        alert('Error saving attendance: ' + error.message);
    }
}
