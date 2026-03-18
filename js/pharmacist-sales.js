/**
 * Pharmacist Sales JavaScript
 * New Lanka Pharmacy Management System
 * 
 * Handles sales history display with backend integration
 */

// Global variables
let currentPage = 1;
const itemsPerPage = 15;
let currentSearchTerm = '';
let currentFilters = {};
let allSalesData = []; // Store all sales data for client-side filtering

// DOM elements
let salesTableBody;
let searchInput;
let userFilter;
let startDateInput;
let endDateInput;
let filterBtn;
let clearBtn;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    initializeEventListeners();
    loadSalesData();
    updateTime();
    updateGreeting();
});

/**
 * Initialize DOM elements
 */
function initializeElements() {
    salesTableBody = document.querySelector('#salesTableBody');
    searchInput = document.getElementById('searchSales');
    userFilter = document.getElementById('userFilter');
    startDateInput = document.getElementById('startDate');
    endDateInput = document.getElementById('endDate');
    filterBtn = document.getElementById('filterBtn');
    clearBtn = document.getElementById('clearBtn');
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            currentSearchTerm = this.value.trim();
            performClientSideFiltering();
        });
    }
    
    // Filter button
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            performClientSideFiltering();
        });
    }
    
    // Clear filters button
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            clearAllFilters();
        });
    }

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
}

/**
 * Load sales data from backend
 */
async function loadSalesData() {
    try {
        showLoading();
        
        const response = await fetch('php/admin-sales.php?action=get_sales&limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            allSalesData = data.sales || [];
            displaySalesInTable(allSalesData);
            updatePaginationInfo(allSalesData.length);
        } else {
            showError(data.error || 'Failed to load sales data');
        }
    } catch (error) {
        console.error('Error loading sales:', error);
        showError('Failed to load sales data. Please try again.');
    }
}

/**
 * Display sales data in table
 */
function displaySalesInTable(salesData) {
    if (!salesTableBody) {
        console.error('Sales table body not found');
        return;
    }
    
    salesTableBody.innerHTML = '';
    
    if (!salesData || salesData.length === 0) {
        salesTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: #666;">
                    No sales found
                </td>
            </tr>
        `;
        return;
    }
    
    salesData.forEach(sale => {
        const row = document.createElement('tr');
        // Pass both real sale ID and formatted sale ID in the URL
        const linkUrl = `pharmacist-inside-sale.html?sale_id=${sale.sale_id}&formatted_id=${sale.formatted_sale_id}&date=${sale.sale_date}&time=${sale.sale_time}&customerName=${encodeURIComponent(sale.customer_name)}&customerId=${sale.customer_id || ''}&totalMedicines=${sale.total_medicines}&amount=${encodeURIComponent(sale.formatted_amount)}&userName=${encodeURIComponent(sale.user_name)}`;
        row.innerHTML = `
            <td><a href="${linkUrl}" class="medicine-link">${sale.formatted_sale_id}</a></td>
            <td>${sale.sale_date}</td>
            <td>${sale.sale_time}</td>
            <td>${sale.customer_name}</td>
            <td>${sale.total_medicines}</td>
            <td>${sale.formatted_amount}</td>
            <td>${sale.user_name}</td>
        `;
        salesTableBody.appendChild(row);
    });
}

/**
 * Perform client-side filtering
 */
function performClientSideFiltering() {
    if (!allSalesData || allSalesData.length === 0) {
        return;
    }
    
    let filteredData = [...allSalesData];
    
    // Search filter
    if (currentSearchTerm) {
        const searchLower = currentSearchTerm.toLowerCase();
        filteredData = filteredData.filter(sale => {
            return sale.formatted_sale_id.toLowerCase().includes(searchLower) ||
                   sale.customer_name.toLowerCase().includes(searchLower) ||
                   sale.formatted_amount.toLowerCase().includes(searchLower) ||
                   sale.user_name.toLowerCase().includes(searchLower);
        });
    }
    
    // User filter
    const userFilterValue = userFilter ? userFilter.value : '';
    if (userFilterValue) {
        filteredData = filteredData.filter(sale => sale.user_name === userFilterValue);
    }
    
    // Date range filter
    const startDate = startDateInput ? startDateInput.value : '';
    const endDate = endDateInput ? endDateInput.value : '';
    
    if (startDate) {
        filteredData = filteredData.filter(sale => sale.sale_date >= startDate);
    }
    
    if (endDate) {
        filteredData = filteredData.filter(sale => sale.sale_date <= endDate);
    }
    
    displaySalesInTable(filteredData);
    updatePaginationInfo(filteredData.length);
}

/**
 * Clear all filters
 */
function clearAllFilters() {
    if (searchInput) searchInput.value = '';
    if (userFilter) userFilter.value = '';
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    
    currentSearchTerm = '';
    currentFilters = {};
    
    displaySalesInTable(allSalesData);
    updatePaginationInfo(allSalesData.length);
}

/**
 * Show loading indicator
 */
function showLoading() {
    if (salesTableBody) {
        salesTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px;">
                    <div class="loading-spinner">Loading sales data...</div>
                </td>
            </tr>
        `;
    }
}

/**
 * Show error message
 */
function showError(message) {
    if (salesTableBody) {
        salesTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: #dc3545;">
                    Error: ${message}
                </td>
            </tr>
        `;
    }
}

/**
 * Update pagination info
 */
function updatePaginationInfo(totalItems) {
    const paginationInfo = document.querySelector('.pagination-info');
    if (paginationInfo) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages} (${totalItems} total sales)`;
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
    
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');
    
    if (timeElement) timeElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
}

// Update time every second
setInterval(updateTime, 1000);

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
