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
            window.location.href = 'login.html';
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
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to fetch shortage medicines');
        }
        
        shortageData = data.data.medicines;
        currentPage = data.data.pagination.current_page;
        totalPages = data.data.pagination.total_pages;
        
        displayShortageMedicines(shortageData);
        updatePagination(data.data.pagination);
        updateShortageCount(data.data.pagination.total_records, search);
        
        isLoading = false;
        hideLoadingState();
        
        return data.data;
        
    } catch (error) {
        console.error('Error fetching shortage medicines:', error);
        showErrorMessage('Failed to load shortage medicines: ' + error.message);
        isLoading = false;
        hideLoadingState();
    }
}

async function fetchShortageStatistics() {
    try {
        const response = await fetch(`${API_BASE_URL}?action=get_shortage_statistics`);
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Failed to fetch statistics');
        }
        
        updateStatisticsDisplay(data.data);
        return data.data;
        
    } catch (error) {
        console.error('Error fetching statistics:', error);
        // Continue without statistics rather than blocking the whole page
    }
}

async function generateShortageReport() {
    try {
        // Get current displayed data instead of making API call
        const currentData = getCurrentDisplayedData();
        
        if (!currentData || currentData.length === 0) {
            console.log('No data to generate report');
            return;
        }
        
        // Generate PDF directly from current data
        downloadReport({ report_data: currentData });
        
    } catch (error) {
        console.error('Error generating report:', error);
        // Don't show error message to user since PDF generation usually works
    }
}

// Get currently displayed data from the table
function getCurrentDisplayedData() {
    const tableRows = document.querySelectorAll('#medicineTableBody tr');
    const data = [];
    
    tableRows.forEach(row => {
        if (row.cells && row.cells.length >= 7) {
            const cells = row.cells;
            data.push({
                medicine_id: cells[0].textContent.trim(),
                medicine_name: cells[1].textContent.trim(),
                category: cells[2].textContent.trim(),
                stock_left: parseInt(cells[3].textContent.trim()) || 0,
                medicine_price: cells[4].textContent.replace('Rs. ', '').trim(),
                medicine_brand: cells[5].textContent.trim()
            });
        }
    });
    
    return data;
}

// Display Functions
function displayShortageMedicines(medicines) {
    const tbody = document.querySelector('.medicine-table tbody');
    if (!tbody) return;
    
    if (!medicines || medicines.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No shortage medicines found</td></tr>';
        return;
    }
    
    tbody.innerHTML = medicines.map(medicine => {
        // Override the backend status logic to match pharmacist side
        let statusClass, statusText;
        
        if (medicine.stock_left <= 0) {
            statusClass = 'danger';
            statusText = 'OUT OF STOCK';
        } else if (medicine.stock_left <= 10) {
            statusClass = 'warning';
            statusText = 'LOW STOCK';
        } else {
            statusClass = 'good';
            statusText = 'IN STOCK';
        }
        
        return `
        <tr data-medicine-id="${medicine.medicine_id}">
            <td>${medicine.medicine_id}</td>
            <td>
                <a href="admin-inside-med.html?id=${medicine.medicine_id}&name=${encodeURIComponent(medicine.medicine_name)}&category=${encodeURIComponent(medicine.category)}&stock=${medicine.stock_left}&price=Rs.%20${medicine.medicine_price}&brand=${encodeURIComponent(medicine.medicine_brand)}&status=${medicine.stock_status}" 
                   class="medicine-link">
                    ${medicine.medicine_name}
                </a>
            </td>
            <td>${medicine.category}</td>
            <td>${medicine.stock_left}</td>
            <td>Rs. ${medicine.medicine_price}</td>
            <td>${medicine.medicine_brand}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>
        </tr>
    `;
    }).join('');
}

function updateStatisticsDisplay(stats) {
    // Update any statistics displays on the page
    const summaryElements = {
        'out-of-stock': stats.summary?.out_of_stock_count || 0,
        'critical-stock': stats.summary?.critical_stock_count || 0,
        'low-stock': stats.summary?.low_stock_count || 0,
        'total-shortage': stats.summary?.total_shortage_count || 0
    };
    
    Object.entries(summaryElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

function updatePagination(pagination) {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;
    
    const prevBtn = paginationContainer.querySelector('.pagination-btn:first-child');
    const nextBtn = paginationContainer.querySelector('.pagination-btn:last-child');
    const pageInfo = paginationContainer.querySelector('.pagination-info');
    
    if (prevBtn) {
        prevBtn.disabled = !pagination.has_previous;
        prevBtn.onclick = () => {
            if (pagination.has_previous) {
                fetchShortageMedicines(currentPage - 1, searchTerm);
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.disabled = !pagination.has_next;
        nextBtn.onclick = () => {
            if (pagination.has_next) {
                fetchShortageMedicines(currentPage + 1, searchTerm);
            }
        };
    }
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${pagination.current_page} of ${pagination.total_pages}`;
    }
}

// Search functionality with backend integration
function searchMedicines() {
    const searchInput = document.getElementById('searchMedicine');
    if (!searchInput) return;
    
    searchTerm = searchInput.value.trim();
    currentPage = 1; // Reset to first page when searching
    
    // Debounce search requests
    clearTimeout(searchMedicines.timeout);
    searchMedicines.timeout = setTimeout(() => {
        fetchShortageMedicines(currentPage, searchTerm);
    }, 300);
}

function clearSearch() {
    const searchInput = document.getElementById('searchMedicine');
    if (searchInput) {
        searchInput.value = '';
        searchTerm = '';
        fetchShortageMedicines(1, '');
    }
}

// Enhanced search with filters
async function advancedSearch(filters = {}) {
    try {
        isLoading = true;
        showLoadingState();
        
        const response = await fetch(`${API_BASE_URL}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'search_shortage_medicines',
                search: filters.search || '',
                category: filters.category || '',
                stock_status: filters.stock_status || '',
                sort_by: filters.sort_by || 'priority',
                sort_order: filters.sort_order || 'ASC',
                page: filters.page || 1,
                limit: filters.limit || 20
            })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Search failed');
        }
        
        displayShortageMedicines(data.data.medicines);
        updatePagination(data.data.pagination);
        updateShortageCount(data.data.pagination.total_records, filters.search || '');
        
        isLoading = false;
        hideLoadingState();
        
    } catch (error) {
        console.error('Error in advanced search:', error);
        showErrorMessage('Search failed: ' + error.message);
        isLoading = false;
        hideLoadingState();
    }
}

// Report generation functions
function downloadReport(reportData) {
    // Create a temporary window for PDF generation
    const printWindow = window.open('', '_blank');
    const reportContent = generatePDFContent(reportData);
    
    printWindow.document.write(reportContent);
    printWindow.document.close();
    
    // Automatically trigger download without preview
    printWindow.onload = function() {
        printWindow.print();
        // Close the window after a short delay
        setTimeout(() => {
            printWindow.close();
        }, 1000);
    };
}

function generatePDFContent(reportData) {
    const currentDate = new Date().toLocaleDateString('en-GB');
    
    // Get current data from the page or use provided data
    const shortageCount = document.getElementById('shortageCount')?.textContent || reportData.report_data.length;
    
    // Calculate summary data from current data
    const totalItems = reportData.report_data.length;
    const outOfStockItems = reportData.report_data.filter(item => item.stock_left === 0).length;
    const lowStockItems = reportData.report_data.filter(item => item.stock_left > 0 && item.stock_left <= 10).length;
    const totalValue = reportData.report_data.reduce((sum, item) => {
        const price = parseFloat(item.medicine_price) || 0;
        const stock = parseInt(item.stock_left) || 0;
        return sum + (price * stock);
    }, 0).toFixed(2);
    
    // Generate table content
    let tableContent = '';
    reportData.report_data.forEach(item => {
        // Use same status logic as display
        let statusClass, statusText;
        
        if (item.stock_left <= 0) {
            statusClass = 'out-of-stock';
            statusText = 'OUT OF STOCK';
        } else if (item.stock_left <= 10) {
            statusClass = 'low-stock';
            statusText = 'LOW STOCK';
        } else {
            statusClass = 'in-stock';
            statusText = 'IN STOCK';
        }
        
        tableContent += `
            <tr>
                <td>${item.medicine_id}</td>
                <td>${item.medicine_name}</td>
                <td>${item.category}</td>
                <td>${item.stock_left}</td>
                <td>Rs. ${item.medicine_price}</td>
                <td>${item.medicine_brand}</td>
                <td><span class="status-${statusClass}">${statusText}</span></td>
            </tr>
        `;
    });
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Medicine Shortage Report - New Lanka Pharmacy</title>
        <style>
            @page { margin: 20mm; }
            body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 0;
                color: #333;
                line-height: 1.4;
            }
            .header { 
                text-align: center; 
                margin-bottom: 30px; 
                border-bottom: 3px solid #4db8a8; 
                padding-bottom: 20px; 
            }
            .header h1 {
                color: #2c3e50;
                margin: 0 0 10px 0;
                font-size: 24px;
            }
            .header h2 {
                color: #4db8a8;
                margin: 0 0 15px 0;
                font-size: 20px;
            }
            .header p {
                margin: 5px 0;
                color: #7f8c8d;
                font-size: 14px;
            }
            .summary { 
                display: flex; 
                justify-content: space-between; 
                margin: 30px 0; 
                gap: 15px;
            }
            .summary-card { 
                text-align: center; 
                padding: 15px; 
                border: 2px solid #4db8a8; 
                border-radius: 8px; 
                flex: 1;
                background-color: #f8f9fa;
            }
            .summary-value { 
                font-size: 20px; 
                font-weight: bold; 
                color: #2c3e50; 
                margin-bottom: 5px;
            }
            .summary-label { 
                font-size: 12px; 
                color: #7f8c8d; 
                text-transform: uppercase;
                font-weight: 600;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-top: 30px; 
                font-size: 12px;
            }
            th, td { 
                padding: 8px; 
                text-align: left; 
                border: 1px solid #ddd; 
            }
            th { 
                background-color: #4db8a8; 
                color: white;
                font-weight: bold; 
                text-align: center;
            }
            tbody tr:nth-child(even) {
                background-color: #f8f9fa;
            }
            .status-out-of-stock {
                background-color: #dc3545;
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: bold;
            }
            .status-low-stock {
                background-color: #ffc107;
                color: #000;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: bold;
            }
            .status-in-stock {
                background-color: #28a745;
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                font-weight: bold;
            }
            .footer { 
                margin-top: 40px; 
                text-align: center; 
                font-size: 10px; 
                color: #7f8c8d; 
                border-top: 1px solid #ddd;
                padding-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>New Lanka Pharmacy Management System</h1>
            <h2>Medicine Shortage Report</h2>
            <p>Generated on: ${currentDate}</p>
            <p>Report Type: Low Stock & Out of Stock Medicines</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <div class="summary-value">${totalItems}</div>
                <div class="summary-label">Total Shortage Items</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${lowStockItems}</div>
                <div class="summary-label">Low Stock Items</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${outOfStockItems}</div>
                <div class="summary-label">Out of Stock</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">Rs. ${totalValue}</div>
                <div class="summary-label">Total Value</div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Medicine ID</th>
                    <th>Medicine Name</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Price</th>
                    <th>Brand</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${tableContent || '<tr><td colspan="7" style="text-align: center; color: #7f8c8d; font-style: italic; padding: 40px;">No shortage medicines found</td></tr>'}
            </tbody>
        </table>
        
        <div class="footer">
            <p>Generated on ${currentDate} | New Lanka Pharmacy Management System</p>
            <p>This report contains confidential pharmacy information</p>
            <p>Developed by ESoft UNI Bit 004 Project Group 04</p>
        </div>
    </body>
    </html>
    `;
}

// Utility functions
function showLoadingState() {
    const tbody = document.querySelector('.medicine-table tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
    }
}

function hideLoadingState() {
    // Loading state is hidden when data is displayed
}

function showLoadingMessage(message) {
    // You can implement a toast or modal for loading messages
    console.log(message);
}

function hideLoadingMessage() {
    // Hide loading message
}

function showErrorMessage(message) {
    console.error(message);
    // You can implement a toast notification system here
    alert('Error: ' + message);
}

function showSuccessMessage(message) {
    console.log(message);
    // Success messages removed as requested
}

// Static data fallback removed - all data comes from backend

// Count shortage items and update display
function updateShortageCount(totalCount = null, searchTerm = '') {
    const headerTitle = document.querySelector('.table-header h3');
    if (!headerTitle) return;
    
    if (totalCount !== null) {
        // Use backend data
        if (searchTerm === '') {
            headerTitle.innerHTML = `Low Stock & Out of Stock Medicines (<span id="shortageCount">${totalCount}</span> items)`;
        } else {
            headerTitle.innerHTML = `Search Results (<span id="shortageCount">${totalCount}</span> items found)`;
        }
    } else {
        // Fallback to counting visible rows
        const rows = document.querySelectorAll('.medicine-table tbody tr');
        const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
        const displayCount = visibleRows.length;
        
        if (searchTerm === '') {
            headerTitle.innerHTML = `Low Stock & Out of Stock Medicines (<span id="shortageCount">${displayCount}</span> items)`;
        } else {
            headerTitle.innerHTML = `Search Results (<span id="shortageCount">${displayCount}</span> items found)`;
        }
    }
}

// Initialize the page
async function initializePage() {
    try {
        // Load shortage medicines data
        await fetchShortageMedicines(1, '');
        
        // Load statistics (optional, doesn't block main functionality)
        fetchShortageStatistics();
        
        // Set up event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Failed to initialize page:', error);
        // Page should still function with static data
        updateShortageCount();
    }
}

function setupEventListeners() {
    // Search input event listener
    const searchInput = document.getElementById('searchMedicine');
    if (searchInput) {
        searchInput.addEventListener('input', searchMedicines);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchMedicines();
            }
        });
    }
    
    // Generate report button
    const reportBtn = document.querySelector('.btn-primary');
    if (reportBtn && reportBtn.textContent.includes('Generate Report')) {
        reportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            generateShortageReport();
        });
    }
    
    // Refresh data every 5 minutes
    setInterval(() => {
        if (!isLoading) {
            fetchShortageMedicines(currentPage, searchTerm);
        }
    }, 5 * 60 * 1000);
}

// Initialize when page loads
window.addEventListener('load', () => {
    initializePage();
});

// Additional pagination function for HTML onclick
function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages && !isLoading) {
        fetchShortageMedicines(newPage, searchTerm);
    }
}
