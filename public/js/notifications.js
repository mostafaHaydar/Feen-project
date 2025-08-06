// Enhanced Notification System for Native Version
class NotificationSystem {
  constructor() {
    this.container = null;
    this.notifications = [];
    this.maxNotifications = 5;
    this.defaultDuration = 5000;
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

  // Show success notification with improved Arabic text
  showSuccess(title, message, duration = this.defaultDuration) {
    return this.showNotification('success', title, message, duration);
  }

  // Show error notification with improved Arabic text
  showError(title, message, duration = this.defaultDuration) {
    return this.showNotification('error', title, message, duration);
  }

  // Show warning notification with improved Arabic text
  showWarning(title, message, duration = this.defaultDuration) {
    return this.showNotification('warning', title, message, duration);
  }

  // Show info notification with improved Arabic text
  showInfo(title, message, duration = this.defaultDuration) {
    return this.showNotification('info', title, message, duration);
  }

  // Main notification function with enhanced structure
  showNotification(type, title, message, duration) {
    // Limit number of notifications
    if (this.notifications.length >= this.maxNotifications) {
      this.hideNotification(this.notifications[0]);
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    // Enhanced icon mapping with better Arabic context
    const iconMap = {
      success: 'check-circle',
      error: 'x-circle',
      warning: 'alert-triangle',
      info: 'info',
    };

    // Enhanced HTML structure with better Arabic text support
    notification.innerHTML = `
            <div class="notification-icon">
                <i data-lucide="${iconMap[type]}"></i>
            </div>
            <div class="notification-content">
                <h4>${this.sanitizeText(title)}</h4>
                <p>${this.sanitizeText(message)}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()" aria-label="إغلاق الإشعار">
                <i data-lucide="x"></i>
            </button>
            <div class="notification-progress">
                <div class="notification-progress-bar" style="width: 100%"></div>
            </div>
        `;

    // Add to container
    this.container.appendChild(notification);

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Enhanced show animation with better timing
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // Enhanced auto-dismiss functionality
    if (duration > 0) {
      this.startProgressAnimation(notification, duration);
    }

    // Store notification reference
    this.notifications.push(notification);

    // Enhanced cleanup
    notification.addEventListener('transitionend', () => {
      if (notification.classList.contains('hide')) {
        this.removeNotification(notification);
      }
    });

    // Add click outside to dismiss (optional)
    this.addClickOutsideListener(notification);

    return notification;
  }

  // Enhanced progress animation
  startProgressAnimation(notification, duration) {
    const progressBar = notification.querySelector(
      '.notification-progress-bar'
    );
    if (!progressBar) return;

    const startTime = Date.now();
    const animateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.max(0, 100 - (elapsed / duration) * 100);
      progressBar.style.width = progress + '%';

      if (progress > 0 && !notification.classList.contains('hide')) {
        requestAnimationFrame(animateProgress);
      } else if (progress <= 0) {
        this.hideNotification(notification);
      }
    };
    requestAnimationFrame(animateProgress);
  }

  // Enhanced hide notification
  hideNotification(notification) {
    if (!notification || notification.classList.contains('hide')) return;

    notification.classList.add('hide');

    // Remove from DOM after animation
    setTimeout(() => {
      this.removeNotification(notification);
    }, 400); // Match CSS transition duration
  }

  // Enhanced remove notification
  removeNotification(notification) {
    if (notification && notification.parentElement) {
      notification.remove();
      const index = this.notifications.indexOf(notification);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    }
  }

  // Hide all notifications
  hideAll() {
    this.notifications.forEach((notification) => {
      this.hideNotification(notification);
    });
  }

  // Clear all notifications immediately
  clearAll() {
    this.notifications.forEach((notification) => {
      this.removeNotification(notification);
    });
    this.notifications = [];
  }

  // Add click outside listener for better UX
  addClickOutsideListener(notification) {
    const handleClickOutside = (event) => {
      if (
        !notification.contains(event.target) &&
        !notification.classList.contains('hide')
      ) {
        this.hideNotification(notification);
        document.removeEventListener('click', handleClickOutside);
      }
    };

    // Delay the listener to avoid immediate dismissal
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
  }

  // Sanitize text for security and proper Arabic rendering
  sanitizeText(text) {
    if (!text) return '';

    // Basic HTML sanitization
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Get notification count
  getNotificationCount() {
    return this.notifications.length;
  }

  // Check if notifications are visible
  hasVisibleNotifications() {
    return this.notifications.length > 0;
  }
}

// Initialize notification system
const notifications = new NotificationSystem();

// Enhanced global functions with better Arabic text support
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

// Enhanced example usage functions with better Arabic text
function testNotifications() {
  showSuccess('تم بنجاح!', 'تم حفظ البيانات بنجاح في النظام');

  setTimeout(() => {
    showError(
      'خطأ في النظام!',
      'حدث خطأ أثناء حفظ البيانات، يرجى المحاولة مرة أخرى'
    );
  }, 1000);

  setTimeout(() => {
    showWarning(
      'تحذير مهم!',
      'يرجى التحقق من صحة البيانات المدخلة قبل المتابعة'
    );
  }, 2000);

  setTimeout(() => {
    showInfo(
      'معلومات جديدة',
      'تم تحديث النظام بنجاح، يمكنك الآن استخدام الميزات الجديدة'
    );
  }, 3000);
}

// Enhanced form validation notifications
function showFormValidationError(fieldName, message) {
  showError(`خطأ في ${fieldName}`, message);
}

function showFormValidationSuccess(fieldName) {
  showSuccess(`تم التحقق من ${fieldName}`, 'البيانات صحيحة');
}

// Enhanced login/logout notifications
function showLoginSuccess(userName) {
  showSuccess('تم تسجيل الدخول بنجاح', `مرحباً بك ${userName} في منصة فين`);
}

function showLogoutSuccess() {
  showSuccess(
    'تم تسجيل الخروج',
    'تم تسجيل الخروج بنجاح، نتمنى لك يوماً سعيداً'
  );
}

function showLoginError() {
  showError(
    'فشل في تسجيل الدخول',
    'البريد الإلكتروني أو كلمة المرور غير صحيحة'
  );
}

// Enhanced report notifications
function showReportSubmittedSuccess() {
  showSuccess(
    'تم إرسال البلاغ بنجاح',
    'تم إرسال بلاغك إلى النظام وسيتم مراجعته قريباً'
  );
}

function showReportUpdatedSuccess() {
  showSuccess('تم تحديث البلاغ', 'تم تحديث بلاغك بنجاح في النظام');
}

function showReportError() {
  showError(
    'خطأ في إرسال البلاغ',
    'حدث خطأ أثناء إرسال البلاغ، يرجى المحاولة مرة أخرى'
  );
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  // Initialize Lucide icons if not already done
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Add keyboard shortcuts for notifications
  document.addEventListener('keydown', function (e) {
    // Ctrl/Cmd + N to hide all notifications
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      hideAllNotifications();
    }
  });
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NotificationSystem,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showFormValidationError,
    showFormValidationSuccess,
    showLoginSuccess,
    showLogoutSuccess,
    showLoginError,
    showReportSubmittedSuccess,
    showReportUpdatedSuccess,
    showReportError,
  };
}
