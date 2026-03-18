/**
 * Universal Session Manager JavaScript
 * New Lanka Pharmacy Management System
 * 
 * Handles authentication, session checking, and user management across all pages
 */

class UniversalSessionManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.checkInterval = null;
        this.init();
    }
    
    /**
     * Initialize session manager
     */
    async init() {
        try {
            await this.checkSession();
            this.setupPeriodicCheck();
            this.setupLogoutHandlers();
            this.setupPageProtection();
            this.isInitialized = true;
            console.log('Universal Session Manager initialized');
        } catch (error) {
            console.error('Failed to initialize session manager:', error);
        }
    }
    
    /**
     * Check current session status
     */
    async checkSession() {
        try {
            const response = await fetch('php/session-check.php?action=check_session');
            const data = await response.json();
            
            if (data.success && data.logged_in) {
                this.currentUser = data.user;
                return true;
            } else {
                this.currentUser = null;
                return false;
            }
        } catch (error) {
            console.error('Session check failed:', error);
            this.currentUser = null;
            return false;
        }
    }
    
    /**
     * Get detailed user information
     */
    async getUserInfo() {
        try {
            const response = await fetch('php/session-check.php?action=get_user_info');
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = { ...this.currentUser, ...data.user };
                return data.user;
            } else {
                throw new Error(data.error || 'Failed to get user info');
            }
        } catch (error) {
            console.error('Failed to get user info:', error);
            return null;
        }
    }
    
    /**
     * Check if current page is accessible
     */
    async checkPageAccess(page = null) {
        try {
            const currentPage = page || this.getCurrentPageName();
            const response = await fetch(`php/session-check.php?action=check_page_access&page=${encodeURIComponent(currentPage)}`);
            const data = await response.json();
            
            if (data.success) {
                if (!data.has_access) {
                    if (data.redirect_url === 'dashboard') {
                        this.redirectToDashboard();
                    } else {
                        window.location.href = data.redirect_url;
                    }
                    return false;
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Page access check failed:', error);
            return false;
        }
    }
    
    /**
     * Get current page name
     */
    getCurrentPageName() {
        return window.location.pathname.split('/').pop() || 'index.html';
    }
    
    /**
     * Redirect to appropriate dashboard based on user role
     */
    redirectToDashboard() {
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        switch (this.currentUser.role) {
            case 'admin':
                window.location.href = 'admin-dashboard.html';
                break;
            case 'pharmacist':
                window.location.href = 'pharmacist-cashier.html';
                break;
            default:
                window.location.href = 'index.html';
        }
    }
    
    /**
     * Setup periodic session checking
     */
    setupPeriodicCheck() {
        // Check session every 5 minutes
        this.checkInterval = setInterval(async () => {
            const isLoggedIn = await this.checkSession();
            if (!isLoggedIn && this.getCurrentPageName() !== 'index.html') {
                this.handleSessionExpired();
            }
        }, 5 * 60 * 1000);
    }
    
    /**
     * Handle session expiration
     */
    handleSessionExpired() {
        clearInterval(this.checkInterval);
        this.showNotification('Your session has expired. Please login again.', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    }
    
    /**
     * Setup logout handlers
     */
    setupLogoutHandlers() {
        // Handle logout buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('#logoutBtn, .logout-btn')) {
                e.preventDefault();
                this.logout();
            }
        });
        
        // Handle browser close/refresh (optional session cleanup)
        window.addEventListener('beforeunload', () => {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
            }
        });
    }
    
    /**
     * Setup page protection
     */
    setupPageProtection() {
        // Prevent access to wrong role pages
        const currentPage = this.getCurrentPageName();
        
        if (currentPage !== 'index.html') {
            // Check page access when page loads
            this.checkPageAccess();
        }
        
        // Redirect logged-in users away from login page
        if (currentPage === 'index.html' && this.currentUser) {
            this.redirectToDashboard();
        }
    }
    
    /**
     * Logout user
     */
    async logout() {
        if (confirm('Are you sure you want to logout?')) {
            try {
                // Clear interval
                if (this.checkInterval) {
                    clearInterval(this.checkInterval);
                }
                
                // Call logout endpoint
                await fetch('php/logout.php', { method: 'POST' });
                
                // Clear local data
                this.currentUser = null;
                
                // Redirect to login
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Logout failed:', error);
                // Force redirect anyway
                window.location.href = 'index.html';
            }
        }
    }
    
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }
    
    /**
     * Check if current user is admin
     */
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }
    
    /**
     * Check if current user is pharmacist
     */
    isPharmacist() {
        return this.currentUser && this.currentUser.role === 'pharmacist';
    }
    
    /**
     * Update user profile information
     */
    async refreshCurrentUser() {
        return await this.getUserInfo();
    }
    
    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `session-notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        
        // Set background color based on type
        switch(type) {
            case 'success':
                notification.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                notification.style.backgroundColor = '#f44336';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ff9800';
                break;
            default:
                notification.style.backgroundColor = '#2196F3';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    /**
     * Update page elements with user information
     */
    updatePageElements() {
        if (!this.currentUser) return;
        
        // Update user name elements
        const nameElements = document.querySelectorAll('.current-user-name, #sidebarAdminName, #sidebarPharmacistName');
        nameElements.forEach(element => {
            element.textContent = this.currentUser.user_name || this.currentUser.username;
        });
        
        // Update profile images
        const profileImages = document.querySelectorAll('.admin-avatar, .pharmacist-avatar');
        profileImages.forEach(img => {
            if (this.currentUser.profile_img) {
                const timestamp = new Date().getTime();
                img.src = this.currentUser.profile_img + '?t=' + timestamp;
            }
        });
        
        // Update role-specific elements
        const roleElements = document.querySelectorAll('.user-role');
        roleElements.forEach(element => {
            element.textContent = this.currentUser.role.charAt(0).toUpperCase() + this.currentUser.role.slice(1);
        });
    }
}

// Initialize global session manager
let sessionManager = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    sessionManager = new UniversalSessionManager();
    
    // Wait for initialization and then update page elements
    setTimeout(() => {
        if (sessionManager.isLoggedIn()) {
            sessionManager.updatePageElements();
        }
    }, 500);
});

// Make session manager globally available
window.sessionManager = sessionManager;
