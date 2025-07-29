import firebaseService from './services/firebase.js';
import { showToast, debounce, createPublicCard, initUI, showItemDetails } from './utils/ui.js';

/**
 * Public Services Page Module
 */
class PublicServices {
    constructor() {
        this.currentFilters = {
            search: '',
            category: '',
            price: ''
        };
        this.categories = [];
        this.allServices = [];
        this.filteredServices = [];
        
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.initEventListeners();
            this.renderServices();
            initUI();
        } catch (error) {
            console.error('Public services initialization error:', error);
            showToast('Errore durante il caricamento dei servizi', 'error');
        }
    }

    async loadData() {
        try {
            // Load categories and services
            [this.categories, this.allServices] = await Promise.all([
                firebaseService.getAllCategories(),
                firebaseService.getAllServices()
            ]);

            this.filteredServices = [...this.allServices];
            this.populateCategoryFilters();
            
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    initEventListeners() {
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

    async applyFilters() {
        try {
            const { search, category, price } = this.currentFilters;

            // Filter services
            this.filteredServices = await this.filterItems(this.allServices, {
                search, category, price
            });

            this.renderServices();
            
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

    renderServices() {
        this.renderCategoryTabs();
        this.renderListings();
    }

    renderCategoryTabs() {
        const container = document.getElementById('categoryTabs');
        if (!container) return;

        // Get unique categories from current items
        const usedCategoryIds = [...new Set(this.filteredServices.map(item => item.categoryId))];
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
                Tutti
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

    renderListings() {
        const container = document.getElementById('servicesGrid');
        if (!container) return;

        if (this.filteredServices.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <h3>Nessun servizio trovato</h3>
                    <p>Prova a modificare i filtri di ricerca</p>
                </div>
            `;
            return;
        }

        // Clear existing content
        container.innerHTML = '';

        // Create cards for each service
        this.filteredServices.forEach(service => {
            const card = createPublicCard(service, 'service');
            container.appendChild(card);
        });
    }
}

// Initialize public services when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PublicServices();
});