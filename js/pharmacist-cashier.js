console.log('=== SCRIPT LOADING ===');
console.log('Pharmacist Cashier page script starting...');

// API Base URL
const API_BASE_URL = 'php/admin-cashier.php';
const MEDICINE_GROUPS_API = 'php/admin-inside-med.php'; // Use existing medicine groups API

// Global variables
let cart = [];
let selectedCustomer = null;
let selectedMedicine = null;
let paymentMethod = 'cash';

/**
 * Load medicine groups from database for dropdown
 */
async function loadMedicineGroups() {
    try {
        const response = await fetch(`${MEDICINE_GROUPS_API}?action=get_medicine_groups`);
        
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
    const categorySelect = document.getElementById('addModalCategory');
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

// Initialize page
function initializePage() {
    console.log('=== INITIALIZING PAGE ==='); 
    console.log('DOM loaded, starting initialization...');
    loadMedicineSearch(''); // Load all medicines initially
    console.log('Medicine search loaded');
    loadCustomerList();
    console.log('Customer list loaded');
    updateCartDisplay();
    console.log('Cart display updated');
    updateCartSummary();
    console.log('Cart summary updated');
    
    // Load medicine groups for the add medicine form
    populateCategoryDropdown();
    console.log('Category dropdown populated');
    
    // Set default payment method to cash
    const cashBtn = document.querySelector('.payment-method[data-method="cash"]');
    if (cashBtn) {
        cashBtn.classList.add('btn-primary');
        console.log('Default payment method set to cash');
    } else {
        console.error('Cash payment button not found!');
    }
    console.log('=== PAGE INITIALIZATION COMPLETE ===');
}

// Load medicine search results from backend
async function loadMedicineSearch(searchTerm = '') {
    console.log('=== LOADING MEDICINE SEARCH ===');
    console.log('Search term:', searchTerm);
    
    const tableBody = document.getElementById('medicineSearchResults');
    
    if (!tableBody) {
        console.error('❌ Medicine search results table body not found!');
        return;
    }
    
    try {
        // Show loading
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading...</td></tr>';
        
        // Build API URL
        const params = new URLSearchParams({
            action: 'search_medicines',
            search: searchTerm,
            limit: 6
        });
        
        const response = await fetch(`${API_BASE_URL}?${params}`);
        const data = await response.json();
        
        if (data.success) {
            displayMedicineResults(data.medicines);
        } else {
            throw new Error(data.error || 'Failed to load medicines');
        }
        
    } catch (error) {
        console.error('Failed to load medicines:', error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Error loading medicines</td></tr>';
    }
}

// Display medicine search results
function displayMedicineResults(medicines) {
    const tableBody = document.getElementById('medicineSearchResults');
    tableBody.innerHTML = '';
    
    if (medicines.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No medicines found</td></tr>';
        return;
    }
    
    medicines.forEach((medicine, index) => {
        const row = tableBody.insertRow();
        const stockClass = medicine.stock < 10 ? 'low-stock' : '';
        
        // Create cells safely
        const nameCell = row.insertCell();
        nameCell.textContent = medicine.name;
        
        const brandCell = row.insertCell();
        brandCell.textContent = medicine.brand;
        
        const stockCell = row.insertCell();
        stockCell.className = stockClass;
        stockCell.textContent = medicine.stock;
        
        const priceCell = row.insertCell();
        priceCell.textContent = `Rs. ${medicine.price.toFixed(2)}`;
        
        const actionCell = row.insertCell();
        const button = document.createElement('button');
        button.className = 'btn btn-primary btn-small medicine-add-btn';
        button.setAttribute('data-medicine-id', medicine.id);
        button.textContent = '➕ Add';
        button.disabled = medicine.stock === 0;
        
        button.onclick = () => showQuantityModal(medicine.id, medicine);
        button.onkeydown = (event) => handleAddButtonKeydown(event, medicine.id, index, medicines.length);
        
        actionCell.appendChild(button);
        
        console.log(`Added medicine row ${index + 1}:`, medicine.name);
    });
    
    console.log('=== MEDICINE SEARCH LOADING COMPLETE ===');
}

// Show quantity modal
function showQuantityModal(medicineId, medicineData = null) {
    // Use provided medicine data or try to find from global variable
    selectedMedicine = medicineData || medicines.find(med => med.id === medicineId);
    
    if (selectedMedicine) {
        const medicineInfo = document.getElementById('selectedMedicineInfo');
        medicineInfo.innerHTML = '';
        
        const nameDiv = document.createElement('div');
        nameDiv.innerHTML = `<strong>${selectedMedicine.name}</strong>`;
        
        const brandDiv = document.createElement('div');
        brandDiv.textContent = `Brand: ${selectedMedicine.brand}`;
        
        const priceDiv = document.createElement('div');
        priceDiv.textContent = `Price: Rs. ${selectedMedicine.price.toFixed(2)}`;
        
        medicineInfo.appendChild(nameDiv);
        medicineInfo.appendChild(brandDiv);
        medicineInfo.appendChild(priceDiv);
        
        document.getElementById('availableStock').textContent = selectedMedicine.stock;
        document.getElementById('quantityInput').max = selectedMedicine.stock;
        document.getElementById('quantityInput').value = 1;
        updateItemTotalPrice();
        document.getElementById('quantityModal').style.display = 'block';
        
        // Auto-focus quantity input
        setTimeout(() => {
            document.getElementById('quantityInput').focus();
            document.getElementById('quantityInput').select();
        }, 100);
    }
}

// Handle keyboard navigation for Add buttons
function handleAddButtonKeydown(event, medicineId, currentIndex, totalButtons) {
    if (event.key === 'Enter') {
        event.preventDefault();
        showQuantityModal(medicineId);
    } else if (event.key === 'Tab') {
        event.preventDefault();
        const nextIndex = currentIndex + 1;
        if (nextIndex < totalButtons) {
            const nextBtn = document.querySelectorAll('.medicine-add-btn')[nextIndex];
            if (nextBtn && !nextBtn.disabled) {
                nextBtn.focus();
            }
        } else {
            // If no more buttons, focus back to search
            document.getElementById('medicineSearch').focus();
        }
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const direction = event.key === 'ArrowUp' ? -1 : 1;
        const nextIndex = currentIndex + direction;
        if (nextIndex >= 0 && nextIndex < totalButtons) {
            const nextBtn = document.querySelectorAll('.medicine-add-btn')[nextIndex];
            if (nextBtn && !nextBtn.disabled) {
                nextBtn.focus();
            }
        }
    }
}

// Update item total price
function updateItemTotalPrice() {
    const quantity = parseInt(document.getElementById('quantityInput').value) || 0;
    const total = selectedMedicine ? selectedMedicine.price * quantity : 0;
    document.getElementById('itemTotalPrice').textContent = `Rs. ${total.toFixed(2)}`;
}

// Add to cart
function addToCart() {
    const quantity = parseInt(document.getElementById('quantityInput').value);
    if (selectedMedicine && quantity > 0 && quantity <= selectedMedicine.stock) {
        const existingItem = cart.find(item => item.id === selectedMedicine.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
            existingItem.total = existingItem.quantity * existingItem.price;
        } else {
            cart.push({
                id: selectedMedicine.id,
                name: selectedMedicine.name,
                brand: selectedMedicine.brand,
                price: selectedMedicine.price,
                quantity: quantity,
                total: selectedMedicine.price * quantity,
                maxStock: selectedMedicine.stock
            });
        }

        updateCartDisplay();
        updateCartSummary();
        document.getElementById('quantityModal').style.display = 'none';
        
        // Return focus to medicine search
        setTimeout(() => {
            document.getElementById('medicineSearch').focus();
            document.getElementById('medicineSearch').select();
        }, 100);
    }
}

// Update cart display
function updateCartDisplay() {
    const cartBody = document.getElementById('cartItems');
    cartBody.innerHTML = '';

    cart.forEach((item, index) => {
        const row = cartBody.insertRow();
        
        // Medicine name cell
        const nameCell = row.insertCell();
        nameCell.innerHTML = `${item.name}<br><small>Brand: ${item.brand}</small>`;
        
        // Quantity cell with controls
        const qtyCell = row.insertCell();
        const qtyDiv = document.createElement('div');
        qtyDiv.style.cssText = 'display: flex; align-items: center; gap: 5px;';
        
        const minusBtn = document.createElement('button');
        minusBtn.className = 'btn btn-small';
        minusBtn.textContent = '-';
        minusBtn.onclick = () => updateQuantity(index, -1);
        
        const qtyInput = document.createElement('input');
        qtyInput.type = 'number';
        qtyInput.value = item.quantity;
        qtyInput.min = 1;
        qtyInput.max = item.maxStock;
        qtyInput.style.cssText = 'width: 50px; text-align: center;';
        qtyInput.onchange = (e) => updateQuantity(index, 0, e.target.value);
        
        const plusBtn = document.createElement('button');
        plusBtn.className = 'btn btn-small';
        plusBtn.textContent = '+';
        plusBtn.onclick = () => updateQuantity(index, 1);
        
        qtyDiv.appendChild(minusBtn);
        qtyDiv.appendChild(qtyInput);
        qtyDiv.appendChild(plusBtn);
        qtyCell.appendChild(qtyDiv);
        
        // Price cell
        const priceCell = row.insertCell();
        priceCell.textContent = `Rs. ${item.price.toFixed(2)}`;
        
        // Total cell
        const totalCell = row.insertCell();
        totalCell.textContent = `Rs. ${item.total.toFixed(2)}`;
        
        // Action cell
        const actionCell = row.insertCell();
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger btn-small';
        removeBtn.textContent = '🗑️';
        removeBtn.onclick = () => removeFromCart(index);
        actionCell.appendChild(removeBtn);
    });
}

// Update quantity
function updateQuantity(index, change, newValue = null) {
    if (newValue !== null) {
        cart[index].quantity = Math.max(1, Math.min(parseInt(newValue) || 1, cart[index].maxStock));
    } else {
        cart[index].quantity = Math.max(1, Math.min(cart[index].quantity + change, cart[index].maxStock));
    }
    cart[index].total = cart[index].quantity * cart[index].price;
    updateCartDisplay();
    updateCartSummary();
}

// Remove from cart
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
    updateCartSummary();
}

// Clear cart
function clearCart() {
    if (confirm('Are you sure you want to clear the cart?')) {
        cart = [];
        updateCartDisplay();
        updateCartSummary();
    }
}

// Update cart summary
function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const discount = parseFloat(document.getElementById('discountInput').value) || 0;
    const discountAmount = (subtotal * discount) / 100;
    const total = subtotal - discountAmount;

    document.getElementById('subtotal').textContent = `Rs. ${subtotal.toFixed(2)}`;
    document.getElementById('discountAmount').textContent = `Rs. ${discountAmount.toFixed(2)}`;
    document.getElementById('totalAmount').textContent = `Rs. ${total.toFixed(2)}`;

    updateChange();
}

// Update change calculation
function updateChange() {
    const total = parseFloat(document.getElementById('totalAmount').textContent.replace('Rs. ', ''));
    const paid = parseFloat(document.getElementById('amountPaid').value) || 0;
    const change = Math.max(0, paid - total);
    document.getElementById('change').textContent = `Rs. ${change.toFixed(2)}`;
}

// Load customer list from backend
async function loadCustomerList(searchTerm = '') {
    const customerListBody = document.getElementById('customerList');
    
    if (!customerListBody) {
        console.error('Customer list not found');
        return;
    }
    
    try {
        customerListBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Loading...</td></tr>';
        
        const params = new URLSearchParams({
            action: 'search_customers',
            search: searchTerm,
            limit: 20
        });
        
        const response = await fetch(`${API_BASE_URL}?${params}`);
        const data = await response.json();
        
        if (data.success) {
            displayCustomerResults(data.customers);
        } else {
            throw new Error(data.error || 'Failed to load customers');
        }
        
    } catch (error) {
        console.error('Failed to load customers:', error);
        customerListBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Failed to load customers</td></tr>';
    }
}

// Display customer search results
function displayCustomerResults(customers) {
    const customerListBody = document.getElementById('customerList');
    customerListBody.innerHTML = '';
    
    if (customers.length === 0) {
        customerListBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No customers found</td></tr>';
        return;
    }
    
    customers.forEach(customer => {
        const row = customerListBody.insertRow();
        
        const nameCell = row.insertCell();
        nameCell.textContent = customer.name;
        
        const phoneCell = row.insertCell();
        phoneCell.textContent = customer.phone;
        
        const actionCell = row.insertCell();
        const selectBtn = document.createElement('button');
        selectBtn.className = 'btn btn-primary btn-small';
        selectBtn.textContent = 'Select';
        selectBtn.onclick = () => selectCustomer(customer);
        actionCell.appendChild(selectBtn);
    });
}

// Select customer
function selectCustomer(customer) {
    selectedCustomer = customer;
    
    // Update UI
    document.getElementById('selectedCustomerInfo').style.display = 'block';
    
    const customerDetails = document.getElementById('customerDetails');
    customerDetails.innerHTML = '';
    
    const nameDiv = document.createElement('div');
    nameDiv.innerHTML = `<strong>${customer.name}</strong> (ID: ${customer.id})`;
    
    const phoneDiv = document.createElement('div');
    phoneDiv.textContent = `Phone: ${customer.phone}`;
    
    if (customer.email) {
        const emailDiv = document.createElement('div');
        emailDiv.textContent = `Email: ${customer.email}`;
        customerDetails.appendChild(emailDiv);
    }
    
    customerDetails.appendChild(nameDiv);
    customerDetails.appendChild(phoneDiv);
    
    // Close modal
    document.getElementById('customerModal').style.display = 'none';
}

// Complete sale transaction
async function completeSale() {
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }

    const total = parseFloat(document.getElementById('totalAmount').textContent.replace('Rs. ', ''));
    const paid = parseFloat(document.getElementById('amountPaid').value) || 0;

    if (paid < total) {
        alert('Insufficient payment amount!');
        return;
    }
 
    try {
        // Prepare sale data
        const saleData = {
            action: 'complete_sale',
            customer_id: selectedCustomer ? selectedCustomer.id : null,
            cart_items: cart.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity
            })),
            payment_method: paymentMethod,
            discount_percent: parseFloat(document.getElementById('discountInput').value) || 0,
            amount_paid: paid
        };

        // Send request to backend
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(saleData)
        });

        const data = await response.json();

        if (data.success) {
            // Show completion modal
            const sale = data.sale;
            document.getElementById('completedSaleId').textContent = sale.sale_id;
            document.getElementById('receiptTotal').textContent = `Rs. ${sale.total_amount.toFixed(2)}`;
            document.getElementById('receiptPaid').textContent = `Rs. ${sale.amount_paid.toFixed(2)}`;
            document.getElementById('receiptChange').textContent = `Rs. ${sale.change_amount.toFixed(2)}`;
            document.getElementById('saleCompleteModal').style.display = 'block';

            // Auto-focus print receipt button
            setTimeout(() => {
                document.getElementById('printReceiptBtn').focus();
            }, 100);

            // Reload medicine search to reflect new stock
            loadMedicineSearch();
        } else {
            throw new Error(data.error || 'Failed to complete sale');
        }

    } catch (error) {
        console.error('Failed to complete sale:', error);
        alert('Failed to complete sale: ' + error.message);
    }
}

// Start new sale
function newSale() {
    cart = [];
    selectedCustomer = null;
    document.getElementById('selectedCustomerInfo').style.display = 'none';
    document.getElementById('medicineSearch').value = '';
    document.getElementById('discountInput').value = '';
    document.getElementById('amountPaid').value = '';
    updateCartDisplay();
    updateCartSummary();
    document.getElementById('saleCompleteModal').style.display = 'none';
    
    // Auto-focus medicine search for next sale
    setTimeout(() => {
        document.getElementById('medicineSearch').focus();
        loadMedicineSearch(''); // Reload all medicines
    }, 100);
}

// Print receipt function
function printReceipt() {
    const saleId = document.getElementById('completedSaleId').textContent;
    const total = document.getElementById('receiptTotal').textContent;
    const paid = document.getElementById('receiptPaid').textContent;
    const change = document.getElementById('receiptChange').textContent;
    
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (printWindow) {
        let receiptHTML = '<!DOCTYPE html><html><head><title>Receipt - ' + saleId + '</title>';
        receiptHTML += '<style>body { margin: 20px; font-family: Arial, sans-serif; } table { width: 100%; border-collapse: collapse; } th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; } .center { text-align: center; } .right { text-align: right; } @media print { body { margin: 0; } }</style>';
        receiptHTML += '</head><body>';
        receiptHTML += '<div class="center"><h2>New Lanka Pharmacy</h2><p>Contact pharmacy for address details</p><p>Tel: Contact pharmacy for phone</p><h3>SALE RECEIPT</h3></div>';
        receiptHTML += '<table><tr><td><strong>Sale ID:</strong></td><td>' + saleId + '</td></tr>';
        receiptHTML += '<tr><td><strong>Date:</strong></td><td>' + new Date().toLocaleDateString() + '</td></tr>';
        receiptHTML += '<tr><td><strong>Time:</strong></td><td>' + new Date().toLocaleTimeString() + '</td></tr>';
        
        if (selectedCustomer) {
            receiptHTML += '<tr><td><strong>Customer:</strong></td><td>' + selectedCustomer.name.replace(/'/g, '&#39;') + '</td></tr>';
            receiptHTML += '<tr><td><strong>Customer ID:</strong></td><td>' + selectedCustomer.id + '</td></tr>';
        } else {
            receiptHTML += '<tr><td><strong>Customer:</strong></td><td>Walk-in Customer</td></tr>';
        }
        
        receiptHTML += '<tr><td><strong>Served By:</strong></td><td>Pharmacist</td></tr></table><br>';
        
        receiptHTML += '<table><thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Unit Price</th><th class="right">Total</th></tr></thead><tbody>';
        cart.forEach(item => {
            receiptHTML += '<tr><td>' + item.name.replace(/'/g, '&#39;') + '<br><small>' + item.brand.replace(/'/g, '&#39;') + '</small></td>';
            receiptHTML += '<td class="center">' + item.quantity + '</td>';
            receiptHTML += '<td class="right">Rs. ' + item.price.toFixed(2) + '</td>';
            receiptHTML += '<td class="right">Rs. ' + item.total.toFixed(2) + '</td></tr>';
        });
        receiptHTML += '</tbody></table><br>';
        
        const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
        const discount = parseFloat(document.getElementById('discountInput').value) || 0;
        const discountAmount = (subtotal * discount) / 100;
        
        receiptHTML += '<table><tr><td><strong>Subtotal:</strong></td><td class="right">Rs. ' + subtotal.toFixed(2) + '</td></tr>';
        if (discount > 0) {
            receiptHTML += '<tr><td><strong>Discount (' + discount + '%):</strong></td><td class="right">Rs. ' + discountAmount.toFixed(2) + '</td></tr>';
        }
        receiptHTML += '<tr style="border-top: 2px solid #333;"><td><strong>TOTAL:</strong></td><td class="right"><strong>' + total + '</strong></td></tr>';
        receiptHTML += '<tr><td><strong>Payment Method:</strong></td><td class="right">' + (paymentMethod === 'cash' ? 'Cash' : 'Card') + '</td></tr>';
        receiptHTML += '<tr><td><strong>Amount Received:</strong></td><td class="right">' + paid + '</td></tr>';
        receiptHTML += '<tr><td><strong>Change:</strong></td><td class="right">' + change + '</td></tr></table>';
        
        receiptHTML += '<div class="center" style="margin-top: 30px;"><p>Thank you for your purchase!</p><p>Please keep this receipt for your records</p>';
        receiptHTML += '<p>Printed on: ' + new Date().toLocaleString().replace(/'/g, '&#39;') + '</p></div>';
        receiptHTML += '</body></html>';
        
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
            // Auto-focus new sale button after printing
            setTimeout(() => {
                document.getElementById('newSaleBtn').focus();
            }, 500);
        }, 500);
    }
}

// Update selected customer info display
function updateSelectedCustomerInfo() {
    if (selectedCustomer) {
        const customerDetails = document.getElementById('customerDetails');
        customerDetails.innerHTML = '';
        
        const nameDiv = document.createElement('div');
        nameDiv.innerHTML = `<strong>${selectedCustomer.name}</strong> (${selectedCustomer.id})`;
        
        const phoneDiv = document.createElement('div');
        phoneDiv.textContent = `Phone: ${selectedCustomer.phone}`;
        
        customerDetails.appendChild(nameDiv);
        customerDetails.appendChild(phoneDiv);
        
        document.getElementById('selectedCustomerInfo').style.display = 'block';
    } else {
        document.getElementById('selectedCustomerInfo').style.display = 'none';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM CONTENT LOADED ===');
    console.log('Starting event listener setup...');
    
    initializePage();
    
    // Auto-focus medicine search on page load
    setTimeout(() => {
        const medicineSearch = document.getElementById('medicineSearch');
        if (medicineSearch) {
            medicineSearch.focus();
            console.log('Medicine search auto-focused');
        } else {
            console.error('Medicine search input not found for auto-focus');
        }
    }, 100);

    // Search functionality - real-time search as user types
    document.getElementById('medicineSearch').addEventListener('input', function() {
        const searchTerm = this.value;
        loadMedicineSearch(searchTerm);
    });

    document.getElementById('medicineSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value;
            loadMedicineSearch(searchTerm);
        }
    });

    // Handle Tab navigation from medicine search to add buttons
    let enterPressCount = 0;
    let enterTimeout;
    
    document.getElementById('medicineSearch').addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const firstAddBtn = document.querySelector('#medicineSearchResults .btn-primary');
            if (firstAddBtn && !firstAddBtn.disabled) {
                firstAddBtn.focus();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            enterPressCount++;
            
            // Clear previous timeout
            if (enterTimeout) {
                clearTimeout(enterTimeout);
            }
            
            // Set timeout to reset count after 1 second
            enterTimeout = setTimeout(() => {
                enterPressCount = 0;
            }, 1000);
            
            // If pressed twice, focus amount paid field
            if (enterPressCount === 2) {
                enterPressCount = 0;
                clearTimeout(enterTimeout);
                document.getElementById('amountPaid').focus();
                document.getElementById('amountPaid').select();
            }
        }
    });

    // Customer functionality
    document.getElementById('selectCustomerBtn').addEventListener('click', function() {
        document.getElementById('customerModal').style.display = 'block';
    });

    document.getElementById('customerModalSearch').addEventListener('input', function() {
        loadCustomerList(this.value);
    });

    // Cart functionality
    document.getElementById('clearCartBtn').addEventListener('click', clearCart);
    document.getElementById('discountInput').addEventListener('input', updateCartSummary);
    document.getElementById('amountPaid').addEventListener('input', updateChange);
    
    // Amount paid Enter key navigation
    document.getElementById('amountPaid').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('completeSaleBtn').focus();
        }
    });

    // Payment method selection
    document.querySelectorAll('.payment-method').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.payment-method').forEach(b => b.classList.remove('btn-primary'));
            this.classList.add('btn-primary');
            paymentMethod = this.dataset.method;
        });
    });

    // Sale completion
    document.getElementById('completeSaleBtn').addEventListener('click', completeSale);
    document.getElementById('newSaleBtn').addEventListener('click', newSale);
    document.getElementById('printReceiptBtn').addEventListener('click', printReceipt);
    
    // Print receipt button keyboard navigation
    document.getElementById('printReceiptBtn').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            printReceipt();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            document.getElementById('newSaleBtn').focus();
        }
    });

    // Quantity modal
    document.getElementById('quantityInput').addEventListener('input', updateItemTotalPrice);
    document.getElementById('addToCartBtn').addEventListener('click', addToCart);
    
    // Quantity modal keyboard navigation
    document.getElementById('quantityInput').addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            document.getElementById('addToCartBtn').focus();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            addToCart();
        }
    });
    
    document.getElementById('addToCartBtn').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addToCart();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            document.getElementById('quantityInput').focus();
        }
    });
    
    // Complete sale button keyboard navigation
    document.getElementById('completeSaleBtn').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            completeSale();
        }
    });
    
    // New sale button keyboard navigation
    document.getElementById('newSaleBtn').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            newSale();
        }
    });

    // Modal close functionality
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    document.getElementById('quantityCancel').addEventListener('click', function() {
        document.getElementById('quantityModal').style.display = 'none';
    });

    document.getElementById('customerModalClose').addEventListener('click', function() {
        document.getElementById('customerModal').style.display = 'none';
    });

    // Add New Customer modal functionality
    document.getElementById('addNewCustomerBtn').addEventListener('click', function() {
        document.getElementById('addCustomerModalTitle').textContent = 'Add New Customer';
        document.getElementById('addModalCustomerName').value = '';
        document.getElementById('addModalContactNumber').value = '';
        document.getElementById('addModalAddress').value = '';
        document.getElementById('addModalDateOfBirth').value = '';
        document.getElementById('addCustomerModal').style.display = 'block';
    });

    document.getElementById('addCustomerModalClose').addEventListener('click', function() {
        document.getElementById('addCustomerModal').style.display = 'none';
    });

    document.getElementById('addCustomerModalCancel').addEventListener('click', function() {
        document.getElementById('addCustomerModal').style.display = 'none';
    });

    document.getElementById('addCustomerModalSave').addEventListener('click', async function() {
        const customerName = document.getElementById('addModalCustomerName').value.trim();
        const contactNumber = document.getElementById('addModalContactNumber').value.trim();
        const address = document.getElementById('addModalAddress').value.trim();
        const dateOfBirth = document.getElementById('addModalDateOfBirth').value;

        // Validation
        if (!customerName) {
            alert('Please enter customer name');
            return;
        }

        if (!contactNumber) {
            alert('Please enter contact number');
            return;
        }

        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'add_customer',
                    name: customerName,
                    phone: contactNumber,
                    email: '', // Optional
                    address: address,
                    date_of_birth: dateOfBirth
                })
            });

            const data = await response.json();

            if (data.success) {
                // Automatically select the new customer
                const newCustomer = {
                    id: data.customer.id,
                    name: data.customer.name,
                    phone: data.customer.phone,
                    email: data.customer.email,
                    address: data.customer.address,
                    date_of_birth: data.customer.date_of_birth
                };
                selectCustomer(newCustomer);
                
                // Refresh customer list for future use
                loadCustomerList();
                
                document.getElementById('addCustomerModal').style.display = 'none';
                alert('Customer added successfully and selected for this sale!');
            } else {
                throw new Error(data.error || 'Failed to add customer');
            }

        } catch (error) {
            console.error('Failed to add customer:', error);
            alert('Failed to add customer: ' + error.message);
        }
    });

    // Add New Medicine modal functionality
    document.getElementById('addNewMedicineBtn').addEventListener('click', function() {
        document.getElementById('addModalMedicineName').value = '';
        document.getElementById('addModalCategory').value = '';
        document.getElementById('addModalMedicineStock').value = '';
        document.getElementById('addModalMedicinePrice').value = '';
        document.getElementById('addModalMedicineBrand').value = '';
        document.getElementById('addModalMedicineExpiry').value = '';
        document.getElementById('addMedicineModal').style.display = 'block';
    });

    document.getElementById('addMedicineModalClose').addEventListener('click', function() {
        document.getElementById('addMedicineModal').style.display = 'none';
    });

    document.getElementById('addMedicineModalCancel').addEventListener('click', function() {
        document.getElementById('addMedicineModal').style.display = 'none';
    });

    document.getElementById('addMedicineModalSave').addEventListener('click', async function() {
        const medicineName = document.getElementById('addModalMedicineName').value.trim();
        const category = document.getElementById('addModalCategory').value;
        const medicineStock = parseInt(document.getElementById('addModalMedicineStock').value);
        const medicinePrice = parseFloat(document.getElementById('addModalMedicinePrice').value);
        const medicineBrand = document.getElementById('addModalMedicineBrand').value.trim();
        const medicineExpiry = document.getElementById('addModalMedicineExpiry').value;

        // Validation
        if (!medicineName) {
            alert('Please enter medicine name');
            return;
        }

        if (!category) {
            alert('Please select a category');
            return;
        }

        if (isNaN(medicineStock) || medicineStock < 0) {
            alert('Please enter valid stock quantity');
            return;
        }

        if (isNaN(medicinePrice) || medicinePrice <= 0) {
            alert('Please enter valid price');
            return;
        }

        if (!medicineBrand) {
            alert('Please enter brand or supplier');
            return;
        }

        if (!medicineExpiry) {
            alert('Please select expiry date');
            return;
        }

        // Check if expiry date is in the future
        const expiryDate = new Date(medicineExpiry);
        const today = new Date();
        if (expiryDate <= today) {
            alert('Expiry date must be in the future');
            return;
        }

        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'add_medicine',
                    name: medicineName,
                    brand: medicineBrand,
                    category: category,
                    stock: medicineStock,
                    price: medicinePrice,
                    expiry_date: medicineExpiry
                })
            });

            const data = await response.json();

            if (data.success) {
                // Refresh medicine search results
                const searchTerm = document.getElementById('medicineSearch').value;
                loadMedicineSearch(searchTerm);

                document.getElementById('addMedicineModal').style.display = 'none';
                alert('Medicine added successfully!');
            } else {
                throw new Error(data.error || 'Failed to add medicine');
            }

        } catch (error) {
            console.error('Failed to add medicine:', error);
            alert('Failed to add medicine: ' + error.message);
        }
    });

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
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
                window.location.href = 'index.html';
            }
        });
    }
    
    console.log('=== ALL EVENT LISTENERS SETUP COMPLETE ===');
    console.log('System ready for user interaction');
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

setInterval(updateTime, 1000);
updateTime();

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

updateGreeting();
