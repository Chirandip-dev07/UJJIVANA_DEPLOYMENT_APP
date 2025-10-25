// Admin Eco Map Management
let map;
let ecoPins = [];
let currentEditingPin = null;
let markers = [];
let pinRequests = [];
let currentRejectRequestId = null;

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
    .request-marker {
        background-color: #6f42c1;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
`;

// Add marker styles to the document
const styleSheet = document.createElement("style");
styleSheet.innerText = markerStyles;
document.head.appendChild(styleSheet);

function checkAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

function initMap() {
    const defaultLat = 20.5937;
    const defaultLng = 78.9629;
    
    map = L.map('map-container').setView([defaultLat, defaultLng], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    map.on('click', function(e) {
        if (checkAdmin()) {
            openPinModalWithLocation(e.latlng.lat, e.latlng.lng);
        }
    });
    
    loadEcoPins();
}

function openPinModalWithLocation(lat, lng) {
    document.getElementById('pin-latitude').value = lat;
    document.getElementById('pin-longitude').value = lng;
    
    reverseGeocode(lat, lng);
    
    const modal = new bootstrap.Modal(document.getElementById('pinModal'));
    modal.show();
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        
        if (data.display_name) {
            document.getElementById('pin-address').value = data.display_name;
        }
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        document.getElementById('pin-address').value = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
    }
}

async function loadEcoPins() {
    try {
        const response = await apiCall('/eco-map/pins');
        if (response.success) {
            ecoPins = response.data;
            updateStats();
            displayEcoPins();
            displayPinsOnMap();
        } else {
            throw new Error(response.message || 'Failed to load pins');
        }
    } catch (error) {
        console.error('Error loading eco pins:', error);
        // Optionally show a user-friendly error message
        showError('pins-list', 'Failed to load eco pins. Please try again.');
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
        }
    ];
    updateStats();
    displayEcoPins();
    displayPinsOnMap();
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

    if (document.getElementById('pollution-percent')) {
        updateProgressBars();
    }
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
                No eco pins found. Create your first pin!
            </div>
        `;
        return;
    }

    let html = '';
    filteredPins.forEach(pin => {
        const typeClass = getPinTypeClass(pin.type);
        const typeLabel = getPinTypeLabel(pin.type);
        
        // Add club links display for admin
        const clubLinksInfo = pin.type === 'club' ? `
            <div class="small mb-2">
                ${pin.whatsapp ? `<div><i class="fab fa-whatsapp text-success me-1"></i> WhatsApp: Available</div>` : ''}
                ${pin.discord ? `<div><i class="fab fa-discord text-primary me-1"></i> Discord: Available</div>` : ''}
            </div>
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
                    ${clubLinksInfo}
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline-primary" onclick="editPin('${pin._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-outline-info" onclick="viewOnMap(${pin.latitude}, ${pin.longitude})">
                            <i class="fas fa-map"></i> View
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deletePin('${pin._id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    pinsList.innerHTML = html;
}

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
                    <a href="${pin.whatsapp}" target="_blank" class="btn btn-sm btn-success w-100>
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
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="editPin('${pin._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
            `);
            
            markers.push(marker);
        }
    });
}

function updateProgressBars() {
    const totalPins = ecoPins.length;
    if (totalPins === 0) return;
    
    const pollutionPins = ecoPins.filter(pin => pin.type === 'pollution').length;
    const parkPins = ecoPins.filter(pin => pin.type === 'park').length;
    const projectPins = ecoPins.filter(pin => pin.type === 'project').length;
    const clubPins = ecoPins.filter(pin => pin.type === 'club').length;
    
    const pollutionPercent = totalPins > 0 ? (pollutionPins / totalPins) * 100 : 0;
    const parkPercent = totalPins > 0 ? (parkPins / totalPins) * 100 : 0;
    const projectPercent = totalPins > 0 ? (projectPins / totalPins) * 100 : 0;
    const clubPercent = totalPins > 0 ? (clubPins / totalPins) * 100 : 0;
    
    document.getElementById('pollution-percent').textContent = `${pollutionPercent.toFixed(1)}%`;
    document.getElementById('park-percent').textContent = `${parkPercent.toFixed(1)}%`;
    document.getElementById('project-percent').textContent = `${projectPercent.toFixed(1)}%`;
    document.getElementById('club-percent').textContent = `${clubPercent.toFixed(1)}%`;
    
    document.getElementById('pollution-progress').style.width = `${pollutionPercent}%`;
    document.getElementById('park-progress').style.width = `${parkPercent}%`;
    document.getElementById('project-progress').style.width = `${projectPercent}%`;
    document.getElementById('club-progress').style.width = `${clubPercent}%`;
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

function editPin(pinId) {
    const pin = ecoPins.find(p => p._id === pinId);
    if (!pin) {
        alert('Pin not found');
        return;
    }

    currentEditingPin = pin;
    
    document.getElementById('pin-id').value = pin._id;
    document.getElementById('pin-title').value = pin.title;
    document.getElementById('pin-type').value = pin.type;
    document.getElementById('pin-description').value = pin.description;
    document.getElementById('pin-address').value = pin.address;
    document.getElementById('pin-contact').value = pin.contact || '';
    document.getElementById('pin-website').value = pin.website || '';
    document.getElementById('pin-image').value = pin.image || '';
    document.getElementById('pin-latitude').value = pin.latitude;
    document.getElementById('pin-longitude').value = pin.longitude;
    document.getElementById('pin-active').checked = pin.isActive;
    
    // Club links
    document.getElementById('pin-whatsapp').value = pin.whatsapp || '';
    document.getElementById('pin-discord').value = pin.discord || '';
    
    // Toggle club links section
    toggleAdminClubLinksSection();
    
    document.getElementById('pinModalTitle').textContent = 'Edit Eco Pin';
    document.getElementById('delete-pin-btn').style.display = 'block';

    const modal = new bootstrap.Modal(document.getElementById('pinModal'));
    modal.show();
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

async function savePin() {
    const saveBtn = document.getElementById('save-pin-btn');
    const pinId = document.getElementById('pin-id').value;
    
    const pinData = {
        title: document.getElementById('pin-title').value,
        type: document.getElementById('pin-type').value,
        description: document.getElementById('pin-description').value,
        address: document.getElementById('pin-address').value,
        contact: document.getElementById('pin-contact').value,
        website: document.getElementById('pin-website').value,
        image: document.getElementById('pin-image').value,
        latitude: parseFloat(document.getElementById('pin-latitude').value),
        longitude: parseFloat(document.getElementById('pin-longitude').value),
        isActive: document.getElementById('pin-active').checked,
        whatsapp: document.getElementById('pin-whatsapp').value,
        discord: document.getElementById('pin-discord').value
    };

    // Club-specific validation
    if (pinData.type === 'club') {
        if (!pinData.whatsapp && !pinData.discord) {
            alert('For eco clubs, either WhatsApp group link or Discord server link is required.');
            return;
        }
    }

    if (!pinData.title || !pinData.type || !pinData.description || !pinData.address) {
        alert('Please fill in all required fields.');
        return;
    }

    if (!pinData.latitude || !pinData.longitude) {
        alert('Please set location by clicking on the map or entering valid coordinates.');
        return;
    }

    try {
        saveBtn.disabled = true;
        saveBtn.querySelector('.loading-text').style.display = 'none';
        saveBtn.querySelector('.loading-spinner').style.display = 'inline-block';
        
        let response;
        if (pinId) {
            response = await updateEcoPin(pinId, pinData);
        } else {
            response = await createEcoPin(pinData);
        }

        alert(response.message || 'Pin saved successfully!');
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('pinModal'));
        modal.hide();
        
        await loadEcoPins();
    } catch (error) {
        console.error('Error saving pin:', error);
        alert('Error saving pin: ' + (error.message || 'Please try again.'));
    } finally {
        saveBtn.disabled = false;
        saveBtn.querySelector('.loading-text').style.display = 'inline';
        saveBtn.querySelector('.loading-spinner').style.display = 'none';
    }
}

async function deletePin(pinId) {
    if (!confirm('Are you sure you want to delete this eco pin? This action cannot be undone.')) {
        return;
    }

    try {
        await deleteEcoPin(pinId);
        alert('Eco pin deleted successfully!');
        await loadEcoPins();
    } catch (error) {
        console.error('Error deleting pin:', error);
        alert('Error deleting pin: ' + (error.message || 'Please try again.'));
    }
}

function refreshMapData() {
    loadEcoPins();
    alert('Map data refreshed!');
}

// Show/hide club links section in admin modal
function toggleAdminClubLinksSection() {
    const pinType = document.getElementById('pin-type').value;
    const clubLinksSection = document.getElementById('club-links-section');
    
    if (pinType === 'club') {
        clubLinksSection.style.display = 'block';
        document.getElementById('pin-whatsapp').required = true;
        document.getElementById('pin-discord').required = true;
    } else {
        clubLinksSection.style.display = 'none';
        document.getElementById('pin-whatsapp').required = false;
        document.getElementById('pin-discord').required = false;
    }
}

// API Functions
async function getEcoPins() {
    try {
        const data = await apiCall('/eco-map/pins');
        return data;
    } catch (error) {
        console.error('Get eco pins error:', error);
        throw error;
    }
}

async function createEcoPin(pinData) {
    try {
        const data = await apiCall('/eco-map/pins', {
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
        const data = await apiCall(`/eco-map/pins/${pinId}`, {
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
        const data = await apiCall(`/eco-map/pins/${pinId}`, {
            method: 'DELETE'
        });
        return data;
    } catch (error) {
        console.error('Delete eco pin error:', error);
        throw error;
    }
}

// Pin Request Management Functions with Backend Integration

// Load all pin requests from backend
async function loadPinRequests() {
    try {
        showLoading('pin-requests-list', 'Loading pin requests...');
        
    const response = await apiCall('/pin-requests/admin');
        if (response.success) {
            pinRequests = response.data;
            updateRequestStats();
            displayPinRequests();
        } else {
            throw new Error(response.message || 'Failed to load requests');
        }
    } catch (error) {
        console.error('Error loading pin requests:', error);
        showError('pin-requests-list', 'Failed to load pin requests. Please try again.');
    }
}

// Update request statistics
function updateRequestStats() {
    const pendingCount = pinRequests.filter(req => req.status === 'pending').length;
    const approvedCount = pinRequests.filter(req => req.status === 'approved').length;
    const rejectedCount = pinRequests.filter(req => req.status === 'rejected').length;
    const totalCount = pinRequests.length;

    document.getElementById('pending-requests-count').textContent = pendingCount;
    document.getElementById('approved-requests-count').textContent = approvedCount;
    document.getElementById('rejected-requests-count').textContent = rejectedCount;
    document.getElementById('total-requests-count').textContent = totalCount;
    
    // Update badge on requests tab
    document.getElementById('pending-requests-badge').textContent = pendingCount;
}

// Display pin requests with filtering
function displayPinRequests() {
    const requestsList = document.getElementById('pin-requests-list');
    const statusFilter = document.getElementById('request-status-filter').value;
    const typeFilter = document.getElementById('request-type-filter').value;
    
    let filteredRequests = pinRequests;
    
    // Apply status filter
    if (statusFilter !== 'all') {
        filteredRequests = filteredRequests.filter(req => req.status === statusFilter);
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
        filteredRequests = filteredRequests.filter(req => req.type === typeFilter);
    }

    if (filteredRequests.length === 0) {
        requestsList.innerHTML = `
            <div class="alert alert-info text-center">
                <i class="fas fa-info-circle me-2"></i>
                No pin requests found matching your filters.
            </div>
        `;
        return;
    }

    let html = '';
    filteredRequests.forEach(request => {
        const statusClass = getRequestStatusClass(request.status);
        const statusLabel = getRequestStatusLabel(request.status);
        const typeLabel = getPinTypeLabel(request.type);
        const date = new Date(request.createdAt).toLocaleDateString();
        
        html += `
            <div class="card request-card ${request.status} mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">${request.title}</h6>
                        <span class="badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge bg-secondary">${typeLabel}</span>
                        <small class="text-muted">${date}</small>
                    </div>
                    <p class="card-text small">${request.description}</p>
                    <div class="text-muted small mb-2">
                        <i class="fas fa-map-marker-alt me-1"></i>
                        ${request.address}
                    </div>
                    <div class="text-muted small mb-2">
                        <i class="fas fa-user me-1"></i>
                        Requested by: ${request.requestedBy?.name || 'Unknown User'}
                    </div>
                    ${request.notes ? `
                    <div class="alert alert-light small mb-2">
                        <strong>Student Notes:</strong> ${request.notes}
                    </div>
                    ` : ''}
                    ${request.adminNotes ? `
                    <div class="alert alert-info small mb-2">
                        <strong>Admin Notes:</strong> ${request.adminNotes}
                    </div>
                    ` : ''}
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-outline-info" onclick="viewRequestDetails('${request._id}')">
                            <i class="fas fa-eye"></i> Details
                        </button>
                        ${request.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="approveRequest('${request._id}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="openRejectModal('${request._id}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewRequestOnMap(${request.latitude}, ${request.longitude})">
                            <i class="fas fa-map"></i> View
                        </button>
                        ` : ''}
                        ${request.status === 'approved' ? `
                        <button class="btn btn-sm btn-outline-success" disabled>
                            <i class="fas fa-check"></i> Approved
                        </button>
                        ` : ''}
                        ${request.status === 'rejected' ? `
                        <button class="btn btn-sm btn-outline-danger" disabled>
                            <i class="fas fa-times"></i> Rejected
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    requestsList.innerHTML = html;
}

// View request details in modal
async function viewRequestDetails(requestId) {
    const request = pinRequests.find(req => req._id === requestId);
    if (!request) {
        alert('Request not found');
        return;
    }
    
    const date = new Date(request.createdAt).toLocaleDateString();
    const approvedDate = request.approvedAt ? new Date(request.approvedAt).toLocaleDateString() : 'N/A';
    const rejectedDate = request.rejectedAt ? new Date(request.rejectedAt).toLocaleDateString() : 'N/A';
    
    const clubLinks = request.type === 'club' ? `
        <div class="mb-2">
            <strong>Club Links:</strong><br>
            ${request.whatsapp ? `<div><i class="fab fa-whatsapp text-success me-1"></i> WhatsApp: <a href="${request.whatsapp}" target="_blank">${request.whatsapp}</a></div>` : ''}
            ${request.discord ? `<div><i class="fab fa-discord text-primary me-1"></i> Discord: <a href="${request.discord}" target="_blank">${request.discord}</a></div>` : ''}
            ${!request.whatsapp && !request.discord ? '<div>No club links provided</div>' : ''}
        </div>
    ` : '';
    
    const detailsContent = `
        <div class="request-details">
            <h6>${request.title}</h6>
            <div class="mb-3">
                <span class="badge ${getRequestStatusClass(request.status)} me-2">${getRequestStatusLabel(request.status)}</span>
                <span class="badge bg-secondary">${getPinTypeLabel(request.type)}</span>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Description:</strong><br>${request.description}</p>
                    <p><strong>Address:</strong><br>${request.address}</p>
                    <p><strong>Coordinates:</strong><br>${request.latitude}, ${request.longitude}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Contact:</strong><br>${request.contact || 'N/A'}</p>
                    <p><strong>Website:</strong><br>${request.website ? `<a href="${request.website}" target="_blank">${request.website}</a>` : 'N/A'}</p>
                    <p><strong>Requested By:</strong><br>${request.requestedBy?.name || 'Unknown'} (${request.requestedBy?.email || 'N/A'})</p>
                </div>
            </div>
            
            ${clubLinks}
            
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Request Date:</strong><br>${date}</p>
                </div>
                <div class="col-md-6">
                    ${request.status === 'approved' ? `<p><strong>Approved Date:</strong><br>${approvedDate}</p>` : ''}
                    ${request.status === 'rejected' ? `<p><strong>Rejected Date:</strong><br>${rejectedDate}</p>` : ''}
                </div>
            </div>
            
            ${request.notes ? `
            <div class="alert alert-light">
                <strong>Student Notes:</strong><br>${request.notes}
            </div>
            ` : ''}
            
            ${request.adminNotes ? `
            <div class="alert alert-info">
                <strong>Admin Notes:</strong><br>${request.adminNotes}
            </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('requestDetailsContent').innerHTML = detailsContent;
    const modal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
    modal.show();
}

// View request location on map
function viewRequestOnMap(lat, lng) {
    // Switch to map tab
    const mapTab = new bootstrap.Tab(document.getElementById('map-tab'));
    mapTab.show();
    
    // Set map view
    map.setView([lat, lng], 15);
    
    // Create temporary marker
    const tempMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            html: '<i class="fas fa-question fa-lg text-white"></i>',
            iconSize: [30, 30],
            className: 'request-marker d-flex align-items-center justify-content-center'
        })
    }).addTo(map);
    
    tempMarker.bindPopup(`
        <div class="text-center">
            <h6>Pending Request Location</h6>
            <p class="text-muted">This is the proposed location for a new eco pin</p>
        </div>
    `).openPopup();
    
    // Remove temporary marker after 10 seconds
    setTimeout(() => {
        map.removeLayer(tempMarker);
    }, 10000);
}

// Approve pin request
// Approve pin request and add to map
async function approveRequest(requestId) {
    const request = pinRequests.find(req => req._id === requestId);
    if (!request) {
        alert('Request not found');
        return;
    }
    
    if (!confirm(`Are you sure you want to approve "${request.title}"? This will create a new eco pin on the map.`)) {
        return;
    }
    
    try {
        showLoading('pin-requests-list', 'Approving request...');
        
        const response = await apiCall(`/pin-requests/${requestId}/approve`, {
            method: 'PUT',
            body: {
                adminNotes: 'Request approved by admin'
            }
        });
        
        if (response.success) {
            // Update local state
            const index = pinRequests.findIndex(req => req._id === requestId);
            if (index !== -1) {
                pinRequests[index] = response.data.pinRequest;
            }
            
            // Add the new eco pin to the existing pins array and update map
            if (response.data.ecoPin) {
                ecoPins.push(response.data.ecoPin);
                updateStats();
                displayEcoPins();
                displayPinsOnMap();
                
                // Switch to map tab and focus on the new pin
                const mapTab = new bootstrap.Tab(document.getElementById('map-tab'));
                mapTab.show();
                
                // Set map view to the new pin location
                map.setView([response.data.ecoPin.latitude, response.data.ecoPin.longitude], 15);
                
                // Find and open the new pin's popup
                setTimeout(() => {
                    const newMarker = markers.find(marker => {
                        const latLng = marker.getLatLng();
                        return latLng.lat === response.data.ecoPin.latitude && 
                               latLng.lng === response.data.ecoPin.longitude;
                    });
                    if (newMarker) {
                        newMarker.openPopup();
                    }
                }, 500);
            }
            
            updateRequestStats();
            displayPinRequests();
            
            alert('Request approved and eco pin created successfully!');
        } else {
            throw new Error(response.message || 'Failed to approve request');
        }
    } catch (error) {
        console.error('Error approving request:', error);
        alert('Error approving request: ' + (error.message || 'Please try again.'));
        loadPinRequests(); // Reload to reset state
        loadEcoPins(); // Reload pins to ensure consistency
    }
}

// Open reject modal
function openRejectModal(requestId) {
    currentRejectRequestId = requestId;
    document.getElementById('reject-reason').value = '';
    const modal = new bootstrap.Modal(document.getElementById('rejectRequestModal'));
    modal.show();
}

// Reject pin request
async function rejectRequest() {
    const requestId = currentRejectRequestId;
    const request = pinRequests.find(req => req._id === requestId);
    
    if (!request) {
        alert('Request not found');
        return;
    }
    
    const rejectReason = document.getElementById('reject-reason').value.trim();
    if (!rejectReason) {
        alert('Please provide a reason for rejection.');
        return;
    }
    
    try {
        showLoading('pin-requests-list', 'Rejecting request...');
        
        const response = await apiCall(`/pin-requests/${requestId}/reject`, {
            method: 'PUT',
            body: {
                adminNotes: rejectReason
            }
        });
        
        if (response.success) {
            // Update local state
            const index = pinRequests.findIndex(req => req._id === requestId);
            if (index !== -1) {
                pinRequests[index] = response.data;
            }
            
            await loadPinRequests();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('rejectRequestModal'));
            modal.hide();
            
            alert('Request rejected successfully!');
        } else {
            throw new Error(response.message || 'Failed to reject request');
        }
    } catch (error) {
        console.error('Error rejecting request:', error);
        alert('Error rejecting request: ' + (error.message || 'Please try again.'));
        loadPinRequests(); // Reload to reset state
    }
}
// Approve all pending requests
async function approveAllPending() {
    const pendingRequests = pinRequests.filter(req => req.status === 'pending');
    if (pendingRequests.length === 0) {
        alert('No pending requests to approve.');
        return;
    }
    
    if (!confirm(`Are you sure you want to approve all ${pendingRequests.length} pending requests?`)) {
        return;
    }
    
    try {
        showLoading('pin-requests-list', 'Approving all pending requests...');
        
        const approvedPins = [];
        
        // Approve each request sequentially
        for (const request of pendingRequests) {
            const response = await apiCall(`/pin-requests/${request._id}/approve`, {
                method: 'PUT',
                body: {
                    adminNotes: 'Bulk approved by admin'
                }
            });
            
            if (response.success && response.data.ecoPin) {
                approvedPins.push(response.data.ecoPin);
            }
        }
        
        // Add all new pins to the map
        ecoPins.push(...approvedPins);
        updateStats();
        displayEcoPins();
        displayPinsOnMap();
        
        // Refresh requests to update their status
        await loadPinRequests();
        
        alert(`Successfully approved ${pendingRequests.length} requests and added them to the map!`);
        
    } catch (error) {
        console.error('Error bulk approving requests:', error);
        alert('Error approving requests: ' + (error.message || 'Please try again.'));
        refreshAllData(); // Reload both pins and requests
    }
}

// Clear all rejected requests
async function clearAllRejected() {
    const rejectedRequests = pinRequests.filter(req => req.status === 'rejected');
    if (rejectedRequests.length === 0) {
        alert('No rejected requests to clear.');
        return;
    }
    
    if (!confirm(`Are you sure you want to clear all ${rejectedRequests.length} rejected requests? This action cannot be undone.`)) {
        return;
    }
    
    try {
        showLoading('pin-requests-list', 'Clearing rejected requests...');
        
        // Note: You would need to implement a backend endpoint for bulk deletion
        // For now, we'll just filter them out locally
        pinRequests = pinRequests.filter(req => req.status !== 'rejected');
        updateRequestStats();
        displayPinRequests();
        
        alert(`Cleared ${rejectedRequests.length} rejected requests from view.`);
    } catch (error) {
        console.error('Error clearing rejected requests:', error);
        alert('Error clearing requests: ' + (error.message || 'Please try again.'));
        loadPinRequests(); // Reload to reset state
    }
}

// Helper functions
function getRequestStatusClass(status) {
    const classes = {
        pending: 'status-badge-pending',
        approved: 'status-badge-approved',
        rejected: 'status-badge-rejected'
    };
    return classes[status] || 'bg-secondary';
}

function getRequestStatusLabel(status) {
    const labels = {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected'
    };
    return labels[status] || 'Unknown';
}

function showLoading(containerId, message = 'Loading...') {
    document.getElementById(containerId).innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-warning" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">${message}</p>
        </div>
    `;
}

function showError(containerId, message) {
    document.getElementById(containerId).innerHTML = `
        <div class="alert alert-danger text-center">
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${message}
        </div>
    `;
}

// Update event listeners in DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAdmin()) {
        alert('Admin access required. Redirecting to home page.');
        window.location.href = 'index.html';
        return;
    }
    
    initMap();
    updateUIForLoginStatus();
    
    // Existing event listeners
    document.getElementById('save-pin-btn').addEventListener('click', savePin);
    document.getElementById('delete-pin-btn').addEventListener('click', function() {
        if (currentEditingPin) {
            deletePin(currentEditingPin._id);
        }
    });
    document.getElementById('pin-type-filter').addEventListener('change', displayEcoPins);
    document.getElementById('pinModal').addEventListener('hidden.bs.modal', function() {
        document.getElementById('pin-form').reset();
        document.getElementById('pin-id').value = '';
        document.getElementById('pinModalTitle').textContent = 'Create New Eco Pin';
        document.getElementById('delete-pin-btn').style.display = 'none';
        document.getElementById('club-links-section').style.display = 'none';
        currentEditingPin = null;
    });
    
    // New event listeners for pin requests
    document.getElementById('request-status-filter').addEventListener('change', displayPinRequests);
    document.getElementById('request-type-filter').addEventListener('change', displayPinRequests);
    document.getElementById('confirm-reject-btn').addEventListener('click', rejectRequest);
    document.getElementById('pin-type').addEventListener('change', toggleAdminClubLinksSection);
    
    // Load pin requests when page loads
    loadPinRequests();
    
    // Load pin requests when requests tab is shown
    document.getElementById('requests-tab').addEventListener('shown.bs.tab', function() {
        loadPinRequests();
    });
});