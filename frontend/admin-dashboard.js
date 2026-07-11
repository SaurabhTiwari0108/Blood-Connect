const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api';
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Authentication
    const token = localStorage.getItem('bloodconnect_token');
    const userData = localStorage.getItem('bloodconnect_user');
    
    if (!token || !userData) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(userData);
    
    if (currentUser.userType !== 'admin') {
        alert('Access denied. Admin only.');
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('headerUserName').textContent = currentUser.fullName;
    
    // Load initial data
    await loadStats();
    await loadUsers();
    await loadRequests();
    
    setupEventListeners();
});

function setupEventListeners() {
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

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('bloodconnect_token');
            localStorage.removeItem('bloodconnect_user');
            window.location.href = 'index.html';
        }
    });
}

function handleNavigation(section) {
    const sections = document.querySelectorAll('.nav-section');
    sections.forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
        setTimeout(() => targetSection.classList.add('active'), 10);
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/admin/stats`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('statDonors').textContent = data.data.totalDonors;
            document.getElementById('statReceivers').textContent = data.data.totalReceivers;
            document.getElementById('statRequests').textContent = data.data.totalRequests;
            document.getElementById('statCompleted').textContent = data.data.fulfilledRequests;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`);
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = data.data.map(user => `
                <tr>
                    <td>${user.fullName}</td>
                    <td>${user.email}</td>
                    <td style="text-transform: capitalize;">${user.userType}</td>
                    <td><span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${user.bloodGroup || 'N/A'}</span></td>
                    <td>${user.city || 'N/A'}</td>
                    <td>
                        ${user.userType !== 'admin' ? `
                            <button class="btn-delete" onclick="deleteUser('${user._id}')">
                                Delete
                            </button>
                        ` : '<span style="color:var(--gray-300);">Admin</span>'}
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadRequests() {
    try {
        const response = await fetch(`${API_URL}/donation-requests`);
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('requestsTableBody');
            tbody.innerHTML = data.data.map(req => {
                const date = new Date(req.createdAt).toLocaleDateString();
                const statusColor = req.status === 'fulfilled' ? 'var(--green)' : req.status === 'accepted' ? 'var(--blue)' : 'var(--orange)';
                return `
                <tr>
                    <td>${req.patientName}</td>
                    <td>${req.hospitalName}</td>
                    <td><span style="background: var(--primary); color: white; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${req.bloodGroup}</span> (${req.unitsNeeded} Units)</td>
                    <td><span style="color: ${statusColor}; font-weight: bold; text-transform: uppercase; font-size: 12px;">${req.status}</span></td>
                    <td>${date}</td>
                    <td>
                        <button class="btn-delete" onclick="deleteRequest('${req._id}')">
                            Delete
                        </button>
                    </td>
                </tr>
            `}).join('');
        }
    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

async function deleteUser(id) {
    if(!confirm('Are you sure you want to delete this user?')) return;
    try {
        const response = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if(data.success) {
            alert('User deleted successfully');
            loadUsers();
            loadStats();
        } else {
            alert(data.message || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
    }
}

async function deleteRequest(id) {
    if(!confirm('Are you sure you want to delete this request?')) return;
    try {
        const response = await fetch(`${API_URL}/donation-requests/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if(data.success) {
            alert('Request deleted successfully');
            loadRequests();
            loadStats();
        } else {
            alert(data.message || 'Failed to delete request');
        }
    } catch (error) {
        console.error('Error deleting request:', error);
    }
}
