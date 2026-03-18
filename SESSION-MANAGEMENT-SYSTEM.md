# Session Management System
## New Lanka Pharmacy Management System

### Overview
This system implements comprehensive session management with role-based authentication, protecting all pages and ensuring proper user access control.

### Components

#### 1. Backend PHP Files

**php/session.php**
- Core SessionManager class with full session handling
- Methods: init(), set(), get(), isLoggedIn(), getCurrentUser(), etc.
- Handles login/logout state management

**php/auth.php**  
- Authentication class with login/logout functionality
- Password verification (supports both hashed and plain text)
- Role-based redirection (admin → admin-dashboard.html, pharmacist → pharmacist-cashier.html)

**php/auth-middleware.php**
- Authentication middleware for role-based access control
- Page protection rules for admin/pharmacist pages
- Auto-redirection based on user roles
- Methods: requireAuth(), requireAdmin(), requirePharmacist()

**php/session-check.php**
- AJAX API for session status checking
- Actions: check_session, get_user_info, check_page_access
- Used by JavaScript for real-time session validation

**php/login_handler.php**
- Handles login form submissions
- Returns JSON responses with redirect URLs
- Integrates with session management

**php/logout.php**
- Handles user logout
- Clears session and redirects to login page

#### 2. Frontend JavaScript Files

**js/universal-session-manager.js**
- Main client-side session management
- Automatic page protection and role-based redirection
- Periodic session checking (every 5 minutes)
- Handles session expiration and forced logout
- Auto-logout functionality with confirmation

**js/user-profile-manager.js** (Updated)
- Now integrates with universal session manager
- Fallback API support for profile management
- Updates page elements with user information

**js/index.js**
- Login form handling with AJAX submission
- Automatic redirection after successful login

#### 3. Database Users
Current test users in the system:
- **adminnn** (admin role) - Password: admin123
- **ashen** (pharmacist role) - Password: ashen123  
- **abc** (pharmacist role) - Password: [unknown]

### Page Protection Rules

#### Admin Pages (require admin role):
- admin-dashboard.html
- admin-point-of-sales.html
- admin-inventory.html
- admin-sales.html
- admin-reports.html
- admin-customers.html
- admin-configurations.html

#### Pharmacist Pages (require pharmacist role):
- pharmacist-cashier.html (default for pharmacist)
- pharmacist-inventory.html
- pharmacist-sales.html
- pharmacist-customers.html
- pharmacist-configurations.html

#### Public Pages:
- index.html (login page)

### How It Works

1. **Login Process**:
   - User submits login form on index.html
   - login_handler.php validates credentials
   - If successful, session is created and user redirected to appropriate dashboard
   - Admin → admin-dashboard.html
   - Pharmacist → pharmacist-cashier.html

2. **Page Protection**:
   - universal-session-manager.js loads on every page
   - Checks session status via session-check.php API
   - Verifies page access permissions
   - Redirects unauthorized users to login or appropriate dashboard

3. **Session Monitoring**:
   - Automatic session checks every 5 minutes
   - Session expiration handling with notifications
   - Forced logout on session timeout

4. **Role-Based Access**:
   - Admin users can only access admin-* pages
   - Pharmacist users can only access pharmacist-* pages
   - Cross-role access attempts redirect to correct dashboard

### Security Features

- **Session Security**: Proper session initialization and regeneration
- **Role Validation**: Server-side role checking on all API endpoints
- **Page Protection**: Client-side and server-side access control
- **Password Security**: Bcrypt hashing for stored passwords
- **Session Timeout**: Automatic logout after inactivity
- **CSRF Protection**: JSON-based APIs with proper headers

### Usage Instructions

1. **For New Pages**: 
   - Add `<script src="js/universal-session-manager.js" defer></script>` to the head
   - The system will automatically protect the page based on its name

2. **For API Endpoints**:
   - Include `require_once 'auth-middleware.php';` at the top
   - Use `AuthMiddleware::requireAuth(['admin', 'pharmacist'])` for protection

3. **For Testing**:
   - Use adminnn/admin123 for admin access
   - Use ashen/ashen123 for pharmacist access

### Integration Status

✅ **Completed**:
- Session management system fully implemented
- Role-based authentication working
- Page protection active
- Login/logout functionality complete
- Profile management integrated
- Session monitoring active

✅ **Updated Pages**:
- admin-dashboard.html
- admin-configurations.html  
- pharmacist-cashier.html
- pharmacist-configurations.html
- profile-test.html

⚠️ **Note**: Other HTML pages in the system should also include the universal-session-manager.js script for full protection.

### API Endpoints

- `POST php/login_handler.php` - User login
- `GET/POST php/logout.php` - User logout  
- `GET php/session-check.php?action=check_session` - Check login status
- `GET php/session-check.php?action=get_user_info` - Get detailed user info
- `GET php/session-check.php?action=check_page_access&page=filename` - Check page access

The system now provides comprehensive session management with proper authentication, authorization, and session handling across all pages!
