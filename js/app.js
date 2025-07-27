import { login, redirectByRole } from './utils/auth.js';
import sessionService from './services/session.js';
import { showToast, toggleButtonLoading, initUI } from './utils/ui.js';

/**
 * Main App Module - Login Page
 */
class App {
    constructor() {
        this.init();
    }

    init() {
        // Check if user is already authenticated
        if (sessionService.isAuthenticated()) {
            redirectByRole();
            return;
        }

        this.initEventListeners();
        initUI();
        sessionService.startAutoRefresh();
    }

    initEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Enter key on form fields
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.closest('#loginForm')) {
                e.preventDefault();
                this.handleLogin();
            }
        });
    }

    async handleLogin(e) {
        if (e) e.preventDefault();

        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const loginBtn = document.querySelector('#loginForm button[type="submit"]');

        if (!usernameInput || !passwordInput) {
            showToast('Errore nel form di login', 'error');
            return;
        }

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        // Validation
        if (!username) {
            showToast('Inserisci il nome utente', 'warning');
            usernameInput.focus();
            return;
        }

        if (!password) {
            showToast('Inserisci la password', 'warning');
            passwordInput.focus();
            return;
        }

        // Show loading state
        toggleButtonLoading(loginBtn, true);

        try {
            const result = await login(username, password);

            if (result.success) {
                showToast(`Benvenuto, ${result.user.username}!`, 'success');
                
                // Small delay for better UX
                setTimeout(() => {
                    redirectByRole();
                }, 1000);
            } else {
                showToast(result.error || 'Credenziali non valide', 'error');
                passwordInput.focus();
                passwordInput.select();
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Errore durante il login. Riprova.', 'error');
        } finally {
            toggleButtonLoading(loginBtn, false);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});