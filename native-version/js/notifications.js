// Notification System for Native Version
class NotificationSystem {
    constructor() {
        this.container = null;
        this.notifications = [];
        this.init();
    }

    init() {
        // Create notification container if it doesn't exist
        if (!document.querySelector('.notification-container')) {
            this.container = document.createElement('div');
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.notification-container');
        }
    }

    // Show success notification
    showSuccess(title, message, duration = 5000) {
        this.showNotification('success', title, message, duration);
    }

    // Show error notification
    showError(title, message, duration = 5000) {
        this.showNotification('error', title, message, duration);
    }

    // Show warning notification
    showWarning(title, message, duration = 5000) {
        this.showNotification('warning', title, message, duration);
    }

    // Show info notification
    showInfo(title, message, duration = 5000) {
        this.showNotification('info', title, message, duration);
    }

    // Main notification function
    showNotification(type, title, message, duration) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Get appropriate icon for each type
        const iconMap = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };

        notification.innerHTML = `
            <div class="notification-icon">
                <i data-lucide="${iconMap[type]}"></i>
            </div>
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i data-lucide="x"></i>
            </button>
            <div class="notification-progress">
                <div class="notification-progress-bar" style="width: 100%"></div>
            </div>
        `;

        // Add to container
        this.container.appendChild(notification);

        // Initialize Lucide icons
        lucide.createIcons();

        // Show animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto-dismiss functionality
        if (duration > 0) {
            const progressBar = notification.querySelector('.notification-progress-bar');
            const startTime = Date.now();
            const animateProgress = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.max(0, 100 - (elapsed / duration) * 100);
                progressBar.style.width = progress + '%';
                
                if (progress > 0) {
                    requestAnimationFrame(animateProgress);
                } else {
                    this.hideNotification(notification);
                }
            };
            requestAnimationFrame(animateProgress);
        }

        // Store notification reference
        this.notifications.push(notification);

        // Remove from array when notification is removed
        notification.addEventListener('transitionend', () => {
            if (notification.classList.contains('hide')) {
                notification.remove();
                const index = this.notifications.indexOf(notification);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }
            }
        });

        return notification;
    }

    // Hide notification
    hideNotification(notification) {
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }

    // Hide all notifications
    hideAll() {
        this.notifications.forEach(notification => {
            this.hideNotification(notification);
        });
    }

    // Clear all notifications immediately
    clearAll() {
        this.notifications.forEach(notification => {
            notification.remove();
        });
        this.notifications = [];
    }
}

// Initialize notification system
const notifications = new NotificationSystem();

// Global functions for easy access
function showSuccess(title, message, duration = 5000) {
    return notifications.showSuccess(title, message, duration);
}

function showError(title, message, duration = 5000) {
    return notifications.showError(title, message, duration);
}

function showWarning(title, message, duration = 5000) {
    return notifications.showWarning(title, message, duration);
}

function showInfo(title, message, duration = 5000) {
    return notifications.showInfo(title, message, duration);
}

function hideAllNotifications() {
    notifications.hideAll();
}

function clearAllNotifications() {
    notifications.clearAll();
}

// Example usage functions for testing
function testNotifications() {
    showSuccess('تم بنجاح!', 'تم حفظ البيانات بنجاح');
    
    setTimeout(() => {
        showError('خطأ!', 'حدث خطأ أثناء حفظ البيانات');
    }, 1000);
    
    setTimeout(() => {
        showWarning('تحذير!', 'يرجى التحقق من البيانات المدخلة');
    }, 2000);
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide icons if not already done
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotificationSystem, showSuccess, showError, showWarning };
} 