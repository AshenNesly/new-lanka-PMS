// Admin dropdown functionality
const adminMenuBtn = document.getElementById('adminMenuBtn');
const adminDropdown = document.getElementById('adminDropdown');
const logoutBtn = document.getElementById('logoutBtn');

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

// Logout functionality
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'login.html'; 
    }
});

// Update time
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
    
    document.getElementById('currentTime').textContent = timeString;
    document.getElementById('currentDate').textContent = dateString;
}

// Update time every second
setInterval(updateTime, 1000);
updateTime(); // Initial call

// Greeting based on time
function updateGreeting() {
    const hour = new Date().getHours();
    const greetingElement = document.querySelector('.greeting-text');
    
    if (hour < 12) {
        greetingElement.textContent = 'Good Morning';
    } else if (hour < 17) {
        greetingElement.textContent = 'Good Afternoon';
    } else {
        greetingElement.textContent = 'Good Evening';
    }
}

updateGreeting();

// Backend API Configuration
const API_BASE_URL = 'php/admin-inventory.php';

/**
 * Load inventory statistics from backend
 */
async function loadInventoryStats() {
    try {
        const response = await fetch(`${API_BASE_URL}?action=get_inventory_stats`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            updateInventoryStatsDisplay(data.data.stats);
        } else {
            console.error('Failed to load inventory stats:', data.error);
            showError('Failed to load inventory statistics');
        }
    } catch (error) {
        console.error('Error loading inventory stats:', error);
        showError('Failed to connect to server');
    }
}

/**
 * Update inventory statistics display
 */
function updateInventoryStatsDisplay(stats) {
    // Update medicines available count
    const medicinesValueElement = document.querySelector('.stat-card.info .stat-value');
    if (medicinesValueElement) {
        medicinesValueElement.textContent = stats.total_medicines || '0';
    }
    
    // Update medicine groups count
    const groupsValueElement = document.querySelector('.stat-card.good .stat-value');
    if (groupsValueElement) {
        groupsValueElement.textContent = stats.total_groups || '0';
    }
    
    // Update medicine shortage count
    const shortageValueElement = document.querySelector('.stat-card.danger .stat-value');
    if (shortageValueElement) {
        shortageValueElement.textContent = stats.low_stock_count || '0';
    }
}

/**
 * Show error message to user
 */
function showError(message) {
    // Create a simple error display
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
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

// Initialize page
window.addEventListener('load', function() {
    // Load inventory statistics from backend
    loadInventoryStats();
    
    // Animate cards loading
    document.querySelectorAll('.stat-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
});
