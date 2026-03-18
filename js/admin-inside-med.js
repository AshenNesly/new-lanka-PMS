// Backend API Configuration
const API_BASE_URL = 'php/admin-inside-med.php';

// Global variables
let currentMedicineId = null;
let currentMedicineData = null;

/**
 * Load medicine groups from backend for dropdown
 */
async function loadMedicineGroups() {
    try {
        const response = await fetch(`${API_BASE_URL}?action=get_medicine_groups`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.data.groups;
        } else {
            console.error('Failed to load medicine groups:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Error loading medicine groups:', error);
        return null;
    }
}

/**
 * Populate category dropdown with medicine groups
 */
async function populateCategoryDropdown() {
    const categorySelect = document.getElementById('editCategory');
    if (!categorySelect) return;
    
    // Show loading state
    categorySelect.innerHTML = '<option value="">Loading categories...</option>';
    categorySelect.disabled = true;
    
    // Load medicine groups from database
    const groups = await loadMedicineGroups();
    
    if (groups && groups.length > 0) {
        // Clear existing options
        categorySelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select Category';
        categorySelect.appendChild(defaultOption);
        
        // Add medicine groups from database
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.med_group_name;
            option.textContent = group.med_group_name;
            categorySelect.appendChild(option);
        });
        
        console.log(`Loaded ${groups.length} medicine groups successfully`);
    } else {
        // Fallback to hardcoded options if database call fails
        console.warn('Using fallback categories');
        categorySelect.innerHTML = `
            <option value="">Select Category</option>
            <option value="Painkillers">Painkillers</option>
            <option value="Antibiotics">Antibiotics</option>
            <option value="Vitamins">Vitamins</option>
            <option value="Cold & Flu">Cold & Flu</option>
            <option value="Other">Other</option>
        `;
    }
    
    // Re-enable the dropdown
    categorySelect.disabled = false;
}

/**
 * Get medicine ID from URL parameters
 */
function getMedicineIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    // Handle different ID formats
    if (id) {
        // If ID starts with 'MED', extract the number
        if (id.startsWith('MED')) {
            return parseInt(id.replace('MED', ''));
        }
        // If it's already a number, return it
        return parseInt(id);
    }
    
    // Default fallback
    return 1;
}

/**
 * Load medicine details from backend
 */
async function loadMedicineDetails() {
    try { 
        currentMedicineId = getMedicineIdFromURL();
        showLoadingState();
        
        const response = await fetch(`${API_BASE_URL}?action=get_medicine_details&medicine_id=${currentMedicineId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            currentMedicineData = data.data;
            populateFormWithBackendData(data.data);
        } else {
            console.error('Failed to load medicine details:', data.error);
            showError('Failed to load medicine details: ' + data.error);
            
            // Fallback to URL parameters if backend fails
            loadFromURLParameters();
        }
    } catch (error) {
        console.error('Error loading medicine details:', error);
        showError('Failed to connect to server');
        
        // Fallback to URL parameters if backend fails
        loadFromURLParameters();
    } finally {
        hideLoadingState();
    }
}

/**
 * Populate form with backend data
 */
function populateFormWithBackendData(data) {
    const medicine = data.medicine;
    
    // Update page title
    document.getElementById('medicineTitle').textContent = medicine.medicine_name;
    
    // Update display fields
    document.getElementById('medicineIdDisplay').textContent = 'MED' + String(medicine.medicine_id).padStart(3, '0');
    document.getElementById('medicineGroupDisplay').textContent = medicine.category || 'N/A';
    document.getElementById('medicinePriceDisplay').textContent = data.formatted_price || ('Rs. ' + parseFloat(medicine.medicine_price).toFixed(2));
    document.getElementById('stockLeftDisplay').textContent = String(medicine.stock_left).padStart(2, '0');
    document.getElementById('lifetimeSupplyDisplay').textContent = medicine.lifetime_supply || '0';
    document.getElementById('lifetimeSalesDisplay').textContent = data.lifetime_sales || '0';
    
    // Update detailed information
    document.getElementById('medicineNameDisplay').textContent = medicine.medicine_name;
    document.getElementById('categoryDisplay').textContent = medicine.category || 'N/A';
    document.getElementById('brandDisplay').textContent = medicine.medicine_brand;
    document.getElementById('howToUseDisplay').textContent = medicine.how_to_use || 'No usage instructions available.';
    document.getElementById('sideEffectsDisplay').textContent = medicine.side_effects || 'No side effects information available.';
}

/**
 * Fallback: Get medicine data from URL parameters (original functionality)
 */
function loadFromURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const medicineData = {
        id: urlParams.get('id') || '',
        name: urlParams.get('name') || '',
        category: urlParams.get('category') || '',
        stock: urlParams.get('stock') || '0',
        price: urlParams.get('price') || 'Rs. 0.00',
        brand: urlParams.get('brand') || urlParams.get('supplier') || '',
        howToUse: urlParams.get('howToUse') || 'No usage instructions available from database.',
        sideEffects: urlParams.get('sideEffects') || 'No side effects information available from database.'
    };
    
    // Update page title
    document.getElementById('medicineTitle').textContent = medicineData.name;
    
    // Update display fields
    document.getElementById('medicineIdDisplay').textContent = medicineData.id;
    document.getElementById('medicineGroupDisplay').textContent = medicineData.category;
    document.getElementById('medicinePriceDisplay').textContent = medicineData.price;
    document.getElementById('stockLeftDisplay').textContent = medicineData.stock.padStart(2, '0');
    document.getElementById('medicineNameDisplay').textContent = medicineData.name;
    document.getElementById('categoryDisplay').textContent = medicineData.category;
    document.getElementById('brandDisplay').textContent = medicineData.brand;
    document.getElementById('howToUseDisplay').textContent = medicineData.howToUse;
    document.getElementById('sideEffectsDisplay').textContent = medicineData.sideEffects;
}

/**
 * Update medicine via backend
 */
async function updateMedicineBackend(medicineData) {
    try {
        const response = await fetch(`${API_BASE_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'update_medicine',
                medicine_id: currentMedicineId,
                medicine_name: medicineData.medicineName,
                medicine_brand: medicineData.brand,
                category: medicineData.category,
                medicine_price: parseFloat(medicineData.price),
                how_to_use: medicineData.howToUse,
                side_effects: medicineData.sideEffects
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.data;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error updating medicine:', error);
        throw error;
    }
}

/**
 * Restock medicine via backend
 */
async function restockMedicineBackend(addQuantity) {
    try {
        const response = await fetch(`${API_BASE_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'restock_medicine',
                medicine_id: currentMedicineId,
                add_quantity: parseInt(addQuantity)
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.data;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error restocking medicine:', error);
        throw error;
    }
}

/**
 * Delete medicine via backend
 */
async function deleteMedicineBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}?action=delete_medicine&medicine_id=${currentMedicineId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            return data.data;
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error deleting medicine:', error);
        throw error;
    }
}

/**
 * Show loading state
 */
function showLoadingState() {
    // Show loading indicators
    const loadingElements = document.querySelectorAll('.stat-value, .form-display, .info-display');
    loadingElements.forEach(el => {
        if (!el.dataset.originalText) {
            el.dataset.originalText = el.textContent;
        }
        el.textContent = 'Loading...';
    });
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

// Admin dropdown functionality
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
        window.location.href = 'login.html';
    }
});

// Modal functionality
const editModal = document.getElementById('editMedicineModal');
const restockModal = document.getElementById('restockModal');
const editBtn = document.getElementById('editBtn');
const restockBtn = document.getElementById('restockBtn');
const deleteBtn = document.getElementById('deleteBtn');

// Edit Modal
editBtn.addEventListener('click', async () => {
    // First populate the category dropdown with database groups
    await populateCategoryDropdown();
    
    if (currentMedicineData && currentMedicineData.medicine) {
        const medicine = currentMedicineData.medicine;
        
        // Populate edit form with current data
        document.getElementById('editMedicineName').value = medicine.medicine_name;
        document.getElementById('editCategory').value = medicine.category || '';
        document.getElementById('editBrand').value = medicine.medicine_brand;
        document.getElementById('editPrice').value = medicine.medicine_price;
        document.getElementById('editHowToUse').value = medicine.how_to_use || '';
        document.getElementById('editSideEffects').value = medicine.side_effects || '';
    } else {
        // Fallback to URL data if backend data not available
        const urlParams = new URLSearchParams(window.location.search);
        document.getElementById('editMedicineName').value = urlParams.get('name') || '';
        document.getElementById('editCategory').value = urlParams.get('category') || '';
        document.getElementById('editBrand').value = urlParams.get('brand') || urlParams.get('supplier') || '';
        document.getElementById('editPrice').value = (urlParams.get('price') || '').replace('Rs. ', '');
        document.getElementById('editHowToUse').value = document.getElementById('howToUseDisplay').textContent;
        document.getElementById('editSideEffects').value = document.getElementById('sideEffectsDisplay').textContent;
    }
    
    editModal.style.display = 'block';
});

// Restock Modal
restockBtn.addEventListener('click', () => {
    const currentStock = currentMedicineData && currentMedicineData.medicine 
        ? currentMedicineData.medicine.stock_left 
        : parseInt(document.getElementById('stockLeftDisplay').textContent) || 0;
    
    // Populate restock form
    document.getElementById('restockCurrentStock').textContent = currentStock;
    document.getElementById('restockQuantity').value = '';
    document.getElementById('newStockLevel').textContent = currentStock;
    
    restockModal.style.display = 'block';
});

// Calculate new stock level when quantity changes
document.getElementById('restockQuantity').addEventListener('input', function() {
    const currentStock = parseInt(document.getElementById('restockCurrentStock').textContent);
    const addQuantity = parseInt(this.value) || 0;
    const newStock = currentStock + addQuantity;
    document.getElementById('newStockLevel').textContent = newStock;
});

// Delete medicine
deleteBtn.addEventListener('click', async () => {
    const medicineName = currentMedicineData && currentMedicineData.medicine 
        ? currentMedicineData.medicine.medicine_name 
        : document.getElementById('medicineNameDisplay').textContent;
    
    if (confirm(`Are you sure you want to delete "${medicineName}"? This action cannot be undone.`)) {
        try {
            // Show loading state
            deleteBtn.disabled = true;
            deleteBtn.textContent = 'Deleting...';
            
            await deleteMedicineBackend();
            
            showSuccess('Medicine deleted successfully!');
            
            // Redirect to medicine list after short delay
            setTimeout(() => {
                window.location.href = 'admin-full-med-list.html';
            }, 2000);
            
        } catch (error) {
            showError('Failed to delete medicine: ' + error.message);
        } finally {
            // Reset button state
            deleteBtn.disabled = false;
            deleteBtn.textContent = '🗑️ Delete Medicine';
        }
    }
});

// Close modals
document.getElementById('editModalClose').addEventListener('click', () => {
    editModal.style.display = 'none';
});

document.getElementById('editModalCancel').addEventListener('click', () => {
    editModal.style.display = 'none';
});

document.getElementById('restockModalClose').addEventListener('click', () => {
    restockModal.style.display = 'none';
});

document.getElementById('restockModalCancel').addEventListener('click', () => {
    restockModal.style.display = 'none';
});

// Save edit changes
document.getElementById('editModalSave').addEventListener('click', async () => {
    // Validate form
    const medicineName = document.getElementById('editMedicineName').value.trim();
    const category = document.getElementById('editCategory').value;
    const brand = document.getElementById('editBrand').value.trim();
    const price = document.getElementById('editPrice').value;
    const howToUse = document.getElementById('editHowToUse').value.trim();
    const sideEffects = document.getElementById('editSideEffects').value.trim();

    if (!medicineName || !category || !brand || !price) {
        alert('Please fill in all required fields');
        return;
    }

    if (parseFloat(price) <= 0) {
        alert('Please enter a valid price');
        return;
    }

    try {
        // Show loading state
        const saveBtn = document.getElementById('editModalSave');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        // Update medicine via backend
        const result = await updateMedicineBackend({
            medicineName,
            category,
            brand,
            price,
            howToUse,
            sideEffects
        });

        // Update display fields with new data
        document.getElementById('medicineNameDisplay').textContent = medicineName;
        document.getElementById('categoryDisplay').textContent = category;
        document.getElementById('brandDisplay').textContent = brand;
        document.getElementById('medicinePriceDisplay').textContent = 'Rs. ' + parseFloat(price).toFixed(2);
        document.getElementById('howToUseDisplay').textContent = howToUse || 'No usage instructions available.';
        document.getElementById('sideEffectsDisplay').textContent = sideEffects || 'No side effects information available.';
        
        // Update page title and header info
        document.getElementById('medicineTitle').textContent = medicineName;
        document.getElementById('medicineGroupDisplay').textContent = category;

        editModal.style.display = 'none';
        showSuccess('Medicine updated successfully!');
        
        // Reload medicine details to get fresh data
        await loadMedicineDetails();

    } catch (error) {
        showError('Failed to update medicine: ' + error.message);
    } finally {
        // Reset button state
        const saveBtn = document.getElementById('editModalSave');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
});

// Save restock
document.getElementById('restockModalSave').addEventListener('click', async () => {
    const addQuantity = parseInt(document.getElementById('restockQuantity').value);
    
    if (!addQuantity || addQuantity <= 0) {
        alert('Please enter a valid quantity to add');
        return;
    }

    try {
        // Show loading state
        const restockSaveBtn = document.getElementById('restockModalSave');
        restockSaveBtn.disabled = true;
        restockSaveBtn.textContent = 'Restocking...';

        // Restock medicine via backend
        const result = await restockMedicineBackend(addQuantity);

        // Update stock displays
        document.getElementById('stockLeftDisplay').textContent = String(result.new_stock).padStart(2, '0');
        document.getElementById('lifetimeSupplyDisplay').textContent = result.new_lifetime_supply;

        restockModal.style.display = 'none';
        showSuccess(`Medicine restocked successfully! Added ${addQuantity} units. New stock level: ${result.new_stock}`);

    } catch (error) {
        showError('Failed to restock medicine: ' + error.message);
    } finally {
        // Reset button state
        const restockSaveBtn = document.getElementById('restockModalSave');
        restockSaveBtn.disabled = false;
        restockSaveBtn.textContent = 'Confirm Restock';
    }
});

// Close modals when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
    if (event.target === restockModal) {
        restockModal.style.display = 'none';
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

// Initialize page
window.addEventListener('load', function() {
    // Load medicine details from backend
    loadMedicineDetails();
    
    // Pre-load category dropdown options
    populateCategoryDropdown();
});
