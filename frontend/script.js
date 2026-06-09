// ============================================
// Configuration
// ============================================
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000/api' : '/api';

// ============================================
// DOM Elements
// ============================================
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const registerModal = document.getElementById('registerModal');
const openRegisterModalBtn = document.getElementById('openRegisterModal');
const closeRegisterModalBtn = document.getElementById('closeRegisterModal');
const closeRegisterModalLink = document.getElementById('closeRegisterModalLink');
const togglePasswordBtns = document.querySelectorAll('.toggle-password');

// ============================================
// Modal Functions
// ============================================
function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ============================================
// Event Listeners - Modal
// ============================================
openRegisterModalBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openModal(registerModal);
});

closeRegisterModalBtn.addEventListener('click', () => {
    closeModal(registerModal);
});

closeRegisterModalLink.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(registerModal);
});

// Close modal when clicking on overlay
registerModal.querySelector('.modal-overlay').addEventListener('click', () => {
    closeModal(registerModal);
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && registerModal.classList.contains('active')) {
        closeModal(registerModal);
    }
});

// ============================================
// Password Toggle Functionality
// ============================================
togglePasswordBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = targetId 
            ? document.getElementById(targetId) 
            : btn.parentElement.querySelector('input[type="password"], input[type="text"]');
        
        if (input) {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            const svg = btn.querySelector('svg');
            if (type === 'text') {
                svg.innerHTML = `
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                `;
            } else {
                svg.innerHTML = `
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                `;
            }
        }
    });
});

// ============================================
// Loading State for Forms
// ============================================
function setFormLoading(form, isLoading) {
    const submitBtn = form.querySelector('button[type="submit"]');
    
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'not-allowed';
        
        const originalContent = submitBtn.innerHTML;
        submitBtn.setAttribute('data-original-content', originalContent);
        
        submitBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10"></circle>
            </svg>
            <span>Processing...</span>
        `;
    } else {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        
        const originalContent = submitBtn.getAttribute('data-original-content');
        if (originalContent) {
            submitBtn.innerHTML = originalContent;
        }
    }
}

// ============================================
// Notification System
// ============================================
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

// ============================================
// Login Form Submission
// ============================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFormLoading(loginForm, true);
    
    const formData = {
        userType: document.querySelector('input[name="userType"]:checked').value,
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
    };
    
    console.log('Login attempt:', { email: formData.email, userType: formData.userType });
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.success) {
            showNotification('Login successful! Redirecting...', 'success');
            
            localStorage.setItem('bloodconnect_token', data.data.token);
            localStorage.setItem('bloodconnect_user', JSON.stringify(data.data.user));
            
            setTimeout(() => {
                setFormLoading(loginForm, false);
                
                switch(formData.userType) {
                    case 'donor':
                        window.location.href = 'donor-dashboard.html';
                        break;
                    case 'receiver':
                        window.location.href = 'receiver-dashboard.html';
                        break;
                    case 'admin':
                        window.location.href = 'admin-dashboard.html';
                        break;
                }
            }, 1500);
        } else {
            showNotification(data.message || 'Login failed!', 'error');
            setFormLoading(loginForm, false);
        }
        
    } catch (error) {
        console.error('Login Error:', error);
        showNotification('Cannot connect to server. Make sure the server is running on port 5000.', 'error');
        setFormLoading(loginForm, false);
    }
});

// ============================================
// Registration Form Submission
// ============================================
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const age = parseInt(document.getElementById('regAge').value);
    const bloodGroup = document.getElementById('regBloodGroup').value;
    
    // Validation
    if (!bloodGroup) {
        showNotification('Please select a blood group!', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }
    
    if (password.length < 8) {
        showNotification('Password must be at least 8 characters long!', 'error');
        return;
    }
    
    if (age < 18 || age > 65) {
        showNotification('Age must be between 18 and 65!', 'error');
        return;
    }
    
    if (phone.length !== 10) {
        showNotification('Phone number must be 10 digits!', 'error');
        return;
    }
    
    const formData = {
        userType: document.querySelector('input[name="regUserType"]:checked').value,
        fullName: document.getElementById('regFullName').value.trim(),
        email: email,
        phone: phone,
        bloodGroup: bloodGroup,
        city: document.getElementById('regCity').value.trim(),
        age: age,
        password: password
    };
    
    console.log('Registration attempt:', formData);
    setFormLoading(registerForm, true);
    
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        console.log('Registration response:', data);
        
        if (data.success) {
            showNotification('Registration successful! You can now login.', 'success');
            
            setTimeout(() => {
                closeModal(registerModal);
                registerForm.reset();
                setFormLoading(registerForm, false);
                
                // Pre-fill login form
                document.getElementById('email').value = formData.email;
                document.querySelector(`input[name="userType"][value="${formData.userType}"]`).checked = true;
            }, 1500);
        } else {
            showNotification(data.message || 'Registration failed!', 'error');
            setFormLoading(registerForm, false);
        }
        
    } catch (error) {
        console.error('Registration Error:', error);
        showNotification('Cannot connect to server. Make sure the server is running on port 5000.', 'error');
        setFormLoading(registerForm, false);
    }
});

// ============================================
// Form Validation
// ============================================
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[0-9]{10}$/;
    return re.test(phone.replace(/[\s-]/g, ''));
}

// Real-time email validation
const emailInputs = document.querySelectorAll('input[type="email"]');
emailInputs.forEach(input => {
    input.addEventListener('blur', () => {
        if (input.value && !validateEmail(input.value)) {
            input.style.borderColor = '#e74c3c';
        } else if (input.value) {
            input.style.borderColor = '#2ecc71';
        }
    });
    
    input.addEventListener('input', () => {
        input.style.borderColor = '';
    });
});

// Real-time phone validation
const phoneInputs = document.querySelectorAll('input[type="tel"]');
phoneInputs.forEach(input => {
    input.addEventListener('input', () => {
        input.value = input.value.replace(/[^0-9]/g, '');
        input.style.borderColor = '';
    });
    
    input.addEventListener('blur', () => {
        if (input.value && !validatePhone(input.value)) {
            input.style.borderColor = '#e74c3c';
        } else if (input.value) {
            input.style.borderColor = '#2ecc71';
        }
    });
});

// Age validation
const ageInput = document.getElementById('regAge');
if (ageInput) {
    ageInput.addEventListener('blur', () => {
        const age = parseInt(ageInput.value);
        if (age && (age < 18 || age > 65)) {
            ageInput.style.borderColor = '#e74c3c';
        } else if (age) {
            ageInput.style.borderColor = '#2ecc71';
        }
    });
    
    ageInput.addEventListener('input', () => {
        ageInput.style.borderColor = '';
    });
}

// ============================================
// Google Sign-In (Demo)
// ============================================
const googleBtn = document.querySelector('.btn-social.google');
if (googleBtn) {
    googleBtn.addEventListener('click', () => {
        showNotification('Google Sign-In is not implemented in this demo', 'info');
    });
}

// ============================================
// Check if server is running
// ============================================
async function checkServerStatus() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        console.log('Server status:', data);
        return true;
    } catch (error) {
        console.error('Server is not running!');
        showNotification('Server is not running! Please start the server with: node server.js', 'error');
        return false;
    }
}

// Check on page load
document.addEventListener('DOMContentLoaded', () => {
    checkServerStatus();
    console.log('BloodConnect initialized successfully!');
});

// ============================================
// Add Animation Styles
// ============================================
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
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
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

// Prevent form resubmission
if (window.history.replaceState) {
    window.history.replaceState(null, null, window.location.href);
}

console.log('BloodConnect Authentication System Loaded');
console.log('API URL:', API_URL);