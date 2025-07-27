/**
 * Session Service
 * Manages user authentication sessions using localStorage
 */
class SessionService {
    constructor() {
        this.TOKEN_KEY = 'bacheca_auth_token';
        this.USER_KEY = 'bacheca_user_data';
        this.SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }

    /**
     * Save user session
     * @param {string} token - JWT token
     * @param {Object} userData - User data object
     */
    saveSession(token, userData) {
        try {
            const sessionData = {
                token,
                userData,
                timestamp: Date.now()
            };

            localStorage.setItem(this.TOKEN_KEY, token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(sessionData));
            
            return true;
        } catch (error) {
            console.error('Error saving session:', error);
            return false;
        }
    }

    /**
     * Get current session token
     * @returns {string|null} - JWT token or null if not found/expired
     */
    getToken() {
        try {
            const token = localStorage.getItem(this.TOKEN_KEY);
            
            if (!token) {
                return null;
            }

            // Check if session is expired
            if (this.isSessionExpired()) {
                this.clearSession();
                return null;
            }

            return token;
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    }

    /**
     * Get current user data
     * @returns {Object|null} - User data object or null if not found/expired
     */
    getUser() {
        try {
            const userDataStr = localStorage.getItem(this.USER_KEY);
            
            if (!userDataStr) {
                return null;
            }

            const sessionData = JSON.parse(userDataStr);

            // Check if session is expired
            if (this.isSessionExpired()) {
                this.clearSession();
                return null;
            }

            return sessionData.userData;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} - True if user is authenticated and session is valid
     */
    isAuthenticated() {
        const token = this.getToken();
        const user = this.getUser();
        
        return !!(token && user && !this.isSessionExpired());
    }

    /**
     * Check if current user has admin role
     * @returns {boolean} - True if user is admin
     */
    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    }

    /**
     * Check if current user has client role
     * @returns {boolean} - True if user is client
     */
    isClient() {
        const user = this.getUser();
        return user && user.role === 'client';
    }

    /**
     * Get current user's username
     * @returns {string|null} - Username or null if not authenticated
     */
    getUsername() {
        const user = this.getUser();
        return user ? user.username : null;
    }

    /**
     * Check if session is expired
     * @returns {boolean} - True if session is expired
     */
    isSessionExpired() {
        try {
            const userDataStr = localStorage.getItem(this.USER_KEY);
            
            if (!userDataStr) {
                return true;
            }

            const sessionData = JSON.parse(userDataStr);
            const currentTime = Date.now();
            const sessionTime = sessionData.timestamp || 0;
            
            return (currentTime - sessionTime) > this.SESSION_TIMEOUT;
        } catch (error) {
            console.error('Error checking session expiration:', error);
            return true;
        }
    }

    /**
     * Update session timestamp (extend session)
     */
    refreshSession() {
        try {
            const userDataStr = localStorage.getItem(this.USER_KEY);
            
            if (userDataStr) {
                const sessionData = JSON.parse(userDataStr);
                sessionData.timestamp = Date.now();
                localStorage.setItem(this.USER_KEY, JSON.stringify(sessionData));
            }
        } catch (error) {
            console.error('Error refreshing session:', error);
        }
    }

    /**
     * Clear current session
     */
    clearSession() {
        try {
            localStorage.removeItem(this.TOKEN_KEY);
            localStorage.removeItem(this.USER_KEY);
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    }

    /**
     * Auto-refresh session on user activity
     */
    startAutoRefresh() {
        // Refresh session on user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        let refreshTimer = null;
        
        const refreshSession = () => {
            if (this.isAuthenticated()) {
                this.refreshSession();
            }
        };

        const debouncedRefresh = () => {
            clearTimeout(refreshTimer);
            refreshTimer = setTimeout(refreshSession, 5000); // Refresh after 5 seconds of inactivity
        };

        events.forEach(event => {
            document.addEventListener(event, debouncedRefresh, { passive: true });
        });

        // Initial refresh
        if (this.isAuthenticated()) {
            this.refreshSession();
        }
    }

    /**
     * Validate JWT token structure (basic validation)
     * @param {string} token - JWT token to validate
     * @returns {boolean} - True if token structure is valid
     */
    validateTokenStructure(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }

        const parts = token.split('.');
        return parts.length === 3;
    }

    /**
     * Decode JWT payload (without verification)
     * @param {string} token - JWT token
     * @returns {Object|null} - Decoded payload or null if invalid
     */
    decodeTokenPayload(token) {
        try {
            if (!this.validateTokenStructure(token)) {
                return null;
            }

            const payload = token.split('.')[1];
            const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Error decoding token payload:', error);
            return null;
        }
    }

    /**
     * Check if token is expired based on JWT exp claim
     * @param {string} token - JWT token
     * @returns {boolean} - True if token is expired
     */
    isTokenExpired(token) {
        try {
            const payload = this.decodeTokenPayload(token);
            
            if (!payload || !payload.exp) {
                return true;
            }

            const currentTime = Math.floor(Date.now() / 1000);
            return currentTime >= payload.exp;
        } catch (error) {
            console.error('Error checking token expiration:', error);
            return true;
        }
    }

    /**
     * Get session info for debugging
     * @returns {Object} - Session information
     */
    getSessionInfo() {
        return {
            hasToken: !!localStorage.getItem(this.TOKEN_KEY),
            hasUserData: !!localStorage.getItem(this.USER_KEY),
            isAuthenticated: this.isAuthenticated(),
            isExpired: this.isSessionExpired(),
            user: this.getUser(),
            tokenStructureValid: this.validateTokenStructure(this.getToken())
        };
    }
}

// Export singleton instance
export default new SessionService();