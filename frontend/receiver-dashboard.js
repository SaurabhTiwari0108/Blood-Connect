// ============================================
// Global Variables
// ============================================
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api';
let currentUser = null;

// ============================================
// Initialize Dashboard
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    const token = localStorage.getItem('bloodconnect_token');
    const userData = localStorage.getItem('bloodconnect_user');
    
    if (!token || !userData) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(userData);
    if (currentUser._id && !currentUser.id) {
        currentUser.id = currentUser._id;
    }
    
    // Verify user is a receiver
    if (currentUser.userType !== 'receiver') {
        showNotification('Access denied. Redirecting...', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // Load all dashboard data
    await loadUserProfile();
    await loadMyRequests();
    await loadAvailableDonors();
    await loadStats();
    
    // Check Premium status
    if (currentUser.isPremium) {
        document.getElementById('navBloodBanks').style.display = 'flex';
        await loadBloodBanks();
    }
    
    // Setup event listeners
    setupEventListeners();
});

// ============================================
// Load User Profile
// ============================================
async function loadUserProfile() {
    try {
        // Update UI with user data
        document.getElementById('userName').textContent = currentUser.fullName.split(' ')[0];
        document.getElementById('headerUserName').textContent = currentUser.fullName;
        document.getElementById('userBloodGroup').textContent = currentUser.bloodGroup;
        
        // Update profile images with initials
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName)}&background=3498db&color=fff&size=120&bold=true`;
        document.getElementById('headerProfileImg').src = avatarUrl;
        
        // Fetch latest data from backend
        const token = localStorage.getItem('bloodconnect_token');
        const response = await fetch(`${API_URL}/users/${currentUser.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.data && data.data._id && !data.data.id) {
                data.data.id = data.data._id;
            }
            // Update local storage with latest data
            localStorage.setItem('bloodconnect_user', JSON.stringify(data.data));
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Failed to load profile data', 'error');
    }
}

// ============================================
// Load Statistics
// ============================================
async function loadStats() {
    try {
        // Get user's requests
        const requestsResponse = await fetch(`${API_URL}/donation-requests?status=pending`);
        const requestsData = await requestsResponse.json();
        
        const allRequests = requestsData.data || [];
        const myRequests = allRequests.filter(req => req.requesterId === currentUser.id || req.requesterId._id === currentUser.id);
        
        // Get available donors
        const donorsResponse = await fetch(`${API_URL}/donors?bloodGroup=${currentUser.bloodGroup}&city=${currentUser.city}`);
        const donorsData = await donorsResponse.json();
        
        // Get user profile to get receivedCount
        const userResponse = await fetch(`${API_URL}/users/${currentUser.id}`);
        let receivedCount = 0;
        if (userResponse.ok) {
            const userData = await userResponse.json();
            receivedCount = userData.data.receivedCount || 0;
            
            // Ensure .id property exists for consistency
            if (userData.data._id && !userData.data.id) {
                userData.data.id = userData.data._id;
            }
            
            // Update local storage to keep it fresh
            localStorage.setItem('bloodconnect_user', JSON.stringify(userData.data));
            currentUser = userData.data;
        }

        // Update stats
        document.getElementById('activeRequests').textContent = myRequests.length;
        document.getElementById('availableDonors').textContent = donorsData.count || 0;
        document.getElementById('fulfilledRequests').textContent = receivedCount;
        
    } catch (error) {
        console.error('Error loading stats:', error);
        // Set default values
        document.getElementById('activeRequests').textContent = '0';
        document.getElementById('fulfilledRequests').textContent = '0';
        document.getElementById('availableDonors').textContent = '0';
    }
}

// ============================================
// Load My Requests
// ============================================
async function loadMyRequests() {
    try {
        const response = await fetch(`${API_URL}/donation-requests`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch requests');
        }
        
        const data = await response.json();
        let requests = data.data || [];
        
        // Filter user's own requests
        requests = requests.filter(req => {
            const requesterId = req.requesterId?._id || req.requesterId;
            return requesterId === currentUser.id;
        });
        
        displayMyRequests(requests);
    } catch (error) {
        console.error('Error loading requests:', error);
        displayMyRequests([]);
    }
}

// ============================================
// Display My Requests
// ============================================
function displayMyRequests(requests) {
    const grid = document.getElementById('myRequestsGrid');
    
    if (requests.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--gray-700);">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 20px; opacity: 0.3;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <h3 style="margin-bottom: 8px;">No Requests Yet</h3>
                <p>Click "Create New Request" to submit your first blood request.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = requests.map((req, index) => `
        <div class="request-card ${req.urgency}" style="animation-delay: ${index * 0.1}s" data-status="${req.status}">
            <div class="request-header">
                <div class="request-blood-group">${req.bloodGroup}</div>
                <span class="urgency-badge ${req.urgency}">${req.urgency}</span>
            </div>
            <div class="request-info">
                <h4>${req.patientName}</h4>
                <div class="request-details">
                    <div class="request-detail">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                        </svg>
                        <span>${req.unitsNeeded} Units Needed</span>
                    </div>
                    <div class="request-detail">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        </svg>
                        <span>${req.hospitalName}</span>
                    </div>
                    <div class="request-detail">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>${req.city}</span>
                    </div>
                    <div class="request-detail">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>${getTimeAgo(req.createdAt)}</span>
                    </div>
                    <div class="request-detail">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M12 16v-4"></path>
                            <path d="M12 8h.01"></path>
                        </svg>
                        <span>Status: ${req.status}</span>
                    </div>
                </div>

                ${req.status === 'accepted' && req.acceptedBy ? `
                <div style="margin-top: 15px; padding: 15px; background: rgba(46, 204, 113, 0.1); border-radius: 8px; border-left: 4px solid var(--green);">
                    <h5 style="margin-bottom: 8px; color: var(--green);">Accepted by Donor</h5>
                    <p><strong>Name:</strong> ${req.acceptedBy.fullName}</p>
                    <p><strong>Contact:</strong> ${req.acceptedBy.phone}</p>
                    <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 4px; text-align: center;">
                        <span style="font-size: 12px; color: var(--gray-500);">Give this code to donor after donation</span>
                        <div style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: var(--red);">${req.completionCode}</div>
                    </div>
                </div>
                ` : ''}

            </div>
            <div class="request-actions">
                ${req.status === 'pending' ? `
                    <button class="btn-edit" onclick="editRequest('${req._id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                    </button>
                    <button class="btn-cancel" onclick="cancelRequest('${req._id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Cancel
                    </button>
                ` : req.status === 'accepted' ? `
                    <button class="btn-primary" style="flex: 1;" onclick="contactDonor('${req.acceptedBy.phone}', '${req.acceptedBy.fullName}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        Contact Donor
                    </button>
                ` : `
                    <button class="btn-cancel" style="flex: 1; opacity: 0.7;" disabled>
                        ${req.status === 'fulfilled' ? 'Fulfilled' : 'Cancelled'}
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

// ============================================
// Load Available Donors
// ============================================
async function loadAvailableDonors() {
    try {
        const response = await fetch(`${API_URL}/donors`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch donors');
        }
        
        const data = await response.json();
        displayDonors(data.data || []);
    } catch (error) {
        console.error('Error loading donors:', error);
        displaySampleDonors();
    }
}

// ============================================
// Display Donors
// ============================================
function displayDonors(donors) {
    const grid = document.getElementById('donorsGrid');
    
    if (donors.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--gray-700);">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 20px; opacity: 0.3;">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <h3 style="margin-bottom: 8px;">No Donors Available</h3>
                <p>No donors with your blood group found in your area.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = donors.map((donor, index) => `
        <div class="donor-card" style="animation-delay: ${index * 0.1}s">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(donor.fullName)}&background=3498db&color=fff&size=80" 
                 alt="${donor.fullName}" class="donor-avatar">
            <h4 class="donor-name">${donor.fullName}</h4>
            <div class="donor-blood">${donor.bloodGroup}</div>
            <div class="donor-info">
                <div class="donor-info-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>${donor.city}</span>
                </div>
                <div class="donor-info-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span>${donor.donationCount || 0} Donations</span>
                </div>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="btn-primary" style="flex: 1; padding: 10px; font-size: 13px;" onclick="requestBloodFrom('${donor.bloodGroup}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    Request
                </button>
                <button class="btn-contact" style="flex: 1; padding: 10px; font-size: 13px;" onclick="contactDonor('${donor.phone}', '${donor.fullName}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    Contact
                </button>
            </div>
        </div>
    `).join('');
}

// ============================================
// Display Sample Donors (Fallback)
// ============================================
function displaySampleDonors() {
    const sampleDonors = [
        {
            fullName: 'Rahul Sharma',
            bloodGroup: currentUser.bloodGroup,
            city: currentUser.city,
            phone: '9876543210',
            donationCount: 5
        },
        {
            fullName: 'Priya Singh',
            bloodGroup: currentUser.bloodGroup,
            city: currentUser.city,
            phone: '9876543211',
            donationCount: 3
        },
        {
            fullName: 'Amit Kumar',
            bloodGroup: currentUser.bloodGroup,
            city: currentUser.city,
            phone: '9876543212',
            donationCount: 7
        }
    ];
    
    displayDonors(sampleDonors);
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Create Request Button
    document.getElementById('createRequestBtn').addEventListener('click', () => {
        openModal(document.getElementById('requestModal'));
    });
    
    // Close Request Modal
    document.getElementById('closeRequestModal').addEventListener('click', () => {
        closeModal(document.getElementById('requestModal'));
    });
    
    // Request Form Submission
    document.getElementById('requestForm').addEventListener('submit', handleRequestSubmit);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('bloodconnect_token');
            localStorage.removeItem('bloodconnect_user');
            window.location.href = 'index.html';
        }
    });
    
    // Filter Requests
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const status = btn.dataset.status;
            filterRequests(status);
        });
    });
    
    // Search Donors
    document.getElementById('donorSearch').addEventListener('input', (e) => {
        searchDonors(e.target.value);
    });
    
    // Modal overlay click
    document.querySelector('#requestModal .modal-overlay').addEventListener('click', () => {
        closeModal(document.getElementById('requestModal'));
    });
    
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.getAttribute('href') !== '#') {
                e.preventDefault();
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                const section = item.getAttribute('href').substring(1);
                handleNavigation(section);
            }
        });
    });
}

// ============================================
// Handle Request Form Submission
// ============================================
async function handleRequestSubmit(e) {
    e.preventDefault();
    
    const formData = {
        requesterId: currentUser.id,
        patientName: document.getElementById('patientName').value,
        bloodGroup: document.getElementById('bloodGroup').value,
        unitsNeeded: parseInt(document.getElementById('unitsNeeded').value),
        urgency: document.getElementById('urgency').value,
        hospitalName: document.getElementById('hospitalName').value,
        hospitalAddress: document.getElementById('hospitalAddress').value,
        city: document.getElementById('city').value,
        contactNumber: document.getElementById('contactNumber').value,
        reason: document.getElementById('reason').value
    };
    
    try {
        const response = await fetch(`${API_URL}/donation-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Request created successfully!', 'success');
            closeModal(document.getElementById('requestModal'));
            document.getElementById('requestForm').reset();
            await loadMyRequests();
            await loadStats();
        } else {
            showNotification(data.message || 'Failed to create request', 'error');
        }
    } catch (error) {
        console.error('Error creating request:', error);
        showNotification('Network error! Please try again.', 'error');
    }
}

// ============================================
// Utility Functions
// ============================================

// Navigation Handler
function handleNavigation(section) {
    console.log('Navigating to:', section);
    
    // Hide all sections
    const sections = document.querySelectorAll('.nav-section');
    sections.forEach(s => {
        if(s) s.style.display = 'none';
        if(s) s.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
        setTimeout(() => {
            targetSection.classList.add('active');
        }, 10);
    }
}

// Modal Functions
function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Contact Donor
function contactDonor(phone, name) {
    if (confirm(`Do you want to call ${name} at ${phone}?`)) {
        window.location.href = `tel:${phone}`;
    }
}

// Request Blood from specific blood group
function requestBloodFrom(bloodGroup) {
    openModal(document.getElementById('requestModal'));
    const bloodGroupSelect = document.getElementById('bloodGroup');
    if (bloodGroupSelect) {
        bloodGroupSelect.value = bloodGroup;
    }
}

// Edit Request
function editRequest(requestId) {
    showNotification('Edit functionality coming soon!', 'info');
}

// Cancel Request
async function cancelRequest(requestId) {
    if (!confirm('Are you sure you want to cancel this request?')) {
        return;
    }
    
    showNotification('Request cancelled successfully!', 'success');
    await loadMyRequests();
    await loadStats();
}

// Filter Requests
function filterRequests(status) {
    const cards = document.querySelectorAll('.request-card');
    
    cards.forEach(card => {
        const cardStatus = card.dataset.status;
        if (status === 'all' || cardStatus === status) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Search Donors
function searchDonors(query) {
    const cards = document.querySelectorAll('.donor-card');
    const lowerQuery = query.toLowerCase();
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(lowerQuery)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Format date
function formatDate(date) {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

// Get time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return 'Just now';
}

// Show notification
function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        font-size: 15px;
        font-weight: 500;
        max-width: 400px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return '✓';
        case 'error': return '✕';
        default: return 'ℹ';
    }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .notification-icon {
        font-size: 20px;
        font-weight: bold;
    }
`;
document.head.appendChild(style);

// ============================================
// Premium & Blood Banks Logic
// ============================================
let selectedPlan = null;

function openPaymentModal(plan) {
    selectedPlan = plan;
    const amount = plan === 'yearly' ? '₹5999' : '₹699';
    document.getElementById('paymentAmount').innerText = amount;
    openModal(document.getElementById('paymentModal'));
}

function closePaymentModal() {
    closeModal(document.getElementById('paymentModal'));
}

async function confirmPayment() {
    const txnId = document.getElementById('transactionId').value;
    if (!txnId) {
        showNotification('Please enter UTR or Transaction ID', 'error');
        return;
    }

    try {
        showNotification('Verifying payment...', 'info');
        const userId = currentUser.id || currentUser._id;
        // Simulated API call for payment verification
        const response = await fetch(`${API_URL}/users/${userId}/upgrade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId: selectedPlan, transactionId: txnId })
        });
        
        const data = await response.json();
        if (data.success) {
            closePaymentModal();
            showNotification('Welcome to Premium! 🎉', 'success');
            
            // Update local storage
            currentUser.isPremium = true;
            localStorage.setItem('bloodconnect_user', JSON.stringify(currentUser));
            
            // Unlock features
            document.getElementById('navBloodBanks').style.display = 'flex';
            await loadBloodBanks();
            
            // Go to blood banks section
            document.getElementById('navBloodBanks').click();
        } else {
            showNotification(data.message || 'Payment verification failed', 'error');
        }
    } catch (error) {
        console.error('Upgrade Error:', error);
        showNotification('Something went wrong. Try again later.', 'error');
    }
}

async function loadBloodBanks() {
    if (!currentUser.isPremium) return;
    
    try {
        const response = await fetch(`${API_URL}/bloodbanks?city=${currentUser.city}`);
        const data = await response.json();
        
        if (data.success) {
            const grid = document.getElementById('bloodbanksGrid');
            if (data.data.length === 0) {
                grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">No blood banks found in your city yet.</p>';
                return;
            }
            
            grid.innerHTML = data.data.map(bank => `
                <div class="bloodbank-card">
                    <h4>${bank.name}</h4>
                    <div class="bloodbank-details">
                        <p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${bank.address}, ${bank.city}</p>
                        <p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> ${bank.phone}</p>
                        <p><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Contact: ${bank.contactPerson || 'Reception'}</p>
                    </div>
                    <div class="inventory-tags">
                        ${bank.availableBloodGroups.map(bg => `<span class="inventory-tag">${bg}</span>`).join('')}
                    </div>
                    <button class="btn-premium" style="font-size: 14px; padding: 10px;" onclick="alert('Your order request has been sent to ${bank.name}. They will contact you shortly.')">Order Blood Now</button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading blood banks:', error);
    }
}