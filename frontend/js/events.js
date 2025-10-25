let currentEvents = [];
let currentEventIndex = 0;

// Fetch upcoming events
async function fetchUpcomingEvents() {
    try {
        const response = await apiCall('/events/upcoming?limit=10');
        currentEvents = response.data || [];
        displayEventsCarousel();
    } catch (error) {
        console.error('Error fetching events:', error);
        displayFallbackEvents();
    }
}

// Display events in carousel
function displayEventsCarousel() {
    const carousel = document.getElementById('events-carousel');
  if (currentEvents.length === 0) {
    carousel.innerHTML = `
      <div class="text-center py-4 py-lg-5">
        <i class="fas fa-calendar-times fa-2x fa-lg-3x text-muted mb-3"></i>
        <h5 class="h6 h-lg-5">No Upcoming Events</h5>
        <p class="text-muted small">Check back later for new green events!</p>
      </div>
    `;
    document.getElementById('events-prev').style.display = 'none';
    document.getElementById('events-next').style.display = 'none';
    return;
  }

    carousel.innerHTML = '';
    currentEvents.forEach((event, index) => {
        const eventDate = new Date(event.date);
        const endDate = new Date(event.endDate);
        const isRegistered = checkIfRegistered(event);
        
        const eventCard = createEventCard(event, eventDate, endDate, isRegistered, index === 0);
        carousel.innerHTML += eventCard;
    });

    updateCarouselNavigation();
}

// Create event card HTML
// Update the createEventCard function in events.js
function createEventCard(event, eventDate, endDate, isRegistered, isActive = false) {
  const activeClass = isActive ? 'active' : '';
  const daysUntil = Math.ceil((eventDate - new Date()) / (1000 * 60 * 60 * 24));
  const dateString = formatEventDate(eventDate, endDate);
  
  // FIXED: Consistent registration logic
  const now = new Date();
  let registrationClosed = false;
  let registrationStatusText = 'Register Now';
  let registrationDeadlineInfo = '';
  
  // Check lastDateToRegister first
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
  
  // Final canRegister check - use the same logic as events-page.js
  const canRegister = isEventActive && !registrationClosed && !isRegistered;

  return `
    <div class="event-card carousel-item ${activeClass}" data-event-id="${event._id}">
      <div class="card h-100 event-card-content border-0 shadow-sm">
        <div class="row g-0 h-100">
          <!-- Left Column - Event Image & Basic Info -->
          <div class="col-lg-5">
            <div class="h-100 d-flex flex-column">
              <!-- Event Image -->
              ${event.image ? `
                <div class="event-image-container">
                  <img src="${event.image}" class="event-image" alt="${event.name}">
                  <div class="event-image-overlay">
                    <span class="event-category badge ${getCategoryBadgeClass(event.category)}">
                      ${getCategoryName(event.category)}
                    </span>
                    <span class="event-days-until badge bg-light text-dark">
                      <i class="fas fa-calendar me-1"></i>
                      ${daysUntil <= 0 ? 'Today' : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} to go`}
                    </span>
                  </div>
                </div>
              ` : `
                <div class="event-image-placeholder">
                  <i class="fas fa-leaf fa-4x text-white"></i>
                  <div class="event-image-overlay">
                    <span class="event-category badge ${getCategoryBadgeClass(event.category)}">
                      ${getCategoryName(event.category)}
                    </span>
                    <span class="event-days-until badge bg-light text-dark">
                      <i class="fas fa-calendar me-1"></i>
                      ${daysUntil <= 0 ? 'Today' : `${daysUntil} day${daysUntil !== 1 ? 's' : ''} to go`}
                    </span>
                  </div>
                </div>
              `}
              
              <!-- Quick Stats -->
              <div class="event-stats p-3 border-bottom">
                <div class="row text-center">
                  <div class="col-4">
                    <div class="stat-item">
                      <i class="fas fa-users text-primary mb-1"></i>
                      <div class="small text-muted">Participants</div>
                      <strong class="text-dark">${event.currentParticipants}</strong>
                      ${event.maxParticipants > 0 ? `<small class="text-muted">/ ${event.maxParticipants}</small>` : ''}
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="stat-item">
                      <i class="fas fa-gift text-warning mb-1"></i>
                      <div class="small text-muted">Points</div>
                      <strong class="text-dark">+${event.pointsReward}</strong>
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="stat-item">
                      <i class="fas fa-clock text-info mb-1"></i>
                      <div class="small text-muted">Duration</div>
                      <strong class="text-dark">${Math.ceil((endDate - eventDate) / (1000 * 60 * 60))}h</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Right Column - Event Details & Description -->
          <div class="col-lg-7">
            <div class="card-body h-100 d-flex flex-column p-4">
              <!-- Event Header -->
              <div class="event-header mb-3">
                <h4 class="event-name text-dark mb-2">${escapeHtml(event.name)}</h4>
                ${registrationDeadlineInfo}
              </div>
              
              <!-- Event Meta Information -->
              <div class="event-meta mb-4">
                <div class="row g-2">
                  <div class="col-sm-6">
                    <div class="meta-item d-flex align-items-center">
                      <i class="fas fa-calendar-alt text-success me-2"></i>
                      <div>
                        <small class="text-muted d-block">Date & Time</small>
                        <strong class="text-dark">${dateString}</strong>
                      </div>
                    </div>
                  </div>
                  <div class="col-sm-6">
                    <div class="meta-item d-flex align-items-center">
                      <i class="fas fa-map-marker-alt text-success me-2"></i>
                      <div>
                        <small class="text-muted d-block">Location</small>
                        <strong class="text-dark">${escapeHtml(event.location)}</strong>
                      </div>
                    </div>
                  </div>
                  <div class="col-sm-6">
                    <div class="meta-item d-flex align-items-center">
                      <i class="fas fa-user text-success me-2"></i>
                      <div>
                        <small class="text-muted d-block">Organizer</small>
                        <strong class="text-dark">${escapeHtml(event.organizer)}</strong>
                      </div>
                    </div>
                  </div>
                  <div class="col-sm-6">
                    <div class="meta-item d-flex align-items-center">
                      <i class="fas fa-home text-success me-2"></i>
                      <div>
                        <small class="text-muted d-block">Address</small>
                        <strong class="text-dark small">${escapeHtml(event.address)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Scrollable Description -->
              <div class="event-description-section flex-grow-1 mb-4">
                <h6 class="text-muted mb-2 border-bottom pb-2">
                  <i class="fas fa-align-left me-2"></i>Event Description
                </h6>
                <div class="event-description-scrollable">
                  <p class="text-dark mb-0">${escapeHtml(event.description)}</p>
                </div>
              </div>
              
              <!-- Action Buttons - UPDATED: Removed Complete button -->
              <div class="event-actions mt-auto">
                ${isRegistered ? `
                  <div class="registered-status">
                    <div class="alert alert-success mb-3 py-2">
                      <i class="fas fa-check-circle me-2"></i>
                      You're registered for this event!
                      ${event.pointsReward > 0 ? `<br><small class="mt-1 d-block">You earned ${event.pointsReward} points. Cancelling will deduct these points.</small>` : ''}
                    </div>
                    <div class="d-flex gap-2">
                      <!-- REMOVED: Complete Registration button -->
                      <button class="btn btn-outline-danger flex-fill" onclick="unregisterFromEvent('${event._id}')">
                        <i class="fas fa-times me-2"></i>Cancel Registration
                      </button>
                    </div>
                  </div>
                ` : `
                  <div class="registration-actions">
                    <div class="d-flex gap-2 align-items-center">
                      <button class="btn btn-success btn-lg flex-fill" onclick="registerForEvent('${event._id}')"
                        ${!canRegister ? 'disabled' : ''}>
                        <i class="fas fa-user-plus me-2"></i>
                        ${canRegister ? 'Register Now' : registrationStatusText}
                      </button>
                      ${event.pointsReward > 0 ? `
                        <div class="points-reward text-center">
                          <span class="badge bg-warning text-dark points-badge fs-6">
                            +${event.pointsReward} pts
                          </span>
                          <div class="small text-muted mt-1">Reward</div>
                        </div>
                      ` : ''}
                    </div>
                    ${!canRegister && !registrationClosed && !isEventFull ? `
                      <small class="text-muted mt-2 d-block">
                        <i class="fas fa-info-circle me-1"></i>
                        Registration opens soon
                      </small>
                    ` : ''}
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}
// Check if user is registered for event
function checkIfRegistered(event) {
    const user = getCurrentUser();
    if (!user) return false;
    
    return event.registrations.some(reg => reg.userId === user.id);
}

// Format event date
function formatEventDate(startDate, endDate) {
    const options = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    if (startDate.toDateString() === endDate.toDateString()) {
        // Same day event
        return `${startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • ${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        // Multi-day event
        return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }
}

// Get category badge class
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

// Get category name
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

// Update carousel navigation
function updateCarouselNavigation() {
    const prevBtn = document.getElementById('events-prev');
    const nextBtn = document.getElementById('events-next');
    
    if (currentEvents.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
    }
}
function updateUserPointsDisplay() {
  const user = getCurrentUser();
  if (user) {
    // Update points in user dropdown or other UI elements
    const pointsElements = document.querySelectorAll('.user-points');
    pointsElements.forEach(element => {
      element.textContent = user.points || 0;
    });
  }
}
// Register for event
async function registerForEvent(eventId) {
    if (!checkLogin()) {
        alert('Please login to register for events');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await apiCall(`/events/${eventId}/register`, {
            method: 'POST'
        });
          
        alert(`Successfully registered! ${response.data.pointsAwarded ? `You earned ${response.data.pointsAwarded} points!` : ''}`);
        
        // Open registration link in new tab
        window.open(response.data.registrationLink, '_blank');
        
        // Refresh events
        await fetchUpcomingEvents();
        
    } catch (error) {
        console.error('Registration error:', error);
        alert('Error registering for event: ' + error.message);
    }
}

// Unregister from event
async function unregisterFromEvent(eventId) {
  const event = currentEvents.find(e => e._id === eventId);
  if (!event) {
    alert('Event not found');
    return;
  }

  let confirmationMessage = 'Are you sure you want to cancel your registration for "' + event.name + '"?';
  
  if (event.pointsReward > 0) {
    confirmationMessage += `\n\n⚠️ Warning: ${event.pointsReward} points earned from this event will be deducted from your account.`;
  }

  confirmationMessage += '\n\nThis action cannot be undone.';

  if (!confirm(confirmationMessage)) {
    return;
  }

  try {
    const response = await apiCall(`/events/${eventId}/unregister`, {
      method: 'DELETE'
    });

    console.log('Unregister response:', response); // Debug log

    // Check if response exists and has data
    if (!response) {
      throw new Error('No response received from server');
    }

    let successMessage = '✅ Registration cancelled successfully.';
    
    // Safely check for points deduction
    if (response.data && response.data.pointsDeducted > 0) {
      successMessage += `\n\n${response.data.pointsDeducted} points have been deducted from your account.`;
      
      // Update user points
      const user = getCurrentUser();
      if (user && response.data.currentPoints !== undefined) {
        user.points = response.data.currentPoints;
        localStorage.setItem('user', JSON.stringify(user));
        updateUIForLoginStatus();
      }
    } else if (response.pointsDeducted > 0) {
      // Alternative response structure
      successMessage += `\n\n${response.pointsDeducted} points have been deducted from your account.`;
      
      const user = getCurrentUser();
      if (user && response.currentPoints !== undefined) {
        user.points = response.currentPoints;
        localStorage.setItem('user', JSON.stringify(user));
        updateUIForLoginStatus();
      }
    }

    alert(successMessage);
    await fetchUpcomingEvents();

  } catch (error) {
    console.error('Unregistration error:', error);
    
    if (error.message.includes('User not registered') || error.message.includes('not found')) {
      alert('❌ You are not registered for this event');
      await fetchUpcomingEvents();
    } else if (error.message.includes('No response')) {
      alert('❌ Server error: No response received. Please try again.');
    } else {
      alert('❌ Error cancelling registration: ' + error.message);
    }
  }
}

function setupCarouselNavigation() {
  const prevBtn = document.getElementById('events-prev');
  const nextBtn = document.getElementById('events-next');
  const carousel = document.getElementById('events-carousel');

  // Improved navigation with mobile consideration
  prevBtn.addEventListener('click', () => {
    navigateCarousel(-1);
  });

  nextBtn.addEventListener('click', () => {
    navigateCarousel(1);
  });

  // Touch swipe support for mobile
  let touchStartX = 0;
  let touchEndX = 0;

  carousel.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  });

  carousel.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  });

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        navigateCarousel(1); // Swipe left - next
      } else {
        navigateCarousel(-1); // Swipe right - previous
      }
    }
  }

  function navigateCarousel(direction) {
    const activeCard = carousel.querySelector('.event-card.active');
    let targetCard;

    if (direction === 1) {
      targetCard = activeCard.nextElementSibling;
    } else {
      targetCard = activeCard.previousElementSibling;
    }

    if (targetCard) {
      activeCard.classList.remove('active');
      targetCard.classList.add('active');
      
      // Smooth scroll to target card
      targetCard.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }
}
// Fallback events
function displayFallbackEvents() {
    const carousel = document.getElementById('events-carousel');
    carousel.innerHTML = `
        <div class="event-card carousel-item active">
            <div class="card h-100 event-card-content">
                <div class="event-image-placeholder">
                    <i class="fas fa-leaf fa-3x text-white"></i>
                </div>
                <div class="card-body">
                    <h5 class="card-title">Community Tree Planting</h5>
                    <p class="card-text">Join us for a community tree planting event to help green our city and combat climate change.</p>
                    <div class="event-meta">
                        <div class="event-date">
                            <i class="fas fa-calendar-alt me-2 text-success"></i>
                            <small>Sat, Jun 15, 2024 • 9:00 AM - 12:00 PM</small>
                        </div>
                        <div class="event-location">
                            <i class="fas fa-map-marker-alt me-2 text-success"></i>
                            <small>Central Park, New York</small>
                        </div>
                    </div>
                    <a href="#" class="btn btn-success w-100 mt-3">Register Now</a>
                </div>
            </div>
        </div>
    `;
}

// Initialize events
document.addEventListener('DOMContentLoaded', function() {
    fetchUpcomingEvents();
    setupCarouselNavigation();
    
    // Refresh events every 5 minutes
    setInterval(fetchUpcomingEvents, 5 * 60 * 1000);
});