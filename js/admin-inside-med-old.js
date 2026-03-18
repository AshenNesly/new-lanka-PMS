// Get medicine data from URL parameters - no hardcoded fallbacks
function getMedicineDataFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        id: urlParams.get('id') || '',
        name: urlParams.get('name') || '',
        category: urlParams.get('category') || '',
        stock: urlParams.get('stock') || '0',
        price: urlParams.get('price') || 'Rs. 0.00',
        brand: urlParams.get('brand') || '',
        expiry: urlParams.get('expiry') || '',
        supplier: urlParams.get('supplier') || ''
    };
}

// Populate form with medicine data
function populateForm() {
    const medicineData = getMedicineDataFromURL();
    
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

// Edit Modal
editBtn.addEventListener('click', () => {
    const medicineData = getMedicineDataFromURL();
    
    // Populate edit form
    document.getElementById('editMedicineName').value = medicineData.name;
    document.getElementById('editCategory').value = medicineData.category;
    document.getElementById('editBrand').value = medicineData.brand;
    document.getElementById('editPrice').value = medicineData.price.replace('Rs. ', '');
    document.getElementById('editHowToUse').value = document.getElementById('howToUseDisplay').textContent;
    document.getElementById('editSideEffects').value = document.getElementById('sideEffectsDisplay').textContent;
    
    editModal.style.display = 'block';
});

// Restock Modal
restockBtn.addEventListener('click', () => {
    const medicineData = getMedicineDataFromURL();
    
    // Populate restock form
    document.getElementById('restockCurrentStock').textContent = medicineData.stock;
    document.getElementById('restockQuantity').value = '';
    document.getElementById('newStockLevel').textContent = medicineData.stock;
    
    restockModal.style.display = 'block';
});

// Calculate new stock level when quantity changes
document.getElementById('restockQuantity').addEventListener('input', function() {
    const currentStock = parseInt(document.getElementById('restockCurrentStock').textContent);
    const addQuantity = parseInt(this.value) || 0;
    const newStock = currentStock + addQuantity;
    document.getElementById('newStockLevel').textContent = newStock;
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
document.getElementById('editModalSave').addEventListener('click', () => {
    // Validate form
    const medicineName = document.getElementById('editMedicineName').value.trim();
    const category = document.getElementById('editCategory').value;
    const brand = document.getElementById('editBrand').value.trim();
    const price = document.getElementById('editPrice').value;

    if (!medicineName || !category || !brand || !price) {
        alert('Please fill in all required fields');
        return;
    }

    // Update display fields
    document.getElementById('medicineNameDisplay').textContent = medicineName;
    document.getElementById('categoryDisplay').textContent = category;
    document.getElementById('brandDisplay').textContent = brand;
    document.getElementById('medicinePriceDisplay').textContent = 'Rs. ' + parseFloat(price).toFixed(2);
    document.getElementById('howToUseDisplay').textContent = document.getElementById('editHowToUse').value;
    document.getElementById('sideEffectsDisplay').textContent = document.getElementById('editSideEffects').value;
    
    // Update page title
    document.getElementById('medicineTitle').textContent = medicineName;
    document.getElementById('medicineGroupDisplay').textContent = category;

    editModal.style.display = 'none';
    alert('Medicine updated successfully!');
});

// Save restock
document.getElementById('restockModalSave').addEventListener('click', () => {
    const addQuantity = parseInt(document.getElementById('restockQuantity').value);
    
    if (!addQuantity || addQuantity <= 0) {
        alert('Please enter a valid quantity to add');
        return;
    }

    const currentStock = parseInt(document.getElementById('restockCurrentStock').textContent);
    const newStock = currentStock + addQuantity;
    
    // Update stock display
    document.getElementById('stockLeftDisplay').textContent = newStock.toString().padStart(2, '0');
    document.getElementById('lifetimeSupplyDisplay').textContent = (parseInt(document.getElementById('lifetimeSupplyDisplay').textContent) + addQuantity).toString();

    restockModal.style.display = 'none';
    alert(`Medicine restocked successfully! Added ${addQuantity} units. New stock level: ${newStock}`);
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
populateForm();
