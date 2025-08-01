// Authentication Utilities for Native Version
// This script provides reusable authentication functions across all pages

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is logged in, false otherwise
 */
function isAuthenticated() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const authToken = localStorage.getItem('authToken');
    
    return !!(isLoggedIn && authToken);
}

/**
 * Get user data from localStorage
 * @returns {object|null} User data object or null if not found
 */
function getUserData() {
    const userData = localStorage.getItem('userData');
    if (userData) {
        try {
            return JSON.parse(userData);
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }
    return null;
}

/**
 * Get authentication token
 * @returns {string|null} JWT token or null if not found
 */
function getAuthToken() {
    return localStorage.getItem('authToken');
}

/**
 * Check authentication and redirect if not logged in
 * @param {string} redirectUrl - URL to redirect to if not authenticated (default: 'index.html')
 * @returns {boolean} True if authenticated, false if redirected
 */
function checkAuthAndRedirect(redirectUrl = 'index.html') {
    if (!isAuthenticated()) {
        // Show error message if notifications are available
        if (typeof showError === 'function') {
            showError('يجب تسجيل الدخول', 'يرجى تسجيل الدخول للوصول إلى هذه الصفحة');
        }
        
        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 2000);
        
        return false;
    }
    
    return true;
}

/**
 * Check authentication and redirect to login page if not logged in
 * @returns {boolean} True if authenticated, false if redirected
 */
function checkAuthAndRedirectToLogin() {
    return checkAuthAndRedirect('login.html');
}

/**
 * Check authentication and redirect to home page if not logged in
 * @returns {boolean} True if authenticated, false if redirected
 */
function checkAuthAndRedirectToHome() {
    return checkAuthAndRedirect('index.html');
}

/**
 * Logout user and redirect
 * @param {string} redirectUrl - URL to redirect to after logout (default: 'login.html')
 */
function logout(redirectUrl = 'login.html') {
    // Clear all authentication data
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('rememberMe');
    
    // Show success message if notifications are available
    if (typeof showSuccess === 'function') {
        showSuccess('تم تسجيل الخروج', 'تم تسجيل الخروج بنجاح');
    }
    
    // Redirect after a short delay
    setTimeout(() => {
        window.location.href = redirectUrl;
    }, 1500);
}

/**
 * Update user name display in the header
 * @param {string} elementId - ID of the element to update (default: 'user-name')
 */
function updateUserNameDisplay(elementId = 'user-name') {
    const userData = getUserData();
    const element = document.getElementById(elementId);
    
    if (element) {
        if (userData && userData.name) {
            element.textContent = userData.name;
        } else if (userData && userData.email) {
            // Fallback to email if name is not available
            element.textContent = userData.email;
        } else {
            element.textContent = 'مستخدم';
        }
    }
}

/**
 * Update user email display in the header (for backward compatibility)
 * @param {string} elementId - ID of the element to update (default: 'user-email')
 */
function updateUserEmailDisplay(elementId = 'user-email') {
    const userData = getUserData();
    const element = document.getElementById(elementId);
    
    if (element) {
        if (userData && userData.email) {
            element.textContent = userData.email;
        } else {
            element.textContent = 'مستخدم';
        }
    }
}

/**
 * Initialize authentication for a page
 * This function should be called at the beginning of each protected page
 * @param {object} options - Configuration options
 * @param {string} options.redirectUrl - URL to redirect to if not authenticated
 * @param {boolean} options.updateEmail - Whether to update email display
 * @param {string} options.emailElementId - ID of email display element
 * @returns {boolean} True if authenticated, false if redirected
 */
function initAuth(options = {}) {
    const {
        redirectUrl = 'index.html',
        updateEmail = true,
        emailElementId = 'user-email'
    } = options;
    
    // Check authentication
    if (!checkAuthAndRedirect(redirectUrl)) {
        return false;
    }
    
    // Update email display if requested
    if (updateEmail) {
        updateUserEmailDisplay(emailElementId);
    }
    
    return true;
}

/**
 * Initialize authentication for dashboard pages (redirects to login)
 * @param {object} options - Configuration options
 * @returns {boolean} True if authenticated, false if redirected
 */
function initDashboardAuth(options = {}) {
    return initAuth({
        redirectUrl: 'login.html',
        ...options
    });
}

/**
 * Initialize authentication for public pages (redirects to home)
 * @param {object} options - Configuration options
 * @returns {boolean} True if authenticated, false if redirected
 */
function initPublicAuth(options = {}) {
    return initAuth({
        redirectUrl: 'index.html',
        ...options
    });
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthenticated,
        getUserData,
        getAuthToken,
        checkAuthAndRedirect,
        checkAuthAndRedirectToLogin,
        checkAuthAndRedirectToHome,
        logout,
        updateUserEmailDisplay,
        updateUserNameDisplay,
        initAuth,
        initDashboardAuth,
        initPublicAuth
    };
}

// Make functions globally available
window.isAuthenticated = isAuthenticated;
window.getUserData = getUserData;
window.getAuthToken = getAuthToken;
window.checkAuthAndRedirect = checkAuthAndRedirect;
window.checkAuthAndRedirectToLogin = checkAuthAndRedirectToLogin;
window.checkAuthAndRedirectToHome = checkAuthAndRedirectToHome;
window.logout = logout;
window.updateUserEmailDisplay = updateUserEmailDisplay;
window.updateUserNameDisplay = updateUserNameDisplay;
window.initAuth = initAuth;
window.initDashboardAuth = initDashboardAuth;
window.initPublicAuth = initPublicAuth; 