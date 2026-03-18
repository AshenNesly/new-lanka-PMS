// Admin dropdown functionality
const adminMenuBtn = document.getElementById('adminMenuBtn');
const adminDropdown = document.getElementById('adminDropdown');
const logoutBtn = document.getElementById('logoutBtn');

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
 
// Logout functionality
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'login.html';
    }
});

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

// Backend API Configuration
const API_BASE_URL = 'php/admin-full-med-list.php';

// Global variables
let currentPage = 1;
let totalPages = 1;
let currentSearchTerm = '';
let allMedicines = [];

/**
 * Load medicine groups/categories from backend and populate dropdown
 */
async function loadMedicineGroups() {
    try {
        const response = await fetch(`${API_BASE_URL}?action=get_medicine_groups`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            const categorySelect = document.getElementById('modalCategory');
            
            // Clear existing options (keep the first "Select Category" option)
            categorySelect.innerHTML = '<option value="">Select Category</option>';
            
            // Add medicine groups from database
            data.data.groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.med_group_name;
                option.textContent = group.med_group_name;
                categorySelect.appendChild(option);
            });
            
            console.log(`Loaded ${data.data.total_count} medicine categories`);
        } else {
            throw new Error(data.error || 'Failed to load medicine groups');
        }
    } catch (error) {
        console.error('Error loading medicine groups:', error);
        // Keep static options as fallback
        showError('Failed to load categories from database');
    }
}

/**
 * Load medicines list from backend
 */
async function loadMedicinesList(page = 1, search = '') {
    try {
        console.log('=== LOAD MEDICINES DEBUG ===');
        console.log('Page:', page);
        console.log('Search:', search);
        
        showLoadingState();
        
        const params = new URLSearchParams({
            action: 'get_medicines_list',
            page: page,
            limit: 20
        });
        
        if (search) {
            params.append('search', search);
        }
        
        const url = `${API_BASE_URL}?${params}`;
        console.log('Request URL:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (data.success) {
            allMedicines = data.data.medicines;
            currentPage = data.data.pagination.current_page;
            totalPages = data.data.pagination.total_pages;
            
            console.log('Medicines found:', allMedicines.length);
            console.log('Total records:', data.data.pagination.total_records);
            
            displayMedicines(allMedicines);
            updatePagination();
            updateMedicineCount(data.data.pagination.total_records, search);
        } else {
            console.error('Failed to load medicines:', data.error);
            showError('Failed to load medicines list');
        }
    } catch (error) {
        console.error('Error loading medicines:', error);
        showError('Failed to connect to server');
    } finally {
        hideLoadingState();
    }
}

/**
 * Display medicines in the table
 */
function displayMedicines(medicines) {
    const tableBody = document.querySelector('.medicine-table tbody');
    
    if (!medicines || medicines.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No medicines found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = medicines.map(medicine => `
        <tr>
            <td>MED${String(medicine.medicine_id).padStart(3, '0')}</td>
            <td>
                <a href="admin-inside-med.html?id=${medicine.medicine_id}&name=${encodeURIComponent(medicine.medicine_name)}&category=${encodeURIComponent(medicine.category || '')}&stock=${medicine.stock_left}&price=Rs.%20${medicine.medicine_price}&supplier=${encodeURIComponent(medicine.medicine_brand)}&howToUse=${encodeURIComponent(medicine.how_to_use || '')}&sideEffects=${encodeURIComponent(medicine.side_effects || '')}&status=${medicine.status}" class="medicine-link">
                    ${medicine.medicine_name}
                </a>
            </td>
            <td>${medicine.category || 'N/A'}</td>
            <td>${medicine.stock_left}</td>
            <td>Rs. ${parseFloat(medicine.medicine_price).toFixed(2)}</td>
            <td>${medicine.medicine_brand}</td>
            <td><span class="status-badge ${medicine.status_class}">${medicine.status_text}</span></td>
        </tr>
    `).join('');
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const prevBtn = document.querySelector('.pagination-btn:first-child');
    const nextBtn = document.querySelector('.pagination-btn:last-child');
    const pageInfo = document.querySelector('.pagination-info');
    
    if (prevBtn && nextBtn && pageInfo) {
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        
        // Remove existing event listeners and add new ones
        prevBtn.onclick = () => {
            if (currentPage > 1) {
                loadMedicinesList(currentPage - 1, currentSearchTerm);
            }
        };
        
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                loadMedicinesList(currentPage + 1, currentSearchTerm);
            }
        };
    }
}

/**
 * Update medicine count display
 */
function updateMedicineCount(total, searchTerm = '') {
    const medicineCount = document.querySelector('.table-header h3');
    if (medicineCount) {
        if (searchTerm) {
            medicineCount.textContent = `Search Results (${total} items found)`;
        } else {
            medicineCount.textContent = `All Medicines (${total} items)`;
        }
    }
}

/**
 * Search medicines
 */
async function searchMedicines() {
    const searchInput = document.getElementById('searchMedicine');
    const searchTerm = searchInput.value.trim();
    
    console.log('=== SEARCH DEBUG ===');
    console.log('Search input element:', searchInput);
    console.log('Search term:', searchTerm);
    console.log('Current search term:', currentSearchTerm);
    
    currentSearchTerm = searchTerm;
    currentPage = 1; // Reset to first page
    
    console.log('Calling loadMedicinesList with:', { page: 1, search: searchTerm });
    
    try {
        await loadMedicinesList(1, searchTerm);
        console.log('Search completed successfully');
    } catch (error) {
        console.error('Search failed:', error);
        alert('Search failed: ' + error.message);
    }
}

/**
 * Clear search
 */
async function clearSearch() {
    document.getElementById('searchMedicine').value = '';
    currentSearchTerm = '';
    currentPage = 1;
    await loadMedicinesList(1, '');
}

/**
 * Add medicine to backend
 */
async function addMedicineToBackend(medicineData) {
    try {
        const requestBody = {
            action: 'add_medicine',
            medicine_name: medicineData.medicineName,
            medicine_brand: medicineData.brand,
            category: medicineData.category,
            stock_left: parseInt(medicineData.stock),
            medicine_price: parseFloat(medicineData.price),
            how_to_use: medicineData.howToUse,
            side_effects: medicineData.sideEffects,
            lifetime_supply: parseInt(medicineData.stock)
        };
        
        const response = await fetch(`${API_BASE_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.data.medicine;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error adding medicine:', error);
        throw error;
    }
}

/**
 * Show loading state
 */
function showLoadingState() {
    const tableBody = document.querySelector('.medicine-table tbody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">Loading medicines...</td></tr>';
    }
}

/**
 * Hide loading state
 */
function hideLoadingState() {
    // Loading state is hidden when actual data is displayed
}

/**
 * Show error message
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

/**
 * Show success message
 */
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}
// Medicine modal functionality
const modal = document.getElementById('medicineModal');
const addMedicineBtn = document.getElementById('addMedicineBtn');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalSave = document.getElementById('modalSave');

// Open modal
addMedicineBtn.addEventListener('click', function() {
    document.getElementById('modalTitle').textContent = 'Add New Medicine';
    document.getElementById('modalMedicineName').value = '';
    document.getElementById('modalCategory').value = '';
    document.getElementById('modalStock').value = '';
    document.getElementById('modalPrice').value = '';
    document.getElementById('modalBrand').value = '';
    document.getElementById('modalHowToUse').value = '';
    document.getElementById('modalSideEffects').value = '';
    modal.style.display = 'block';
});

// Close modal
modalClose.addEventListener('click', function() {
    modal.style.display = 'none';
});

modalCancel.addEventListener('click', function() {
    modal.style.display = 'none';
});

// Save medicine
modalSave.addEventListener('click', async function() {
    const medicineName = document.getElementById('modalMedicineName').value.trim();
    const category = document.getElementById('modalCategory').value;
    const stock = document.getElementById('modalStock').value;
    const price = document.getElementById('modalPrice').value;
    const brand = document.getElementById('modalBrand').value.trim();
    const howToUse = document.getElementById('modalHowToUse').value.trim();
    const sideEffects = document.getElementById('modalSideEffects').value.trim();

    // Validation
    if (!medicineName) {
        alert('Please enter medicine name');
        return;
    }

    if (!category) {
        alert('Please select a category');
        return;
    }

    if (!stock || stock < 0) {
        alert('Please enter a valid stock quantity');
        return;
    }

    if (!price || price <= 0) {
        alert('Please enter a valid price');
        return;
    }

    if (!brand) {
        alert('Please enter brand or supplier');
        return;
    }

    if (!howToUse) {
        alert('Please enter usage instructions');
        return;
    }

    if (!sideEffects) {
        alert('Please enter side effects information');
        return;
    }

    try {
        // Show loading state
        modalSave.disabled = true;
        modalSave.textContent = 'Saving...';

        // Add medicine via backend
        const newMedicine = await addMedicineToBackend({
            medicineName,
            category,
            stock,
            price,
            brand,
            howToUse,
            sideEffects
        });

        modal.style.display = 'none';
        // Don't show success message as requested
        
        // Reload the medicines list to show the new medicine
        await loadMedicinesList(1, currentSearchTerm);

    } catch (error) {
        showError('Failed to add medicine: ' + error.message);
    } finally {
        // Reset button state
        modalSave.disabled = false;
        modalSave.textContent = 'Save Medicine';
    }
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Initialize page
window.addEventListener('load', function() {
    // Load medicines list from backend
    loadMedicinesList(1, '');
    
    // Load medicine groups/categories for the dropdown
    loadMedicineGroups();
});