// Utility: Get URL parameter
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Utility: Format currency
function formatCurrency(amount) {
    return 'Rs. ' + parseFloat(amount).toFixed(2);
}

// Fetch sale details from backend
async function fetchSaleDetails(saleId) {
    try {
        const response = await fetch(`php/admin-sales.php?action=get_sale_details&sale_id=${encodeURIComponent(saleId)}`);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load sale details');
        return data.sale;
    } catch (error) {
        console.error('Failed to fetch sale details:', error);
        return null;
    }
}

// Populate sale data on page
async function populateSaleData() {
    // Use numeric sale_id for backend, formatted_sale_id for display
    const saleId = getUrlParameter('sale_id');
    const formattedSaleId = getUrlParameter('formatted_id');
    const sale = await fetchSaleDetails(saleId);
    if (!sale) {
        document.getElementById('saleTitle').textContent = 'Sale Details - Not Found';
        document.getElementById('saleId').textContent = formattedSaleId || saleId || '-';
        return;
    }
    // Transaction info
    document.getElementById('saleTitle').textContent = 'Sale Details - ' + (formattedSaleId || sale.formatted_sale_id || saleId);
    document.getElementById('saleId').textContent = formattedSaleId || sale.formatted_sale_id || saleId;
    document.getElementById('saleDate').textContent = sale.sale_date || '-';
    document.getElementById('saleTime').textContent = sale.sale_time || '-';
    // Customer info
    document.getElementById('customerName').textContent = sale.customer_name || '-';
    document.getElementById('customerId').textContent = sale.customer_id || '-';
    document.getElementById('userName').textContent = sale.user_name || '-';
    // Sale summary
    document.getElementById('totalItems').textContent = sale.total_medicines || '0';
    document.getElementById('subtotal').textContent = sale.sub_total || formatCurrency(0);
    document.getElementById('totalAmount').textContent = sale.total_amount || formatCurrency(0);
    // Items table
    populateItemsTable(sale.medicines || []);
    // Payment info
    document.getElementById('paymentMethodDetail').textContent = sale.payment_type ? (sale.payment_type.charAt(0).toUpperCase() + sale.payment_type.slice(1)) + ' Payment' : '-';
    document.getElementById('amountReceived').textContent = sale.amount_received || formatCurrency(0);
    document.getElementById('changeGiven').textContent = sale.change_given || formatCurrency(0);
}

function populateItemsTable(items) {
    var tableBody = document.getElementById('itemsTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (!items.length) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No items found</td></tr>';
        return;
    }
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var row = document.createElement('tr');
        row.innerHTML =
            '<td>' + (item.medicine_name || '-') + '</td>' +
            '<td>' + (item.medicine_brand || '-') + '</td>' +
            '<td class="text-center">' + (item.quantity || 0) + '</td>' +
            '<td class="text-right">' + formatCurrency(item.medicine_price || 0) + '</td>' +
            '<td class="text-right">' + formatCurrency((item.quantity * item.medicine_price) || 0) + '</td>';
        tableBody.appendChild(row);
    }
}

// Print receipt function (dynamic)
async function printReceipt() {
    const saleId = getUrlParameter('sale_id');
    const formattedSaleId = getUrlParameter('formatted_id');
    const sale = await fetchSaleDetails(saleId);
    if (!sale) {
        alert('Sale details not found.');
        return;
    }
    var printWindow = window.open('', '_blank', 'width=600,height=800');
    if (printWindow) {
        var receiptHTML = '<!DOCTYPE html><html><head><title>Receipt - ' + (formattedSaleId || sale.formatted_sale_id || saleId) + '</title>';
        receiptHTML += '<style>body { margin: 20px; font-family: Arial, sans-serif; } table { width: 100%; border-collapse: collapse; } th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; } .center { text-align: center; } .right { text-align: right; } @media print { body { margin: 0; } }</style>';
        receiptHTML += '</head><body>';
        receiptHTML += '<div class="center"><h2>New Lanka Pharmacy</h2><p>Contact pharmacy for address details</p><p>Tel: Contact pharmacy for phone</p><h3>SALE RECEIPT</h3></div>';
        receiptHTML += '<table><tr><td><strong>Sale ID:</strong></td><td>' + (formattedSaleId || sale.formatted_sale_id || saleId) + '</td></tr>';
        receiptHTML += '<tr><td><strong>Date:</strong></td><td>' + (sale.sale_date || '-') + '</td></tr>';
        receiptHTML += '<tr><td><strong>Time:</strong></td><td>' + (sale.sale_time || '-') + '</td></tr>';
        receiptHTML += '<tr><td><strong>Customer:</strong></td><td>' + (sale.customer_name || '-') + '</td></tr>';
        receiptHTML += '<tr><td><strong>Customer ID:</strong></td><td>' + (sale.customer_id || '-') + '</td></tr>';
        receiptHTML += '<tr><td><strong>Served By:</strong></td><td>' + (sale.user_name || '-') + '</td></tr></table><br>';
        receiptHTML += '<table><thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Price</th></tr></thead><tbody>';
        for (var i = 0; i < (sale.medicines || []).length; i++) {
            var item = sale.medicines[i];
            receiptHTML += '<tr><td>' + (item.medicine_name || '-') + '<br><small>' + (item.medicine_brand || '-') + '</small></td>';
            receiptHTML += '<td class="center">' + (item.quantity || 0) + '</td>';
            receiptHTML += '<td class="right">' + formatCurrency((item.quantity * item.medicine_price) || 0) + '</td></tr>';
        }
        receiptHTML += '</tbody></table><br>';
        receiptHTML += '<table><tr><td><strong>Subtotal:</strong></td><td class="right">' + sale.sub_total + '</td></tr>';
        receiptHTML += '<tr style="border-top: 2px solid #333;"><td><strong>TOTAL:</strong></td><td class="right"><strong>' + sale.total_amount + '</strong></td></tr>';
        receiptHTML += '<tr><td><strong>Payment Method:</strong></td><td class="right">' + (sale.payment_type ? (sale.payment_type.charAt(0).toUpperCase() + sale.payment_type.slice(1)) : '-') + '</td></tr>';
        receiptHTML += '<tr><td><strong>Amount Received:</strong></td><td class="right">' + sale.amount_received + '</td></tr>';
        receiptHTML += '<tr><td><strong>Change:</strong></td><td class="right">' + sale.change_given + '</td></tr></table>';
        receiptHTML += '<div class="center" style="margin-top: 30px;"><p>Thank you for your purchase!</p><p>Please keep this receipt for your records</p>';
        receiptHTML += '<p>Printed on: ' + new Date().toLocaleString() + '</p></div>';
        receiptHTML += '</body></html>';
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
        setTimeout(function() {
            printWindow.print();
        }, 500);
    }
}

// Update time function
function updateTime() {
    var now = new Date();
    var timeString = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    var dateString = now.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
    
    document.getElementById('currentTime').textContent = timeString;
    document.getElementById('currentDate').textContent = dateString;
}

// Update greeting based on time
function updateGreeting() {
    var hour = new Date().getHours();
    var greetingElement = document.querySelector('.greeting-text');
    
    if (hour < 12) {
        greetingElement.textContent = 'Good Morning';
    } else if (hour < 17) {
        greetingElement.textContent = 'Good Afternoon';
    } else {
        greetingElement.textContent = 'Good Evening';
    }
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Populate sale data
    populateSaleData();
    
    // Update time and greeting
    updateTime();
    updateGreeting();
    setInterval(updateTime, 1000);
    
    // Admin dropdown functionality
    var adminMenuBtn = document.getElementById('adminMenuBtn');
    var adminDropdown = document.getElementById('adminDropdown');
    var logoutBtn = document.getElementById('logoutBtn');

    if (adminMenuBtn && adminDropdown) {
        adminMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            adminDropdown.classList.toggle('show');
        });

        document.addEventListener('click', function(e) {
            if (!adminDropdown.contains(e.target) && !adminMenuBtn.contains(e.target)) {
                adminDropdown.classList.remove('show');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                window.location.href = 'login.html';
            }
        });
    }

    // Print button functionality
    var printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', printReceipt);
    }
});
