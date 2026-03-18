// Admin Configurations JavaScript
// Updated to work with existing database structure

// Configuration
const API_BASE_URL = 'php/admin-configurations-simple.php';
let currentUsers = [];
let currentEditingUserId = null;

// Load admin profile
async function loadAdminProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}?action=get_admin_profile`);
        const data = await response.json();
        
        if (data.success) {
            const admin = data.data;
            
            // Update admin profile display 
            document.getElementById('displayAdminName').textContent = admin.user_name;
            
            // Update sidebar admin info - only update the name, keep role as "Admin"
            const sidebarAdminName = document.getElementById('sidebarAdminName');
            
            if (sidebarAdminName) {
                sidebarAdminName.textContent = admin.user_name;
            }
            // Note: sidebarAdminRole should always stay as "Admin" (role, not username)
            
            // Update profile image with error handling
            const profilePreview = document.getElementById('adminProfilePreview');
            const sidebarAvatar = document.querySelector('.admin-avatar');
            
            if (profilePreview) {
                profilePreview.src = admin.profile_img;
                profilePreview.onerror = function() {
                    this.src = 'img/default-profile.png';
                };
            }
            if (sidebarAvatar) {
                sidebarAvatar.src = admin.profile_img;
                sidebarAvatar.onerror = function() {
                    this.src = 'img/default-profile.png';
                };
            }
            
        } else {
            console.error('Failed to load admin profile:', data.error);
            alert('Failed to load admin profile: ' + data.error);
        }
    } catch (error) {
        console.error('Error loading admin profile:', error);
        alert('Error loading admin profile: ' + error.message);
    }
}

// Upload profile photo
async function uploadProfilePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('action', 'upload_admin_photo');
    formData.append('profile_photo', file);
    
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Profile photo updated successfully!');
            loadAdminProfile(); // Reload to show new image
            
            // Also refresh the global user profile manager
            if (window.userProfileManager) {
                window.userProfileManager.loadCurrentUser();
            }
        } else {
            throw new Error(data.error || 'Failed to upload photo');
        }
    } catch (error) {
        console.error('Failed to upload photo:', error);
        alert('Failed to upload photo: ' + error.message);
    }
}

// Load users table (pharmacists only)
async function loadUsersTable() {
    try {
        const response = await fetch(`${API_BASE_URL}?action=get_users`);
        const data = await response.json();
        
        if (data.success) {
            currentUsers = data.data;
            displayUsersInTable(data.data);
        } else {
            throw new Error(data.error || 'Failed to load users');
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        alert('Failed to load users: ' + error.message);
    }
}

// Display users in table
function displayUsersInTable(users) {
    const tableBody = document.getElementById('usersTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <img src="${user.profile_img}" alt="Profile" 
                     style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;"
                     onerror="this.src='img/default-profile.png'">
            </td>
            <td>${user.user_name}</td>
            <td>••••••••</td>
            <td>
                <span class="status-badge ${user.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${user.status}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editUser(${user.user_id})" title="Edit User">
                    ✏️ Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.user_id})" title="Delete User">
                    🗑️ Delete
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Add new user (pharmacist)
async function addUser() {
    const user_name = document.getElementById('modalUsername').value.trim();
    const password = document.getElementById('modalPassword').value;
    const status = document.getElementById('modalStatus').value;
    
    if (!user_name || !password) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'add_user',
                user_name: user_name,
                password: password,
                status: status
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Pharmacist user added successfully!');
            document.getElementById('userModal').style.display = 'none';
            clearUserForm();
            loadUsersTable();
        } else {
            throw new Error(data.error || 'Failed to add user');
        }
    } catch (error) {
        console.error('Failed to add user:', error);
        alert('Failed to add user: ' + error.message);
    }
}

// Edit user
function editUser(userId) {
    const user = currentUsers.find(u => u.user_id == userId);
    if (!user) return;
    
    currentEditingUserId = userId;
    document.getElementById('modalTitle').textContent = 'Edit Pharmacist User';
    document.getElementById('modalUsername').value = user.user_name;
    document.getElementById('modalPassword').value = ''; // Don't show password
    document.getElementById('modalStatus').value = user.status;
    document.getElementById('userModal').style.display = 'block';
}

// Update user
async function updateUser() {
    const user_name = document.getElementById('modalUsername').value.trim();
    const password = document.getElementById('modalPassword').value;
    const status = document.getElementById('modalStatus').value;
    
    if (!user_name) {
        alert('Username is required');
        return;
    }
    
    try {
        const body = new URLSearchParams({
            action: 'update_user',
            user_id: currentEditingUserId,
            user_name: user_name,
            status: status
        });
        
        // Only include password if it's provided
        if (password) {
            body.append('password', password);
        }
        
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('User updated successfully!');
            document.getElementById('userModal').style.display = 'none';
            clearUserForm();
            loadUsersTable();
        } else {
            throw new Error(data.error || 'Failed to update user');
        }
    } catch (error) {
        console.error('Failed to update user:', error);
        alert('Failed to update user: ' + error.message);
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this pharmacist user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}?action=delete_user&user_id=${userId}`, {
            method: 'GET'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('User deleted successfully!');
            loadUsersTable();
        } else {
            throw new Error(data.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Failed to delete user:', error);
        alert('Failed to delete user: ' + error.message);
    }
}

// Toggle user status
async function toggleUserStatus(userId) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'toggle_user_status',
                user_id: userId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadUsersTable();
        } else {
            throw new Error(data.error || 'Failed to update user status');
        }
    } catch (error) {
        console.error('Failed to toggle user status:', error);
        alert('Failed to update user status: ' + error.message);
    }
}

// Save admin profile
async function saveAdminProfile() {
    const user_name = document.getElementById('modalAdminName').value.trim();
    const current_password = document.getElementById('modalCurrentPassword').value;
    const new_password = document.getElementById('modalNewPassword').value;
    const confirm_password = document.getElementById('modalConfirmPassword').value;
    
    if (!user_name) {
        alert('Admin name is required');
        return;
    }
    
    // Check if passwords match when changing password
    if (new_password && new_password !== confirm_password) {
        alert('New passwords do not match');
        return;
    }
    
    try {
        const body = new URLSearchParams({
            action: 'update_admin_profile',
            user_name: user_name
        });
        
        // Add password fields if changing password
        if (new_password) {
            body.append('current_password', current_password);
            body.append('new_password', new_password);
        }
        
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Admin profile updated successfully!');
            document.getElementById('adminModal').style.display = 'none';
            clearAdminForm();
            loadAdminProfile();
        } else {
            throw new Error(data.error || 'Failed to update admin profile');
        }
    } catch (error) {
        console.error('Failed to update admin profile:', error);
        alert('Failed to update admin profile: ' + error.message);
    }
}

// Clear user form
function clearUserForm() {
    document.getElementById('modalUsername').value = '';
    document.getElementById('modalPassword').value = '';
    document.getElementById('modalStatus').value = 'active';
    currentEditingUserId = null;
}

// Clear admin form
function clearAdminForm() {
    document.getElementById('modalAdminName').value = '';
    document.getElementById('modalCurrentPassword').value = '';
    document.getElementById('modalNewPassword').value = '';
    document.getElementById('modalConfirmPassword').value = '';
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadAdminProfile();
    loadUsersTable();
    
    // Profile photo change handler
    document.getElementById('changeProfilePicBtn').addEventListener('click', function() {
        document.getElementById('adminProfileInput').click();
    });
    
    document.getElementById('adminProfileInput').addEventListener('change', uploadProfilePhoto);
    
    // Edit admin profile button handler
    document.getElementById('editAdminBtn').addEventListener('click', function() {
        // Populate current admin name
        const currentAdminName = document.getElementById('displayAdminName').textContent;
        document.getElementById('modalAdminName').value = currentAdminName;
        document.getElementById('adminModal').style.display = 'block';
    });
    
    // Add user button handler
    document.getElementById('addUserBtn').addEventListener('click', function() {
        currentEditingUserId = null;
        document.getElementById('modalTitle').textContent = 'Add New Pharmacist User';
        clearUserForm();
        document.getElementById('userModal').style.display = 'block';
    });
    
    // Modal close handlers for user modal
    document.getElementById('modalClose').addEventListener('click', function() {
        document.getElementById('userModal').style.display = 'none';
    });
    
    document.getElementById('modalCancel').addEventListener('click', function() {
        document.getElementById('userModal').style.display = 'none';
    });
    
    // Modal close handlers for admin modal
    document.getElementById('adminModalClose').addEventListener('click', function() {
        document.getElementById('adminModal').style.display = 'none';
    });
    
    document.getElementById('adminModalCancel').addEventListener('click', function() {
        document.getElementById('adminModal').style.display = 'none';
    });
    
    // Save user button handler
    document.getElementById('modalSave').addEventListener('click', function() {
        if (currentEditingUserId) {
            updateUser();
        } else {
            addUser();
        }
    });
    
    // Save admin profile button handler
    document.getElementById('adminModalSave').addEventListener('click', function() {
        saveAdminProfile();
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const userModal = document.getElementById('userModal');
        const adminModal = document.getElementById('adminModal');
        
        if (event.target === userModal) {
            userModal.style.display = 'none';
        }
        if (event.target === adminModal) {
            adminModal.style.display = 'none';
        }
    });
});

// Global functions for button clicks
window.editUser = editUser;
window.deleteUser = deleteUser;
window.toggleUserStatus = toggleUserStatus;
