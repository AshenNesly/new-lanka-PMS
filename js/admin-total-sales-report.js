// Total Sales Report JavaScript
// New Lanka Pharmacy Management System

// Configuration
const API_BASE_URL = 'php/admin-reports.php';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

// Generate report based on selected report type
function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const dateRange = getDateRangeForReportType(reportType);
    
    // Update table title based on report type
    updateTableTitle(reportType);
    
    // Load data for the selected period
    loadSalesReport(dateRange.startDate, dateRange.endDate, reportType);
}

// Get date range based on report type
function getDateRangeForReportType(reportType) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate, endDate;
    
    switch (reportType) {
        case 'daily':
            // Today only
            startDate = new Date(today);
            endDate = new Date(today);
            break;
            
        case 'weekly':
            // This week (last 7 days including today)
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6);
            endDate = new Date(today);
            break;
            
        case 'monthly':
            // Current month
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of month
            break;
            
        case 'yearly':
            // Current year
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
            break;
            
        case 'all':
            // All time
            startDate = new Date('2020-01-01');
            endDate = new Date('2030-12-31');
            break;
            
        default:
            // Default to current month
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    
    return {
        startDate: formatDateForInput(startDate),
        endDate: formatDateForInput(endDate)
    };
}

// Update table title based on report type
function updateTableTitle(reportType) {
    const titleElement = document.getElementById('salesTableTitle');
    if (titleElement) {
        const titles = {
            'daily': 'Today\'s Sales Transactions',
            'weekly': 'This Week\'s Sales Transactions',
            'monthly': 'Monthly Sales Transactions',
            'yearly': 'Yearly Sales Transactions',
            'all': 'All Sales Transactions'
        };
        titleElement.textContent = titles[reportType] || 'Sales Transactions';
    }
}

// Initialize page elements
function initializePage() {
    // Update time
    updateTime();
    setInterval(updateTime, 1000);
    
    // Update greeting
    updateGreeting();
    
    // Admin dropdown functionality
    setupAdminDropdown();
    
    // Load initial report (monthly by default)
    generateReport();
}

// Load sales report data
async function loadSalesReport(startDate, endDate, reportType) {
    try {
        // Show loading state
        showLoadingState();
        
        const apiUrl = `${API_BASE_URL}?action=get_sales_report&start_date=${startDate}&end_date=${endDate}&limit=1000&report_type=${reportType}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.success) {
            updateSummaryCards(data.data.summary, reportType);
            updateSalesTable(data.data.sales);
        } else {
            console.error('❌ API Error:', data.error);
            showError('Failed to load sales report: ' + data.error);
        }
    } catch (error) {
        console.error('💥 JavaScript Error:', error);
        showError('Error loading sales report: ' + error.message);
    }
}

// Show loading state
function showLoadingState() {
    // Update summary cards
    const totalSalesElement = document.getElementById('totalSales');
    const totalTransactionsElement = document.getElementById('totalTransactions');
    const averageSaleElement = document.getElementById('averageSale');
    const totalDiscountsElement = document.getElementById('totalDiscounts');
    
    if (totalSalesElement) totalSalesElement.textContent = 'Loading...';
    if (totalTransactionsElement) totalTransactionsElement.textContent = 'Loading...';
    if (averageSaleElement) averageSaleElement.textContent = 'Loading...';
    if (totalDiscountsElement) totalDiscountsElement.textContent = 'Loading...';
    
    // Update table
    const tableBody = document.getElementById('salesTableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" class="loading">Loading sales data...</td></tr>';
    }
}

// Update summary cards
function updateSummaryCards(summary, reportType) {
    const totalSalesElement = document.getElementById('totalSales');
    const totalTransactionsElement = document.getElementById('totalTransactions');
    const averageSaleElement = document.getElementById('averageSale');
    const totalDiscountsElement = document.getElementById('totalDiscounts');
    
    // Handle empty/null summary data
    const safeNumber = (value) => value || 0;
    const safePrice = (value) => value || 'Rs. 0.00';
    
    if (totalSalesElement) {
        totalSalesElement.textContent = safePrice(summary.formatted_total_sales);
    }
    if (totalTransactionsElement) {
        totalTransactionsElement.textContent = safeNumber(summary.total_transactions);
    }
    if (averageSaleElement) {
        averageSaleElement.textContent = safePrice(summary.formatted_average_sale);
    }
    if (totalDiscountsElement) {
        totalDiscountsElement.textContent = safePrice(summary.formatted_total_discounts);
    }
    
    // Update the labels based on report type
    updateSummaryLabels(reportType);
}

// Update summary card labels based on report type
function updateSummaryLabels(reportType) {
    const labels = {
        'daily': {
            sales: 'Today\'s Revenue',
            transactions: 'Today\'s Transactions',
            average: 'Average Sale Today',
            discounts: 'Today\'s Discounts'
        },
        'weekly': {
            sales: 'This Week\'s Revenue',
            transactions: 'This Week\'s Transactions',
            average: 'Weekly Average Sale',
            discounts: 'This Week\'s Discounts'
        },
        'monthly': {
            sales: 'Monthly Revenue',
            transactions: 'Monthly Transactions',
            average: 'Monthly Average Sale',
            discounts: 'Monthly Discounts'
        },
        'yearly': {
            sales: 'Yearly Revenue',
            transactions: 'Yearly Transactions',
            average: 'Yearly Average Sale',
            discounts: 'Yearly Discounts'
        },
        'all': {
            sales: 'Total Revenue',
            transactions: 'Total Transactions',
            average: 'Average Sale Value',
            discounts: 'Total Discounts'
        }
    };
    
    const currentLabels = labels[reportType] || labels['monthly'];
    
    const salesLabel = document.querySelector('#totalSales').parentElement.querySelector('.stat-label');
    const transactionsLabel = document.querySelector('#totalTransactions').parentElement.querySelector('.stat-label');
    const averageLabel = document.querySelector('#averageSale').parentElement.querySelector('.stat-label');
    const discountsLabel = document.querySelector('#totalDiscounts').parentElement.querySelector('.stat-label');
    
    if (salesLabel) salesLabel.textContent = currentLabels.sales;
    if (transactionsLabel) transactionsLabel.textContent = currentLabels.transactions;
    if (averageLabel) averageLabel.textContent = currentLabels.average;
    if (discountsLabel) discountsLabel.textContent = currentLabels.discounts;
}

// Update sales table
function updateSalesTable(sales) {
    const tableBody = document.getElementById('salesTableBody');
    
    if (!tableBody) {
        console.error('❌ Sales table body not found!');
        return;
    }
    
    if (!sales || sales.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="no-data">No sales data found for the selected period</td></tr>';
        return;
    }
    
    let tableHTML = '';
    sales.forEach(sale => {
        const customerName = sale.customer_name || 'Walk-in Customer';
        const cashierName = sale.cashier_name || 'Unknown';
        const paymentBadge = sale.payment_type === 'cash' ? 'payment-cash' : 'payment-card';
        
        tableHTML += `
            <tr>
                <td>#${sale.sale_id}</td>
                <td>${formatDateTime(sale.sale_date, sale.sale_time)}</td>
                <td>${customerName}</td>
                <td>${cashierName}</td>
                <td>${sale.formatted_subtotal}</td>
                <td>Rs. ${sale.discount}</td>
                <td>${sale.formatted_total}</td>
                <td><span class="payment-badge ${paymentBadge}">${sale.payment_type.toUpperCase()}</span></td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
}

// Reset filters to default
function resetFilters() {
    const reportTypeSelect = document.getElementById('reportType');
    if (reportTypeSelect) reportTypeSelect.value = 'monthly';
    generateReport();
}

// Download PDF functionality
function downloadPDF() {
    const reportType = document.getElementById('reportType').value;
    const dateRange = getDateRangeForReportType(reportType);
    
    // Create a temporary window for PDF generation
    const printWindow = window.open('', '_blank');
    const reportContent = generatePDFContent(reportType, dateRange);
    
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
function generatePDFContent(reportType, dateRange) {
    const reportTitle = getReportTitle(reportType);
    const currentDate = new Date().toLocaleDateString('en-GB');
    
    // Get current data from the page
    const totalSales = document.getElementById('totalSales').textContent;
    const totalTransactions = document.getElementById('totalTransactions').textContent;
    const averageSale = document.getElementById('averageSale').textContent;
    const totalDiscounts = document.getElementById('totalDiscounts').textContent;
    
    // Get table data
    const tableRows = document.querySelectorAll('#salesTableBody tr');
    let tableContent = '';
    
    tableRows.forEach(row => {
        if (!row.querySelector('.loading') && !row.querySelector('.error')) {
            const cells = row.querySelectorAll('td');
            tableContent += '<tr>';
            cells.forEach(cell => {
                tableContent += `<td>${cell.textContent}</td>`;
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
            <p>Period: ${dateRange.startDate} to ${dateRange.endDate}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <div class="summary-value">${totalSales}</div>
                <div class="summary-label">Total Revenue</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${totalTransactions}</div>
                <div class="summary-label">Total Transactions</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${averageSale}</div>
                <div class="summary-label">Average Sale</div>
            </div>
            <div class="summary-card">
                <div class="summary-value">${totalDiscounts}</div>
                <div class="summary-label">Total Discounts</div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Sale ID</th>
                    <th>Date & Time</th>
                    <th>Customer</th>
                    <th>Cashier</th>
                    <th>Subtotal</th>
                    <th>Discount</th>
                    <th>Total</th>
                    <th>Payment</th>
                </tr>
            </thead>
            <tbody>
                ${tableContent}
            </tbody>
        </table>
        
        <div class="footer">
            <p>New Lanka Pharmacy Management System - Sales Report</p>
            <p>Developed by ESoft UNI Bit 004 Project Group 04</p>
        </div>
    </body>
    </html>`;
}

// Get report title based on type
function getReportTitle(reportType) {
    const titles = {
        'daily': 'Daily Sales Report',
        'recent_daily': 'Recent Daily Sales Report',
        'weekly': 'Weekly Sales Report',
        'recent_weekly': 'Recent Weekly Sales Report',
        'monthly': 'Monthly Sales Report',
        'yearly': 'Yearly Sales Report',
        'all': 'Complete Sales Report'
    };
    return titles[reportType] || 'Sales Report';
}

// Show error message
function showError(message) {
    const tableBody = document.getElementById('salesTableBody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="8" class="error">${message}</td></tr>`;
    }
    
    // Reset summary cards
    const totalSalesElement = document.getElementById('totalSales');
    const totalTransactionsElement = document.getElementById('totalTransactions');
    const averageSaleElement = document.getElementById('averageSale');
    const totalDiscountsElement = document.getElementById('totalDiscounts');
    
    if (totalSalesElement) totalSalesElement.textContent = 'Rs. 0.00';
    if (totalTransactionsElement) totalTransactionsElement.textContent = '0';
    if (averageSaleElement) averageSaleElement.textContent = 'Rs. 0.00';
    if (totalDiscountsElement) totalDiscountsElement.textContent = 'Rs. 0.00';
}

// Utility functions
function formatDateForInput(date) {
    // Use local timezone date instead of UTC to avoid date shifting
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateTime(date, time) {
    const dateObj = new Date(date + ' ' + time); 
    return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }) + ' ' + dateObj.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Update time function
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

setInterval(updateTime, 1000);
updateTime();

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

// Admin dropdown functionality
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
