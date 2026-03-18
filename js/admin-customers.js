console.log('=== ADMIN CUSTOMERS SCRIPT LOADING ===');

// API Base URL
const API_BASE_URL = 'php/admin-customers.php';

// Global variables
let currentCustomers = [];
let currentPage = 1;
let totalPages = 1;
let isLoading = false;

// Initialize page
function initializePage() {
    console.log('=== INITIALIZING CUSTOMERS PAGE ===');
    loadAllCustomers(); 
    updateTime();
    updateGreeting();
    setupEventListeners();
    console.log('=== PAGE INITIALIZATION COMPLETE ===');
}

// Load all customers from backend
async function loadAllCustomers(page = 1, search = '') {
    if (isLoading) return;
    
    try {
        isLoading = true;
        showLoading();
        
        const params = new URLSearchParams({
            action: search ? 'search_customers' : 'get_all_customers',
            page: page,
            limit: 20,
            sort_by: 'full_name',
            sort_order: 'ASC'
        });
        
        if (search) {
            params.append('search', search);
        }
        
        const response = await fetch(`${API_BASE_URL}?${params}`);
        const data = await response.json();
        
        if (data.success) {
            currentCustomers = data.customers;
            
            if (data.pagination) {
                currentPage = data.pagination.current_page;
                totalPages = data.pagination.total_pages;
                updatePaginationInfo(data.pagination);
            }
            
            displayCustomers(data.customers);
            updateCustomersCount(search ? data.total_found : data.pagination?.total_count);
        } else {
            throw new Error(data.error || 'Failed to load customers');
        }
        
    } catch (error) {
        console.error('Failed to load customers:', error);
        showError('Failed to load customers: ' + error.message);
    } finally {
        isLoading = false;
        hideLoading();
    }
}

// Display customers in the table
function displayCustomers(customers) {
    const tableBody = document.getElementById('customersTableBody');
    tableBody.innerHTML = '';
    
    if (customers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No customers found</td></tr>';
        return;
    }
    
    customers.forEach(customer => {
        const row = tableBody.insertRow();
        
        // Customer Name (clickable link)
        const nameCell = row.insertCell();
        const customerLink = document.createElement('a');
        const age = calculateAge(customer.date_of_birth);
        
        customerLink.href = `admin-inside-customer.html?id=${customer.customer_id}&name=${encodeURIComponent(customer.full_name)}&phone=${encodeURIComponent(customer.phone_number)}&email=${encodeURIComponent(customer.email || '')}&address=${encodeURIComponent(customer.address || '')}&dob=${customer.date_of_birth || ''}&age=${age}&regDate=${customer.reg_date}&totalPurchases=${customer.total_purchases || 0}`;
        customerLink.className = 'customer-link';
        customerLink.textContent = customer.full_name;
        nameCell.appendChild(customerLink);
        
        // Contact Number
        const phoneCell = row.insertCell();
        phoneCell.textContent = customer.phone_number;
        
        // Address
        const addressCell = row.insertCell();
        addressCell.textContent = customer.address || 'N/A';
        
        // Age (calculated from date of birth)
        const ageCell = row.insertCell();
        ageCell.textContent = age !== null ? age : 'N/A';
        
        // Registered Date
        const dateCell = row.insertCell();
        dateCell.textContent = customer.reg_date;
        
        // Total Purchases
        const purchasesCell = row.insertCell();
        purchasesCell.textContent = customer.total_purchases || 0;
    });
}

// Calculate age from date of birth
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

// Search customers
async function searchCustomers() {
    const searchTerm = document.getElementById('searchCustomer').value.trim();
    currentPage = 1; // Reset to first page when searching
    await loadAllCustomers(1, searchTerm);
}

// Clear search
function clearSearch() {
    document.getElementById('searchCustomer').value = '';
    searchCustomers();
}

// Update customers count in header
function updateCustomersCount(count = null) {
    const headerElement = document.querySelector('.table-header h3');
    const searchTerm = document.getElementById('searchCustomer').value.trim();
    
    if (count !== null) {
        if (searchTerm) {
            headerElement.innerHTML = `Search Results (<span id="customersCount">${count}</span> customers found)`;
        } else {
            headerElement.innerHTML = `All Customers (<span id="customersCount">${count}</span> customers)`;
        }
    } else {
        const visibleRows = document.querySelectorAll('.medicine-table tbody tr[style=""], .medicine-table tbody tr:not([style])');
        const visibleCount = visibleRows.length;
        headerElement.innerHTML = `All Customers (<span id="customersCount">${visibleCount}</span> customers)`;
    }
}

// Update pagination info
function updatePaginationInfo(pagination) {
    const paginationInfo = document.querySelector('.pagination-info');
    const prevBtn = document.querySelector('.pagination-btn:first-child');
    const nextBtn = document.querySelector('.pagination-btn:last-child');
    
    if (paginationInfo) {
        paginationInfo.textContent = `Page ${pagination.current_page} of ${pagination.total_pages}`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = !pagination.has_prev;
        prevBtn.onclick = pagination.has_prev ? () => loadAllCustomers(pagination.current_page - 1) : null;
    }
    
    if (nextBtn) {
        nextBtn.disabled = !pagination.has_next;
        nextBtn.onclick = pagination.has_next ? () => loadAllCustomers(pagination.current_page + 1) : null;
    }
}

// Show loading state
function showLoading() {
    const tableBody = document.querySelector('.medicine-table tbody');
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading customers...</td></tr>';
}

// Hide loading state
function hideLoading() {
    // Loading is hidden when displaying customers
}

// Show error message
function showError(message) {
    const tableBody = document.querySelector('.medicine-table tbody');
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error: ${message}</td></tr>`;
}

// Modal functionality
let currentEditingCustomerId = null;
const modal = document.getElementById('customerModal');

// Add new customer
function addNewCustomer() {
    currentEditingCustomerId = null;
    document.getElementById('modalTitle').textContent = 'Add New Customer';
    clearModalForm();
    modal.style.display = 'block';
}

// Edit customer
async function editCustomer(customerId) {
    try {
        currentEditingCustomerId = customerId;
        document.getElementById('modalTitle').textContent = 'Edit Customer';
        
        // Get customer details from API
        const params = new URLSearchParams({
            action: 'get_customer_details',
            customer_id: customerId
        });
        
        const response = await fetch(`${API_BASE_URL}?${params}`);
        const data = await response.json();
        
        if (data.success) {
            const customer = data.customer;
            
            // Fill form with customer data
            document.getElementById('modalCustomerName').value = customer.name;
            document.getElementById('modalContactNumber').value = customer.phone;
            document.getElementById('modalEmail').value = customer.email;
            document.getElementById('modalAddress').value = customer.address;
            document.getElementById('modalDateOfBirth').value = customer.date_of_birth;
            
            modal.style.display = 'block';
        } else {
            throw new Error(data.error || 'Failed to load customer details');
        }
        
    } catch (error) {
        console.error('Failed to load customer details:', error);
        alert('Failed to load customer details: ' + error.message);
    }
}

// Delete customer
async function deleteCustomer(customerId, customerName) {
    if (!confirm(`Are you sure you want to delete customer "${customerName}"?`)) {
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('action', 'delete_customer');
        formData.append('customer_id', customerId);
        
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            // Reload current page
            loadAllCustomers(currentPage, document.getElementById('searchCustomer').value.trim());
        } else {
            throw new Error(data.error || 'Failed to delete customer');
        }
        
    } catch (error) {
        console.error('Failed to delete customer:', error);
        alert('Failed to delete customer: ' + error.message);
    }
}

// Clear modal form
function clearModalForm() {
    document.getElementById('modalCustomerName').value = '';
    document.getElementById('modalContactNumber').value = '';
    document.getElementById('modalEmail').value = '';
    document.getElementById('modalAddress').value = '';
    document.getElementById('modalDateOfBirth').value = '';
}

// Save customer (add or update)
async function saveCustomer() {
    const customerName = document.getElementById('modalCustomerName').value.trim();
    const contactNumber = document.getElementById('modalContactNumber').value.trim();
    const email = document.getElementById('modalEmail').value.trim();
    const address = document.getElementById('modalAddress').value.trim();
    const dateOfBirth = document.getElementById('modalDateOfBirth').value;

    // Client-side validation
    if (!customerName) {
        alert('Please enter customer name');
        return;
    }

    if (!contactNumber) {
        alert('Please enter contact number');
        return;
    }

    if (email && !email.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }

    if (!address) {
        alert('Please enter customer address');
        return;
    }

    if (!dateOfBirth) {
        alert('Please select date of birth');
        return;
    }

    // Check if date of birth is in the future
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    if (birthDate > today) {
        alert('Date of birth cannot be in the future');
        return;
    }

    try {
        const formData = new FormData();
        const action = currentEditingCustomerId ? 'update_customer' : 'add_customer';
        
        formData.append('action', action);
        formData.append('name', customerName);
        formData.append('phone', contactNumber);
        formData.append('email', email);
        formData.append('address', address);
        formData.append('date_of_birth', dateOfBirth);
        
        if (currentEditingCustomerId) {
            formData.append('customer_id', currentEditingCustomerId);
        }

        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            modal.style.display = 'none';
            
            // Reload customers list
            loadAllCustomers(currentPage, document.getElementById('searchCustomer').value.trim());
        } else {
            throw new Error(data.error || 'Failed to save customer');
        }

    } catch (error) {
        console.error('Failed to save customer:', error);
        alert('Failed to save customer: ' + error.message);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add customer button
    document.getElementById('addCustomerBtn').addEventListener('click', addNewCustomer);
    
    // Search functionality
    document.getElementById('searchCustomer').addEventListener('input', searchCustomers);
    
    // Modal close buttons
    document.getElementById('modalClose').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    document.getElementById('modalCancel').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Save customer button
    document.getElementById('modalSave').addEventListener('click', saveCustomer);
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
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

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                window.location.href = 'login.html';
            }
        });
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

// Load customer statistics (for potential dashboard integration)
async function loadCustomerStats() {
    try {
        const params = new URLSearchParams({
            action: 'get_customer_stats'
        });
        
        const response = await fetch(`${API_BASE_URL}?${params}`);
        const data = await response.json();
        
        if (data.success) {
            return data.stats;
        } else {
            throw new Error(data.error || 'Failed to load customer statistics');
        }
        
    } catch (error) {
        console.error('Failed to load customer statistics:', error);
        return null;
    }
}

// Export functions for global use
window.searchCustomers = searchCustomers;
window.clearSearch = clearSearch;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM CONTENT LOADED ===');
    
    // Update time every second
    setInterval(updateTime, 1000);
    
    // Initialize the page
    initializePage();
    
    console.log('=== CUSTOMERS SYSTEM READY ===');
});

console.log('=== ADMIN CUSTOMERS SCRIPT LOADED ===');
