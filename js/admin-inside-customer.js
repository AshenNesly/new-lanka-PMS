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

// Calculate customer since duration from database reg_date
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

// Calculate age from database date_of_birth
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

// Load customer details from backend
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
        
        // Load purchase history
        await loadPurchaseHistory();
        
    } catch (error) {
        console.error('Error loading customer details:', error);
        alert('Error loading customer details: ' + error.message);
        // Redirect back to customers page
        window.location.href = 'admin-customers.html';
    }
}

// Populate customer details in the UI with database data only
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

// Load purchase history from backend
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

        populatePurchaseHistory(data.purchases);
        
    } catch (error) {
        console.error('Error loading purchase history:', error);
        document.getElementById('purchaseHistoryTable').innerHTML = 
            '<tr><td colspan="6" style="text-align: center; color: #e74c3c;">Error loading purchase history</td></tr>';
    }
}

// Populate purchase history table with database data only
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
            <td><a href="admin-inside-sale.html?id=${purchase.sale_id}&date=${purchase.date}&time=${purchase.time}&customerName=${encodeURIComponent(currentCustomer.full_name)}&customerId=${currentCustomerId}&totalMedicines=${purchase.items}&amount=Rs.%20${parseFloat(purchase.amount || 0).toFixed(2)}&userName=${encodeURIComponent(purchase.user)}" class="medicine-link">${purchase.sale_id}</a></td>
            <td>${purchase.date}</td>
            <td>${purchase.time}</td>
            <td>${purchase.items || 0}</td>
            <td>Rs. ${parseFloat(purchase.amount || 0).toFixed(2)}</td>
            <td>${purchase.user || 'N/A'}</td>
        `;
    });
}

// Update customer information
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
            throw new Error(data.error || 'Failed to update customer');
        }

        return data;
        
    } catch (error) {
        console.error('Error updating customer:', error);
        throw error;
    }
}

// Delete customer
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
            throw new Error(data.error || 'Failed to delete customer');
        }

        return data;
        
    } catch (error) {
        console.error('Error deleting customer:', error);
        throw error;
    }
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

// Update time
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const dateString = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');
    
    if (timeElement) timeElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
}

// Modal functionality
const editModal = document.getElementById('editCustomerModal');
const editBtn = document.getElementById('editCustomerBtn');
const deleteBtn = document.getElementById('deleteCustomerBtn');

// Edit Customer
if (editBtn && editModal) {
    editBtn.addEventListener('click', () => {
        if (!currentCustomer) {
            alert('Customer data not loaded yet');
            return;
        }
        
        // Populate edit form with current data
        document.getElementById('editFullName').value = currentCustomer.full_name;
        document.getElementById('editDob').value = currentCustomer.date_of_birth;
        document.getElementById('editPhone').value = currentCustomer.phone_number;
        document.getElementById('editEmail').value = currentCustomer.email || '';
        document.getElementById('editAddress').value = currentCustomer.address || '';
        
        editModal.style.display = 'block';
    });
}

// Delete Customer
if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
        if (!currentCustomer) {
            alert('Customer data not loaded yet');
            return;
        }
        
        const customerName = currentCustomer.full_name;
        if (confirm(`Are you sure you want to delete customer "${customerName}"? This action cannot be undone.`)) {
            try {
                const result = await deleteCustomer();
                alert(result.message || 'Customer deleted successfully!');
                window.location.href = 'admin-customers.html';
            } catch (error) {
                alert('Error deleting customer: ' + error.message);
            }
        }
    });
}

// Close modal events
const editModalClose = document.getElementById('editModalClose');
const editModalCancel = document.getElementById('editModalCancel');

if (editModalClose && editModal) {
    editModalClose.addEventListener('click', () => {
        editModal.style.display = 'none';
    });
}

if (editModalCancel && editModal) {
    editModalCancel.addEventListener('click', () => {
        editModal.style.display = 'none';
    });
}

// Save customer changes
const editModalSave = document.getElementById('editModalSave');
if (editModalSave) {
    editModalSave.addEventListener('click', async () => {
        // Get form values
        const fullName = document.getElementById('editFullName').value.trim();
        const phone = document.getElementById('editPhone').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const address = document.getElementById('editAddress').value.trim();
        const dateOfBirth = document.getElementById('editDob').value;

        // Validate form
        if (!fullName || !phone || !address || !dateOfBirth) {
            alert('Please fill in all required fields (Name, Phone, Address, and Date of Birth)');
            return;
        }

        // Email validation
        if (email && !email.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }

        // Date validation
        if (new Date(dateOfBirth) > new Date()) {
            alert('Date of birth cannot be in the future');
            return;
        }

        try {
            // Update customer via API
            const result = await updateCustomer({
                full_name: fullName,
                phone_number: phone,
                email: email,
                address: address,
                date_of_birth: dateOfBirth
            });

            // Update local customer object
            currentCustomer.full_name = fullName;
            currentCustomer.phone_number = phone;
            currentCustomer.email = email;
            currentCustomer.address = address;
            currentCustomer.date_of_birth = dateOfBirth;
            currentCustomer.age = result.customer.age;

            // Update display fields
            populateCustomerDetails(currentCustomer);

            editModal.style.display = 'none';
            alert(result.message || 'Customer information updated successfully!');
            
        } catch (error) {
            alert('Error updating customer: ' + error.message);
        }
    });
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
});

// Initialize page
window.addEventListener('load', () => {
    updateTime();
    setInterval(updateTime, 1000);
    loadCustomerDetails();
});

// Update greeting based on time
function updateGreeting() {
    const now = new Date();
    const hour = now.getHours();
    let greeting = '';
    
    if (hour >= 5 && hour < 12) {
        greeting = 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
        greeting = 'Good Afternoon';
    } else {
        greeting = 'Good Evening';
    }
    
    const greetingElement = document.querySelector('.greeting-text');
    if (greetingElement) {
        greetingElement.textContent = greeting;
    }
}

// Update greeting on load
updateGreeting();
