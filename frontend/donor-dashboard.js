// ============================================
// Global Variables
// ============================================
const API_URL = 'http://localhost:5000/api';
let currentUser = null;
let donationChart = null;
let pieChart = null;

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
    
    // Load all dashboard data
    await loadUserProfile();
    await loadDonationHistory();
    await loadActiveRequests();
    initializeCharts();
    
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
        document.getElementById('profileName').textContent = currentUser.fullName;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profilePhone').textContent = currentUser.phone;
        document.getElementById('profileCity').textContent = currentUser.city;
        document.getElementById('profileAge').textContent = currentUser.age + ' years';
        document.getElementById('bloodBadge').textContent = currentUser.bloodGroup;
        
        // Update profile images with initials
        const initials = currentUser.fullName.split(' ').map(n => n[0]).join('');
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.fullName)}&background=ff4757&color=fff&size=120&bold=true`;
        
        document.getElementById('headerProfileImg').src = avatarUrl;
        document.getElementById('profileImage').src = avatarUrl;
        
        // Fetch latest data from backend
        const token = localStorage.getItem('bloodconnect_token');
        const response = await fetch(`${API_URL}/users/${currentUser.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const user = data.data;
            
            // Update stats
            document.getElementById('totalDonations').textContent = user.donationCount || 0;
            document.getElementById('totalUnits').textContent = (user.donationCount || 0) * 1; // Assuming 1 unit per donation
            document.getElementById('livesSaved').textContent = (user.donationCount || 0) * 3; // Assuming 1 donation saves 3 lives
            
            // Calculate next donation eligibility
            if (user.lastDonationDate) {
                const lastDonation = new Date(user.lastDonationDate);
                const nextEligible = new Date(lastDonation);
                nextEligible.setDate(nextEligible.getDate() + 90); // 90 days gap
                
                const today = new Date();
                const daysLeft = Math.ceil((nextEligible - today) / (1000 * 60 * 60 * 24));
                
                document.getElementById('lastDonationDate').textContent = formatDate(lastDonation);
                
                if (daysLeft > 0) {
                    document.getElementById('nextDonation').textContent = daysLeft;
                    document.getElementById('eligibilityStatus').textContent = 'Not Eligible';
                    document.getElementById('eligibilityStatus').style.color = 'var(--red)';
                } else {
                    document.getElementById('nextDonation').textContent = '✓';
                    document.getElementById('eligibilityStatus').textContent = 'Eligible';
                    document.getElementById('eligibilityStatus').style.color = 'var(--green)';
                }
            } else {
                document.getElementById('lastDonationDate').textContent = 'Never';
                document.getElementById('nextDonation').textContent = '✓';
                document.getElementById('eligibilityStatus').textContent = 'Eligible';
                document.getElementById('eligibilityStatus').style.color = 'var(--green)';
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Failed to load profile data', 'error');
    }
}

// ============================================
// Load Donation History
// ============================================
async function loadDonationHistory() {
    // Sample donation history (replace with actual API call)
    const donations = [
        {
            date: new Date('2024-11-15'),
            hospital: 'AIIMS Delhi',
            units: 1,
            location: 'New Delhi'
        },
        {
            date: new Date('2024-08-20'),
            hospital: 'Fortis Hospital',
            units: 1,
            location: 'Gurgaon'
        },
        {
            date: new Date('2024-05-10'),
            hospital: 'Max Hospital',
            units: 1,
            location: 'Delhi'
        },
        {
            date: new Date('2024-02-05'),
            hospital: 'Apollo Hospital',
            units: 1,
            location: 'Noida'
        }
    ];
    
    const timeline = document.getElementById('donationTimeline');
    
    if (donations.length === 0) {
        timeline.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--gray-700);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px; opacity: 0.3;">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                </svg>
                <p>No donation history yet. Be a hero, donate blood!</p>
            </div>
        `;
        return;
    }
    
    timeline.innerHTML = donations.map((donation, index) => `
        <div class="timeline-item" style="animation-delay: ${index * 0.1}s">
            <div class="timeline-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <span class="timeline-title">${donation.hospital}</span>
                    <span class="timeline-date">${formatDate(donation.date)}</span>
                </div>
                <div class="timeline-details">
                    <span class="timeline-detail">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                        </svg>
                        ${donation.units} Unit
                    </span>
                    <span class="timeline-detail">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        ${donation.location}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// Load Active Requests
// ============================================
async function loadActiveRequests() {
    try {
        const response = await fetch(`${API_URL}/donation-requests?status=pending`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch requests');
        }
        
        const data = await response.json();
        let requests = data.data || [];
        
        // Filter by user's city and blood group compatibility
        requests = requests.filter(req => {
            const isCompatible = isBloodCompatible(currentUser.bloodGroup, req.bloodGroup);
            const isSameCity = req.city.toLowerCase() === currentUser.city.toLowerCase();
            return isCompatible && isSameCity;
        });
        
        displayRequests(requests);
    } catch (error) {
        console.error('Error loading requests:', error);
        // Show sample data if API fails
        displaySampleRequests();
    }
}

// ============================================
// Display Requests
// ============================================
function displayRequests(requests) {
    const grid = document.getElementById('requestsGrid');
    
    if (requests.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px; color: var(--gray-700);">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 20px; opacity: 0.3;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3 style="margin-bottom: 8px;">No Active Requests</h3>
                <p>There are no blood requests in your area at the moment.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = requests.map((req, index) => `
        <div class="request-card ${req.urgency}" style="animation-delay: ${index * 0.1}s">
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
                </div>
            </div>
            <div class="request-actions">
                <button class="btn-donate" onclick="respondToRequest('${req._id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    I Can Donate
                </button>
                <button class="btn-contact" onclick="contactRequester('${req.contactNumber}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// ============================================
// Display Sample Requests (Fallback)
// ============================================
function displaySampleRequests() {
    const sampleRequests = [
        {
            _id: '1',
            patientName: 'Rajesh Kumar',
            bloodGroup: currentUser.bloodGroup,
            unitsNeeded: 2,
            urgency: 'critical',
            hospitalName: 'AIIMS Delhi',
            city: currentUser.city,
            contactNumber: '9876543210',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
            _id: '2',
            patientName: 'Priya Sharma',
            bloodGroup: currentUser.bloodGroup,
            unitsNeeded: 1,
            urgency: 'urgent',
            hospitalName: 'Fortis Hospital',
            city: currentUser.city,
            contactNumber: '9876543211',
            createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
        },
        {
            _id: '3',
            patientName: 'Amit Singh',
            bloodGroup: currentUser.bloodGroup,
            unitsNeeded: 3,
            urgency: 'normal',
            hospitalName: 'Max Hospital',
            city: currentUser.city,
            contactNumber: '9876543212',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
    ];
    
    displayRequests(sampleRequests);
}

// ============================================
// Initialize Charts
// ============================================
function initializeCharts() {
    // Donation Trend Chart
    const ctx = document.getElementById('donationChart');
    if (ctx) {
        donationChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Donations',
                    data: [0, 1, 1, 2, 1, 1],
                    borderColor: '#ff4757',
                    backgroundColor: 'rgba(255, 71, 87, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#ff4757',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#2f3542',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: { size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 12 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Impact Pie Chart
    const pieCtx = document.getElementById('impactPieChart');
    if (pieCtx) {
        const donationCount = parseInt(document.getElementById('totalDonations').textContent) || 6;
        
        pieChart = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Lives Saved', 'Units Donated', 'Hospitals Served'],
                datasets: [{
                    data: [donationCount * 3, donationCount, Math.ceil(donationCount / 2)],
                    backgroundColor: [
                        '#2ecc71',
                        '#ff4757',
                        '#3498db'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#2f3542',
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                cutout: '70%'
            }
        });
        
        // Create custom legend
        const legendContainer = document.getElementById('pieLegend');
        const colors = ['#2ecc71', '#ff4757', '#3498db'];
        const labels = ['Lives Saved', 'Units Donated', 'Hospitals Served'];
        const values = [donationCount * 3, donationCount, Math.ceil(donationCount / 2)];
        
        legendContainer.innerHTML = labels.map((label, i) => `
            <div class="legend-item">
                <div class="legend-color" style="background: ${colors[i]}"></div>
                <span class="legend-label">${label}</span>
                <span class="legend-value">${values[i]}</span>
            </div>
        `).join('');
    }
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('bloodconnect_token');
            localStorage.removeItem('bloodconnect_user');
            window.location.href = 'index.html';
        }
    });
    
    // Edit Profile
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        showNotification('Edit profile feature coming soon!', 'info');
    });
    
    // Change Photo
    document.getElementById('changePhotoBtn').addEventListener('click', () => {
        document.getElementById('photoInput').click();
    });
    
    document.getElementById('photoInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('profileImage').src = event.target.result;
                document.getElementById('headerProfileImg').src = event.target.result;
                showNotification('Profile photo updated!', 'success');
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Filter Requests
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const urgency = btn.dataset.urgency;
            filterRequests(urgency);
        });
    });
    
    // Chart Period Change
    const chartPeriod = document.getElementById('chartPeriod');
    if (chartPeriod) {
        chartPeriod.addEventListener('change', (e) => {
            updateChartData(e.target.value);
        });
    }
    
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.getAttribute('href') !== '#') {
                e.preventDefault();
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Scroll to section or load content
                const section = item.getAttribute('href').substring(1);
                handleNavigation(section);
            }
        });
    });
}

// ============================================
// Filter Requests
// ============================================
function filterRequests(urgency) {
    const cards = document.querySelectorAll('.request-card');
    
    cards.forEach(card => {
        if (urgency === 'all' || card.classList.contains(urgency)) {
            card.style.display = 'block';
            card.style.animation = 'scaleIn 0.3s ease-out';
        } else {
            card.style.display = 'none';
        }
    });
}

// ============================================
// Update Chart Data
// ============================================
function updateChartData(period) {
    if (!donationChart) return;
    
    let labels, data;
    
    switch(period) {
        case '6months':
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            data = [0, 1, 1, 2, 1, 1];
            break;
        case '1year':
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            data = [1, 0, 1, 1, 2, 1, 1, 0, 1, 1, 0, 1];
            break;
        case 'all':
            labels = ['2022', '2023', '2024'];
            data = [3, 5, 6];
            break;
        default:
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            data = [0, 1, 1, 2, 1, 1];
    }
    
    donationChart.data.labels = labels;
    donationChart.data.datasets[0].data = data;
    donationChart.update('active');
}

// ============================================
// Respond to Request
// ============================================
function respondToRequest(requestId) {
    showNotification('Thank you for your willingness to donate! Hospital will contact you soon.', 'success');
    
    // Here you would typically make an API call to notify the requester
    console.log('Responding to request:', requestId);
}

// ============================================
// Contact Requester
// ============================================
function contactRequester(phone) {
    if (confirm(`Do you want to call ${phone}?`)) {
        window.location.href = `tel:${phone}`;
    }
}

// ============================================
// Navigation Handler
// ============================================
function handleNavigation(section) {
    console.log('Navigating to:', section);
    
    switch(section) {
        case 'dashboard':
            showNotification('You are on Dashboard', 'info');
            break;
        case 'history':
            showNotification('Donation History section', 'info');
            break;
        case 'requests':
            showNotification('Blood Requests section', 'info');
            break;
        case 'profile':
            showNotification('Profile section', 'info');
            break;
        case 'certificates':
            showNotification('Certificates section coming soon!', 'info');
            break;
    }
}

// ============================================
// Utility Functions
// ============================================

// Check blood compatibility
function isBloodCompatible(donorBlood, requiredBlood) {
    const compatibility = {
        'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
        'O+': ['O+', 'A+', 'B+', 'AB+'],
        'A-': ['A-', 'A+', 'AB-', 'AB+'],
        'A+': ['A+', 'AB+'],
        'B-': ['B-', 'B+', 'AB-', 'AB+'],
        'B+': ['B+', 'AB+'],
        'AB-': ['AB-', 'AB+'],
        'AB+': ['AB+']
    };
    
    return compatibility[donorBlood]?.includes(requiredBlood) || false;
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