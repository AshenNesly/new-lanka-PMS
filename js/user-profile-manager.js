/**
 * User Profile Utility
 * New Lanka Pharmacy Management System
 * 
 * Shared utility for displaying logged-in user profile information across all pages
 * Now integrates with Universal Session Manager
 */

class UserProfileManager {
    constructor() {
        this.API_BASE_URL = 'php/user-profile-simple.php';
        this.currentUser = null;
        this.sessionManager = null;
        this.init();
    }
    
    /**
     * Initialize profile manager
     */
    async init() {
        // Wait for session manager to be available
        await this.waitForSessionManager();
        this.loadCurrentUser();
    }
    
    /**
     * Wait for session manager to be initialized
     */
    async waitForSessionManager() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (!window.sessionManager && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.sessionManager) {
            this.sessionManager = window.sessionManager;
        }
    }

    /**
     * Load current user information from session
     */
    async loadCurrentUser() {
        // Use session manager if available
        if (this.sessionManager && this.sessionManager.isLoggedIn()) {
            try {
                const user = await this.sessionManager.getUserInfo();
                if (user) {
                    this.currentUser = user;
                    this.updatePageElements();
                    return;
                }
            } catch (error) {
                console.log('Session manager failed, trying fallback APIs...');
            }
        }
        
        // Fallback to direct API calls
        const apiEndpoints = [
            `${this.API_BASE_URL}?action=get_current_user`,
            'php/admin-configurations-simple.php?action=get_admin_profile',
            'php/pharmacist-configurations.php?action=get_pharmacist_profile'
        ];

        for (let i = 0; i < apiEndpoints.length; i++) {
            try {
                const response = await fetch(apiEndpoints[i]);
                
                // Check if response is ok
                if (!response.ok) {
                    if (i === apiEndpoints.length - 1) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    continue; // Try next endpoint
                }
                
                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    if (i === apiEndpoints.length - 1) {
                        const text = await response.text();
                        console.error('Non-JSON response received:', text.substring(0, 200));
                        throw new Error('Server returned non-JSON response');
                    }
                    continue; // Try next endpoint
                }
                
                const data = await response.json();
                
                if (data.success) {
                    this.currentUser = data.data;
                    this.updateAllProfileDisplays();
                    
                    // Only log if using fallback endpoint
                    if (i > 0) {
                        console.log('Loaded user profile from fallback API');
                    }
                    return; // Success, exit function
                } else {
                    if (i === apiEndpoints.length - 1) {
                        console.warn('Failed to load user profile:', data.error);
                    }
                    continue; // Try next endpoint
                }
            } catch (error) {
                if (i === apiEndpoints.length - 1) {
                    console.error('Error loading current user:', error);
                }
                // Continue to next endpoint or exit if this was the last one
            }
        }
        
        console.warn('All user profile loading attempts failed');
    }

    /**
     * Update all profile displays on the current page
     */
    updateAllProfileDisplays() {
        if (!this.currentUser) return;

        // Update sidebar profile
        this.updateSidebarProfile();
        
        // Update header greeting (if exists)
        this.updateHeaderGreeting();
        
        // Update page-specific profile elements
        this.updatePageSpecificElements();
    }

    /**
     * Update sidebar profile information
     */
    updateSidebarProfile() {
        // Update admin/pharmacist name in sidebar
        const sidebarAdminName = document.getElementById('sidebarAdminName');
        const sidebarPharmacistName = document.getElementById('sidebarPharmacistName');
        
        if (sidebarAdminName && this.currentUser.role === 'admin') {
            sidebarAdminName.textContent = this.currentUser.user_name;
        }
        
        if (sidebarPharmacistName && this.currentUser.role === 'pharmacist') {
            sidebarPharmacistName.textContent = this.currentUser.user_name;
        }

        // Update profile avatar in sidebar
        const sidebarAvatar = document.querySelector('.admin-avatar, .pharmacist-avatar');
        if (sidebarAvatar) {
            // Add timestamp to force cache refresh
            const imageUrl = this.currentUser.profile_img || 'img/default-profile.png';
            const cacheBuster = imageUrl.includes('?') ? '&' : '?';
            sidebarAvatar.src = imageUrl + cacheBuster + 't=' + Date.now();
            sidebarAvatar.onerror = function() {
                this.src = 'img/default-profile.png';
            };
        }

        // Update role display if needed
        const roleDisplays = document.querySelectorAll('.user-role, .admin-role, .pharmacist-role');
        roleDisplays.forEach(element => {
            element.textContent = this.currentUser.role === 'admin' ? 'Admin' : 'Pharmacist';
        });
    }

    /**
     * Update header greeting with user name
     */
    updateHeaderGreeting() {
        const greetingText = document.querySelector('.greeting-text');
        if (greetingText) {
            const hour = new Date().getHours();
            let greeting;
            
            if (hour < 12) {
                greeting = 'Good Morning';
            } else if (hour < 17) {
                greeting = 'Good Afternoon';
            } else {
                greeting = 'Good Evening';
            }
            
            greetingText.textContent = `${greeting}, ${this.currentUser.user_name}`;
        }
    }

    /**
     * Update page-specific profile elements
     */
    updatePageSpecificElements() {
        // Configuration page elements
        const displayAdminName = document.getElementById('displayAdminName');
        if (displayAdminName) {
            displayAdminName.textContent = this.currentUser.user_name;
        }

        const adminProfilePreview = document.getElementById('adminProfilePreview');
        if (adminProfilePreview) {
            const imageUrl = this.currentUser.profile_img || 'img/default-profile.png';
            const cacheBuster = imageUrl.includes('?') ? '&' : '?';
            adminProfilePreview.src = imageUrl + cacheBuster + 't=' + Date.now();
            adminProfilePreview.onerror = function() {
                this.src = 'img/default-profile.png';
            };
        }

        // Dashboard profile elements
        const dashboardProfileImg = document.getElementById('dashboardProfileImg');
        if (dashboardProfileImg) {
            const imageUrl = this.currentUser.profile_img || 'img/default-profile.png';
            const cacheBuster = imageUrl.includes('?') ? '&' : '?';
            dashboardProfileImg.src = imageUrl + cacheBuster + 't=' + Date.now();
            dashboardProfileImg.onerror = function() {
                this.src = 'img/default-profile.png';
            };
        }

        // Any other profile displays
        const profileImages = document.querySelectorAll('.user-profile-img, .current-user-img');
        profileImages.forEach(img => {
            const imageUrl = this.currentUser.profile_img || 'img/default-profile.png';
            const cacheBuster = imageUrl.includes('?') ? '&' : '?';
            img.src = imageUrl + cacheBuster + 't=' + Date.now();
            img.onerror = function() {
                this.src = 'img/default-profile.png';
            };
        });

        const userNameDisplays = document.querySelectorAll('.current-user-name');
        userNameDisplays.forEach(element => {
            element.textContent = this.currentUser.user_name;
        });
    }

    /**
     * Get current user data
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is admin
     */
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    /**
     * Check if user is pharmacist
     */
    isPharmacist() {
        return this.currentUser && this.currentUser.role === 'pharmacist';
    }

    /**
     * Update date and time display
     */
    updateDateTime() {
        const currentDate = document.getElementById('currentDate');
        const currentTime = document.getElementById('currentTime');
        
        const now = new Date();
        
        if (currentDate) {
            // Use more compatible date formatting
            const day = now.getDate().toString().padStart(2, '0');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[now.getMonth()];
            const year = now.getFullYear();
            currentDate.textContent = `${day} ${month} ${year}`;
        }
        
        if (currentTime) {
            // Use more compatible time formatting
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            currentTime.textContent = `${hours}:${minutes}:${seconds}`;
        }
    }

    /**
     * Handle logout
     */
    async logout() {
        try {
            const response = await fetch(`${this.API_BASE_URL}?action=logout`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Redirect to login page
                window.location.href = 'index.html';
            } else {
                alert('Logout failed: ' + data.error);
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Force redirect even if API call fails
            window.location.href = 'index.html';
        }
    }

    /**
     * Initialize profile manager on page load
     */
    init() {
        // Update date/time every second
        setInterval(() => this.updateDateTime(), 1000);
        this.updateDateTime();

        // Setup logout handlers
        const logoutBtns = document.querySelectorAll('#logoutBtn, .logout-btn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    this.logout();
                }
            });
        });

        // Setup admin menu dropdown
        const adminMenuBtn = document.getElementById('adminMenuBtn');
        const adminDropdown = document.getElementById('adminDropdown');
        
        if (adminMenuBtn && adminDropdown) {
            adminMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                adminDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                adminDropdown.classList.remove('show');
            });
        }

        // Load current user
        this.loadCurrentUser();
    }
}

// Global instance
window.userProfileManager = new UserProfileManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.userProfileManager.init();
});