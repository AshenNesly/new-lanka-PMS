// Backend API Configuration
const API_BASE_URL = 'php/admin-inside-med-group.php';

// Global variables for data management
let currentPage = 1;
let totalPages = 1;
let currentSearchTerm = '';
let currentGroupId = '';
let currentGroupInfo = {};
let allMedicinesData = [];

// Get group data from URL parameters
function getGroupDataFromURL() { 
    const urlParams = new URLSearchParams(window.location.search);
    return {
        id: urlParams.get('id'),
        name: urlParams.get('name'),
        count: urlParams.get('count'),
        stock: urlParams.get('stock'),
        status: urlParams.get('status')
    };
}

// Convert string group IDs to numeric IDs for database lookup
function convertGroupIdToNumeric(stringId) {
    // If it's already numeric, return as is
    if (!isNaN(stringId)) {
        return parseInt(stringId);
    }
    
    // Extract numeric part from string (GRP002 -> 2)
    const extracted = stringId.replace(/[^0-9]/g, '');
    if (extracted) {
        console.log(`Extracted numeric part '${extracted}' from '${stringId}'`);
        return parseInt(extracted);
    }
    
    // If no numeric part found, log error and return null
    console.error(`Could not convert group ID '${stringId}' to numeric format`);
    return null;
}

// API Helper Functions
async function makeAPICall(action, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        let url = API_BASE_URL;
        
        if (method === 'GET' || method === 'DELETE') {
            const params = new URLSearchParams({ action, ...data });
            url += '?' + params.toString();
        } else {
            options.body = JSON.stringify({ action, ...data });
        }

        const response = await fetch(url, options);
        const result = await response.json();
        
        return {
            success: response.ok && result.success,
            data: result.data,
            message: result.message,
            error: result.error,
            status: response.status
        };
    } catch (error) {
        console.error('API Call Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Load medicines for specific group from backend
async function loadMedicinesForGroup(groupId, page = 1, searchTerm = '') {
    try {
        console.log('Loading medicines for group:', groupId, 'page:', page, 'search:', searchTerm);
        showLoadingState();
        
        const params = {
            group_id: groupId,
            page: page,
            limit: 20
        };
        
        if (searchTerm) {
            params.search = searchTerm;
        }
        
        console.log('API call params:', params);
        const result = await makeAPICall('get_group_medicines', 'GET', params);
        console.log('API result:', result);
        
        if (result.success) {
            const { medicines, group_info, pagination } = result.data;
            
            allMedicinesData = medicines;
            currentGroupInfo = group_info;
            currentPage = pagination.current_page;
            totalPages = pagination.total_pages;
            currentSearchTerm = searchTerm;
            
            console.log('Medicines loaded:', medicines.length, 'Group info:', group_info);
            
            displayMedicines(medicines);
            updatePagination(pagination);
            updateMedicinesCount(pagination.total_records, searchTerm !== '');
            updateGroupInfo(group_info);
            
        } else {
            console.error('API call failed:', result.error);
            showError('Failed to load group medicines: ' + (result.error || 'Unknown error'));
            displayEmptyState();
            updateMedicinesCount(0, false);
        }
        
    } catch (error) {
        console.error('Load Group Medicines Error:', error);
        showError('Error loading group medicines');
        displayEmptyState();
        updateMedicinesCount(0, false);
    } finally {
        hideLoadingState();
    }
}

// Display medicines in table
function displayMedicines(medicines) {
    const tbody = document.getElementById('medicinesTableBody');
    
    if (!medicines || medicines.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    ${currentSearchTerm ? 'No medicines found matching your search.' : 'No medicines available in this group.'}
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = medicines.map(medicine => {
        const price = parseFloat(medicine.medicine_price);
        const formattedPrice = `Rs. ${price.toFixed(2)}`;
        
        return `
            <tr>
                <td>${medicine.medicine_id}</td>
                <td>
                    <a href="pharmacist-inside-med.html?id=${medicine.medicine_id}&name=${encodeURIComponent(medicine.medicine_name)}&category=${encodeURIComponent(medicine.category)}&stock=${medicine.stock_left}&price=${encodeURIComponent(formattedPrice)}&brand=${encodeURIComponent(medicine.medicine_brand)}&status=${medicine.status}" 
                       class="medicine-link">${medicine.medicine_name}</a>
                </td>
                <td>${medicine.medicine_brand}</td>
                <td>${medicine.stock_left}</td>
                <td>${formattedPrice}</td>
                <td><span class="status-badge ${medicine.status_class}">${medicine.status_text}</span></td>
            </tr>
        `;
    }).join('');
}

// Update group information in the page
function updateGroupInfo(groupInfo) {
    const groupTitle = document.getElementById('groupTitle');
    const groupDescription = document.getElementById('groupDescription');
    const groupNameInTable = document.getElementById('groupNameInTable');
    
    if (groupTitle) groupTitle.textContent = `${groupInfo.group_name} Medicines`;
    if (groupDescription) groupDescription.textContent = `All medicines in the ${groupInfo.group_name} category.`;
    if (groupNameInTable) groupNameInTable.textContent = groupInfo.group_name;
}

// Update medicines count
function updateMedicinesCount(count, isFiltered) {
    const headerElement = document.querySelector('.table-header h3');
    const groupName = currentGroupInfo.group_name || document.getElementById('groupNameInTable').textContent;
    
    if (isFiltered) {
        headerElement.innerHTML = `Search Results in <span id="groupNameInTable">${groupName}</span> Group (<span id="medicinesCount">${count}</span> medicines found)`;
    } else {
        headerElement.innerHTML = `Medicines in <span id="groupNameInTable">${groupName}</span> Group (<span id="medicinesCount">${count}</span> medicines)`;
    }
}

// Update pagination
function updatePagination(pagination) {
    const prevBtn = document.querySelector('.pagination-btn:first-child');
    const nextBtn = document.querySelector('.pagination-btn:last-child');
    const pageInfo = document.querySelector('.pagination-info');
    
    if (prevBtn && nextBtn && pageInfo) {
        prevBtn.disabled = !pagination.has_prev;
        nextBtn.disabled = !pagination.has_next;
        pageInfo.textContent = `Page ${pagination.current_page} of ${pagination.total_pages}`;
        
        // Update pagination event listeners
        prevBtn.onclick = () => {
            if (pagination.has_prev) {
                loadMedicinesForGroup(currentGroupId, pagination.current_page - 1, currentSearchTerm);
            }
        };
        
        nextBtn.onclick = () => {
            if (pagination.has_next) {
                loadMedicinesForGroup(currentGroupId, pagination.current_page + 1, currentSearchTerm);
            }
        };
    }
}

// Show/Hide Loading State
function showLoadingState() {
    const tbody = document.getElementById('medicinesTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <div style="width: 20px; height: 20px; border: 2px solid #ddd; border-top: 2px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    Loading medicines...
                </div>
            </td>
        </tr>
    `;
}

function hideLoadingState() {
    // Loading state will be replaced by actual data or error message
}

// Show Error Message
function showError(message) {
    const tbody = document.getElementById('medicinesTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px;">
                <div style="color: #dc3545;">
                    <strong>Error:</strong> ${message}
                    <br><br>
                    <button onclick="loadMedicinesForGroup(currentGroupId)" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Try Again
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Display empty state when no medicines are found
function displayEmptyState() {
    const tableBody = document.getElementById('medicinesTableBody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="empty-state">
                        <i class="fas fa-pills fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">No medicines found</h5>
                        <p class="text-muted">No medicines are available in this group or try adjusting your search.</p>
                    </div>
                </td>
            </tr>
        `;
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
            window.location.href = 'index.html';
        }
    });
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

// Search functionality - connected to backend
async function searchMedicines() {
    const searchTerm = document.getElementById('searchMedicine').value.trim();
    
    // Reset to first page when searching
    currentPage = 1;
    await loadMedicinesForGroup(currentGroupId, 1, searchTerm);
}

// Add debounce to search input (will be attached after DOM loads)
let searchTimeout;

// Clear search functionality
async function clearSearch() {
    document.getElementById('searchMedicine').value = '';
    currentSearchTerm = '';
    currentPage = 1;
    await loadMedicinesForGroup(currentGroupId, 1, '');
}

// Initialize medicines count
function initializeMedicinesCount() {
    // This will be handled by updateMedicinesCount function
}

// Add Medicine to Group Modal functionality
const addMedicineModal = document.getElementById('addMedicineToGroupModal');
const addMedicineBtn = document.getElementById('addMedicineToGroupBtn');
const addMedicineModalClose = document.getElementById('addMedicineModalClose');
const addMedicineModalCancel = document.getElementById('addMedicineModalCancel');
const addMedicineModalSave = document.getElementById('addMedicineModalSave');

// Open modal
if (addMedicineBtn) {
    addMedicineBtn.addEventListener('click', () => {
        // Clear form and any error messages
        clearAddMedicineForm();
        const existingError = document.querySelector('.modal-error');
        if (existingError) {
            existingError.remove();
        }
        
        addMedicineModal.style.display = 'block';
    });
}

// Close modal events
if (addMedicineModalClose) {
    addMedicineModalClose.addEventListener('click', () => {
        addMedicineModal.style.display = 'none';
        clearAddMedicineForm();
        const existingError = document.querySelector('.modal-error');
        if (existingError) {
            existingError.remove();
        }
    });
}

if (addMedicineModalCancel) {
    addMedicineModalCancel.addEventListener('click', () => {
        addMedicineModal.style.display = 'none';
        clearAddMedicineForm();
        const existingError = document.querySelector('.modal-error');
        if (existingError) {
            existingError.remove();
        }
    });
}

// Save medicine - connected to backend
if (addMedicineModalSave) {
    addMedicineModalSave.addEventListener('click', async () => {
        const medicineName = document.getElementById('addMedicineName').value.trim();
        const stock = document.getElementById('addMedicineStock').value.trim();
        const price = document.getElementById('addMedicinePrice').value.trim();
        const brand = document.getElementById('addMedicineBrand').value.trim();
        const howToUse = document.getElementById('addMedicineHowToUse').value.trim();
        const sideEffects = document.getElementById('addMedicineSideEffects').value.trim();

        // Validation
        if (!medicineName) {
            showModalError('Please enter medicine name');
            return;
        }
        if (!stock || stock <= 0) {
            showModalError('Please enter valid stock quantity');
            return;
        }
        if (!price || price <= 0) {
            showModalError('Please enter valid price');
            return;
        }
        if (!brand) {
            showModalError('Please enter brand/supplier');
            return;
        }
        if (!howToUse) {
            showModalError('Please enter usage instructions');
            return;
        }
        if (!sideEffects) {
            showModalError('Please enter side effects information');
            return;
        }

        try {
            // Disable button during save
            addMedicineModalSave.disabled = true;
            addMedicineModalSave.textContent = 'Adding...';
            
            console.log('Adding medicine to group ID:', currentGroupId);
            
            const result = await makeAPICall('add_medicine_to_group', 'POST', {
                group_id: currentGroupId,
                medicine_name: medicineName,
                medicine_brand: brand,
                stock_left: parseInt(stock),
                medicine_price: parseFloat(price),
                how_to_use: howToUse,
                side_effects: sideEffects,
                lifetime_supply: parseInt(stock)
            });
            
            if (result.success) {
                showSuccessMessage('Medicine added to group successfully!');
                addMedicineModal.style.display = 'none';
                clearAddMedicineForm();
                
                // Reload the medicines to show the new medicine
                await loadMedicinesForGroup(currentGroupId, currentPage, currentSearchTerm);
            } else {
                showModalError(result.error || 'Failed to add medicine to group');
            }
            
        } catch (error) {
            console.error('Add Medicine Error:', error);
            showModalError('Error occurred while adding the medicine');
        } finally {
            // Re-enable button
            addMedicineModalSave.disabled = false;
            addMedicineModalSave.textContent = 'Add Medicine';
        }
    });
}

// Clear add medicine form
function clearAddMedicineForm() {
    const elements = [
        'addMedicineName',
        'addMedicineStock', 
        'addMedicinePrice',
        'addMedicineBrand',
        'addMedicineHowToUse',
        'addMedicineSideEffects'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });
}

// Show success message
function showSuccessMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #d4edda;
        color: #155724;
        padding: 15px 20px;
        border: 1px solid #c3e6cb;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 9999;
        max-width: 400px;
    `;
    alertDiv.textContent = message;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// Show modal error
function showModalError(message) {
    // Remove existing error messages
    const existingError = document.querySelector('.modal-error');
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'modal-error';
    errorDiv.style.cssText = `
        background: #f8d7da;
        color: #721c24;
        padding: 10px;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
        margin-bottom: 15px;
        font-size: 14px;
    `;
    errorDiv.textContent = message;
    
    const modalBody = document.querySelector('#addMedicineToGroupModal .modal-body');
    if (modalBody) {
        modalBody.insertBefore(errorDiv, modalBody.firstChild);
    } else {
        console.error('Modal body not found for error display');
    }
}

// Populate page with group data from URL
function populateGroupData() {
    const groupData = getGroupDataFromURL();
    
    // Validate required URL parameters
    if (!groupData.id || !groupData.name) {
        console.error('Missing required URL parameters:', groupData);
        showError('Invalid page access. Please navigate from the medicine groups page.');
        displayEmptyState();
        return;
    }
    
    // Convert string ID to numeric ID for database lookup
    const numericGroupId = convertGroupIdToNumeric(groupData.id);
    
    if (numericGroupId === null) {
        console.error('Invalid group ID:', groupData.id);
        showError('Invalid group ID. Please navigate from the medicine groups page.');
        displayEmptyState();
        return;
    }
    
    currentGroupId = numericGroupId;
    
    console.log('Populating group data:', groupData);
    console.log(`Original ID: '${groupData.id}' -> Converted ID: '${numericGroupId}'`);
    console.log('Current group ID set to:', currentGroupId);
    
    // Update page elements with URL data initially (with error checking)
    const groupTitle = document.getElementById('groupTitle');
    const groupDescription = document.getElementById('groupDescription');
    const groupNameInTable = document.getElementById('groupNameInTable');
    
    if (groupTitle) groupTitle.textContent = `${groupData.name} Medicines`;
    if (groupDescription) groupDescription.textContent = `All medicines in the ${groupData.name} category.`;
    if (groupNameInTable) groupNameInTable.textContent = groupData.name;
    
    // Load medicines for this group from backend using numeric ID
    loadMedicinesForGroup(numericGroupId);
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === addMedicineModal) {
        addMedicineModal.style.display = 'none';
        clearAddMedicineForm();
        const existingError = document.querySelector('.modal-error');
        if (existingError) {
            existingError.remove();
        }
    }
});

// Add CSS for loading animation and alerts
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .alert {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 9999;
        max-width: 400px;
        font-weight: 500;
    }
    
    .alert-success {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }
    
    .alert-error {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }
`;
document.head.appendChild(style);

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    populateGroupData();
    
    // Attach search event listener after DOM is ready
    const searchInput = document.getElementById('searchMedicine');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(searchMedicines, 500); // Debounce for 500ms
        });
    }
    
    // Set up keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+N to add new medicine
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            if (addMedicineBtn) addMedicineBtn.click();
        }
        
        // Escape to close modal
        if (e.key === 'Escape' && addMedicineModal && addMedicineModal.style.display === 'block') {
            addMedicineModalClose.click();
        }
        
        // Ctrl+F to focus search
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            if (searchInput) searchInput.focus();
        }
    });
});
