import { requireAdmin, logout } from './utils/auth.js';
import sessionService from './services/session.js';
import firebaseService from './services/firebase.js';
import { showToast, toggleButtonLoading, initUI, showModal, hideModal, formatDate, debounce } from './utils/ui.js';

/**
 * Admin Panel Module
 */
class AdminPanel {
    constructor() {
        this.currentSection = 'users';
        this.categories = [];
        this.users = [];
        this.jobs = [];
        this.services = [];
        
        this.init();
    }

    async init() {
        // Check authentication
        if (!requireAdmin()) return;

        try {
            await this.loadData();
            this.initEventListeners();
            this.renderCurrentSection();
            initUI();
            sessionService.startAutoRefresh();
        } catch (error) {
            console.error('Admin panel initialization error:', error);
            showToast('Errore durante il caricamento del pannello admin', 'error');
        }
    }

    async loadData() {
        try {
            [this.users, this.categories, this.jobs, this.services] = await Promise.all([
                firebaseService.getAllUsers(),
                firebaseService.getAllCategories(),
                firebaseService.getAllJobs(),
                firebaseService.getAllServices()
            ]);
        } catch (error) {
            console.error('Error loading admin data:', error);
            throw error;
        }
    }

    initEventListeners() {
        // Section navigation
        document.querySelectorAll('.admin-nav__item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                if (section) {
                    this.switchSection(section);
                }
            });
        });

        // Add buttons
        this.initAddButtons();

        // Search functionality
        this.initSearchHandlers();

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                logout();
                window.location.href = 'index.html';
            });
        }

        // Action buttons event delegation
        document.addEventListener('click', (e) => {
            if (e.target.dataset.action) {
                const action = e.target.dataset.action;
                const id = e.target.dataset.id;
                
                switch (action) {
                    case 'edit-user':
                        this.showUserForm(id);
                        break;
                    case 'delete-user':
                        this.deleteUser(id);
                        break;
                    case 'edit-category':
                        this.showCategoryForm(id);
                        break;
                    case 'delete-category':
                        this.deleteCategory(id);
                        break;
                    case 'edit-job':
                        this.showJobForm(id);
                        break;
                    case 'delete-job':
                        this.deleteJob(id);
                        break;
                    case 'edit-service':
                        this.showServiceForm(id);
                        break;
                    case 'delete-service':
                        this.deleteService(id);
                        break;
                }
            }
        });
        // Modal close handlers are handled by initUI()
    }

    initAddButtons() {
        const addUserBtn = document.getElementById('addUserBtn');
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        const addJobBtn = document.getElementById('addJobBtn');
        const addServiceBtn = document.getElementById('addServiceBtn');

        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.showUserForm());
        }

        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', () => this.showCategoryForm());
        }

        if (addJobBtn) {
            addJobBtn.addEventListener('click', () => this.showJobForm());
        }

        if (addServiceBtn) {
            addServiceBtn.addEventListener('click', () => this.showServiceForm());
        }
    }

    initSearchHandlers() {
        const jobSearchInput = document.getElementById('jobSearchInput');
        const serviceSearchInput = document.getElementById('serviceSearchInput');

        if (jobSearchInput) {
            const debouncedSearch = debounce((value) => {
                this.filterJobs(value);
            }, 300);

            jobSearchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value.trim());
            });
        }

        if (serviceSearchInput) {
            const debouncedSearch = debounce((value) => {
                this.filterServices(value);
            }, 300);

            serviceSearchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value.trim());
            });
        }

        // Category filters
        const jobCategoryFilter = document.getElementById('jobCategoryFilter');
        const serviceCategoryFilter = document.getElementById('serviceCategoryFilter');

        if (jobCategoryFilter) {
            jobCategoryFilter.addEventListener('change', (e) => {
                this.filterJobsByCategory(e.target.value);
            });
        }

        if (serviceCategoryFilter) {
            serviceCategoryFilter.addEventListener('change', (e) => {
                this.filterServicesByCategory(e.target.value);
            });
        }
    }

    switchSection(sectionName) {
        this.currentSection = sectionName;

        // Update navigation
        document.querySelectorAll('.admin-nav__item').forEach(item => {
            item.classList.remove('admin-nav__item--active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('admin-nav__item--active');

        // Update sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('admin-section--active');
        });
        document.getElementById(`${sectionName}Section`).classList.add('admin-section--active');

        this.renderCurrentSection();
    }

    renderCurrentSection() {
        switch (this.currentSection) {
            case 'users':
                this.renderUsersSection();
                break;
            case 'categories':
                this.renderCategoriesSection();
                break;
            case 'jobs':
                this.renderJobsSection();
                break;
            case 'services':
                this.renderServicesSection();
                break;
        }
    }

    renderUsersSection() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-secondary);">
                        Nessun utente trovato
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>
                    <span class="badge badge--${user.role === 'admin' ? 'primary' : 'success'}">
                        ${user.role === 'admin' ? 'Admin' : 'Cliente'}
                    </span>
                </td>
                <td>${formatDate(user.createdAt?.toDate?.() || user.createdAt)}</td>
                <td>
                    <button class="action-btn action-btn--edit" data-action="edit-user" data-id="${user.id}">
                        Modifica
                    </button>
                    <button class="action-btn action-btn--delete" data-action="delete-user" data-id="${user.id}">
                        Elimina
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderCategoriesSection() {
        const container = document.getElementById('categoriesGrid');
        if (!container) return;

        if (this.categories.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <h3>Nessuna categoria trovata</h3>
                    <p>Aggiungi la prima categoria per iniziare</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.categories.map(category => `
            <div class="category-card" style="border-left-color: ${category.color}">
                <div class="category-card__header">
                    <h3 class="category-card__title">${category.name}</h3>
                    <div class="category-card__color" style="background-color: ${category.color}"></div>
                </div>
                <div class="category-card__actions">
                    <button class="action-btn action-btn--edit" data-action="edit-category" data-id="${category.id}">
                        Modifica
                    </button>
                    <button class="action-btn action-btn--delete" data-action="delete-category" data-id="${category.id}">
                        Elimina
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderJobsSection() {
        this.populateCategoryFilter('jobCategoryFilter');
        this.renderListings('adminJobsGrid', this.jobs, 'job');
    }

    renderServicesSection() {
        this.populateCategoryFilter('serviceCategoryFilter');
        this.renderListings('adminServicesGrid', this.services, 'service');
    }

    populateCategoryFilter(filterId) {
        const filter = document.getElementById(filterId);
        if (!filter) return;

        filter.innerHTML = '<option value="">Tutte le categorie</option>';
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            filter.appendChild(option);
        });
    }

    renderListings(containerId, items, type) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <h3>Nessun ${type === 'job' ? 'lavoro' : 'servizio'} trovato</h3>
                    <p>Aggiungi il primo ${type === 'job' ? 'lavoro' : 'servizio'} per iniziare</p>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => {
            const category = this.categories.find(cat => cat.id === item.categoryId);
            const imageUrl = item.images && item.images.length > 0 ? item.images[0] : 'default.png';

            return `
                <div class="card">
                    <img src="${imageUrl}" alt="${item.title}" class="card__image" loading="lazy">
                    <div class="card__content">
                        <h3 class="card__title">${item.title}</h3>
                        ${item.code ? `<div class="card__code">Cod: ${item.code}</div>` : ''}
                        <p class="card__description">${item.description?.substring(0, 80)}...</p>
                        
                        <div style="margin: 1rem 0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <span><strong>Prezzo:</strong> €${item.price}</span>
                                ${type === 'job' && item.surface ? `<span><strong>Superficie:</strong> ${item.surface} m²</span>` : ''}
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span><strong>Luogo:</strong> ${item.location}</span>
                                ${category ? `<span class="badge" style="background-color: ${category.color}20; color: ${category.color};">${category.name}</span>` : ''}
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                            <button class="action-btn action-btn--edit" data-action="edit-${type}" data-id="${item.id}">
                                Modifica
                            </button>
                            <button class="action-btn action-btn--delete" data-action="delete-${type}" data-id="${item.id}">
                                Elimina
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Form Methods
    showUserForm(userId = null) {
        const isEdit = !!userId;
        const user = isEdit ? this.users.find(u => u.id === userId) : null;

        const modalTitle = document.getElementById('formModalTitle');
        const modalBody = document.getElementById('formModalBody');

        modalTitle.textContent = isEdit ? 'Modifica Utente' : 'Aggiungi Utente';

        modalBody.innerHTML = `
            <form id="userForm">
                <div class="form-group">
                    <label for="userUsername" class="form-label">Username</label>
                    <input type="text" id="userUsername" class="form-input" value="${user?.username || ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="userRole" class="form-label">Ruolo</label>
                    <select id="userRole" class="form-select" required>
                        <option value="client" ${!user || user.role === 'client' ? 'selected' : ''}>Cliente</option>
                        <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                
                ${!isEdit ? `
                <div class="form-group">
                    <label for="userPassword" class="form-label">Password</label>
                    <input type="password" id="userPassword" class="form-input" required>
                </div>
                ` : ''}
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" class="btn btn--secondary" onclick="hideModal('formModal')">Annulla</button>
                    <button type="submit" class="btn btn--primary">
                        <span class="btn__text">${isEdit ? 'Aggiorna' : 'Crea'}</span>
                        <div class="spinner spinner--hidden"></div>
                    </button>
                </div>
            </form>
        `;

        // Add form submit handler
        document.getElementById('userForm').addEventListener('submit', (e) => {
            this.handleUserFormSubmit(e, isEdit, userId);
        });

        // Add cancel button handler
        const cancelBtn = modalBody.querySelector('.btn--secondary');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                hideModal('formModal');
            });
        }
        showModal('formModal');
    }

    async handleUserFormSubmit(e, isEdit, userId) {
        e.preventDefault();

        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        const username = document.getElementById('userUsername').value.trim();
        const role = document.getElementById('userRole').value;
        const password = !isEdit ? document.getElementById('userPassword').value.trim() : null;

        if (!username || (!isEdit && !password)) {
            showToast('Compila tutti i campi obbligatori', 'warning');
            return;
        }

        toggleButtonLoading(submitBtn, true);

        try {
            if (isEdit) {
                await firebaseService.update('users', userId, { username, role });
                showToast('Utente aggiornato con successo', 'success');
                
                // Update local data
                const userIndex = this.users.findIndex(u => u.id === userId);
                if (userIndex !== -1) {
                    this.users[userIndex] = { ...this.users[userIndex], username, role };
                }
            } else {
                // Hash password before saving
                const { hashPassword } = await import('./utils/auth.js');
                const hashedPassword = await hashPassword(password);
                
                const newUserId = await firebaseService.createUser({
                    username,
                    role,
                    password: hashedPassword
                });

                showToast('Utente creato con successo', 'success');
                
                // Add to local data
                this.users.unshift({
                    id: newUserId,
                    username,
                    role,
                    createdAt: new Date()
                });
            }

            hideModal('formModal');
            this.renderCurrentSection();
            
        } catch (error) {
            console.error('Error saving user:', error);
            showToast('Errore durante il salvataggio', 'error');
        } finally {
            toggleButtonLoading(submitBtn, false);
        }
    }

    showCategoryForm(categoryId = null) {
        const isEdit = !!categoryId;
        const category = isEdit ? this.categories.find(c => c.id === categoryId) : null;

        const modalTitle = document.getElementById('formModalTitle');
        const modalBody = document.getElementById('formModalBody');

        modalTitle.textContent = isEdit ? 'Modifica Categoria' : 'Aggiungi Categoria';

        modalBody.innerHTML = `
            <form id="categoryForm">
                <div class="form-group">
                    <label for="categoryName" class="form-label">Nome Categoria</label>
                    <input type="text" id="categoryName" class="form-input" value="${category?.name || ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="categoryColor" class="form-label">Colore</label>
                    <input type="color" id="categoryColor" class="form-input" value="${category?.color || '#6366f1'}" required>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" class="btn btn--secondary" onclick="hideModal('formModal')">Annulla</button>
                    <button type="submit" class="btn btn--primary">
                        <span class="btn__text">${isEdit ? 'Aggiorna' : 'Crea'}</span>
                        <div class="spinner spinner--hidden"></div>
                    </button>
                </div>
            </form>
        `;

        // Add form submit handler
        document.getElementById('categoryForm').addEventListener('submit', (e) => {
            this.handleCategoryFormSubmit(e, isEdit, categoryId);
        });

        // Add cancel button handler
        const cancelBtn = modalBody.querySelector('.btn--secondary');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                hideModal('formModal');
            });
        }
        showModal('formModal');
    }

    async handleCategoryFormSubmit(e, isEdit, categoryId) {
        e.preventDefault();

        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        const name = document.getElementById('categoryName').value.trim();
        const color = document.getElementById('categoryColor').value;

        if (!name) {
            showToast('Inserisci il nome della categoria', 'warning');
            return;
        }

        toggleButtonLoading(submitBtn, true);

        try {
            if (isEdit) {
                await firebaseService.update('categories', categoryId, { name, color });
                showToast('Categoria aggiornata con successo', 'success');
                
                // Update local data
                const categoryIndex = this.categories.findIndex(c => c.id === categoryId);
                if (categoryIndex !== -1) {
                    this.categories[categoryIndex] = { ...this.categories[categoryIndex], name, color };
                }
            } else {
                const newCategoryId = await firebaseService.add('categories', { name, color });
                showToast('Categoria creata con successo', 'success');
                
                // Add to local data
                this.categories.push({
                    id: newCategoryId,
                    name,
                    color,
                    createdAt: new Date()
                });
            }

            hideModal('formModal');
            this.renderCurrentSection();
            
        } catch (error) {
            console.error('Error saving category:', error);
            showToast('Errore durante il salvataggio', 'error');
        } finally {
            toggleButtonLoading(submitBtn, false);
        }
    }

    showJobForm(jobId = null) {
        this.showListingForm(jobId, 'job');
    }

    showServiceForm(serviceId = null) {
        this.showListingForm(serviceId, 'service');
    }

    showListingForm(itemId = null, type = 'job') {
        const isEdit = !!itemId;
        const items = type === 'job' ? this.jobs : this.services;
        const item = isEdit ? items.find(i => i.id === itemId) : null;

        const modalTitle = document.getElementById('formModalTitle');
        const modalBody = document.getElementById('formModalBody');

        modalTitle.textContent = isEdit 
            ? `Modifica ${type === 'job' ? 'Offerta di Lavoro' : 'Servizio'}` 
            : `Aggiungi ${type === 'job' ? 'Offerta di Lavoro' : 'Servizio'}`;

        modalBody.innerHTML = `
            <form id="listingForm">
                <div class="form-group">
                    <label for="listingTitle" class="form-label">Titolo</label>
                    <input type="text" id="listingTitle" class="form-input" value="${item?.title || ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="listingCode" class="form-label">Codice Identificativo</label>
                    <input type="text" id="listingCode" class="form-input" value="${item?.code || ''}" 
                           placeholder="Es: JOB001, SRV001" required>
                </div>
                
                <div class="form-group">
                    <label for="listingCategory" class="form-label">Categoria</label>
                    <select id="listingCategory" class="form-select" required>
                        <option value="">Seleziona categoria</option>
                        ${this.categories.map(cat => `
                            <option value="${cat.id}" ${item?.categoryId === cat.id ? 'selected' : ''}>
                                ${cat.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="listingDescription" class="form-label">Descrizione Breve</label>
                    <textarea id="listingDescription" class="form-textarea" required>${item?.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="listingFullDescription" class="form-label">Descrizione Completa</label>
                    <textarea id="listingFullDescription" class="form-textarea" style="min-height: 120px;">${item?.fullDescription || ''}</textarea>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div class="form-group">
                        <label for="listingPrice" class="form-label">Prezzo (€)</label>
                        <input type="number" id="listingPrice" class="form-input" min="0" step="0.01" value="${item?.price || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="listingLocation" class="form-label">Luogo</label>
                        <input type="text" id="listingLocation" class="form-input" value="${item?.location || ''}" required>
                    </div>
                </div>
                
                ${type === 'job' ? `
                <div class="form-group">
                    <label for="listingSurface" class="form-label">Superficie (m²)</label>
                    <input type="number" id="listingSurface" class="form-input" min="0" value="${item?.surface || ''}">
                </div>
                ` : ''}
                
                <div class="form-group">
                    <label for="listingImages" class="form-label">Immagini</label>
                    <div class="file-upload" id="fileUploadArea">
                        <input type="file" id="listingImages" multiple accept="image/*" style="display: none;">
                        <div class="file-upload__text">Clicca o trascina per caricare immagini</div>
                        <div class="file-upload__hint">JPEG, PNG, GIF - Max 5MB per file</div>
                    </div>
                    <div class="image-preview" id="imagePreview"></div>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" class="btn btn--secondary" onclick="hideModal('formModal')">Annulla</button>
                    <button type="submit" class="btn btn--primary">
                        <span class="btn__text">${isEdit ? 'Aggiorna' : 'Crea'}</span>
                        <div class="spinner spinner--hidden"></div>
                    </button>
                </div>
            </form>
        `;

        // Initialize file upload
        this.initFileUpload();

        // Show existing images if editing
        if (isEdit && item?.images) {
            this.showExistingImages(item.images);
        }

        // Add form submit handler
        document.getElementById('listingForm').addEventListener('submit', (e) => {
            this.handleListingFormSubmit(e, isEdit, itemId, type);
        });

        // Add cancel button handler
        const cancelBtn = modalBody.querySelector('.btn--secondary');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                hideModal('formModal');
            });
        }
        showModal('formModal');
    }

    initFileUpload() {
        const fileInput = document.getElementById('listingImages');
        const uploadArea = document.getElementById('fileUploadArea');
        const preview = document.getElementById('imagePreview');

        if (!fileInput || !uploadArea || !preview) return;

        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // File selection
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('file-upload--dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('file-upload--dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('file-upload--dragover');
            this.handleFileSelection(e.dataTransfer.files);
        });
    }

    async handleFileSelection(files) {
        const preview = document.getElementById('imagePreview');
        if (!preview) return;

        // Check current number of images
        const existingImages = preview.querySelectorAll('.image-preview__item');
        const maxImages = 10;
        
        if (existingImages.length >= maxImages) {
            showToast(`Massimo ${maxImages} immagini consentite`, 'warning');
            return;
        }

        const filesToProcess = Array.from(files).slice(0, maxImages - existingImages.length);
        
        for (const file of filesToProcess) {
            if (!file.type.startsWith('image/')) {
                showToast(`${file.name} non è un'immagine valida`, 'warning');
                continue;
            }

            if (file.size > 5 * 1024 * 1024) {
                showToast(`${file.name} è troppo grande (max 5MB)`, 'warning');
                continue;
            }

            // Create preview
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview__item';
            
            const img = document.createElement('img');
            img.className = 'image-preview__img';
            img.src = URL.createObjectURL(file);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'image-preview__remove';
            removeBtn.innerHTML = '×';
            removeBtn.type = 'button';
            removeBtn.addEventListener('click', () => {
                previewItem.remove();
            });

            previewItem.appendChild(img);
            previewItem.appendChild(removeBtn);
            previewItem.dataset.file = file.name;
            previewItem.dataset.fileObject = JSON.stringify({
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified
            });
            
            preview.appendChild(previewItem);
        }
        
        if (filesToProcess.length < files.length) {
            showToast(`Aggiunte solo ${filesToProcess.length} immagini (limite ${maxImages})`, 'warning');
        }
    }

    showExistingImages(images) {
        const preview = document.getElementById('imagePreview');
        if (!preview || !images) return;

        images.forEach(imageName => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview__item';
            
            const img = document.createElement('img');
            img.className = 'image-preview__img';
            img.src = `uploads/${imageName}`;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'image-preview__remove';
            removeBtn.innerHTML = '×';
            removeBtn.type = 'button';
            removeBtn.addEventListener('click', () => {
                previewItem.remove();
            });

            previewItem.appendChild(img);
            previewItem.appendChild(removeBtn);
            previewItem.dataset.existing = imageName;
            
            preview.appendChild(previewItem);
        });
    }

    async handleListingFormSubmit(e, isEdit, itemId, type) {
        e.preventDefault();

        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Get form data
        const title = document.getElementById('listingTitle').value.trim();
        const code = document.getElementById('listingCode').value.trim();
        const categoryId = document.getElementById('listingCategory').value;
        const description = document.getElementById('listingDescription').value.trim();
        const fullDescription = document.getElementById('listingFullDescription').value.trim();
        const price = parseFloat(document.getElementById('listingPrice').value);
        const location = document.getElementById('listingLocation').value.trim();
        const surface = type === 'job' ? parseFloat(document.getElementById('listingSurface').value) || null : null;

        // Validation
        if (!title || !code || !categoryId || !description || !price || !location) {
            showToast('Compila tutti i campi obbligatori', 'warning');
            return;
        }

        // Check if code already exists (only for new items or if code changed)
        if (!isEdit || (isEdit && code !== (type === 'job' ? this.jobs : this.services).find(i => i.id === itemId)?.code)) {
            const allItems = [...this.jobs, ...this.services];
            const codeExists = allItems.some(item => item.code === code && item.id !== itemId);
            
            if (codeExists) {
                showToast('Codice già esistente, scegli un codice diverso', 'warning');
                return;
            }
        }
        toggleButtonLoading(submitBtn, true);

        try {
            // Handle image uploads
            const images = await this.processImages();

            const listingData = {
                title,
                code,
                categoryId,
                description,
                fullDescription,
                price,
                location,
                images
            };

            if (surface !== null) {
                listingData.surface = surface;
            }

            const collection = type === 'job' ? 'jobs' : 'services';

            if (isEdit) {
                await firebaseService.update(collection, itemId, listingData);
                showToast(`${type === 'job' ? 'Offerta' : 'Servizio'} aggiornato con successo`, 'success');
                
                // Update local data
                const items = type === 'job' ? this.jobs : this.services;
                const itemIndex = items.findIndex(i => i.id === itemId);
                if (itemIndex !== -1) {
                    items[itemIndex] = { ...items[itemIndex], ...listingData };
                }
            } else {
                const newItemId = await firebaseService.add(collection, listingData);
                showToast(`${type === 'job' ? 'Offerta' : 'Servizio'} creato con successo`, 'success');
                
                // Add to local data
                const items = type === 'job' ? this.jobs : this.services;
                items.unshift({
                    id: newItemId,
                    ...listingData,
                    createdAt: new Date()
                });
            }

            hideModal('formModal');
            this.renderCurrentSection();
            
        } catch (error) {
            console.error('Error saving listing:', error);
            showToast('Errore durante il salvataggio', 'error');
        } finally {
            toggleButtonLoading(submitBtn, false);
        }
    }

    async processImages() {
        const preview = document.getElementById('imagePreview');
        if (!preview) return [];
        
        const imageItems = preview.querySelectorAll('.image-preview__item');
        const images = [];
        
        imageItems.forEach(item => {
            if (item.dataset.existing) {
                // Existing image
                images.push(item.dataset.existing);
            } else if (item.dataset.file) {
                // New image - in a real implementation, you would upload to server
                // For now, we'll use a placeholder name
                const fileName = `uploaded_${Date.now()}_${item.dataset.file}`;
                images.push(fileName);
            }
        });
        
        return images;
    }

    // Removed uploadImage method since we're not using PHP uploads

    // Delete Methods
    async deleteUser(userId) {
        if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;

        try {
            await firebaseService.delete('users', userId);
            this.users = this.users.filter(u => u.id !== userId);
            this.renderCurrentSection();
            showToast('Utente eliminato con successo', 'success');
        } catch (error) {
            console.error('Error deleting user:', error);
            showToast('Errore durante l\'eliminazione', 'error');
        }
    }

    async deleteCategory(categoryId) {
        if (!confirm('Sei sicuro di voler eliminare questa categoria?')) return;

        try {
            await firebaseService.delete('categories', categoryId);
            this.categories = this.categories.filter(c => c.id !== categoryId);
            this.renderCurrentSection();
            showToast('Categoria eliminata con successo', 'success');
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast('Errore durante l\'eliminazione', 'error');
        }
    }

    async deleteJob(jobId) {
        if (!confirm('Sei sicuro di voler eliminare questa offerta di lavoro?')) return;

        try {
            await firebaseService.delete('jobs', jobId);
            this.jobs = this.jobs.filter(j => j.id !== jobId);
            this.renderCurrentSection();
            showToast('Offerta eliminata con successo', 'success');
        } catch (error) {
            console.error('Error deleting job:', error);
            showToast('Errore durante l\'eliminazione', 'error');
        }
    }

    async deleteService(serviceId) {
        if (!confirm('Sei sicuro di voler eliminare questo servizio?')) return;

        try {
            await firebaseService.delete('services', serviceId);
            this.services = this.services.filter(s => s.id !== serviceId);
            this.renderCurrentSection();
            showToast('Servizio eliminato con successo', 'success');
        } catch (error) {
            console.error('Error deleting service:', error);
            showToast('Errore durante l\'eliminazione', 'error');
        }
    }

    // Filter Methods
    filterJobs(searchTerm) {
        // Implementation for filtering jobs
        this.renderListings('adminJobsGrid', this.jobs, 'job');
    }

    filterServices(searchTerm) {
        // Implementation for filtering services
        this.renderListings('adminServicesGrid', this.services, 'service');
    }

    filterJobsByCategory(categoryId) {
        // Implementation for filtering jobs by category
        this.renderListings('adminJobsGrid', this.jobs, 'job');
    }

    filterServicesByCategory(categoryId) {
        // Implementation for filtering services by category
        this.renderListings('adminServicesGrid', this.services, 'service');
    }
}


// Initialize admin panel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
});