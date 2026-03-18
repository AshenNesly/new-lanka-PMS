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
        // Redirect to logout handler
        window.location.href = 'php/logout.php';
    }
});

// Load dashboard data from backend
async function loadDashboardData() {
    try {
        const response = await fetch('php/admin-dashboard.php');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            updateDashboardUI(data);
        } else {
            console.error('Dashboard data error:', data.error);
            if (data.redirect_to_login) {
                window.location.href = 'login.html';
            }
        }
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

// Update dashboard UI with backend data
function updateDashboardUI(data) {
    // Update admin profile info
    const adminName = document.getElementById('adminUsername');
    const adminRole = document.getElementById('adminRole');
    const adminProfileImage = document.getElementById('adminProfileImage');
    
    if (adminName) adminName.textContent = data.user.username;
    if (adminRole) adminRole.textContent = data.user.role;
    if (adminProfileImage) {
        adminProfileImage.src = data.user.profile_image;
        adminProfileImage.alt = data.user.username;
        
        // Handle image load error - fallback to default
        adminProfileImage.onerror = function() {
            this.src = 'img/default-profile.jpg';
            this.onerror = null; // Prevent infinite loop
        };
    }
    
    // Update Inventory Status Card
    const inventoryCard = document.getElementById('inventoryCard');
    const inventoryStatus = document.getElementById('inventoryStatus');
    if (inventoryCard && inventoryStatus) {
        inventoryCard.className = `stat-card ${data.stats.inventory_class}`;
        inventoryStatus.textContent = data.stats.inventory_status;
    }
    
    // Update Sales Card
    const salesCard = document.getElementById('salesCard');
    const salesAmount = document.getElementById('salesAmount');
    const salesPeriod = document.getElementById('salesPeriod');
    if (salesCard && salesAmount && salesPeriod) {
        salesCard.className = `stat-card ${data.stats.sales_class}`;
        salesAmount.textContent = data.stats.formatted_sales;
        salesPeriod.textContent = `Sales: ${data.stats.sales_period} ▼`;
    }
    
    // Update Medicines Available Card
    const totalMedicines = document.getElementById('totalMedicines');
    if (totalMedicines) {
        totalMedicines.textContent = data.stats.total_medicines;
    }
    
    // Update Medicine Shortage Card
    const shortageCard = document.getElementById('shortageCard');
    const shortageCount = document.getElementById('shortageCount');
    const shortageAction = document.getElementById('shortageAction');
    if (shortageCard && shortageCount && shortageAction) {
        shortageCount.textContent = String(data.stats.medicine_shortage).padStart(2, '0');
        
        // Update card class and action text based on shortage count
        if (data.stats.medicine_shortage > 0) {
            shortageCard.className = 'stat-card danger';
            shortageAction.innerHTML = 'Resolve Now<span class="icon-arrow"></span>';
        } else {
            shortageCard.className = 'stat-card good';
            shortageAction.innerHTML = 'View Status<span class="icon-arrow"></span>';
        }
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

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Add hover effects to cards
document.querySelectorAll('.stat-card, .info-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});

// Simulate loading effect
window.addEventListener('load', function() {
    // Load dashboard data first
    loadDashboardData();
    
    // Then animate cards
    document.querySelectorAll('.stat-card, .info-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
});

// Refresh dashboard data every 5 minutes
setInterval(loadDashboardData, 5 * 60 * 1000);
