// Events Page JavaScript
let allEvents = [];
let filteredEvents = [];
let currentView = 'grid';
let calendar;

// Initialize the page
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing events page...');
    initializePage();
});

// Also initialize when window loads (as backup)
window.addEventListener('load', function() {
    console.log('Window loaded, checking events page...');
    // If events aren't loaded yet, try again
    if (allEvents.length === 0) {
        console.log('Events not loaded, retrying...');
        initializePage();
    }
});

// Initialize the page with proper error handling
async function initializePage() {
    try {
        console.log('Initializing events page...');
        
        // Initialize calendar first
        initializeCalendar();
        
        // Then load data
        await Promise.all([
            fetchEventsStatistics(),
            fetchAllEvents()
        ]);
        
        // Then setup event listeners
        setupEventListeners();
        
        console.log('Events page initialized successfully');
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Failed to load events data. Please refresh the page.');
    }
}

// Show error message
function showError(message) {
    const container = document.getElementById('events-container');
    if (container) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${message}
                </div>
            </div>
        `;
    }
}

function setupEventListeners() {
    // Category filter - all/none toggle
    const filterAll = document.getElementById('filter-all');
    if (filterAll) {
        filterAll.addEventListener('change', function() {
            const categoryFilters = document.querySelectorAll('.category-filter');
            categoryFilters.forEach(filter => {
                filter.checked = this.checked;
            });
            applyFilters();
        });
    }

    // Individual category filters
    document.querySelectorAll('.category-filter').forEach(filter => {
        filter.addEventListener('change', function() {
            const allChecked = Array.from(document.querySelectorAll('.category-filter')).every(f => f.checked);
            const filterAll = document.getElementById('filter-all');
            if (filterAll) {
                filterAll.checked = allChecked;
            }
            applyFilters();
        });
    });

    // Other filters
    document.querySelectorAll('.status-filter, .registration-filter').forEach(filter => {
        filter.addEventListener('change', applyFilters);
    });

    // Date filters
    document.getElementById('filter-start-date')?.addEventListener('change', applyFilters);
    document.getElementById('filter-end-date')?.addEventListener('change', applyFilters);
}

// Fetch events statistics
async function fetchEventsStatistics() {
    try {
        const response = await apiCall('/events/statistics');
        displayEventsStatistics(response.data);
    } catch (error) {
        console.error('Error fetching events statistics:', error);
        document.getElementById('events-statistics').innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Unable to load statistics
                </div>
            </div>
        `;
    }
}

// Display events statistics
// Display events statistics with new styling
function displayEventsStatistics(stats) {
    const statsContainer = document.getElementById('events-statistics');
    
    statsContainer.innerHTML = `
        <div class="col-md-3 col-6 mb-4">
            <div class="events-stats-card total-events">
                <div class="events-stat-icon">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="stat-content">
                    <h4 class="events-stat-number">${stats.totalEvents}</h4>
                    <p class="events-stat-label">Total Events</p>
                    <div class="events-progress">
                        <div class="events-progress-bar" style="width: ${Math.min(100, (stats.totalEvents / 50) * 100)}%"></div>
                    </div>
                    <small class="events-level-text">${getEventLevel(stats.totalEvents)}</small>
                </div>
            </div>
        </div>
        <div class="col-md-3 col-6 mb-4">
            <div class="events-stats-card upcoming-events">
                <div class="events-stat-icon">
                    <i class="fas fa-rocket"></i>
                </div>
                <div class="stat-content">
                    <h4 class="events-stat-number">${stats.upcomingEvents}</h4>
                    <p class="events-stat-label">Upcoming Events</p>
                    <div class="events-streak-info">
                        <small>${getUpcomingEventsMessage(stats.upcomingEvents)}</small>
                    </div>
                    <small class="events-text-warning">${getEventStatus(stats.upcomingEvents)}</small>
                </div>
            </div>
        </div>
        <div class="col-md-3 col-6 mb-4">
            <div class="events-stats-card open-registration">
                <div class="events-stat-icon">
                    <i class="fas fa-user-plus"></i>
                </div>
                <div class="stat-content">
                    <h4 class="events-stat-number">${stats.eventsWithOpenRegistration}</h4>
                    <p class="events-stat-label">Open for Registration</p>
                    <div class="events-quizzes-completed-info">
                        <small>${getRegistrationMessage(stats.eventsWithOpenRegistration)}</small>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3 col-6 mb-4">
            <div class="events-stats-card total-registrations">
                <div class="events-stat-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-content">
                    <h4 class="events-stat-number">${stats.totalRegistrations}</h4>
                    <p class="events-stat-label">Total Registrations</p>
                    <div class="events-impact-stats">
                        <small>${getRegistrationsMessage(stats.totalRegistrations)}</small>
                    </div>
                    <small class="events-impact-text">Community engaged</small>
                </div>
            </div>
        </div>
        
        ${stats.registrationsByCategory && stats.registrationsByCategory.length > 0 ? `
        <div class="col-12 mt-4">
            <div class="card shadow" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div class="card-header py-3 border-0">
                    <h6 class="m-0 font-weight-bold text-white">
                        <i class="fas fa-chart-pie me-2"></i>Registrations by Category
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        ${stats.registrationsByCategory.map(cat => `
                        <div class="col-md-4 mb-2">
                            <div class="d-flex justify-content-between align-items-center text-white">
                                <span class="text-capitalize small">${cat._id.replace('-', ' ')}</span>
                                <span class="badge bg-light text-dark">${cat.count}</span>
                            </div>
                        </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
    `;
}

// Helper functions for statistics messages
function getEventLevel(totalEvents) {
    if (totalEvents === 0) return 'No Events';
    if (totalEvents <= 5) return 'Getting Started';
    if (totalEvents <= 15) return 'Active';
    if (totalEvents <= 30) return 'Very Active';
    return 'Extremely Active';
}

function getUpcomingEventsMessage(count) {
    if (count === 0) return 'No upcoming events';
    if (count === 1) return '1 event coming up';
    return `${count} events scheduled`;
}

function getEventStatus(count) {
    if (count === 0) return 'Schedule events';
    if (count <= 3) return 'Good schedule';
    return 'Excellent schedule';
}

function getRegistrationMessage(count) {
    if (count === 0) return 'No open registrations';
    if (count === 1) return '1 event open';
    return `${count} events available`;
}

function getRegistrationsMessage(count) {
    if (count === 0) return 'No registrations yet';
    if (count <= 10) return 'Growing community';
    if (count <= 50) return 'Active community';
    return 'Thriving community';
}

// Fetch all events
async function fetchAllEvents() {
    try {
        console.log('Fetching events...');
        const response = await apiCall('/events/upcoming?limit=50');
        
        if (response && response.success) {
            allEvents = response.data || [];
            filteredEvents = [...allEvents];
            console.log('Events loaded:', allEvents.length, 'events');
            
            // Display events immediately after loading
            displayEvents();
            updateCalendar();
        } else {
            throw new Error(response?.message || 'Failed to fetch events');
        }
    } catch (error) {
        console.error('Error fetching events:', error);
        // Try fallback events
        displayFallbackEvents();
    }
}

// Display events in grid/list view
function displayEvents() {
    const container = document.getElementById('events-container');
    
    if (!container) {
        console.error('Events container not found!');
        return;
    }
    
    console.log('Displaying events:', filteredEvents.length, 'in', currentView, 'view');
    
    if (filteredEvents.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <h5>No Events Found</h5>
                <p class="text-muted">Try adjusting your filters to see more events.</p>
            </div>
        `;
        return;
    }

    try {
        let htmlContent = '';
        
        if (currentView === 'grid') {
            htmlContent = filteredEvents.map(event => createEventCard(event)).join('');
        } else {
            htmlContent = filteredEvents.map(event => createEventListItem(event)).join('');
        }
        
        container.innerHTML = htmlContent;
        console.log('Events displayed successfully');
        
    } catch (error) {
        console.error('Error displaying events:', error);
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error displaying events: ${error.message}
                </div>
            </div>
        `;
    }
}

// Attach event listeners to dynamically created elements
function attachEventListeners() {
    // Add any dynamic event listeners here if needed
    console.log('Event listeners attached');
}

// Create event card for grid view
// Update the createEventCard function in events-page.js
function createEventCard(event) {
    const eventDate = new Date(event.date);
    const endDate = new Date(event.endDate);
    const isRegistered = checkIfRegistered(event);
    const now = new Date();
    
    // FIXED: Use same registration logic as events.js
    let registrationClosed = false;
    let registrationStatusText = 'Register Now';
    let registrationDeadlineInfo = '';
    
    // Check lastDateToRegister
    if (event.lastDateToRegister) {
        const lastRegDate = new Date(event.lastDateToRegister);
        if (lastRegDate < now) {
            registrationClosed = true;
            registrationStatusText = 'Registration Closed';
        } else {
            const daysLeft = Math.ceil((lastRegDate - now) / (1000 * 60 * 60 * 24));
            registrationDeadlineInfo = `
                <div class="registration-deadline alert alert-warning py-2 mb-3">
                    <i class="fas fa-clock me-1"></i>
                    Registration closes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
                </div>
            `;
        }
    }
    
    // Check if event is full
    const isEventFull = event.maxParticipants > 0 && event.currentParticipants >= event.maxParticipants;
    if (isEventFull) {
        registrationClosed = true;
        registrationStatusText = 'Event Full';
    }
    
    // Check if event is active and in future
    const isEventActive = event.isActive && eventDate > now;
    
    // Final canRegister check - same logic as events.js
    const canRegister = isEventActive && !registrationClosed && !isRegistered;

    return `
        <div class="event-card" data-event-id="${event._id}" data-category="${event.category}">
            <div class="card h-100">
                ${event.image ? `
                    <img src="${event.image}" class="event-image" alt="${event.name}">
                ` : `
                    <div class="event-image-placeholder">
                        <i class="fas fa-leaf fa-3x text-white"></i>
                    </div>
                `}
                <div class="card-body d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <span class="badge ${getCategoryBadgeClass(event.category)} category-badge">
                            ${getCategoryName(event.category)}
                        </span>
                        ${event.pointsReward > 0 ? `
                            <span class="badge bg-warning text-dark">
                                +${event.pointsReward} pts
                            </span>
                        ` : ''}
                    </div>
                    
                    <h5 class="card-title">${escapeHtml(event.name)}</h5>
                    <p class="card-text text-muted small flex-grow-1">${escapeHtml(event.description.substring(0, 100))}...</p>
                    
                    <div class="event-meta mb-3">
                        <div class="small text-muted">
                            <i class="fas fa-calendar-alt me-1"></i>
                            ${eventDate.toLocaleDateString()}
                        </div>
                        <div class="small text-muted">
                            <i class="fas fa-map-marker-alt me-1"></i>
                            ${escapeHtml(event.location)}
                        </div>
                        <div class="small text-muted">
                            <i class="fas fa-users me-1"></i>
                            ${event.currentParticipants} registered
                            ${event.maxParticipants > 0 ? `/ ${event.maxParticipants}` : ''}
                        </div>
                    </div>
                    
                    ${registrationDeadlineInfo}
                    
                    <div class="event-actions mt-auto">
                        ${isRegistered ? `
                            <!-- UPDATED: Removed Complete button, only show Cancel -->
                            <div class="d-flex gap-2">
                                <button class="btn btn-outline-danger btn-sm flex-fill" onclick="unregisterFromEvent('${event._id}')">
                                    <i class="fas fa-times me-1"></i>Cancel Registration
                                </button>
                            </div>
                            <small class="text-success d-block mt-1">
                                <i class="fas fa-check me-1"></i>Registered
                            </small>
                        ` : `
                            <button class="btn btn-success btn-sm w-100" onclick="registerForEvent('${event._id}')"
                                ${!canRegister ? 'disabled' : ''}>
                                <i class="fas fa-user-plus me-1"></i>
                                ${canRegister ? 'Register' : registrationStatusText}
                            </button>
                        `}
                    </div>
                    
                    <div class="mt-2 d-flex justify-content-between">
                        <button class="btn btn-outline-primary btn-sm" onclick="showEventDetails('${event._id}')">
                            <i class="fas fa-info-circle me-1"></i>Details
                        </button>
                        <div class="dropdown">
                            <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                <i class="fas fa-download"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="exportEventICS('${event._id}')">Download ICS</a></li>
                                <li><a class="dropdown-item" href="#" onclick="addToGoogleCalendar('${event._id}')">Add to Google Calendar</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Also update the createEventListItem function in events-page.js
function createEventListItem(event) {
    const eventDate = new Date(event.date);
    const isRegistered = checkIfRegistered(event);
    const now = new Date();
    
    // FIXED: Use same registration logic
    let registrationClosed = false;
    let registrationStatusText = 'Register Now';
    
    if (event.lastDateToRegister) {
        const lastRegDate = new Date(event.lastDateToRegister);
        if (lastRegDate < now) {
            registrationClosed = true;
            registrationStatusText = 'Registration Closed';
        }
    }
    
    const isEventFull = event.maxParticipants > 0 && event.currentParticipants >= event.maxParticipants;
    if (isEventFull) {
        registrationClosed = true;
        registrationStatusText = 'Event Full';
    }
    
    const isEventActive = event.isActive && eventDate > now;
    const canRegister = isEventActive && !registrationClosed && !isRegistered;
    
    return `
        <div class="card event-card mb-3" data-event-id="${event._id}" data-category="${event.category}">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <div class="d-flex align-items-center">
                            ${event.image ? `
                                <img src="${event.image}" class="rounded me-3" style="width: 80px; height: 80px; object-fit: cover;" alt="${event.name}">
                            ` : `
                                <div class="bg-success rounded me-3 d-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                                    <i class="fas fa-leaf text-white"></i>
                                </div>
                            `}
                            <div>
                                <span class="badge ${getCategoryBadgeClass(event.category)} category-badge">
                                    ${getCategoryName(event.category)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-5">
                        <h6 class="card-title mb-1">${escapeHtml(event.name)}</h6>
                        <p class="card-text text-muted small mb-2">${escapeHtml(event.description.substring(0, 150))}...</p>
                        <div class="small text-muted">
                            <i class="fas fa-map-marker-alt me-1"></i>${escapeHtml(event.location)}
                            <i class="fas fa-users ms-3 me-1"></i>${event.currentParticipants} registered
                        </div>
                    </div>
                    <div class="col-md-2 text-center">
                        <div class="small text-muted mb-1">Date</div>
                        <strong>${eventDate.toLocaleDateString()}</strong>
                        ${event.pointsReward > 0 ? `
                            <div class="mt-1">
                                <span class="badge bg-warning text-dark">+${event.pointsReward} pts</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="col-md-2">
                        ${isRegistered ? `
                            <!-- UPDATED: Only show Cancel button -->
                            <div class="d-flex flex-column gap-1">
                                <button class="btn btn-outline-danger btn-sm" onclick="unregisterFromEvent('${event._id}')">
                                    Cancel
                                </button>
                            </div>
                        ` : `
                            <button class="btn btn-success btn-sm w-100" onclick="registerForEvent('${event._id}')"
                                ${!canRegister ? 'disabled' : ''}>
                                ${canRegister ? 'Register' : registrationStatusText}
                            </button>
                        `}
                        <div class="dropdown mt-1">
                            <button class="btn btn-outline-secondary btn-sm w-100 dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                Export
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="exportEventICS('${event._id}')">ICS File</a></li>
                                <li><a class="dropdown-item" href="#" onclick="addToGoogleCalendar('${event._id}')">Google Calendar</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Initialize FullCalendar
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: [],
        eventClick: function(info) {
            showEventDetails(info.event.id);
        },
        eventDisplay: 'block',
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            meridiem: 'short'
        }
    });
    
    calendar.render();
}

// Update calendar with events
function updateCalendar() {
    const events = filteredEvents.map(event => ({
        id: event._id,
        title: event.name,
        start: event.date,
        end: event.endDate,
        backgroundColor: getCategoryColor(event.category),
        borderColor: getCategoryColor(event.category),
        extendedProps: {
            description: event.description,
            location: event.location,
            category: event.category
        }
    }));
    
    calendar.removeAllEvents();
    calendar.addEventSource(events);
}

// Get category color for calendar
function getCategoryColor(category) {
    const colors = {
        'tree-planting': '#28a745',
        'beach-cleanup': '#17a2b8',
        'workshop': '#ffc107',
        'conference': '#007bff',
        'protest': '#dc3545',
        'fundraiser': '#6f42c1',
        'other': '#6c757d'
    };
    return colors[category] || '#6c757d';
}

// Apply filters
// Apply filters with proper registration logic
function applyFilters() {
    const selectedCategories = Array.from(document.querySelectorAll('.category-filter:checked')).map(f => f.value);
    const selectedStatus = Array.from(document.querySelectorAll('.status-filter:checked')).map(f => f.value);
    const selectedRegistration = Array.from(document.querySelectorAll('.registration-filter:checked')).map(f => f.value);
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;
    
    console.log('Applying filters:', {
        categories: selectedCategories,
        status: selectedStatus,
        registration: selectedRegistration,
        startDate,
        endDate
    });
    
    filteredEvents = allEvents.filter(event => {
        let passesFilter = true;
        const now = new Date();
        const eventDate = new Date(event.date);
        const eventEndDate = new Date(event.endDate);
        
        // Category filter
        if (selectedCategories.length > 0 && !selectedCategories.includes('all')) {
            if (!selectedCategories.includes(event.category)) {
                passesFilter = false;
            }
        }
        
        // Status filter
        if (selectedStatus.length > 0) {
            let statusMatch = false;
            
            if (selectedStatus.includes('upcoming') && eventDate > now) {
                statusMatch = true;
            }
            if (selectedStatus.includes('ongoing') && eventDate <= now && eventEndDate >= now) {
                statusMatch = true;
            }
            if (selectedStatus.includes('past') && eventEndDate < now) {
                statusMatch = true;
            }
            
            if (!statusMatch) {
                passesFilter = false;
            }
        }
        
        // Registration filter - FIXED LOGIC
        if (selectedRegistration.length > 0) {
            let registrationMatch = false;
            
            // "Open for Registration" filter
            if (selectedRegistration.includes('open')) {
                const registrationOpen = isRegistrationOpen(event);
                if (registrationOpen) {
                    registrationMatch = true;
                }
            }
            
            // "My Registered Events" filter
            if (selectedRegistration.includes('registered')) {
                if (checkIfRegistered(event)) {
                    registrationMatch = true;
                }
            }
            
            // If neither condition is met and we have registration filters active
            if (!registrationMatch && selectedRegistration.length > 0) {
                passesFilter = false;
            }
        }
        
        // Date range filter
        if (startDate) {
            const filterStartDate = new Date(startDate);
            filterStartDate.setHours(0, 0, 0, 0);
            if (eventDate < filterStartDate) {
                passesFilter = false;
            }
        }
        
        if (endDate) {
            const filterEndDate = new Date(endDate);
            filterEndDate.setHours(23, 59, 59, 999);
            if (eventDate > filterEndDate) {
                passesFilter = false;
            }
        }
        
        return passesFilter;
    });
    
    console.log('Filtered events:', filteredEvents.length);
    displayEvents();
    updateCalendar();
}

// Helper function to check if registration is open using lastDateToRegister
function isRegistrationOpen(event) {
    const now = new Date();
    const eventDate = new Date(event.date);
    const lastDateToRegister = event.lastDateToRegister ? new Date(event.lastDateToRegister) : null;
    
    // Check if event is active and in the future
    if (!event.isActive || eventDate <= now) {
        return false;
    }
    
    // Check lastDateToRegister
    if (lastDateToRegister && now > lastDateToRegister) {
        return false;
    }
    
    // Check participant limit
    if (event.maxParticipants > 0 && event.currentParticipants >= event.maxParticipants) {
        return false;
    }
    
    return true;
}

// Reset filters
// Reset filters function
function resetFilters() {
    // Reset category filters
    document.getElementById('filter-all').checked = true;
    document.querySelectorAll('.category-filter').forEach(f => f.checked = true);
    
    // Reset status filters (only upcoming checked by default)
    document.querySelectorAll('.status-filter').forEach(f => {
        f.checked = f.value === 'upcoming';
    });
    
    // Reset registration filters (only open checked by default)
    document.querySelectorAll('.registration-filter').forEach(f => {
        f.checked = f.value === 'open';
    });
    
    // Reset date filters
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    
    // Apply the reset filters
    applyFilters();
}

// Toggle between grid and list view
function toggleView(view) {
    currentView = view;
    displayEvents();
}

// Show event details modal
function showEventDetails(eventId) {
    const event = allEvents.find(e => e._id === eventId);
    if (!event) return;
    const isRegistered = checkIfRegistered(event);
    // Create and show modal with event details
    const modalHtml = `
        <div class="modal fade" id="eventDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${escapeHtml(event.name)}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Category:</strong> <span class="badge ${getCategoryBadgeClass(event.category)}">${getCategoryName(event.category)}</span></p>
                                <p><strong>Date:</strong> ${new Date(event.date).toLocaleString()}</p>
                                <p><strong>End Date:</strong> ${new Date(event.endDate).toLocaleString()}</p>
                                <p><strong>Location:</strong> ${escapeHtml(event.location)}</p>
                                <p><strong>Address:</strong> ${escapeHtml(event.address)}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Organizer:</strong> ${escapeHtml(event.organizer)}</p>
                                <p><strong>Participants:</strong> ${event.currentParticipants}${event.maxParticipants > 0 ? ` / ${event.maxParticipants}` : ''}</p>
                                <p><strong>Points Reward:</strong> ${event.pointsReward}</p>
                                <p><strong>Registration:</strong> ${isRegistered ? 'Registered' : 'Not Registered'}</p>
                            </div>
                        </div>
                        <div class="mt-3">
                            <strong>Description:</strong>
                            <p>${escapeHtml(event.description)}</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <div class="dropdown">
                            <button class="btn btn-success dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                <i class="fas fa-download me-2"></i>Export
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="exportEventICS('${event._id}')">Download ICS File</a></li>
                                <li><a class="dropdown-item" href="#" onclick="addToGoogleCalendar('${event._id}')">Add to Google Calendar</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('eventDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body and show it
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
    modal.show();
}

// Export single event as ICS
function exportEventICS(eventId) {
    const event = allEvents.find(e => e._id === eventId);
    if (!event) return;
    
    const icsContent = generateICS(event);
    downloadICS(icsContent, `${event.name}.ics`);
}

// Export all events as ICS
function exportAllEventsICS() {
    const icsContent = generateICSForMultipleEvents(filteredEvents);
    downloadICS(icsContent, 'ujjivana-events.ics');
}

// Generate ICS content for a single event
function generateICS(event) {
    const start = formatDateForICS(new Date(event.date));
    const end = formatDateForICS(new Date(event.endDate));
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Ujjivana//EN
BEGIN:VEVENT
UID:${event._id}@ujjivana.com
DTSTAMP:${formatDateForICS(new Date())}
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.name}
DESCRIPTION:${event.description}
LOCATION:${event.location}
ORGANIZER;CN=${event.organizer}:MAILTO:info@ujjivana.com
END:VEVENT
END:VCALENDAR`;
}

// Generate ICS for multiple events
function generateICSForMultipleEvents(events) {
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Ujjivana//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH\n`;
    
    events.forEach(event => {
        const start = formatDateForICS(new Date(event.date));
        const end = formatDateForICS(new Date(event.endDate));
        
        icsContent += `BEGIN:VEVENT
UID:${event._id}@ujjivana.com
DTSTAMP:${formatDateForICS(new Date())}
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.name}
DESCRIPTION:${event.description}
LOCATION:${event.location}
ORGANIZER;CN=${event.organizer}:MAILTO:info@ujjivana.com
END:VEVENT\n`;
    });
    
    icsContent += 'END:VCALENDAR';
    return icsContent;
}

// Format date for ICS
function formatDateForICS(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Download ICS file
function downloadICS(icsContent, filename) {
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Add single event to Google Calendar
function addToGoogleCalendar(eventId) {
    const event = allEvents.find(e => e._id === eventId);
    if (!event) return;
    
    const start = encodeURIComponent(new Date(event.date).toISOString());
    const end = encodeURIComponent(new Date(event.endDate).toISOString());
    const text = encodeURIComponent(event.name);
    const details = encodeURIComponent(event.description);
    const location = encodeURIComponent(event.location);
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=${start}/${end}&text=${text}&details=${details}&location=${location}`;
    
    window.open(url, '_blank');
}

// Add all events to Google Calendar (via ICS import)
function addAllToGoogleCalendar() {
    const icsContent = generateICSForMultipleEvents(filteredEvents);
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    
    // Guide user to import the ICS file
    alert('To add all events to Google Calendar:\n1. Download the ICS file\n2. Go to Google Calendar\n3. Click Settings → Import & Export\n4. Select the downloaded file and import');
    
    downloadICS(icsContent, 'ujjivana-events.ics');
}

// Helper functions from events.js
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"',]/g, function (c) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];
    });
}

function getCategoryBadgeClass(category) {
    const classes = {
        'tree-planting': 'bg-success',
        'beach-cleanup': 'bg-info',
        'workshop': 'bg-warning',
        'conference': 'bg-primary',
        'protest': 'bg-danger',
        'fundraiser': 'bg-purple',
        'other': 'bg-secondary'
    };
    return classes[category] || 'bg-secondary';
}

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

function checkIfRegistered(event) {
    const user = getCurrentUser();
    if (!user) return false;
    return event.registrations.some(reg => reg.userId === user.id);
}

// Fallback events display
function displayFallbackEvents() {
    const container = document.getElementById('events-container');
    container.innerHTML = `
        <div class="col-12">
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Unable to load events. Please check your connection and try again.
            </div>
        </div>
    `;
}
// Test function to verify events display
function testEventsDisplay() {
    console.log('Testing events display...');
    
    // Check if we have events
    if (allEvents.length === 0) {
        console.log('No events loaded');
        return false;
    }
    
    // Check if container exists
    const container = document.getElementById('events-container');
    if (!container) {
        console.log('Events container not found');
        return false;
    }
    
    // Check if events are being displayed
    const eventCards = container.querySelectorAll('.event-card');
    console.log('Event cards found:', eventCards.length);
    
    if (eventCards.length === 0) {
        console.log('No event cards rendered');
        return false;
    }
    
    console.log('Events display test: PASSED');
    return true;
}

// Call this after events are loaded
window.testEvents = testEventsDisplay;
// Debug function to check what's happening
function debugEventsDisplay() {
    console.log('=== EVENTS DEBUG INFO ===');
    console.log('All events:', allEvents);
    console.log('Filtered events:', filteredEvents);
    console.log('Current view:', currentView);
    
    const container = document.getElementById('events-container');
    console.log('Container exists:', !!container);
    console.log('Container HTML:', container?.innerHTML);
    
    // Check if events have the required fields
    if (allEvents.length > 0) {
        const sampleEvent = allEvents[0];
        console.log('Sample event structure:', {
            id: sampleEvent._id,
            name: sampleEvent.name,
            date: sampleEvent.date,
            lastDateToRegister: sampleEvent.lastDateToRegister,
            isActive: sampleEvent.isActive,
            maxParticipants: sampleEvent.maxParticipants,
            currentParticipants: sampleEvent.currentParticipants,
            registrationOpen: isRegistrationOpen(sampleEvent)
        });
    }
    
    console.log('=== END DEBUG INFO ===');
}

// Call this function if events aren't showing
window.debugEvents = debugEventsDisplay;