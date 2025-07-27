import sessionService from '../services/session.js';
import firebaseService from '../services/firebase.js';

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
 * Generate a simple JWT-like token
 * @param {Object} payload - Token payload
 * @returns {string} - Generated token
 */
function generateToken(payload) {
    const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'none' }));
    const payloadStr = btoa(JSON.stringify({
        ...payload,
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }));
    return `${header}.${payloadStr}.signature`;
}

/**
 * Login user with credentials using Firebase
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} - Login result
 */
export async function login(username, password) {
    try {
        // Hash the password for comparison
        const hashedPassword = await hashPassword(password);

        // Get user from Firebase
        const user = await firebaseService.getUserByUsername(username);

        if (!user) {
            return { success: false, error: 'Credenziali non valide' };
        }

        // Compare hashed passwords
        if (user.password !== hashedPassword) {
            return { success: false, error: 'Credenziali non valide' };
        }

        // Generate token
        const token = generateToken({
            username: user.username,
            role: user.role,
            userId: user.id
        });

        // Save session
        sessionService.saveSession(token, {
            id: user.id,
            username: user.username,
            role: user.role
        });

        return { 
            success: true, 
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        };

    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Errore durante il login. Riprova.' };
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