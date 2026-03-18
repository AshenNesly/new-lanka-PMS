// API Base URL
const API_BASE_URL = 'php/admin-inside-customer.php';

// Get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Global variables
let currentCustomer = null;
let currentCustomerId = null;

// Load customer details from backend database ONLY
async function loadCustomerDetails() {
    try {
        currentCustomerId = getUrlParameter('id');
        
        if (!currentCustomerId) {
            throw new Error('No customer ID provided');
        }

        const params = new URLSearchParams({
            action: 'get_customer_details',
            customer_id: currentCustomerId
        });

        const response = await fetch(`${API_BASE_URL}?${params}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to load customer details');
        }

        currentCustomer = data.customer;
        populateCustomerDetails(currentCustomer);
        
        // Load purchase history from database
        await loadPurchaseHistory();
        
    } catch (error) {
        console.error('Error loading customer details:', error);
        alert('Error loading customer details: ' + error.message);
        window.location.href = 'pharmacist-customers.html';
    }
}

// Populate customer details in the UI with database data
function populateCustomerDetails(customer) {
    // All data comes from database - no hardcoded values
    document.getElementById('customerId').textContent = customer.id || 'N/A';
    document.getElementById('customerFullName').textContent = customer.full_name || 'N/A';
    document.getElementById('customerDob').textContent = customer.date_of_birth || 'N/A';
    document.getElementById('customerPhone').textContent = customer.phone_number || 'N/A';
    document.getElementById('customerEmail').textContent = customer.email || 'Not provided';
    document.getElementById('customerAddress').textContent = customer.address || 'Not provided';
    
    // Calculate age from database date_of_birth
    const age = calculateAge(customer.date_of_birth);
    document.getElementById('customerAge').textContent = age ? `${age} years` : 'N/A';
    
    document.getElementById('customerRegDate').textContent = customer.reg_date || 'N/A';
    
    // Calculate customer since from database reg_date
    const customerSince = calculateCustomerSince(customer.reg_date);
    document.getElementById('customerSince').textContent = customerSince || 'N/A';
    
    // Purchase summary from database
    document.getElementById('totalPurchases').textContent = customer.total_purchases || 0;
    document.getElementById('totalAmountSpent').textContent = `Rs. ${parseFloat(customer.total_spent || 0).toFixed(2)}`;
    document.getElementById('lastPurchase').textContent = customer.last_purchase_date || 'No purchases yet';
}

// Calculate age from date of birth (no hardcoded values)
function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    
    if (isNaN(birthDate.getTime())) return null;
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age >= 0 ? age : null;
}

// Calculate customer since duration (no hardcoded values)
function calculateCustomerSince(regDate) {
    if (!regDate) return null;
    
    const registrationDate = new Date(regDate);
    const currentDate = new Date();
    
    if (isNaN(registrationDate.getTime())) return null;
    
    const diffTime = Math.abs(currentDate - registrationDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    
    if (years > 0) {
        return months > 0 ? `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}` : `${years} year${years > 1 ? 's' : ''}`;
    } else if (months > 0) {
        return `${months} month${months > 1 ? 's' : ''}`;
    } else {
        return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }
}

// Load purchase history from database ONLY
async function loadPurchaseHistory() {
    try {
        const params = new URLSearchParams({
            action: 'get_purchase_history',
            customer_id: currentCustomerId,
            limit: 50
        });

        const response = await fetch(`${API_BASE_URL}?${params}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to load purchase history');
        }

        // All purchase data comes from database
        populatePurchaseHistory(data.purchases);
        
    } catch (error) {
        console.error('Error loading purchase history:', error);
        document.getElementById('purchaseHistoryTable').innerHTML = 
            '<tr><td colspan="6" style="text-align: center; color: #e74c3c;">Error loading purchase history from database</td></tr>';
    }
}

// Populate purchase history table with database data ONLY
function populatePurchaseHistory(purchases) {
    const tableBody = document.getElementById('purchaseHistoryTable');
    tableBody.innerHTML = '';
    
    if (!purchases || purchases.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No purchase history found in database</td></tr>';
        return;
    }

    // All data comes from database - no hardcoded values
    purchases.forEach(purchase => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td><a href="pharmacist-inside-sale.html?id=${purchase.sale_id}&date=${purchase.date}&time=${purchase.time}&customerName=${encodeURIComponent(currentCustomer.full_name)}&customerId=${currentCustomerId}&totalMedicines=${purchase.items}&amount=Rs.%20${parseFloat(purchase.amount || 0).toFixed(2)}&userName=${encodeURIComponent(purchase.user)}" class="medicine-link">${purchase.sale_id}</a></td>
            <td>${purchase.date}</td>
            <td>${purchase.time}</td>
            <td>${purchase.items || 0}</td>
            <td>Rs. ${parseFloat(purchase.amount || 0).toFixed(2)}</td>
            <td>${purchase.user || 'N/A'}</td>
        `;
    });
}

// Update customer information in database
async function updateCustomer(customerData) {
    try {
        const formData = new FormData();
        formData.append('action', 'update_customer');
        formData.append('customer_id', currentCustomerId);
        formData.append('full_name', customerData.full_name);
        formData.append('phone_number', customerData.phone_number);
        formData.append('email', customerData.email);
        formData.append('address', customerData.address);
        formData.append('date_of_birth', customerData.date_of_birth);

        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to update customer in database');
        }

        return data;
        
    } catch (error) {
        console.error('Error updating customer:', error);
        throw error;
    }
}

// Delete customer from database
async function deleteCustomer() {
    try {
        const formData = new FormData();
        formData.append('action', 'delete_customer');
        formData.append('customer_id', currentCustomerId);

        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to delete customer from database');
        }

        return data;
        
    } catch (error) {
        console.error('Error deleting customer:', error);
        throw error;
    }
}

// Pharmacist dropdown functionality
const adminMenuBtn = document.getElementById('adminMenuBtn');
const adminDropdown = document.getElementById('adminDropdown');
const logoutBtn = document.getElementById('logoutBtn');

if (adminMenuBtn && adminDropdown) {
    adminMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        adminDropdown.classList.toggle('show');
    });

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

// Modal functionality
const editCustomerBtn = document.getElementById('editCustomerBtn');
const editCustomerModal = document.getElementById('editCustomerModal');
const editModalClose = document.getElementById('editModalClose');
const editModalCancel = document.getElementById('editModalCancel');
const editModalSave = document.getElementById('editModalSave');

if (editCustomerBtn) {
    editCustomerBtn.addEventListener('click', function() {
        openEditModal();
    });
}

if (editModalClose) {
    editModalClose.addEventListener('click', function() {
        editCustomerModal.style.display = 'none';
    });
}

if (editModalCancel) {
    editModalCancel.addEventListener('click', function() {
        editCustomerModal.style.display = 'none';
    });
}

if (editModalSave) {
    editModalSave.addEventListener('click', function() {
        saveCustomerChanges();
    });
}

window.addEventListener('click', function(event) {
    if (event.target === editCustomerModal) {
        editCustomerModal.style.display = 'none';
    }
});

// Delete functionality
const deleteCustomerBtn = document.getElementById('deleteCustomerBtn');
if (deleteCustomerBtn) {
    deleteCustomerBtn.addEventListener('click', function() {
        deleteCurrentCustomer();
    });
}

// Open edit modal with database data
function openEditModal() {
    if (!currentCustomer) {
        alert('Customer data not loaded from database yet. Please wait and try again.');
        return;
    }

    // Populate form with database data - no hardcoded values
    document.getElementById('editFullName').value = currentCustomer.full_name || '';
    document.getElementById('editDob').value = currentCustomer.date_of_birth || '';
    document.getElementById('editPhone').value = currentCustomer.phone_number || '';
    document.getElementById('editEmail').value = currentCustomer.email || '';
    document.getElementById('editAddress').value = currentCustomer.address || '';

    editCustomerModal.style.display = 'block';
}

// Save customer changes to database
async function saveCustomerChanges() {
    const customerData = {
        full_name: document.getElementById('editFullName').value.trim(),
        date_of_birth: document.getElementById('editDob').value,
        phone_number: document.getElementById('editPhone').value.trim(),
        email: document.getElementById('editEmail').value.trim(),
        address: document.getElementById('editAddress').value.trim()
    };

    if (!customerData.full_name) {
        alert('Please enter customer name');
        return;
    }

    if (!customerData.phone_number) {
        alert('Please enter phone number');
        return;
    }

    if (customerData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
        alert('Please enter a valid email address');
        return;
    }

    try {
        await updateCustomer(customerData);
        editCustomerModal.style.display = 'none';
        
        // Reload fresh data from database
        await loadCustomerDetails();
        
    } catch (error) {
        alert('Failed to update customer in database: ' + error.message);
    }
}

// Delete customer from database
async function deleteCurrentCustomer() {
    if (!currentCustomer) {
        alert('Customer data not loaded from database yet. Please wait and try again.');
        return;
    }

    const customerName = currentCustomer.full_name;
    if (!confirm(`Are you sure you want to delete customer "${customerName}" from database? This action cannot be undone.`)) {
        return;
    }

    try {
        await deleteCustomer();
        window.location.href = 'pharmacist-customers.html';
        
    } catch (error) {
        alert('Failed to delete customer from database: ' + error.message);
    }
}

// Update time display
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

// Dynamic greeting based on current time
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

// Initialize page - all data from database
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== LOADING PHARMACIST INSIDE CUSTOMER - DATABASE ONLY ===');
    
    setInterval(updateTime, 1000);
    updateTime();
    updateGreeting();
    
    // Load ALL customer data from database
    loadCustomerDetails();
    
    console.log('=== PHARMACIST INSIDE CUSTOMER READY - NO HARDCODED DATA ===');
});
