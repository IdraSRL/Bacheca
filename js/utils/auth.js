import sessionService from '../services/session.js';

/**
 * Authentication Utilities
 */

/**
 * Hash password using SHA-256
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Login user with credentials
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} - Login result
 */
export async function login(username, password) {
    try {
        // Hash the password
        const hashedPassword = await hashPassword(password);

        // Send login request to PHP backend
        const response = await fetch('php/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'login',
                username,
                password: hashedPassword
            })
        });

        const result = await response.json();

        if (result.success) {
            // Save session
            sessionService.saveSession(result.token, result.user);
            return { success: true, user: result.user };
        } else {
            return { success: false, error: result.error || 'Login failed' };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Network error. Please try again.' };
    }
}

/**
 * Logout current user
 * @returns {boolean} - True if logout successful
 */
export function logout() {
    try {
        sessionService.clearSession();
        return true;
    } catch (error) {
        console.error('Logout error:', error);
        return false;
    }
}

/**
 * Check if user is authenticated and redirect if not
 * @param {string} redirectUrl - URL to redirect to if not authenticated
 */
export function requireAuth(redirectUrl = 'index.html') {
    if (!sessionService.isAuthenticated()) {
        window.location.href = redirectUrl;
        return false;
    }
    return true;
}

/**
 * Check if user has admin role and redirect if not
 * @param {string} redirectUrl - URL to redirect to if not admin
 */
export function requireAdmin(redirectUrl = 'dashboard.html') {
    if (!sessionService.isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    
    if (!sessionService.isAdmin()) {
        window.location.href = redirectUrl;
        return false;
    }
    
    return true;
}

/**
 * Check if user has client role and redirect if not
 * @param {string} redirectUrl - URL to redirect to if not client
 */
export function requireClient(redirectUrl = 'admin.html') {
    if (!sessionService.isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    
    if (!sessionService.isClient()) {
        window.location.href = redirectUrl;
        return false;
    }
    
    return true;
}

/**
 * Get authorization headers for API requests
 * @returns {Object} - Headers object with authorization
 */
export function getAuthHeaders() {
    const token = sessionService.getToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Auto-redirect based on user role
 */
export function redirectByRole() {
    if (!sessionService.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    const user = sessionService.getUser();
    if (user.role === 'admin') {
        window.location.href = 'admin.html';
    } else if (user.role === 'client') {
        window.location.href = 'dashboard.html';
    }
}