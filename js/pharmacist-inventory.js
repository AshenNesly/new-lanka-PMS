/**
 * Pharmacist Inventory JavaScript
 * New Lanka Pharmacy Management System
 * 
 * Handles inventory dashboard display with backend integration
 */

// Global variables for inventory data
let inventoryStats = {};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadInventoryStats();
    updateTime();
    updateGreeting();
});

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Admin dropdown functionality
    const adminMenuBtn = document.getElementById('adminMenuBtn');
    const adminDropdown = document.getElementById('adminDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    if (adminMenuBtn && adminDropdown) {
        adminMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            adminDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!adminDropdown.contains(e.target) && !adminMenuBtn.contains(e.target)) {
                adminDropdown.classList.remove('show');
            }
        });
    }

    // Logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                window.location.href = 'index.html';
            }
        });
    }

    // Add hover effects to cards
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

/**
 * Load inventory statistics from backend
 */
async function loadInventoryStats() {
    try {
        showLoadingStats();
        
        const response = await fetch('php/admin-inventory.php?action=get_inventory_stats');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            inventoryStats = data.data.stats;
            updateStatsDisplay();
        } else {
            showStatsError(data.error || 'Failed to load inventory statistics');
        }
    } catch (error) {
        console.error('Error loading inventory stats:', error);
        showStatsError('Failed to load inventory statistics. Please try again.');
    }
}

/**
 * Update statistics display with real data
 */
function updateStatsDisplay() {
    // Update medicines count
    const medicinesCard = document.querySelector('.stat-card.info .stat-value');
    if (medicinesCard) {
        medicinesCard.textContent = inventoryStats.total_medicines || '0';
    }
    
    // Update medicine groups count
    const groupsCard = document.querySelector('.stat-card.good .stat-value');
    if (groupsCard) {
        groupsCard.textContent = inventoryStats.total_groups || '0';
    }
    
    // Update shortage count
    const shortageCard = document.querySelector('.stat-card.danger .stat-value');
    if (shortageCard) {
        shortageCard.textContent = inventoryStats.low_stock_count || '0';
    }
    
    // Animate cards after updating
    animateStatsCards();
}

/**
 * Show loading state for statistics
 */
function showLoadingStats() {
    document.querySelectorAll('.stat-card .stat-value').forEach(card => {
        card.textContent = '...';
    });
}

/**
 * Show error state for statistics
 */
function showStatsError(message) {
    console.error('Stats error:', message);
    document.querySelectorAll('.stat-card .stat-value').forEach(card => {
        card.textContent = '-';
    });
}

/**
 * Animate statistics cards
 */
function animateStatsCards() {
    document.querySelectorAll('.stat-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

/**
 * Update time display
 */
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    const dateString = now.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
    
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');
    
    if (timeElement) timeElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
}

// Update time every second
setInterval(updateTime, 1000);

/**
 * Update greeting based on time
 */
function updateGreeting() {
    const hour = new Date().getHours();
    const greetingElement = document.querySelector('.greeting-text');
    
    if (greetingElement) {
        if (hour < 12) {
            greetingElement.textContent = 'Good Morning';
        } else if (hour < 17) {
            greetingElement.textContent = 'Good Afternoon';
        } else {
            greetingElement.textContent = 'Good Evening';
        }
    }
}
