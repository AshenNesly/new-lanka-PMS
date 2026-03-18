// Pharmacist dropdown functionality
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

// Backend API Configuration
const API_BASE_URL = 'php/admin-med-shortage.php';

// Global variables
let currentPage = 1;
let totalPages = 1;
let searchTerm = '';
let isLoading = false;
let shortageData = [];

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
    
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');
    
    if (timeElement) timeElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
}

// Update time every second
setInterval(updateTime, 1000);
updateTime(); // Initial call

// Greeting based on time
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

updateGreeting();

// API Functions
async function fetchShortageMedicines(page = 1, search = '') {
    try {
        isLoading = true;
        showLoadingState();
        
        const requestData = {
            action: 'get_shortage_medicines',
            page: page,
            limit: 20,
            search: search
        };
        
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            shortageData = data.data.medicines;
            currentPage = data.data.current_page;
            totalPages = data.data.total_pages;
            searchTerm = search;
            
            displayShortageMedicines(shortageData);
            updatePagination();
            updateShortageCount(data.data.total_shortage);
        } else {
            showError(data.message || 'Failed to load shortage medicines');
        }
        
    } catch (error) {
        console.error('Error fetching shortage medicines:', error);
        showError('An error occurred while loading shortage medicines');
    } finally {
        isLoading = false;
        hideLoadingState();
    }
}

// Display shortage medicines in table
function displayShortageMedicines(medicines) {
    const tbody = document.getElementById('medicineTableBody');
    
    if (!medicines || medicines.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="padding: 40px;">
                    <div style="color: #6c757d;">
                        <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                        <h5 style="margin-bottom: 8px;">No shortage medicines found</h5>
                        <p style="margin: 0; font-size: 14px;">
                            ${searchTerm ? 'No medicines match your search criteria.' : 'All medicines are in stock.'}
                        </p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = medicines.map(medicine => {
        const price = parseFloat(medicine.medicine_price || 0);
        const formattedPrice = `Rs. ${price.toFixed(2)}`;
        
        // Determine status badge class and text
        let statusClass = 'good';
        let statusText = 'In Stock';
        
        if (medicine.stock_left <= 0) {
            statusClass = 'danger';
            statusText = 'Out of Stock';
        } else if (medicine.stock_left <= medicine.low_stock_threshold || medicine.stock_left <= 10) {
            statusClass = 'warning';
            statusText = 'Low Stock';
        }
        
        return `
            <tr>
                <td>${medicine.medicine_id}</td>
                <td>
                    <a href="pharmacist-inside-med.html?id=${medicine.medicine_id}&name=${encodeURIComponent(medicine.medicine_name)}&category=${encodeURIComponent(medicine.category || '')}&stock=${medicine.stock_left}&price=${encodeURIComponent(formattedPrice)}&brand=${encodeURIComponent(medicine.medicine_brand || '')}&status=${medicine.stock_left <= 0 ? 'out-of-stock' : 'low-stock'}" 
                       class="medicine-link">${medicine.medicine_name}</a>
                </td>
                <td>${medicine.category || 'N/A'}</td>
                <td>${medicine.stock_left}</td>
                <td>${formattedPrice}</td>
                <td>${medicine.medicine_brand || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
}

// Show loading state
function showLoadingState() {
    const tbody = document.getElementById('medicineTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center" style="padding: 40px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <div style="width: 20px; height: 20px; border: 2px solid #ddd; border-top: 2px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    Loading shortage medicines...
                </div>
            </td>
        </tr>
    `;
}

// Hide loading state
function hideLoadingState() {
    // Loading will be replaced by actual content
}

// Show error message
function showError(message) {
    const tbody = document.getElementById('medicineTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center" style="padding: 40px;">
                <div style="color: #dc3545;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px; opacity: 0.7;"></i>
                    <h5 style="margin-bottom: 8px;">Error Loading Data</h5>
                    <p style="margin-bottom: 16px;">${message}</p>
                    <button onclick="loadInitialData()" class="btn btn-primary" style="padding: 8px 16px;">
                        Try Again
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Update shortage count
function updateShortageCount(count) {
    const countElement = document.getElementById('shortageCount');
    if (countElement) {
        countElement.textContent = count || 0;
    }
}

// Update pagination
function updatePagination() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    if (prevBtn && nextBtn && pageInfo) {
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

// Change page
function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages && !isLoading) {
        fetchShortageMedicines(newPage, searchTerm);
    }
}

// Search medicines
function searchMedicines() {
    const searchInput = document.getElementById('searchMedicine');
    if (searchInput) {
        const newSearchTerm = searchInput.value.trim();
        if (newSearchTerm !== searchTerm) {
            fetchShortageMedicines(1, newSearchTerm);
        }
    }
}

// Clear search
function clearSearch() {
    const searchInput = document.getElementById('searchMedicine');
    if (searchInput) {
        searchInput.value = '';
        if (searchTerm !== '') {
            fetchShortageMedicines(1, '');
        }
    }
}

// Load initial data
function loadInitialData() {
    fetchShortageMedicines(1, '');
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .medicine-link {
        color: #007bff;
        text-decoration: none;
        font-weight: 500;
    }
    
    .medicine-link:hover {
        color: #0056b3;
        text-decoration: underline;
    }
    
    .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
    }
    
    .status-badge.good {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }
    
    .status-badge.warning {
        background-color: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
    }
    
    .status-badge.danger {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }
    
    .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: all 0.2s ease;
    }
    
    .btn-primary {
        background-color: #007bff;
        color: white;
    }
    
    .btn-primary:hover {
        background-color: #0056b3;
    }
    
    .btn-secondary {
        background-color: #6c757d;
        color: white;
    }
    
    .btn-secondary:hover {
        background-color: #545b62;
    }
    
    .pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .search-container {
        display: flex;
        gap: 8px;
        align-items: center;
    }
    
    .search-input {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        min-width: 250px;
    }
    
    .search-input:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }
`;
document.head.appendChild(style);

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
    
    // Add search input event listener for real-time search
    const searchInput = document.getElementById('searchMedicine');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchMedicines();
            }, 500); // Debounce search for 500ms
        });
    }
});
