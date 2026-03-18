// Admin Reports JavaScript
// New Lanka Pharmacy Management System

// Configuration
const API_BASE_URL = 'php/admin-reports.php';

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

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}?action=get_dashboard_stats`);
        const data = await response.json();
        
        if (data.success) {
            updateDashboardStats(data.data);
        } else {
            console.error('Failed to load dashboard stats:', data.error);
            // Show default values on error
            showDefaultStats();
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showDefaultStats();
    }
}

// Update dashboard statistics in the UI
function updateDashboardStats(stats) {
    // Update Total Sales Report card
    const totalSalesValue = document.getElementById('totalSalesValue');
    if (totalSalesValue) {
        totalSalesValue.textContent = stats.total_sales.formatted_amount;
    }
    
    // Update Inventory Report card  
    const inventoryValue = document.getElementById('inventoryValue');
    if (inventoryValue) {
        inventoryValue.textContent = stats.inventory.total_medicines.toLocaleString();
    }
    
    // Store stats globally for use in detail pages
    window.reportStats = stats;
}

// Show default stats if API fails
function showDefaultStats() {
    const totalSalesValue = document.getElementById('totalSalesValue');
    if (totalSalesValue) {
        totalSalesValue.textContent = 'Rs. 0.00';
    }
    
    const inventoryValue = document.getElementById('inventoryValue');
    if (inventoryValue) {
        inventoryValue.textContent = '0';
    }
} 

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

// Load dashboard stats when page loads
loadDashboardStats();

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

// Add hover effects to cards (using existing functionality)
document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// Simulate loading effect (using existing functionality)
window.addEventListener('load', function() {
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
