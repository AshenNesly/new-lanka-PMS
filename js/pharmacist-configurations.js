/**
 * Pharmacist Configurations JavaScript
 * New Lanka Pharmacy Management System
 * 
 * Handles pharmacist profile picture uploads only
 * Profile editing is restricted for pharmacist users
 */

// Load pharmacist profile on page load
function loadPharmacistProfile() {
    fetch('php/pharmacist-configurations.php?action=get_pharmacist_profile')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const pharmacist = data.data;
                
                // Update display elements
                document.getElementById('displayPharmacistName').textContent = pharmacist.user_name;
                document.getElementById('sidebarPharmacistName').textContent = pharmacist.user_name;
                
                // Update profile images with cache busting
                const timestamp = new Date().getTime();
                const profileImagePath = pharmacist.profile_img + '?t=' + timestamp;
                
                const profilePreview = document.getElementById('pharmacistProfilePreview');
                const sidebarAvatar = document.querySelector('.pharmacist-avatar');
                
                if (profilePreview) {
                    profilePreview.src = profileImagePath;
                }
                if (sidebarAvatar) {
                    sidebarAvatar.src = profileImagePath;
                }
                
                console.log('Pharmacist profile loaded successfully');
            } else {
                console.error('Failed to load pharmacist profile:', data.error);
                showNotification('Failed to load pharmacist profile', 'error');
            }
        })
        .catch(error => {
            console.error('Error loading pharmacist profile:', error);
            showNotification('Error loading pharmacist profile', 'error');
        });
}

// Handle profile picture upload
function uploadProfilePhoto(file) {
    const formData = new FormData();
    formData.append('profile_photo', file);
    formData.append('action', 'upload_pharmacist_photo');
    
    // Show loading state
    const changeBtn = document.getElementById('changeProfilePicBtn');
    const originalText = changeBtn.textContent;
    changeBtn.textContent = '📤 Uploading...';
    changeBtn.disabled = true;
    
    fetch('php/pharmacist-configurations.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update profile images immediately with cache busting
            const timestamp = new Date().getTime();
            const profileImagePath = data.image_path + '?t=' + timestamp;
            
            const profilePreview = document.getElementById('pharmacistProfilePreview');
            const sidebarAvatar = document.querySelector('.pharmacist-avatar');
            
            if (profilePreview) {
                profilePreview.src = profileImagePath;
            }
            if (sidebarAvatar) {
                sidebarAvatar.src = profileImagePath;
            }
            
            // Refresh global profile manager if available
            if (window.profileManager && typeof window.profileManager.refreshCurrentUser === 'function') {
                window.profileManager.refreshCurrentUser();
            }
            
            showNotification('Profile picture updated successfully!', 'success');
            console.log('Profile picture uploaded successfully');
        } else {
            console.error('Failed to upload profile picture:', data.error);
            showNotification('Failed to upload profile picture: ' + data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error uploading profile picture:', error);
        showNotification('Error uploading profile picture', 'error');
    })
    .finally(() => {
        // Reset button state
        changeBtn.textContent = originalText;
        changeBtn.disabled = false;
    });
}

// Show notification function
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // Set background color based on type
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        default:
            notification.style.backgroundColor = '#2196F3';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Pharmacist configurations page loaded');
    
    // Load initial data
    loadPharmacistProfile();
    
    // Set up profile picture upload
    const profileInput = document.getElementById('pharmacistProfileInput');
    const changeProfileBtn = document.getElementById('changeProfilePicBtn');
    
    if (changeProfileBtn && profileInput) {
        changeProfileBtn.addEventListener('click', function() {
            profileInput.click();
        });
        
        profileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Validate file type
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
                const fileType = file.type.toLowerCase();
                
                if (!allowedTypes.includes(fileType)) {
                    showNotification('Please select a valid image file (JPEG, PNG, or GIF)', 'error');
                    return;
                }
                
                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showNotification('File size must be less than 5MB', 'error');
                    return;
                }
                
                uploadProfilePhoto(file);
            }
        });
    }
    
    // Set up logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                window.location.href = 'login.html';
            }
        });
    }
    
    // Set up admin menu toggle
    const adminMenuBtn = document.getElementById('adminMenuBtn');
    const adminDropdown = document.getElementById('adminDropdown');
    
    if (adminMenuBtn && adminDropdown) {
        adminMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            adminDropdown.style.display = adminDropdown.style.display === 'block' ? 'none' : 'block';
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', function() {
            adminDropdown.style.display = 'none';
        });
    }
    
    console.log('Pharmacist configurations initialized - Profile picture upload only');
});
