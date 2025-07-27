import { requireClient, logout } from './utils/auth.js';
import sessionService from './services/session.js';
import firebaseService from './services/firebase.js';
import favoritesModule from './modules/favorites.js';
import { showToast, debounce, createCard, initUI, createSkeletonCards } from './utils/ui.js';

/**
 * Dashboard Module - Client Interface
 */
class Dashboard {
    constructor() {
        this.currentTab = 'jobs';
        this.currentFilters = {
            search: '',
            category: '',
            price: '',
            surface: ''
        };
        this.categories = [];
        this.allJobs = [];
        this.allServices = [];
        this.filteredJobs = [];
        this.filteredServices = [];
        
        this.init();
    }

    async init() {
        // Check authentication
        if (!requireClient()) return;

        try {
            await this.loadData();
            this.initEventListeners();
            this.renderCurrentTab();
            initUI();
            sessionService.startAutoRefresh();
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            showToast('Errore durante il caricamento', 'error');
        }
    }

    async loadData() {
        try {
            // Load categories first
            this.categories = await firebaseService.getAllCategories();
            this.populateCategoryFilters();

            // Load jobs and services
            [this.allJobs, this.allServices] = await Promise.all([
                firebaseService.getAllJobs(),
                firebaseService.getAllServices()
            ]);

            this.filteredJobs = [...this.allJobs];
            this.filteredServices = [...this.allServices];
            
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    initEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-nav__button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                if (tab) {
                    this.switchTab(tab);
                }
            });
        });

        // Search functionality with debounce
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const debouncedSearch = debounce((value) => {
                this.currentFilters.search = value;
                this.applyFilters();
            }, 300);

            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value.trim());
            });
        }

        // Filter changes
        const categoryFilter = document.getElementById('categoryFilter');
        const priceFilter = document.getElementById('priceFilter');
        const surfaceFilter = document.getElementById('surfaceFilter');

        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.applyFilters();
            });
        }

        if (priceFilter) {
            priceFilter.addEventListener('change', (e) => {
                this.currentFilters.price = e.target.value;
                this.applyFilters();
            });
        }

        if (surfaceFilter) {
            surfaceFilter.addEventListener('change', (e) => {
                this.currentFilters.surface = e.target.value;
                this.applyFilters();
            });
        }

        // Search button
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    this.currentFilters.search = searchInput.value.trim();
                    this.applyFilters();
                }
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                logout();
                window.location.href = 'index.html';
            });
        }

        // Category tab clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-tab')) {
                const categoryId = e.target.dataset.categoryId;
                this.filterByCategory(categoryId);
                
                // Update active category tab
                document.querySelectorAll('.category-tab').forEach(tab => {
                    tab.classList.remove('category-tab--active');
                });
                e.target.classList.add('category-tab--active');
            }
        });
    }

    populateCategoryFilters() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (!categoryFilter) return;

        // Clear existing options (except "All categories")
        categoryFilter.innerHTML = '<option value="">Tutte le categorie</option>';

        // Add category options
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categoryFilter.appendChild(option);
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.tab-nav__button').forEach(btn => {
            btn.classList.remove('tab-nav__button--active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('tab-nav__button--active');

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('tab-panel--active');
        });
        document.getElementById(`${tabName}Panel`).classList.add('tab-panel--active');

        // Show/hide surface filter based on tab
        const surfaceFilter = document.getElementById('surfaceFilter');
        if (surfaceFilter) {
            surfaceFilter.style.display = tabName === 'jobs' ? 'block' : 'none';
        }

        this.renderCurrentTab();
    }

    async applyFilters() {
        try {
            const { search, category, price, surface } = this.currentFilters;

            // Filter jobs
            this.filteredJobs = await this.filterItems(this.allJobs, {
                search, category, price, surface: this.currentTab === 'jobs' ? surface : ''
            });

            // Filter services
            this.filteredServices = await this.filterItems(this.allServices, {
                search, category, price, surface: ''
            });

            this.renderCurrentTab();
            
        } catch (error) {
            console.error('Error applying filters:', error);
            showToast('Errore nell\'applicazione dei filtri', 'error');
        }
    }

    async filterItems(items, filters) {
        let filtered = [...items];

        // Text search
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(item =>
                item.title?.toLowerCase().includes(searchTerm) ||
                item.description?.toLowerCase().includes(searchTerm) ||
                item.location?.toLowerCase().includes(searchTerm)
            );
        }

        // Category filter
        if (filters.category) {
            filtered = filtered.filter(item => item.categoryId === filters.category);
        }

        // Price filter
        if (filters.price) {
            filtered = this.filterByPriceRange(filtered, filters.price);
        }

        // Surface filter (jobs only)
        if (filters.surface) {
            filtered = this.filterBySurfaceRange(filtered, filters.surface);
        }

        return filtered;
    }

    filterByPriceRange(items, range) {
        if (!range) return items;

        const [min, max] = range.includes('+') 
            ? [parseInt(range.replace('+', '')), Infinity]
            : range.split('-').map(Number);

        return items.filter(item => {
            const price = parseFloat(item.price) || 0;
            return price >= min && price <= max;
        });
    }

    filterBySurfaceRange(items, range) {
        if (!range) return items;

        const [min, max] = range.includes('+') 
            ? [parseInt(range.replace('+', '')), Infinity]
            : range.split('-').map(Number);

        return items.filter(item => {
            const surface = parseFloat(item.surface) || 0;
            return surface >= min && surface <= max;
        });
    }

    filterByCategory(categoryId) {
        if (categoryId) {
            this.currentFilters.category = categoryId;
            
            // Update category filter select
            const categoryFilter = document.getElementById('categoryFilter');
            if (categoryFilter) {
                categoryFilter.value = categoryId;
            }
        } else {
            this.currentFilters.category = '';
            
            // Reset category filter
            const categoryFilter = document.getElementById('categoryFilter');
            if (categoryFilter) {
                categoryFilter.value = '';
            }
        }

        this.applyFilters();
    }

    renderCurrentTab() {
        if (this.currentTab === 'jobs') {
            this.renderCategoryTabs('jobCategoryTabs', this.filteredJobs);
            this.renderListings('jobsGrid', this.filteredJobs, 'job');
        } else {
            this.renderCategoryTabs('serviceCategoryTabs', this.filteredServices);
            this.renderListings('servicesGrid', this.filteredServices, 'service');
        }
    }

    renderCategoryTabs(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Get unique categories from current items
        const usedCategoryIds = [...new Set(items.map(item => item.categoryId))];
        const availableCategories = this.categories.filter(cat => 
            usedCategoryIds.includes(cat.id)
        );

        if (availableCategories.length === 0) {
            container.innerHTML = '';
            return;
        }

        const tabsHTML = `
            <button class="category-tab ${!this.currentFilters.category ? 'category-tab--active' : ''}" 
                    data-category-id="">
                Tutte
            </button>
            ${availableCategories.map(category => `
                <button class="category-tab ${this.currentFilters.category === category.id ? 'category-tab--active' : ''}" 
                        data-category-id="${category.id}"
                        style="border-color: ${category.color}; ${this.currentFilters.category === category.id ? `background-color: ${category.color}; color: white;` : ''}">
                    ${category.name}
                </button>
            `).join('')}
        `;

        container.innerHTML = tabsHTML;
    }

    renderListings(containerId, items, type) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <h3>Nessun risultato trovato</h3>
                    <p>Prova a modificare i filtri di ricerca</p>
                </div>
            `;
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        // Create cards for each item
        items.forEach(item => {
            const isFavorite = favoritesModule.isFavorite(item.id, type);
            const card = createCard(item, type, isFavorite);
            container.appendChild(card);
        });
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});