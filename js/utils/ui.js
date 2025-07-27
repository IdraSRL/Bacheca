/**
 * UI Utilities
 * Common functions for UI interactions and notifications
 */

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
export function showToast(message, type = 'info', duration = 4000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    
    toast.innerHTML = `
        <div class="toast__message">${message}</div>
    `;

    toastContainer.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }, duration);

    // Allow manual close on click
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    });
}

/**
 * Show/hide loading spinner on button
 * @param {HTMLElement} button - Button element
 * @param {boolean} loading - Show or hide loading state
 */
export function toggleButtonLoading(button, loading = true) {
    if (!button) return;

    const text = button.querySelector('.btn__text');
    const spinner = button.querySelector('.spinner');

    if (loading) {
        button.disabled = true;
        if (text) text.style.opacity = '0.5';
        if (spinner) spinner.classList.remove('spinner--hidden');
    } else {
        button.disabled = false;
        if (text) text.style.opacity = '1';
        if (spinner) spinner.classList.add('spinner--hidden');
    }
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format price for display
 * @param {number|string} price - Price value
 * @returns {string} - Formatted price string
 */
export function formatPrice(price) {
    const numPrice = parseFloat(price) || 0;
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(numPrice);
}

/**
 * Format date for display
 * @param {Date|string} date - Date value
 * @returns {string} - Formatted date string
 */
export function formatDate(date) {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) return '';
    
    return new Intl.DateTimeFormat('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(dateObj);
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
export function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if email is valid
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitize HTML content
 * @param {string} html - HTML content to sanitize
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHTML(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
}

/**
 * Show modal
 * @param {string} modalId - Modal element ID
 */
export function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('modal--active');
        document.body.style.overflow = 'hidden';
        
        // Focus first input if available
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

/**
 * Hide modal
 * @param {string} modalId - Modal element ID
 */
export function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('modal--active');
        document.body.style.overflow = '';
    }
}

/**
 * Create card element for listing
 * @param {Object} item - Item data
 * @param {string} type - Type of item (job, service)
 * @param {boolean} isFavorite - Whether item is favorited
 * @returns {HTMLElement} - Card element
 */
export function createCard(item, type = 'job', isFavorite = false) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = item.id;
    card.dataset.type = type;

    const imageUrl = 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg';

    card.innerHTML = `
        <img src="${imageUrl}" alt="${item.title}" class="card__image" loading="lazy">
        <div class="card__content">
            <h3 class="card__title">${sanitizeHTML(item.title || '')}</h3>
            <p class="card__description">${truncateText(sanitizeHTML(item.description || ''), 80)}</p>
            <div class="card__meta">
                <span class="card__price">${formatPrice(item.price || 0)}</span>
                <button class="card__favorite ${isFavorite ? 'card__favorite--active' : ''}" 
                        data-id="${item.id}" data-type="${type}">
                    ♥
                </button>
            </div>
        </div>
    `;

    // Add click handler for card (excluding favorite button)
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.card__favorite')) {
            showItemDetails(item, type);
        }
    });

    return card;
}

/**
 * Show item details in modal
 * @param {Object} item - Item data
 * @param {string} type - Type of item
 */
export function showItemDetails(item, type) {
    const modal = document.getElementById('detailModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    if (!modal || !title || !body) return;

    title.textContent = item.title || '';

    const imageGallery = item.images && item.images.length > 0
        ? item.images.map(img => `<img src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg" alt="${item.title}" style="width: 100%; margin-bottom: 1rem; border-radius: 0.5rem;">`).join('')
        : `<img src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg" alt="${item.title}" style="width: 100%; margin-bottom: 1rem; border-radius: 0.5rem;">`;

    body.innerHTML = `
        <div class="modal-gallery">
            ${imageGallery}
        </div>
        <div class="modal-info">
            <p><strong>Descrizione:</strong></p>
            <p>${sanitizeHTML(item.fullDescription || item.description || '')}</p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0;">
                <div>
                    <strong>Prezzo:</strong><br>
                    ${formatPrice(item.price || 0)}
                </div>
                <div>
                    <strong>Luogo:</strong><br>
                    ${sanitizeHTML(item.location || 'Non specificato')}
                </div>
                ${type === 'job' && item.surface ? `
                <div>
                    <strong>Superficie:</strong><br>
                    ${item.surface} m²
                </div>
                ` : ''}
            </div>
            
            <div style="margin-top: 2rem;">
                <button class="btn btn--primary" onclick="window.location.href='mailto:info@example.com?subject=Interesse per: ${encodeURIComponent(item.title)}'">
                    Contatta per info
                </button>
            </div>
        </div>
    `;

    showModal('detailModal');
}

/**
 * Create skeleton loading cards
 * @param {number} count - Number of skeleton cards to create
 * @returns {DocumentFragment} - Fragment containing skeleton cards
 */
export function createSkeletonCards(count = 3) {
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        fragment.appendChild(skeleton);
    }
    
    return fragment;
}

/**
 * Initialize modal close handlers
 */
export function initModalHandlers() {
    // Close modal on backdrop click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal__backdrop')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                hideModal(modal.id);
            }
        }
    });

    // Close modal on close button click
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal__close')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                hideModal(modal.id);
            }
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal--active');
            if (activeModal) {
                hideModal(activeModal.id);
            }
        }
    });
}

/**
 * Initialize common UI components
 */
export function initUI() {
    initModalHandlers();
}