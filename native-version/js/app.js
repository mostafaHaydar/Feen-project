// Main JavaScript file for the native version

// Global variables
let currentUser = null;
let isLoggedIn = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize the application
function initializeApp() {
    checkAuthStatus();
    setupEventListeners();
    initializeComponents();
}

// Check authentication status
function checkAuthStatus() {
    const loginStatus = localStorage.getItem('isLoggedIn');
    const userEmail = localStorage.getItem('userEmail');
    
    if (loginStatus && userEmail) {
        currentUser = {
            email: userEmail,
            isLoggedIn: true
        };
        isLoggedIn = true;
    }
}

// Setup global event listeners
function setupEventListeners() {
    // Navigation
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-navigate]')) {
            e.preventDefault();
            const page = e.target.getAttribute('data-navigate');
            navigateTo(page);
        }
    });

    // Form submissions
    document.addEventListener('submit', function(e) {
        if (e.target.matches('#login-form')) {
            e.preventDefault();
            handleLogin(e.target);
        }
        
        if (e.target.matches('#register-form')) {
            e.preventDefault();
            handleRegister(e.target);
        }
        
        if (e.target.matches('#report-missing-form')) {
            e.preventDefault();
            handleReportMissing(e.target);
        }
        
        if (e.target.matches('#report-found-form')) {
            e.preventDefault();
            handleReportFound(e.target);
        }
    });

    // Password toggle
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-toggle-password]')) {
            togglePasswordVisibility(e.target);
        }
    });
}

// Initialize components
function initializeComponents() {
    // Initialize tooltips
    initializeTooltips();
    
    // Initialize modals
    initializeModals();
    
    // Initialize dropdowns
    initializeDropdowns();
    
    // Initialize file uploads
    initializeFileUploads();
}

// Navigation function
function navigateTo(page) {
    const pages = {
        'home': 'index.html',
        'login': 'login.html',
        'register': 'register.html',
        'dashboard': 'dashboard.html',
        'report-missing': 'report-missing.html',
        'report-found': 'report-found.html',
        'edit-missing': 'edit-missing.html',
        'edit-found': 'edit-found.html'
    };
    
    if (pages[page]) {
        window.location.href = pages[page];
    }
}

// Handle login
function handleLogin(form) {
    const email = form.querySelector('#email').value;
    const password = form.querySelector('#password').value;
    
    if (email === 'example@com' && password === '0000000') {
        // Store login state
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        
        // Show success message
        showAlert('تم تسجيل الدخول بنجاح!', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    } else {
        showAlert('بيانات الدخول غير صحيحة', 'error');
    }
}

// Handle register
function handleRegister(form) {
    const username = form.querySelector('#username').value;
    const email = form.querySelector('#register-email').value;
    const password = form.querySelector('#register-password').value;
    
    if (username && email && password) {
        // Store registration data
        localStorage.setItem('registeredUser', JSON.stringify({
            username: username,
            email: email,
            password: password
        }));
        
        showAlert('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.', 'success');
        
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    } else {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'error');
    }
}

// Handle missing person report
function handleReportMissing(form) {
    const formData = new FormData(form);
    const reportData = Object.fromEntries(formData.entries());
    
    // Validate required fields
    if (!reportData.fullName || !reportData.gender || !reportData.residence || !reportData.lastSeen || !reportData.lastSeenDate) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    // Store report data (in a real app, this would be sent to a server)
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const newReport = {
        id: Date.now(),
        type: 'missing',
        ...reportData,
        date: new Date().toISOString().split('T')[0],
        status: 'نشط'
    };
    
    reports.push(newReport);
    localStorage.setItem('reports', JSON.stringify(reports));
    
    showAlert('تم إرسال البلاغ بنجاح!', 'success');
    
    setTimeout(() => {
        if (isLoggedIn) {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'index.html';
        }
    }, 1500);
}

// Handle found person report
function handleReportFound(form) {
    const formData = new FormData(form);
    const reportData = Object.fromEntries(formData.entries());
    
    // Validate required fields
    if (!reportData.foundFullName || !reportData.foundGender || !reportData.foundLocation || !reportData.foundDate) {
        showAlert('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }
    
    // Store report data
    const reports = JSON.parse(localStorage.getItem('reports') || '[]');
    const newReport = {
        id: Date.now(),
        type: 'found',
        ...reportData,
        date: new Date().toISOString().split('T')[0],
        status: 'نشط'
    };
    
    reports.push(newReport);
    localStorage.setItem('reports', JSON.stringify(reports));
    
    showAlert('تم إرسال البلاغ بنجاح!', 'success');
    
    setTimeout(() => {
        if (isLoggedIn) {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'index.html';
        }
    }, 1500);
}

// Toggle password visibility
function togglePasswordVisibility(button) {
    const input = button.parentElement.querySelector('input');
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    
    // Re-initialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} animate-slide-in`;
    alert.textContent = message;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.className = 'float-left text-lg font-bold hover:text-gray-700';
    closeButton.onclick = () => alert.remove();
    alert.appendChild(closeButton);
    
    // Insert alert
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alert, container.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Initialize tooltips
function initializeTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltip = this.getAttribute('data-tooltip');
            showTooltip(this, tooltip);
        });
        
        element.addEventListener('mouseleave', function() {
            hideTooltip();
        });
    });
}

// Show tooltip
function showTooltip(element, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip-popup';
    tooltip.textContent = text;
    tooltip.style.cssText = `
        position: absolute;
        background: #1f2937;
        color: white;
        padding: 0.5rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        z-index: 1000;
        pointer-events: none;
    `;
    
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
}

// Hide tooltip
function hideTooltip() {
    const tooltip = document.querySelector('.tooltip-popup');
    if (tooltip) {
        tooltip.remove();
    }
}

// Initialize modals
function initializeModals() {
    const modalTriggers = document.querySelectorAll('[data-modal]');
    const modalCloses = document.querySelectorAll('[data-modal-close]');
    
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            openModal(modalId);
        });
    });
    
    modalCloses.forEach(close => {
        close.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    // Close modal on backdrop click
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
}

// Open modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Close modal
function closeModal(modal) {
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Initialize dropdowns
function initializeDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const content = dropdown.querySelector('.dropdown-content');
        
        if (trigger && content) {
            trigger.addEventListener('click', function(e) {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });
        }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function() {
        dropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    });
}

// Initialize file uploads
function initializeFileUploads() {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    
    fileInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                handleFileUpload(file, this);
            }
        });
    });
}

// Handle file upload
function handleFileUpload(file, input) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        showAlert('يرجى اختيار ملف صورة صالح (JPG, PNG, GIF)', 'error');
        input.value = '';
        return;
    }
    
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showAlert('حجم الملف يجب أن يكون أقل من 10 ميجابايت', 'error');
        input.value = '';
        return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = input.parentElement.querySelector('.file-preview');
        if (preview) {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview" class="w-20 h-20 object-cover rounded-lg">
                <p class="text-sm text-gray-600 mt-2">${file.name}</p>
            `;
        }
    };
    reader.readAsDataURL(file);
    
    showAlert('تم رفع الملف بنجاح', 'success');
}

// Logout function
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    currentUser = null;
    isLoggedIn = false;
    
    showAlert('تم تسجيل الخروج بنجاح', 'success');
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Utility functions
function formatDate(date) {
    return new Date(date).toLocaleDateString('ar-SA');
}

function formatDateTime(dateTime) {
    return new Date(dateTime).toLocaleString('ar-SA');
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[\+]?[0-9]{10,15}$/;
    return re.test(phone);
}

// Export functions for use in other scripts
window.FeenApp = {
    navigateTo,
    handleLogin,
    handleRegister,
    handleReportMissing,
    handleReportFound,
    logout,
    showAlert,
    formatDate,
    formatDateTime,
    validateEmail,
    validatePhone
}; 