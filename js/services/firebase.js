// Firebase Configuration and Service
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    getDoc, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCQU6T-AS1NchGErgOXGASHG9s0Nu4uTKg",
    authDomain: "bacheca-643d6.firebaseapp.com",
    projectId: "bacheca-643d6",
    storageBucket: "bacheca-643d6.appspot.com",
    messagingSenderId: "482936657403",
    appId: "1:482936657403:web:253ddc68c48751e7e9e75e",
    measurementId: "G-1Q6JV19V88"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Firebase Service Class
 * Handles all Firestore operations for the application
 */
class FirebaseService {
    constructor() {
        this.db = db;
        this.listeners = new Map();
    }

    // Collection references
    get users() {
        return collection(this.db, 'users');
    }

    get categories() {
        return collection(this.db, 'categories');
    }

    get jobs() {
        return collection(this.db, 'jobs');
    }

    get services() {
        return collection(this.db, 'services');
    }

    get favorites() {
        return collection(this.db, 'favorites');
    }

    /**
     * Generic Methods
     */
    
    // Add document to collection
    async add(collectionName, data) {
        try {
            const docRef = await addDoc(collection(this.db, collectionName), {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error(`Error adding document to ${collectionName}:`, error);
            throw error;
        }
    }

    // Get document by ID
    async get(collectionName, id) {
        try {
            const docRef = doc(this.db, collectionName, id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                return null;
            }
        } catch (error) {
            console.error(`Error getting document from ${collectionName}:`, error);
            throw error;
        }
    }

    // Get all documents from collection
    async getAll(collectionName, orderField = 'createdAt', orderDirection = 'desc') {
        try {
            const q = query(
                collection(this.db, collectionName),
                orderBy(orderField, orderDirection)
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`Error getting documents from ${collectionName}:`, error);
            throw error;
        }
    }

    // Update document
    async update(collectionName, id, data) {
        try {
            const docRef = doc(this.db, collectionName, id);
            await updateDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error(`Error updating document in ${collectionName}:`, error);
            throw error;
        }
    }

    // Delete document
    async delete(collectionName, id) {
        try {
            const docRef = doc(this.db, collectionName, id);
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error(`Error deleting document from ${collectionName}:`, error);
            throw error;
        }
    }

    // Query documents with where clause
    async query(collectionName, field, operator, value) {
        try {
            const q = query(
                collection(this.db, collectionName),
                where(field, operator, value),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error(`Error querying ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * User Methods
     */
    
    async getUserByUsername(username) {
        try {
            const users = await this.query('users', 'username', '==', username);
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            console.error('Error getting user by username:', error);
            throw error;
        }
    }

    async createUser(userData) {
        try {
            const docRef = await addDoc(this.users, {
                ...userData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async getAllUsers() {
        return await this.getAll('users', 'createdAt', 'desc');
    }

    /**
     * Category Methods
     */
    
    async getAllCategories() {
        return await this.getAll('categories', 'name', 'asc');
    }

    async createCategory(categoryData) {
        return await this.add('categories', categoryData);
    }

    /**
     * Job Methods
     */
    
    async getAllJobs() {
        return await this.getAll('jobs');
    }

    async getJobsByCategory(categoryId) {
        return await this.query('jobs', 'categoryId', '==', categoryId);
    }

    async createJob(jobData) {
        return await this.add('jobs', jobData);
    }

    /**
     * Service Methods
     */
    
    async getAllServices() {
        return await this.getAll('services');
    }

    async getServicesByCategory(categoryId) {
        return await this.query('services', 'categoryId', '==', categoryId);
    }

    async createService(serviceData) {
        return await this.add('services', serviceData);
    }

    /**
     * Favorites Methods
     */
    
    async getFavoritesByUser(username) {
        return await this.query('favorites', 'username', '==', username);
    }

    async addToFavorites(username, itemId, itemType) {
        // Check if already in favorites
        const existing = await this.query('favorites', 'username', '==', username);
        const alreadyFavorite = existing.find(fav => 
            fav.itemId === itemId && fav.itemType === itemType
        );

        if (alreadyFavorite) {
            return false; // Already in favorites
        }

        await this.add('favorites', {
            username,
            itemId,
            itemType
        });
        return true;
    }

    async removeFromFavorites(username, itemId, itemType) {
        try {
            const favorites = await this.query('favorites', 'username', '==', username);
            const favorite = favorites.find(fav => 
                fav.itemId === itemId && fav.itemType === itemType
            );

            if (favorite) {
                await this.delete('favorites', favorite.id);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error removing from favorites:', error);
            throw error;
        }
    }

    /**
     * Real-time Listeners
     */
    
    // Listen to collection changes
    listen(collectionName, callback, constraints = []) {
        try {
            let q = collection(this.db, collectionName);
            
            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const documents = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                callback(documents);
            });

            // Store listener for cleanup
            const listenerId = `${collectionName}_${Date.now()}`;
            this.listeners.set(listenerId, unsubscribe);
            
            return listenerId;
        } catch (error) {
            console.error(`Error setting up listener for ${collectionName}:`, error);
            throw error;
        }
    }

    // Remove listener
    unlisten(listenerId) {
        const unsubscribe = this.listeners.get(listenerId);
        if (unsubscribe) {
            unsubscribe();
            this.listeners.delete(listenerId);
        }
    }

    // Remove all listeners
    unlistenAll() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners.clear();
    }

    /**
     * Search Methods
     */
    
    // Full-text search simulation (Firestore doesn't support full-text search)
    async searchJobs(searchTerm, filters = {}) {
        try {
            let jobs = await this.getAllJobs();
            
            // Apply text search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                jobs = jobs.filter(job => 
                    job.title?.toLowerCase().includes(term) ||
                    job.description?.toLowerCase().includes(term) ||
                    job.location?.toLowerCase().includes(term)
                );
            }

            // Apply filters
            if (filters.categoryId) {
                jobs = jobs.filter(job => job.categoryId === filters.categoryId);
            }

            if (filters.priceRange) {
                jobs = this.filterByPriceRange(jobs, filters.priceRange);
            }

            if (filters.surfaceRange) {
                jobs = this.filterBySurfaceRange(jobs, filters.surfaceRange);
            }

            return jobs;
        } catch (error) {
            console.error('Error searching jobs:', error);
            throw error;
        }
    }

    async searchServices(searchTerm, filters = {}) {
        try {
            let services = await this.getAllServices();
            
            // Apply text search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                services = services.filter(service => 
                    service.title?.toLowerCase().includes(term) ||
                    service.description?.toLowerCase().includes(term) ||
                    service.location?.toLowerCase().includes(term)
                );
            }

            // Apply filters
            if (filters.categoryId) {
                services = services.filter(service => service.categoryId === filters.categoryId);
            }

            if (filters.priceRange) {
                services = this.filterByPriceRange(services, filters.priceRange);
            }

            return services;
        } catch (error) {
            console.error('Error searching services:', error);
            throw error;
        }
    }

    // Helper methods for filtering
    filterByPriceRange(items, range) {
        const [min, max] = range.includes('+') 
            ? [parseInt(range.replace('+', '')), Infinity]
            : range.split('-').map(Number);

        return items.filter(item => {
            const price = parseFloat(item.price) || 0;
            return price >= min && price <= max;
        });
    }

    filterBySurfaceRange(items, range) {
        const [min, max] = range.includes('+') 
            ? [parseInt(range.replace('+', '')), Infinity]
            : range.split('-').map(Number);

        return items.filter(item => {
            const surface = parseFloat(item.surface) || 0;
            return surface >= min && surface <= max;
        });
    }
}

// Export singleton instance
export default new FirebaseService();