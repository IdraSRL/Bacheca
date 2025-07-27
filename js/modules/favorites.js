import firebaseService from '../services/firebase.js';
import sessionService from '../services/session.js';
import { showToast } from '../utils/ui.js';

/**
 * Favorites Module
 * Handles favorite items functionality
 */
class FavoritesModule {
    constructor() {
        this.favorites = new Set();
        this.favoritesCount = 0;
        this.init();
    }

    async init() {
        if (sessionService.isAuthenticated()) {
            await this.loadUserFavorites();
            this.initEventListeners();
            this.updateFavoritesCount();
        }
    }

    /**
     * Load user's favorites from Firebase
     */
    async loadUserFavorites() {
        try {
            const username = sessionService.getUsername();
            if (!username) return;

            const favorites = await firebaseService.getFavoritesByUser(username);
            
            this.favorites.clear();
            favorites.forEach(fav => {
                this.favorites.add(`${fav.itemId}_${fav.itemType}`);
            });

            this.favoritesCount = this.favorites.size;
            
        } catch (error) {
            console.error('Error loading favorites:', error);
            showToast('Errore nel caricamento dei preferiti', 'error');
        }
    }

    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Handle favorite button clicks
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('card__favorite')) {
                e.stopPropagation();
                e.preventDefault();
                
                const itemId = e.target.dataset.id;
                const itemType = e.target.dataset.type;
                
                if (itemId && itemType) {
                    await this.toggleFavorite(itemId, itemType, e.target);
                }
            }
        });

        // Handle favorites badge click
        const favoritesBadge = document.getElementById('favoritesBadge');
        if (favoritesBadge) {
            favoritesBadge.addEventListener('click', () => {
                this.showFavoritesModal();
            });
        }
    }

    /**
     * Toggle favorite status of an item
     * @param {string} itemId - Item ID
     * @param {string} itemType - Item type (job, service)
     * @param {HTMLElement} button - Favorite button element
     */
    async toggleFavorite(itemId, itemType, button) {
        try {
            const username = sessionService.getUsername();
            if (!username) {
                showToast('Devi essere autenticato per aggiungere ai preferiti', 'error');
                return;
            }

            const favoriteKey = `${itemId}_${itemType}`;
            const isFavorite = this.favorites.has(favoriteKey);

            if (isFavorite) {
                // Remove from favorites
                const success = await firebaseService.removeFromFavorites(username, itemId, itemType);
                if (success) {
                    this.favorites.delete(favoriteKey);
                    button.classList.remove('card__favorite--active');
                    this.favoritesCount--;
                    showToast('Rimosso dai preferiti', 'success');
                }
            } else {
                // Add to favorites
                const success = await firebaseService.addToFavorites(username, itemId, itemType);
                if (success) {
                    this.favorites.add(favoriteKey);
                    button.classList.add('card__favorite--active');
                    this.favoritesCount++;
                    showToast('Aggiunto ai preferiti', 'success');
                }
            }

            this.updateFavoritesCount();
            
        } catch (error) {
            console.error('Error toggling favorite:', error);
            showToast('Errore nell\'operazione sui preferiti', 'error');
        }
    }

    /**
     * Check if item is favorite
     * @param {string} itemId - Item ID
     * @param {string} itemType - Item type
     * @returns {boolean} - True if item is favorite
     */
    isFavorite(itemId, itemType) {
        return this.favorites.has(`${itemId}_${itemType}`);
    }

    /**
     * Update favorites count badge
     */
    updateFavoritesCount() {
        const countElement = document.getElementById('favoritesCount');
        if (countElement) {
            countElement.textContent = this.favoritesCount;
        }
    }

    /**
     * Show favorites in a modal
     */
    async showFavoritesModal() {
        try {
            const username = sessionService.getUsername();
            if (!username) return;

            const favorites = await firebaseService.getFavoritesByUser(username);
            
            if (favorites.length === 0) {
                showToast('Non hai ancora nessun preferito', 'info');
                return;
            }

            // Get detailed information for each favorite
            const favoriteItems = await Promise.all(
                favorites.map(async (fav) => {
                    const collection = fav.itemType === 'job' ? 'jobs' : 'services';
                    const item = await firebaseService.get(collection, fav.itemId);
                    return { ...item, type: fav.itemType };
                })
            );

            this.renderFavoritesModal(favoriteItems.filter(item => item !== null));
            
        } catch (error) {
            console.error('Error showing favorites:', error);
            showToast('Errore nel caricamento dei preferiti', 'error');
        }
    }

    /**
     * Render favorites modal
     * @param {Array} favoriteItems - Array of favorite items
     */
    renderFavoritesModal(favoriteItems) {
        // Create modal content
        const modalContent = `
            <div class="modal" id="favoritesModal" style="display: flex;">
                <div class="modal__backdrop"></div>
                <div class="modal__content">
                    <div class="modal__header">
                        <h2 class="modal__title">I Tuoi Preferiti</h2>
                        <button class="modal__close">×</button>
                    </div>
                    <div class="modal__body">
                        <div class="favorites-list">
                            ${favoriteItems.map(item => `
                                <div class="favorite-item" data-id="${item.id}" data-type="${item.type}">
                                    <div class="favorite-item__image">
                                        <img src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg" 
                                             alt="${item.title}" loading="lazy">
                                    </div>
                                    <div class="favorite-item__content">
                                        <h3 class="favorite-item__title">${item.title}</h3>
                                        <p class="favorite-item__description">${item.description?.substring(0, 100)}...</p>
                                        <div class="favorite-item__meta">
                                            <span class="favorite-item__price">€${item.price}</span>
                                            <span class="favorite-item__type">${item.type === 'job' ? 'Lavoro' : 'Servizio'}</span>
                                        </div>
                                    </div>
                                    <div class="favorite-item__actions">
                                        <button class="btn btn--small btn--primary favorite-item__view">Visualizza</button>
                                        <button class="btn btn--small btn--error favorite-item__remove" 
                                                data-id="${item.id}" data-type="${item.type}">Rimuovi</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing favorites modal
        const existingModal = document.getElementById('favoritesModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalContent);

        // Add event listeners
        const favoritesModal = document.getElementById('favoritesModal');
        
        // Close modal handlers
        favoritesModal.querySelector('.modal__close').addEventListener('click', () => {
            favoritesModal.remove();
        });
        
        favoritesModal.querySelector('.modal__backdrop').addEventListener('click', () => {
            favoritesModal.remove();
        });

        // View item handlers
        favoritesModal.querySelectorAll('.favorite-item__view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const favoriteItem = e.target.closest('.favorite-item');
                const itemId = favoriteItem.dataset.id;
                const itemType = favoriteItem.dataset.type;
                const item = favoriteItems.find(item => item.id === itemId && item.type === itemType);
                
                if (item) {
                    // Import and use showItemDetails from ui.js
                    import('../utils/ui.js').then(({ showItemDetails }) => {
                        favoritesModal.remove();
                        showItemDetails(item, itemType);
                    });
                }
            });
        });

        // Remove from favorites handlers
        favoritesModal.querySelectorAll('.favorite-item__remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const itemId = e.target.dataset.id;
                const itemType = e.target.dataset.type;
                
                await this.toggleFavorite(itemId, itemType, e.target);
                
                // Remove from modal
                const favoriteItem = e.target.closest('.favorite-item');
                favoriteItem.remove();
                
                // Check if no more favorites
                const remainingItems = favoritesModal.querySelectorAll('.favorite-item');
                if (remainingItems.length === 0) {
                    favoritesModal.remove();
                    showToast('Non hai più nessun preferito', 'info');
                }
            });
        });

        // Add CSS for favorites modal
        this.addFavoritesModalStyles();
    }

    /**
     * Add CSS styles for favorites modal
     */
    addFavoritesModalStyles() {
        if (document.getElementById('favoritesModalStyles')) return;

        const style = document.createElement('style');
        style.id = 'favoritesModalStyles';
        style.textContent = `
            .favorites-list {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .favorite-item {
                display: flex;
                gap: 1rem;
                padding: 1rem;
                background-color: var(--bg-tertiary);
                border-radius: var(--border-radius);
                border: 1px solid var(--border-primary);
            }
            
            .favorite-item__image {
                width: 80px;
                height: 80px;
                border-radius: var(--border-radius);
                overflow: hidden;
                flex-shrink: 0;
            }
            
            .favorite-item__image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .favorite-item__content {
                flex: 1;
                min-width: 0;
            }
            
            .favorite-item__title {
                font-size: var(--font-size-base);
                font-weight: var(--font-weight-semibold);
                color: var(--text-primary);
                margin-bottom: 0.5rem;
            }
            
            .favorite-item__description {
                color: var(--text-secondary);
                font-size: var(--font-size-sm);
                line-height: 1.4;
                margin-bottom: 0.5rem;
            }
            
            .favorite-item__meta {
                display: flex;
                gap: 1rem;
                align-items: center;
            }
            
            .favorite-item__price {
                font-weight: var(--font-weight-semibold);
                color: var(--color-primary-500);
            }
            
            .favorite-item__type {
                font-size: var(--font-size-xs);
                padding: 0.25rem 0.5rem;
                background-color: var(--color-secondary-200);
                color: var(--text-primary);
                border-radius: var(--border-radius-full);
            }
            
            .favorite-item__actions {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                align-items: flex-end;
            }
            
            @media (max-width: 768px) {
                .favorite-item {
                    flex-direction: column;
                }
                
                .favorite-item__image {
                    width: 100%;
                    height: 120px;
                }
                
                .favorite-item__actions {
                    flex-direction: row;
                    justify-content: flex-start;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Get favorites count
     * @returns {number} - Number of favorites
     */
    getFavoritesCount() {
        return this.favoritesCount;
    }

    /**
     * Clear all favorites
     */
    clearFavorites() {
        this.favorites.clear();
        this.favoritesCount = 0;
        this.updateFavoritesCount();
    }
}

// Export singleton instance
export default new FavoritesModule();