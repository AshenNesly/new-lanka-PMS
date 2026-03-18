// Inventory Report JavaScript
// New Lanka Pharmacy Management System

// Configuration
const API_BASE_URL = 'php/admin-reports.php';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    loadInventoryReport();
});

// Initialize page elements
function initializePage() {
    // Update time
    updateTime();
    setInterval(updateTime, 1000);
    
    // Update greeting
    updateGreeting();
    
    // Admin dropdown functionality
    setupAdminDropdown();
}

// Generate inventory report based on selected filters
function generateInventoryReport() {
    const stockFilter = document.getElementById('stockFilter').value;
    
    // Update table title based on filter
    updateTableTitle(stockFilter);
    
    // Load filtered data
    loadInventoryReport(stockFilter);
}

// Update table title based on stock filter
function updateTableTitle(stockFilter) {
    const titleElement = document.getElementById('inventoryTableTitle');
    if (titleElement) {
        const titles = {
            'all': 'All Inventory Items',
            'in-stock': 'In Stock Items',
            'low-stock': 'Low Stock Items',
            'out-of-stock': 'Out of Stock Items'
        };
        titleElement.textContent = titles[stockFilter] || 'All Inventory Items';
    }
}

// Load inventory report data
async function loadInventoryReport(stockFilter = 'all') {
    try {
        showLoading();
        
        const apiUrl = `${API_BASE_URL}?action=get_inventory_report&stock_filter=${stockFilter}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.success) {
            updateInventorySummary(data.data.summary);
            
            // Filter medicines based on selected stock level
            let filteredMedicines = data.data.medicines || [];
            if (stockFilter !== 'all') {
                filteredMedicines = filterMedicinesByStock(filteredMedicines, stockFilter);
            }
            
            updateInventoryTable(filteredMedicines, stockFilter);
        } else {
            showError('Failed to load inventory report: ' + data.error);
        }
    } catch (error) {
        console.error('Error loading inventory report:', error);
        showError('Error loading inventory report: ' + error.message);
    }
}

// Filter medicines based on stock level
function filterMedicinesByStock(medicines, stockFilter) {
    switch (stockFilter) {
        case 'in-stock':
            return medicines.filter(med => med.stock_left > (med.min_stock_level || 10));
        case 'low-stock':
            return medicines.filter(med => med.stock_left > 0 && med.stock_left <= (med.min_stock_level || 10));
        case 'out-of-stock':
            return medicines.filter(med => med.stock_left === 0);
        default:
            return medicines;
    }
}

// Update inventory summary cards
function updateInventorySummary(summary) {
    const totalMedicinesElement = document.getElementById('totalMedicines');
    const lowStockItemsElement = document.getElementById('lowStockItems');
    const outOfStockItemsElement = document.getElementById('outOfStockItems');
    const totalInventoryValueElement = document.getElementById('totalInventoryValue');
    
    if (totalMedicinesElement) totalMedicinesElement.textContent = (summary.total_medicines || 0).toLocaleString();
    if (lowStockItemsElement) lowStockItemsElement.textContent = summary.low_stock || 0;
    if (outOfStockItemsElement) outOfStockItemsElement.textContent = summary.out_of_stock || 0;
    if (totalInventoryValueElement) totalInventoryValueElement.textContent = summary.formatted_total_value || 'Rs. 0.00';
}

// Update inventory table
function updateInventoryTable(medicines, stockFilter) {
    const tableBody = document.getElementById('inventoryTableBody');
    if (!tableBody) {
        console.error('❌ Inventory table body not found!');
        return;
    }
    
    if (!medicines || medicines.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="no-data">No inventory data found for the selected filter</td></tr>';
        return;
    }
    
    let tableHTML = '';
    medicines.forEach(medicine => {
        const categoryName = medicine.med_group_name || 'Uncategorized';
        const supplierName = medicine.supplier_name || 'Unknown Supplier';
        const stockStatus = getStockStatus(medicine.stock_left, medicine.min_stock_level);
        
        // Determine stock display class
        let stockClass = '';
        if (medicine.stock_left === 0) {
            stockClass = 'stock-critical';
        } else if (medicine.stock_left <= (medicine.min_stock_level || 10)) {
            stockClass = 'stock-warning';
        } else {
            stockClass = 'stock-good';
        }
        
        tableHTML += `
            <tr>
                <td>MED${String(medicine.medicine_id).padStart(3, '0')}</td>
                <td><a href="admin-inside-med.html?id=MED${String(medicine.medicine_id).padStart(3, '0')}" class="medicine-link">${medicine.medicine_name}</a></td>
                <td>${categoryName}</td>
                <td class="${stockClass}">${medicine.stock_left}</td>
                <td>Rs. ${medicine.unit_price}</td>
                <td>${supplierName}</td>
                <td><span class="status-badge ${stockStatus.class}">${stockStatus.text}</span></td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
}

// Get stock status based on stock level
function getStockStatus(stockLeft, minStockLevel) {
    // Use minimum stock level or default to 10 if not specified
    const minLevel = minStockLevel || 10;
    
    if (stockLeft === 0) {
        return { class: 'danger', text: 'Out of Stock' };
    } else if (stockLeft <= minLevel) {
        return { class: 'warning', text: 'Low Stock' };
    } else {
        return { class: 'good', text: 'In Stock' };
    }
}

// Download PDF functionality
function downloadPDF() {
    const stockFilter = document.getElementById('stockFilter').value;
    
    // Create a temporary window for PDF generation
    const printWindow = window.open('', '_blank');
    const reportContent = generatePDFContent(stockFilter);
    
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

// Generate PDF content
function generatePDFContent(stockFilter) {
    const reportTitle = getReportTitle(stockFilter);
    const currentDate = new Date().toLocaleDateString('en-GB');
    
    // Get current data from the page
    const totalMedicines = document.getElementById('totalMedicines').textContent;
    const lowStockItems = document.getElementById('lowStockItems').textContent;
    const outOfStockItems = document.getElementById('outOfStockItems').textContent;
    const totalInventoryValue = document.getElementById('totalInventoryValue').textContent;
    
    // Get table data
    const tableRows = document.querySelectorAll('#inventoryTableBody tr');
    let tableContent = '';
    
    tableRows.forEach(row => {
        if (!row.querySelector('.loading') && !row.querySelector('.error') && row.cells.length > 1) {
            const cells = row.querySelectorAll('td');
            tableContent += '<tr>';
            cells.forEach(cell => {
                // Clean up the cell content (remove links but keep text)
                const textContent = cell.textContent || cell.innerText || '';
                tableContent += `<td>${textContent}</td>`;
            });
            tableContent += '</tr>';
        }
    });
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${reportTitle} - New Lanka Pharmacy</title>
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
            <h2>${reportTitle}</h2>
            <p>Generated on: ${currentDate}</p>
            <p>Filter: ${getFilterDescription(stockFilter)}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <div class="summary-value">${totalMedicines}</div>
                <div class="summary-label">Total Items</div>
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
                <div class="summary-value">${totalInventoryValue}</div>
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
                ${tableContent}
            </tbody>
        </table>
        
        <div class="footer">
            <p>New Lanka Pharmacy Management System - Inventory Report</p>
            <p>Developed by ESoft UNI Bit 004 Project Group 04</p>
        </div>
    </body>
    </html>
    `;
}

// Get report title based on stock filter
function getReportTitle(stockFilter) {
    const titles = {
        'all': 'Complete Inventory Report',
        'in-stock': 'In Stock Items Report',
        'low-stock': 'Low Stock Items Report',
        'out-of-stock': 'Out of Stock Items Report'
    };
    return titles[stockFilter] || 'Inventory Report';
}

// Get filter description
function getFilterDescription(stockFilter) {
    const descriptions = {
        'all': 'All Stock Levels',
        'in-stock': 'Items In Stock Only',
        'low-stock': 'Low Stock Items Only',
        'out-of-stock': 'Out of Stock Items Only'
    };
    return descriptions[stockFilter] || 'All Items';
}

// Utility functions
function showLoading() {
    const summaryCards = document.querySelectorAll('.stat-card .stat-value');
    summaryCards.forEach(card => {
        card.textContent = 'Loading...';
    });
    
    // Update table
    const tableBody = document.getElementById('inventoryTableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" class="loading">Loading inventory data...</td></tr>';
    }
}

function showError(message) {
    console.error(message);
    const summaryCards = document.querySelectorAll('.stat-card .stat-value');
    summaryCards.forEach(card => {
        card.textContent = 'Error';
    });
}

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

function setupAdminDropdown() {
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

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                window.location.href = 'login.html';
            }
        });
    }
}

// Global functions for HTML onclick handlers
window.generateInventoryReport = generateInventoryReport;
window.downloadPDF = downloadPDF;
