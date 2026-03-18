// Backend API Configuration
const API_BASE_URL = 'php/admin-med-groups.php';

// Global variables for data management
let currentPage = 1;
let totalPages = 1;
let currentSearchTerm = '';
let allGroupsData = [];

// Pharmacist dropdown functionality
const adminMenuBtn = document.getElementById('adminMenuBtn');
const adminDropdown = document.getElementById('adminDropdown');
const logoutBtn = document.getElementById('logoutBtn');

adminMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    adminDropdown.classList.toggle('show');
});

document.addEventListener('click', (e) => {
    if (!adminDropdown.contains(e.target) && !adminMenuBtn.contains(e.target)) {
        adminDropdown.classList.remove('show');
    }
});
 
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'index.html';
    }
});

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

// Load Medicine Groups from Backend
async function loadMedicineGroups(page = 1, searchTerm = '') {
    try {
        showLoadingState();
        
        const params = {
            page: page,
            limit: 10
        };
        
        const action = searchTerm ? 'search_groups' : 'get_groups';
        if (searchTerm) {
            params.search = searchTerm;
        }
        
        const result = await makeAPICall(action, 'GET', params);
        
        if (result.success) {
            const { groups, pagination } = result.data;
            allGroupsData = groups;
            currentPage = pagination.current_page;
            totalPages = pagination.total_pages;
            currentSearchTerm = searchTerm;
            
            displayGroups(groups);
            updatePagination(pagination);
            updateGroupsCount(pagination.total_groups, searchTerm !== '');
            
        } else {
            showError('Failed to load medicine groups: ' + (result.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Load Groups Error:', error);
        showError('Error loading medicine groups');
    } finally {
        hideLoadingState();
    }
}

// Display Groups in Table
function displayGroups(groups) {
    const tbody = document.querySelector('.medicine-table tbody');
    
    if (!groups || groups.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    ${currentSearchTerm ? 'No groups found matching your search.' : 'No medicine groups available.'}
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = groups.map(group => {
        const statusClass = group.stock_status === 'good' ? 'good' : 
                          group.stock_status === 'low_stock' ? 'warning' : 'danger';
        
        return `
            <tr>
                <td>${group.group_id}</td>
                <td>
                    <a href="pharmacist-inside-med-group.html?id=${group.group_id}&name=${encodeURIComponent(group.med_group_name)}&count=${group.medicine_count}&stock=${group.total_stock}&status=${group.stock_status}" 
                       class="medicine-link">${group.med_group_name}</a>
                </td>
                <td>${group.description}</td>
                <td>${group.medicine_count}</td>
                <td>${group.formatted_stock}</td>
                <td><span class="status-badge ${statusClass}">${group.status_text}</span></td>
            </tr>
        `;
    }).join('');
}

// Static data fallback removed - all data comes from backend

// Update Pagination
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
                loadMedicineGroups(pagination.current_page - 1, currentSearchTerm);
            }
        };
        
        nextBtn.onclick = () => {
            if (pagination.has_next) {
                loadMedicineGroups(pagination.current_page + 1, currentSearchTerm);
            }
        };
    }
}

// Show/Hide Loading State
function showLoadingState() {
    const tbody = document.querySelector('.medicine-table tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <div style="width: 20px; height: 20px; border: 2px solid #ddd; border-top: 2px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    Loading medicine groups...
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
    const tbody = document.querySelector('.medicine-table tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px;">
                <div style="color: #dc3545;">
                    <strong>Error:</strong> ${message}
                    <br><br>
                    <button onclick="loadMedicineGroups()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Try Again
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Modal functionality - connected to backend
const addGroupBtn = document.getElementById('addGroupBtn');
const addGroupModal = document.getElementById('addGroupModal');
const closeModal = document.getElementById('closeModal');
const cancelBtn = document.getElementById('cancelBtn');
const saveGroupBtn = document.getElementById('saveGroupBtn');
const addGroupForm = document.getElementById('addGroupForm');

addGroupBtn.addEventListener('click', () => {
    addGroupModal.style.display = 'flex';
});

closeModal.addEventListener('click', () => {
    addGroupModal.style.display = 'none';
    addGroupForm.reset();
});

cancelBtn.addEventListener('click', () => {
    addGroupModal.style.display = 'none';
    addGroupForm.reset();
});

// Close modal when clicking outside
addGroupModal.addEventListener('click', (e) => {
    if (e.target === addGroupModal) {
        addGroupModal.style.display = 'none';
        addGroupForm.reset();
    }
});

// Save group functionality - connected to backend
saveGroupBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const groupName = document.getElementById('groupName').value.trim();
    const groupDescription = document.getElementById('groupDescription').value.trim();

    // Validation
    if (!groupName) {
        showModalError('Group name is required.');
        return;
    }
    
    if (!groupDescription) {
        showModalError('Description is required.');
        return;
    }
    
    if (groupName.length > 50) {
        showModalError('Group name must be 50 characters or less.');
        return;
    }
    
    if (groupDescription.length > 100) {
        showModalError('Description must be 100 characters or less.');
        return;
    }

    try {
        // Disable button during save
        saveGroupBtn.disabled = true;
        saveGroupBtn.textContent = 'Saving...';
        
        const result = await makeAPICall('add_group', 'POST', {
            group_name: groupName,
            description: groupDescription
        });
        
        if (result.success) {
            showSuccessMessage('Medicine group added successfully!');
            addGroupModal.style.display = 'none';
            addGroupForm.reset();
            
            // Reload the groups to show the new group
            await loadMedicineGroups(currentPage, currentSearchTerm);
        } else {
            showModalError(result.message || 'Failed to add medicine group');
        }
        
    } catch (error) {
        console.error('Save Group Error:', error);
        showModalError('Error occurred while saving the group');
    } finally {
        // Re-enable button
        saveGroupBtn.disabled = false;
        saveGroupBtn.textContent = 'Save Group';
    }
});

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
    
    const modalBody = document.querySelector('.modal-body');
    modalBody.insertBefore(errorDiv, modalBody.firstChild);
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
    
    document.getElementById('currentTime').textContent = timeString;
    document.getElementById('currentDate').textContent = dateString;
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
async function searchGroups() {
    const searchTerm = document.getElementById('searchGroups').value.trim();
    
    // Reset to first page when searching
    currentPage = 1;
    currentSearchTerm = searchTerm;
    await loadMedicineGroups(1, searchTerm);
}

// Add debounce to search input
let searchTimeout;
document.getElementById('searchGroups').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(searchGroups, 500); // Debounce for 500ms
});

// Clear search functionality
async function clearSearch() {
    document.getElementById('searchGroups').value = '';
    currentSearchTerm = '';
    currentPage = 1;
    await loadMedicineGroups(1, '');
}

// Show all groups (same as clear search)
async function showAllGroups() {
    await clearSearch();
}

function updateGroupsCount(count, isFiltered) {
    const groupsCountElement = document.getElementById('groupsCount');
    const headerElement = document.querySelector('.table-header h3');
    
    if (isFiltered) {
        headerElement.innerHTML = `Filtered Groups (<span id="groupsCount">${count}</span> groups found)`;
    } else {
        headerElement.innerHTML = `All Medicine Groups (<span id="groupsCount">${count}</span> groups)`;
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Load initial data
    await loadMedicineGroups();
    
    // Load statistics for potential dashboard use
    await loadGroupStatistics();
    
    // Set up keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+N to add new group
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            addGroupBtn.click();
        }
        
        // Escape to close modal
        if (e.key === 'Escape' && addGroupModal.style.display === 'flex') {
            closeModal.click();
        }
        
        // Ctrl+F to focus search
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            document.getElementById('searchGroups').focus();
        }
    });
});

// Load statistics from backend
async function loadGroupStatistics() {
    try {
        const result = await makeAPICall('get_group_statistics', 'GET');
        
        if (result.success) {
            console.log('Group Statistics:', result.data);
            // Statistics can be displayed in dashboard or other components if needed
        }
    } catch (error) {
        console.error('Load Statistics Error:', error);
    }
}

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

// Export functions for potential use in other modules
window.MedGroupsAPI = {
    loadMedicineGroups,
    searchGroups,
    clearSearch,
    loadGroupStatistics
};
