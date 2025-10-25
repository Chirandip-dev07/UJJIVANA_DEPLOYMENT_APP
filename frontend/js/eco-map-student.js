// Student-specific eco-map functionality
let map;
let ecoPins = [];
let markers = [];

const pinIcons = {
    pollution: L.divIcon({
        html: '<i class="fas fa-smog fa-lg text-white"></i>',
        iconSize: [30, 30],
        className: 'pollution-marker d-flex align-items-center justify-content-center'
    }),
    park: L.divIcon({
        html: '<i class="fas fa-tree fa-lg text-white"></i>',
        iconSize: [30, 30],
        className: 'park-marker d-flex align-items-center justify-content-center'
    }),
    project: L.divIcon({
        html: '<i class="fas fa-recycle fa-lg text-white"></i>',
        iconSize: [30, 30],
        className: 'project-marker d-flex align-items-center justify-content-center'
    }),
    club: L.divIcon({
        html: '<i class="fas fa-users fa-lg text-white"></i>',
        iconSize: [30, 30],
        className: 'club-marker d-flex align-items-center justify-content-center'
    })
};

const markerStyles = `
    .pollution-marker {
        background-color: #dc3545;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .park-marker {
        background-color: #198754;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .project-marker {
        background-color: #0dcaf0;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .club-marker {
        background-color: #ffc107;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
`;

// Add marker styles to the document
const styleSheet = document.createElement("style");
styleSheet.innerText = markerStyles;
document.head.appendChild(styleSheet);

function initMap() {
    const defaultLat = 20.5937;
    const defaultLng = 78.9629;
    
    map = L.map('map-container').setView([defaultLat, defaultLng], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    loadEcoPins();
}

async function loadEcoPins() {
    try {
        const response = await apiCall('/eco-map/pins');
        ecoPins = response.data;
        updateStats();
        displayEcoPins();
        displayPinsOnMap();
        displayClubs();
    } catch (error) {
        console.error('Error loading eco pins:', error);
        createSamplePins();
    }
}

function createSamplePins() {
    ecoPins = [
        {
            _id: '1',
            title: 'Yamuna River Pollution',
            type: 'pollution',
            description: 'Severe water pollution in Yamuna River near Delhi',
            latitude: 28.6139,
            longitude: 77.2090,
            address: 'Yamuna River, Delhi, India',
            contact: '',
            website: '',
            image: '',
            isActive: true,
            createdAt: new Date()
        },
        {
            _id: '2',
            title: 'Lodhi Garden',
            type: 'park',
            description: 'Beautiful historical park with lush greenery',
            latitude: 28.5930,
            longitude: 77.2190,
            address: 'Lodhi Garden, New Delhi, India',
            contact: '+91-11-24647004',
            website: 'https://delhitourism.gov.in',
            image: '',
            isActive: true,
            createdAt: new Date()
        },
        {
            _id: '3',
            title: 'Clean Ganga Project',
            type: 'project',
            description: 'Government initiative to clean and protect River Ganga',
            latitude: 25.3176,
            longitude: 83.0058,
            address: 'Varanasi, Uttar Pradesh, India',
            contact: 'projectgangacleanup@gov.in',
            website: 'https://nmcg.nic.in',
            image: '',
            isActive: true,
            createdAt: new Date()
        },
        {
            _id: '4',
            title: 'Green Earth Eco Club',
            type: 'club',
            description: 'Student-run environmental conservation club at Delhi University',
            latitude: 28.7041,
            longitude: 77.1025,
            address: 'Delhi University, North Campus, Delhi',
            contact: 'greenearth@du.ac.in',
            website: '',
            whatsapp: 'https://chat.whatsapp.com/example1',
            discord: 'https://discord.gg/example1',
            image: '',
            isActive: true,
            createdAt: new Date()
        },
        {
            _id: '5',
            title: 'Youth for Environment',
            type: 'club',
            description: 'Young activists working on environmental awareness campaigns',
            latitude: 28.4595,
            longitude: 77.0266,
            address: 'Gurugram, Haryana, India',
            contact: 'youth.env@gmail.com',
            website: 'https://youthforenvironment.org',
            whatsapp: 'https://chat.whatsapp.com/example2',
            discord: 'https://discord.gg/example2',
            image: '',
            isActive: true,
            createdAt: new Date()
        },
        {
            _id: '6',
            title: 'Eco Warriors Club',
            type: 'club',
            description: 'School eco club promoting sustainability among students',
            latitude: 28.5355,
            longitude: 77.3910,
            address: 'Noida, Uttar Pradesh, India',
            contact: 'ecowarriors@school.edu',
            website: '',
            whatsapp: 'https://chat.whatsapp.com/example3',
            discord: '',
            image: '',
            isActive: true,
            createdAt: new Date()
        }
    ];
    updateStats();
    displayEcoPins();
    displayPinsOnMap();
    displayClubs();
}

function updateStats() {
    const totalPins = ecoPins.length;
    const pollutionPins = ecoPins.filter(pin => pin.type === 'pollution').length;
    const parkPins = ecoPins.filter(pin => pin.type === 'park').length;
    const projectPins = ecoPins.filter(pin => pin.type === 'project').length;
    const clubPins = ecoPins.filter(pin => pin.type === 'club').length;
    const activePins = ecoPins.filter(pin => pin.isActive).length;

    document.getElementById('total-pins').textContent = totalPins;
    document.getElementById('pollution-pins').textContent = pollutionPins;
    document.getElementById('park-pins').textContent = parkPins;
    document.getElementById('project-pins').textContent = projectPins;
    document.getElementById('club-pins').textContent = clubPins;
    document.getElementById('active-pins').textContent = activePins;
}

function displayEcoPins() {
    const pinsList = document.getElementById('pins-list');
    const filterType = document.getElementById('pin-type-filter').value;
    
    let filteredPins = ecoPins;
    if (filterType) {
        filteredPins = ecoPins.filter(pin => pin.type === filterType);
    }

    if (filteredPins.length === 0) {
        pinsList.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="fas fa-info-circle me-2"></i>
                No eco pins found matching your filter.
            </div>
        `;
        return;
    }

    let html = '';
    filteredPins.forEach(pin => {
        const typeClass = getPinTypeClass(pin.type);
        const typeLabel = getPinTypeLabel(pin.type);
        
        html += `
            <div class="card eco-pin-card ${pin.type} mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${pin.title}</h6>
                        <span class="badge ${typeClass} pin-type-badge">${typeLabel}</span>
                    </div>
                    <p class="card-text small">${pin.description}</p>
                    <div class="text-muted small mb-2">
                        <i class="fas fa-map-marker-alt me-1"></i>
                        ${pin.address}
                    </div>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewOnMap(${pin.latitude}, ${pin.longitude})">
                            <i class="fas fa-map"></i> View on Map
                        </button>
                        ${pin.type === 'club' ? `
                        <button class="btn btn-sm btn-outline-success" onclick="showClubDetails('${pin._id}')">
                            <i class="fas fa-info-circle"></i> Club Info
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    pinsList.innerHTML = html;
}

function displayPinsOnMap() {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    ecoPins.forEach(pin => {
        if (pin.isActive && pin.latitude && pin.longitude) {
            const marker = L.marker([pin.latitude, pin.longitude], {
                icon: pinIcons[pin.type]
            }).addTo(map);
            
            marker.bindPopup(`
                <div class="text-center">
                    <h6>${pin.title}</h6>
                    <span class="badge ${getPinTypeClass(pin.type)}">${getPinTypeLabel(pin.type)}</span>
                    <p class="mt-2">${pin.description}</p>
                    <small class="text-muted">${pin.address}</small>
                    ${pin.contact ? `<br><small><i class="fas fa-phone"></i> ${pin.contact}</small>` : ''}
                    ${pin.website ? `<br><small><i class="fas fa-globe"></i> <a href="${pin.website}" target="_blank">Website</a></small>` : ''}
                    ${pin.type === 'club' ? `
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-success" onclick="showClubDetails('${pin._id}')">
                            <i class="fas fa-info-circle"></i> Club Details
                        </button>
                    </div>
                    ` : ''}
                </div>
            `);
            
            markers.push(marker);
        }
    });
}

function displayClubs() {
    const clubsList = document.getElementById('clubs-list');
    const clubs = ecoPins.filter(pin => pin.type === 'club');
    
    if (clubs.length === 0) {
        clubsList.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    No eco clubs found in your area.
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    clubs.forEach(club => {
        html += `
            <div class="col-md-6 col-lg-4">
                <div class="club-card">
                    <div class="club-header">
                        <h5 class="mb-0">${club.title}</h5>
                    </div>
                    <div class="club-body">
                        <p class="card-text">${club.description}</p>
                        <div class="text-muted small mb-2">
                            <i class="fas fa-map-marker-alt me-1"></i>
                            ${club.address}
                        </div>
                        ${club.contact ? `
                        <div class="text-muted small mb-2">
                            <i class="fas fa-envelope me-1"></i>
                            ${club.contact}
                        </div>
                        ` : ''}
                        <div class="d-grid gap-2">
                            ${club.whatsapp ? `
                            <a href="${club.whatsapp}" target="_blank" class="btn btn-success join-btn">
                                <i class="fab fa-whatsapp me-2"></i>Join WhatsApp Group
                            </a>
                            ` : ''}
                            ${club.discord ? `
                            <a href="${club.discord}" target="_blank" class="btn btn-primary join-btn">
                                <i class="fab fa-discord me-2"></i>Join Discord Server
                            </a>
                            ` : ''}
                            ${!club.whatsapp && !club.discord ? `
                            <button class="btn btn-secondary join-btn" disabled>
                                No Join Links Available
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    clubsList.innerHTML = html;
}

function viewOnMap(lat, lng) {
    map.setView([lat, lng], 15);
    
    markers.forEach(marker => {
        const markerLatLng = marker.getLatLng();
        if (markerLatLng.lat === lat && markerLatLng.lng === lng) {
            marker.openPopup();
        }
    });
}

function showClubDetails(clubId) {
    const club = ecoPins.find(pin => pin._id === clubId);
    if (!club) {
        alert('Club not found');
        return;
    }
    
    // Switch to clubs tab
    const clubsTab = new bootstrap.Tab(document.getElementById('clubs-tab'));
    clubsTab.show();
    
    // Scroll to the specific club
    setTimeout(() => {
        const clubElement = document.querySelector(`[data-club-id="${clubId}"]`);
        if (clubElement) {
            clubElement.scrollIntoView({ behavior: 'smooth' });
        }
    }, 300);
}

function getPinTypeClass(type) {
    const classes = {
        pollution: 'pollution-badge',
        park: 'park-badge',
        project: 'project-badge',
        club: 'club-badge'
    };
    return classes[type] || 'badge-secondary';
}

function getPinTypeLabel(type) {
    const labels = {
        pollution: 'Pollution Hotspot',
        park: 'Green Park',
        project: 'Environmental Project',
        club: 'Eco Club'
    };
    return labels[type] || 'Unknown';
}

async function submitPinRequest(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submit-request-btn');
    const form = document.getElementById('pin-request-form');
    
    const requestData = {
        title: document.getElementById('request-title').value,
        type: document.getElementById('request-type').value,
        description: document.getElementById('request-description').value,
        address: document.getElementById('request-address').value,
        contact: document.getElementById('request-contact').value,
        website: document.getElementById('request-website').value,
        latitude: parseFloat(document.getElementById('request-latitude').value),
        longitude: parseFloat(document.getElementById('request-longitude').value),
        notes: document.getElementById('request-notes').value
    };
    
    // Validation
    if (!requestData.title || !requestData.type || !requestData.description || 
        !requestData.address || !requestData.latitude || !requestData.longitude) {
        alert('Please fill in all required fields.');
        return;
    }
    
    try {
        submitBtn.disabled = true;
        submitBtn.querySelector('.loading-text').style.display = 'none';
        submitBtn.querySelector('.loading-spinner').style.display = 'inline-block';
        
        // Submit the request to the backend
        const response = await apiCall('/pin-requests', {
            method: 'POST',
            body: requestData
        });
        
        if (response.success) {
            alert('Your pin request has been submitted successfully! Our admin team will review it soon.');
            form.reset();
        } else {
            throw new Error(response.message || 'Failed to submit request');
        }
        
    } catch (error) {
        console.error('Error submitting pin request:', error);
        alert('Error submitting request: ' + (error.message || 'Please try again.'));
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.loading-text').style.display = 'inline';
        submitBtn.querySelector('.loading-spinner').style.display = 'none';
    }
}

function simulatePinRequest(requestData) {
    return new Promise((resolve) => {
        // Simulate API call delay
        setTimeout(() => {
            console.log('Pin request submitted:', requestData);
            resolve({ success: true, message: 'Request submitted successfully' });
        }, 1500);
    });
}

function getCurrentUser() {
    // This would typically get the current user from localStorage or a global state
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
}
// Add to the existing functions in eco-map-student.js

// Show/hide club links section based on pin type
function toggleClubLinksSection() {
    const pinType = document.getElementById('request-type').value;
    const clubLinksSection = document.getElementById('club-links-section');
    
    if (pinType === 'club') {
        clubLinksSection.style.display = 'block';
        // Add required attribute to inputs
        document.getElementById('request-whatsapp').required = true;
        document.getElementById('request-discord').required = true;
    } else {
        clubLinksSection.style.display = 'none';
        // Remove required attribute
        document.getElementById('request-whatsapp').required = false;
        document.getElementById('request-discord').required = false;
    }
}

// Enhanced map click handler for students
function initMap() {
    const defaultLat = 20.5937;
    const defaultLng = 78.9629;
    
    map = L.map('map-container').setView([defaultLat, defaultLng], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    // Map click handler for students
    map.on('click', function(e) {
        openRequestFormWithLocation(e.latlng.lat, e.latlng.lng);
    });
    
    loadEcoPins();
}

// Open request form with location data
function openRequestFormWithLocation(lat, lng) {
    // Switch to request tab
    const requestTab = new bootstrap.Tab(document.getElementById('request-tab'));
    requestTab.show();
    
    // Set coordinates
    document.getElementById('request-latitude').value = lat;
    document.getElementById('request-longitude').value = lng;
    
    // Reverse geocode to get address
    reverseGeocodeForRequest(lat, lng);
}

// Reverse geocode for request form
async function reverseGeocodeForRequest(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        
        if (data.display_name) {
            document.getElementById('request-address').value = data.display_name;
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        document.getElementById('request-address').value = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
}

// Enhanced submitPinRequest function with club validation
async function submitPinRequest(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submit-request-btn');
    const form = document.getElementById('pin-request-form');
    
    const requestData = {
        title: document.getElementById('request-title').value,
        type: document.getElementById('request-type').value,
        description: document.getElementById('request-description').value,
        address: document.getElementById('request-address').value,
        contact: document.getElementById('request-contact').value,
        website: document.getElementById('request-website').value,
        latitude: parseFloat(document.getElementById('request-latitude').value),
        longitude: parseFloat(document.getElementById('request-longitude').value),
        notes: document.getElementById('request-notes').value,
        whatsapp: document.getElementById('request-whatsapp').value,
        discord: document.getElementById('request-discord').value,
        requestedBy: getCurrentUser() ? getCurrentUser().id : 'anonymous',
        status: 'pending'
    };
    
    // Validation
    if (!requestData.title || !requestData.type || !requestData.description || 
        !requestData.address || !requestData.latitude || !requestData.longitude) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Club-specific validation
    if (requestData.type === 'club') {
        if (!requestData.whatsapp && !requestData.discord) {
            alert('For eco clubs, either WhatsApp group link or Discord server link is required.');
            return;
        }
    }
    
    try {
        submitBtn.disabled = true;
        submitBtn.querySelector('.loading-text').style.display = 'none';
        submitBtn.querySelector('.loading-spinner').style.display = 'inline-block';
        
        // Send request to backend (apiCall already prefixes /api)
        const response = await apiCall('/pin-requests', {
            method: 'POST',
            body: requestData
        });
        
        if (response.success) {
            alert('Your pin request has been submitted successfully! Our admin team will review it soon.');
            form.reset();
            // Hide club links section after reset
            document.getElementById('club-links-section').style.display = 'none';
        } else {
            throw new Error(response.message || 'Failed to submit request');
        }
        
    } catch (error) {
        console.error('Error submitting pin request:', error);
        alert('Error submitting request: ' + (error.message || 'Please try again.'));
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.loading-text').style.display = 'inline';
        submitBtn.querySelector('.loading-spinner').style.display = 'none';
    }
}

// Enhanced display functions to show club links
function displayEcoPins() {
    const pinsList = document.getElementById('pins-list');
    const filterType = document.getElementById('pin-type-filter').value;
    
    let filteredPins = ecoPins;
    if (filterType) {
        filteredPins = ecoPins.filter(pin => pin.type === filterType);
    }

    if (filteredPins.length === 0) {
        pinsList.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="fas fa-info-circle me-2"></i>
                No eco pins found matching your filter.
            </div>
        `;
        return;
    }

    let html = '';
    filteredPins.forEach(pin => {
        const typeClass = getPinTypeClass(pin.type);
        const typeLabel = getPinTypeLabel(pin.type);
        
        // Add club links if available
        const clubLinks = pin.type === 'club' ? `
            ${pin.whatsapp ? `
            <div class="mb-1">
                <a href="${pin.whatsapp}" target="_blank" class="btn btn-sm btn-success w-100">
                    <i class="fab fa-whatsapp me-1"></i>Join WhatsApp
                </a>
            </div>
            ` : ''}
            ${pin.discord ? `
            <div class="mb-1">
                <a href="${pin.discord}" target="_blank" class="btn btn-sm btn-primary w-100">
                    <i class="fab fa-discord me-1"></i>Join Discord
                </a>
            </div>
            ` : ''}
        ` : '';
        
        html += `
            <div class="card eco-pin-card ${pin.type} mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${pin.title}</h6>
                        <span class="badge ${typeClass} pin-type-badge">${typeLabel}</span>
                    </div>
                    <p class="card-text small">${pin.description}</p>
                    <div class="text-muted small mb-2">
                        <i class="fas fa-map-marker-alt me-1"></i>
                        ${pin.address}
                    </div>
                    ${clubLinks}
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewOnMap(${pin.latitude}, ${pin.longitude})">
                            <i class="fas fa-map"></i> View on Map
                        </button>
                        ${pin.type === 'club' ? `
                        <button class="btn btn-sm btn-outline-success" onclick="showClubDetails('${pin._id}')">
                            <i class="fas fa-info-circle"></i> Club Info
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    pinsList.innerHTML = html;
}

// Enhanced displayPinsOnMap function
function displayPinsOnMap() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    ecoPins.forEach(pin => {
        if (pin.isActive && pin.latitude && pin.longitude) {
            const marker = L.marker([pin.latitude, pin.longitude], {
                icon: pinIcons[pin.type]
            }).addTo(map);
            
            // Enhanced popup with club links
            const clubLinksPopup = pin.type === 'club' ? `
                ${pin.whatsapp ? `
                <div class="mt-1">
                    <a href="${pin.whatsapp}" target="_blank" class="btn btn-sm btn-success w-100">
                        <i class="fab fa-whatsapp me-1"></i>WhatsApp
                    </a>
                </div>
                ` : ''}
                ${pin.discord ? `
                <div class="mt-1">
                    <a href="${pin.discord}" target="_blank" class="btn btn-sm btn-primary w-100">
                        <i class="fab fa-discord me-1"></i>Discord
                    </a>
                </div>
                ` : ''}
            ` : '';
            
            marker.bindPopup(`
                <div class="text-center">
                    <h6>${pin.title}</h6>
                    <span class="badge ${getPinTypeClass(pin.type)}">${getPinTypeLabel(pin.type)}</span>
                    <p class="mt-2">${pin.description}</p>
                    <small class="text-muted">${pin.address}</small>
                    ${pin.contact ? `<br><small><i class="fas fa-phone"></i> ${pin.contact}</small>` : ''}
                    ${pin.website ? `<br><small><i class="fas fa-globe"></i> <a href="${pin.website}" target="_blank">Website</a></small>` : ''}
                    ${clubLinksPopup}
                    ${pin.type === 'club' ? `
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-success" onclick="showClubDetails('${pin._id}')">
                            <i class="fas fa-info-circle"></i> Club Details
                        </button>
                    </div>
                    ` : ''}
                </div>
            `);
            
            markers.push(marker);
        }
    });
}

// Enhanced displayClubs function
function displayClubs() {
    const clubsList = document.getElementById('clubs-list');
    const clubs = ecoPins.filter(pin => pin.type === 'club');
    
    if (clubs.length === 0) {
        clubsList.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info text-center">
                    <i class="fas fa-info-circle me-2"></i>
                    No eco clubs found in your area.
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    clubs.forEach(club => {
        // Determine which join buttons to show
        const joinButtons = `
            ${club.whatsapp ? `
            <a href="${club.whatsapp}" target="_blank" class="btn btn-success join-btn">
                <i class="fab fa-whatsapp me-2"></i>Join WhatsApp Group
            </a>
            ` : ''}
            ${club.discord ? `
            <a href="${club.discord}" target="_blank" class="btn btn-primary join-btn">
                <i class="fab fa-discord me-2"></i>Join Discord Server
            </a>
            ` : ''}
            ${!club.whatsapp && !club.discord ? `
            <button class="btn btn-secondary join-btn" disabled>
                No Join Links Available
            </button>
            ` : ''}
        `;
        
        html += `
            <div class="col-md-6 col-lg-4">
                <div class="club-card">
                    <div class="club-header">
                        <h5 class="mb-0">${club.title}</h5>
                    </div>
                    <div class="club-body">
                        <p class="card-text">${club.description}</p>
                        <div class="text-muted small mb-2">
                            <i class="fas fa-map-marker-alt me-1"></i>
                            ${club.address}
                        </div>
                        ${club.contact ? `
                        <div class="text-muted small mb-2">
                            <i class="fas fa-envelope me-1"></i>
                            ${club.contact}
                        </div>
                        ` : ''}
                        <div class="d-grid gap-2">
                            ${joinButtons}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    clubsList.innerHTML = html;
}

// Update event listeners
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    updateUIForLoginStatus();
    
    // Existing event listeners
    document.getElementById('pin-type-filter').addEventListener('change', displayEcoPins);
    document.getElementById('pin-request-form').addEventListener('submit', submitPinRequest);
    
    // New event listeners
    document.getElementById('request-type').addEventListener('change', toggleClubLinksSection);
    
    // Add data attributes to club cards for scrolling
    document.getElementById('clubs-list').addEventListener('DOMSubtreeModified', function() {
        const clubs = ecoPins.filter(pin => pin.type === 'club');
        clubs.forEach(club => {
            const clubElement = document.querySelector(`[data-club-id="${club._id}"]`);
            if (clubElement) {
                clubElement.setAttribute('data-club-id', club._id);
            }
        });
    });
});