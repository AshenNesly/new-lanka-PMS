// Enhanced form validation and submission with PHP backend integration
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginButton = document.getElementById('loginButton');
    const buttonText = loginButton.querySelector('.button-text');
    const loadingSpinner = loginButton.querySelector('.loading-spinner');
    const messageContainer = document.getElementById('loginMessage');
    const messageText = document.getElementById('messageText');
    
    // Clear previous error messages
    clearErrors();
    
    // Validate inputs
    if (!validateForm(username, password)) {
        return;
    }
    
    // Show loading state
    showLoading(loginButton, buttonText, loadingSpinner);
    
    // Create form data
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    // Send AJAX request to PHP backend
    fetch('php/login_handler.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        hideLoading(loginButton, buttonText, loadingSpinner);
        
        if (data.success) {
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 1000);
        } else {
            showMessage(data.message || 'Login failed. Please try again.', 'error');
        }
    })
    .catch(error => {
        hideLoading(loginButton, buttonText, loadingSpinner);
        console.error('Login error:', error);
        showMessage('An error occurred. Please try again.', 'error');
    });
});

// Validate form inputs
function validateForm(username, password) {
    let isValid = true;
    
    if (username === '') {
        showFieldError('usernameError', 'Username is required');
        isValid = false;
    } else if (username.length < 3) {
        showFieldError('usernameError', 'Username must be at least 3 characters');
        isValid = false;
    }
    
    if (password === '') {
        showFieldError('passwordError', 'Password is required');
        isValid = false;
    } else if (password.length < 3) {
        showFieldError('passwordError', 'Password must be at least 3 characters');
        isValid = false;
    }
    
    return isValid;
}

// Show field-specific error
function showFieldError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Clear all error messages
function clearErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.textContent = '';
        element.style.display = 'none';
    });
    
    const messageContainer = document.getElementById('loginMessage');
    if (messageContainer) {
        messageContainer.style.display = 'none';
    }
}

// Show general message
function showMessage(message, type) {
    const messageContainer = document.getElementById('loginMessage');
    const messageText = document.getElementById('messageText');
    
    if (messageContainer && messageText) {
        messageText.textContent = message;
        messageContainer.className = `message-container ${type}`;
        messageContainer.style.display = 'block';
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                messageContainer.style.display = 'none';
            }, 3000);
        }
    }
}

// Show loading state
function showLoading(button, textElement, spinner) {
    button.disabled = true;
    textElement.style.display = 'none';
    spinner.style.display = 'block';
    button.style.opacity = '0.7';
}

// Hide loading state
function hideLoading(button, textElement, spinner) {
    button.disabled = false;
    textElement.style.display = 'block';
    spinner.style.display = 'none';
    button.style.opacity = '1';
}

// Add interactive effects
const inputs = document.querySelectorAll('.form-input');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.classList.remove('focused');
    });
});

// Update time display
function updateDateTime() {
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
    
    // Update if elements exist
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');
    
    if (timeElement) timeElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
}

// Set greeting based on time
function setGreeting() {
    const hour = new Date().getHours();
    const greetingElement = document.querySelector('.login-header h2');
    
    if (hour < 12) {
        greetingElement.textContent = 'Good Morning!';
    } else if (hour < 17) {
        greetingElement.textContent = 'Good Afternoon!';
    } else {
        greetingElement.textContent = 'Good Evening!';
    }
}

// Initialize
setGreeting();
updateDateTime();
setInterval(updateDateTime, 1000);
