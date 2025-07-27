import firebaseService from './services/firebase.js';
import { showToast, toggleButtonLoading, initUI } from './utils/ui.js';
import { hashPassword } from './utils/auth.js';

/**
 * Initialization Module
 * Sets up the system with test data
 */
class InitializationModule {
    constructor() {
        this.init();
    }

    init() {
        this.initEventListeners();
        initUI();
    }

    initEventListeners() {
        const initBtn = document.getElementById('initBtn');
        if (initBtn) {
            initBtn.addEventListener('click', () => {
                this.startInitialization();
            });
        }
    }

    async startInitialization() {
        const initBtn = document.getElementById('initBtn');
        toggleButtonLoading(initBtn, true);

        try {
            // Step 1: Create Users
            await this.createUsers();
            
            // Step 2: Create Categories
            await this.createCategories();
            
            // Step 3: Create Jobs
            await this.createJobs();
            
            // Step 4: Create Services
            await this.createServices();

            // Show credentials
            this.showCredentials();
            
            showToast('Inizializzazione completata con successo!', 'success');
            
        } catch (error) {
            console.error('Initialization error:', error);
            showToast('Errore durante l\'inizializzazione', 'error');
        } finally {
            toggleButtonLoading(initBtn, false);
        }
    }

    async createUsers() {
        this.updateStepStatus('users', 'processing', 'Creazione utenti in corso...');

        try {
            // Check if users already exist
            const existingUsers = await firebaseService.getAllUsers();
            if (existingUsers.length > 0) {
                this.updateStepStatus('users', 'completed', 'Utenti già esistenti');
                return;
            }

            // Create admin user
            const adminPassword = await hashPassword('admin123');
            await firebaseService.createUser({
                username: 'admin',
                password: adminPassword,
                role: 'admin'
            });

            // Create client user
            const clientPassword = await hashPassword('cliente123');
            await firebaseService.createUser({
                username: 'cliente1',
                password: clientPassword,
                role: 'client'
            });

            this.updateStepStatus('users', 'completed', 'Utenti creati con successo');
            
        } catch (error) {
            this.updateStepStatus('users', 'error', 'Errore nella creazione utenti');
            throw error;
        }
    }

    async createCategories() {
        this.updateStepStatus('categories', 'processing', 'Creazione categorie in corso...');

        try {
            // Check if categories already exist
            const existingCategories = await firebaseService.getAllCategories();
            if (existingCategories.length > 0) {
                this.updateStepStatus('categories', 'completed', 'Categorie già esistenti');
                return;
            }

            const categories = [
                { name: 'Edilizia', color: '#f97316' },
                { name: 'Pulizie', color: '#22c55e' },
                { name: 'Giardinaggio', color: '#16a34a' },
                { name: 'Elettricità', color: '#eab308' },
                { name: 'Idraulica', color: '#3b82f6' },
                { name: 'Informatica', color: '#6366f1' },
                { name: 'Traslochi', color: '#8b5cf6' },
                { name: 'Riparazioni', color: '#ef4444' }
            ];

            for (const category of categories) {
                await firebaseService.createCategory(category);
            }

            this.updateStepStatus('categories', 'completed', 'Categorie create con successo');
            
        } catch (error) {
            this.updateStepStatus('categories', 'error', 'Errore nella creazione categorie');
            throw error;
        }
    }

    async createJobs() {
        this.updateStepStatus('jobs', 'processing', 'Creazione offerte di lavoro in corso...');

        try {
            // Check if jobs already exist
            const existingJobs = await firebaseService.getAllJobs();
            if (existingJobs.length > 0) {
                this.updateStepStatus('jobs', 'completed', 'Offerte già esistenti');
                return;
            }

            // Get categories for reference
            const categories = await firebaseService.getAllCategories();
            const edilizia = categories.find(c => c.name === 'Edilizia');
            const pulizie = categories.find(c => c.name === 'Pulizie');
            const giardinaggio = categories.find(c => c.name === 'Giardinaggio');

            const jobs = [
                {
                    title: 'Ristrutturazione Bagno Completa',
                    code: 'JOB001',
                    categoryId: edilizia?.id || categories[0]?.id,
                    description: 'Ristrutturazione completa di bagno con sostituzione sanitari, piastrelle e impianti.',
                    fullDescription: 'Offriamo un servizio completo di ristrutturazione bagno che include: demolizione dell\'esistente, rifacimento impianti idrico ed elettrico, posa nuove piastrelle, installazione sanitari di alta qualità, box doccia in cristallo, mobili bagno su misura. Lavoro eseguito da professionisti qualificati con garanzia di 2 anni.',
                    price: 2500,
                    location: 'Milano, Lombardia',
                    surface: 8,
                    images: []
                },
                {
                    title: 'Pulizie Post-Ristrutturazione',
                    code: 'JOB002',
                    categoryId: pulizie?.id || categories[1]?.id,
                    description: 'Servizio professionale di pulizie dopo lavori di ristrutturazione e cantiere.',
                    fullDescription: 'Specializzati nella pulizia post-cantiere e post-ristrutturazione. Il nostro team utilizza attrezzature professionali per rimuovere polvere di cantiere, residui di cemento, vernice e ogni tipo di sporco derivante dai lavori. Servizio che include pulizia vetri, pavimenti, sanitari, rimozione etichette e protezioni.',
                    price: 350,
                    location: 'Roma, Lazio',
                    surface: 100,
                    images: []
                },
                {
                    title: 'Manutenzione Giardino Stagionale',
                    code: 'JOB003',
                    categoryId: giardinaggio?.id || categories[2]?.id,
                    description: 'Servizio completo di manutenzione giardino per tutto l\'anno.',
                    fullDescription: 'Pacchetto annuale di manutenzione giardino che include: potatura piante e siepi, taglio erba settimanale, pulizia aiuole, trattamenti antiparassitari, concimazione stagionale, pulizia foglie autunnali, preparazione invernale delle piante. Servizio personalizzabile in base alle esigenze del cliente.',
                    price: 1200,
                    location: 'Torino, Piemonte',
                    surface: 200,
                    images: []
                },
                {
                    title: 'Imbiancatura Appartamento',
                    code: 'JOB004',
                    categoryId: edilizia?.id || categories[0]?.id,
                    description: 'Imbiancatura professionale di appartamento con materiali di qualità.',
                    fullDescription: 'Servizio di imbiancatura professionale che include: preparazione pareti, stuccatura e levigatura imperfezioni, applicazione primer, due mani di pittura lavabile di alta qualità. Possibilità di scelta colori personalizzati, effetti decorativi e carte da parati. Lavoro pulito e preciso con protezione di mobili e pavimenti.',
                    price: 800,
                    location: 'Napoli, Campania',
                    surface: 80,
                    images: []
                }
            ];

            for (const job of jobs) {
                await firebaseService.createJob(job);
            }

            this.updateStepStatus('jobs', 'completed', 'Offerte create con successo');
            
        } catch (error) {
            this.updateStepStatus('jobs', 'error', 'Errore nella creazione offerte');
            throw error;
        }
    }

    async createServices() {
        this.updateStepStatus('services', 'processing', 'Creazione servizi in corso...');

        try {
            // Check if services already exist
            const existingServices = await firebaseService.getAllServices();
            if (existingServices.length > 0) {
                this.updateStepStatus('services', 'completed', 'Servizi già esistenti');
                return;
            }

            // Get categories for reference
            const categories = await firebaseService.getAllCategories();
            const informatica = categories.find(c => c.name === 'Informatica');
            const elettricita = categories.find(c => c.name === 'Elettricità');
            const idraulica = categories.find(c => c.name === 'Idraulica');
            const riparazioni = categories.find(c => c.name === 'Riparazioni');

            const services = [
                {
                    title: 'Assistenza Tecnica Computer',
                    code: 'SRV001',
                    categoryId: informatica?.id || categories[0]?.id,
                    description: 'Riparazione e manutenzione computer, installazione software e recupero dati.',
                    fullDescription: 'Servizio completo di assistenza informatica: riparazione hardware, pulizia virus e malware, installazione e configurazione software, backup e recupero dati, ottimizzazione prestazioni, configurazione reti domestiche e aziendali. Disponibili anche per assistenza remota e contratti di manutenzione.',
                    price: 50,
                    location: 'Milano, Lombardia',
                    images: []
                },
                {
                    title: 'Installazione Lampadari e Punti Luce',
                    code: 'SRV002',
                    categoryId: elettricita?.id || categories[1]?.id,
                    description: 'Installazione professionale di impianti di illuminazione e punti luce.',
                    fullDescription: 'Elettricista qualificato per installazione di lampadari, applique, faretti LED, sistemi di illuminazione smart, interruttori e prese elettriche. Servizio che include progettazione illuminotecnica, fornitura materiali certificati, installazione a norma e collaudo impianto.',
                    price: 120,
                    location: 'Bologna, Emilia-Romagna',
                    images: []
                },
                {
                    title: 'Riparazione Perdite e Scarichi',
                    code: 'SRV003',
                    categoryId: idraulica?.id || categories[2]?.id,
                    description: 'Intervento rapido per riparazione perdite d\'acqua e problemi agli scarichi.',
                    fullDescription: 'Idraulico disponibile per emergenze 24/7. Specializzato in: riparazione perdite rubinetti e tubazioni, disostruzione scarichi e WC, sostituzione guarnizioni e cartucce, installazione sanitari, riparazione caldaie e scaldabagni, videoispezioni tubazioni. Intervento rapido con preventivo gratuito.',
                    price: 80,
                    location: 'Firenze, Toscana',
                    images: []
                },
                {
                    title: 'Riparazione Elettrodomestici',
                    code: 'SRV004',
                    categoryId: riparazioni?.id || categories[3]?.id,
                    description: 'Riparazione di lavatrici, lavastoviglie, frigoriferi e altri elettrodomestici.',
                    fullDescription: 'Centro assistenza specializzato nella riparazione di tutti gli elettrodomestici: lavatrici, asciugatrici, lavastoviglie, frigoriferi, forni, piani cottura, condizionatori. Tecnici qualificati, ricambi originali, garanzia sulle riparazioni. Sopralluogo gratuito e preventivo trasparente.',
                    price: 90,
                    location: 'Genova, Liguria',
                    images: []
                },
                {
                    title: 'Montaggio Mobili IKEA',
                    code: 'SRV005',
                    categoryId: riparazioni?.id || categories[3]?.id,
                    description: 'Servizio professionale di montaggio mobili e complementi d\'arredo.',
                    fullDescription: 'Esperti nel montaggio di mobili di ogni tipo: cucine componibili, armadi, librerie, scrivanie, letti, divani modulari. Servizio che include disimballaggio, montaggio professionale, posizionamento, livellamento e pulizia finale. Disponibili per montaggi complessi e su misura.',
                    price: 45,
                    location: 'Palermo, Sicilia',
                    images: []
                }
            ];

            for (const service of services) {
                await firebaseService.createService(service);
            }

            this.updateStepStatus('services', 'completed', 'Servizi creati con successo');
            
        } catch (error) {
            this.updateStepStatus('services', 'error', 'Errore nella creazione servizi');
            throw error;
        }
    }

    updateStepStatus(step, status, message) {
        const stepElement = document.querySelector(`[data-step="${step}"]`);
        const statusElement = document.getElementById(`${step}Status`);

        if (stepElement && statusElement) {
            // Remove existing status classes
            stepElement.classList.remove('init-step--processing', 'init-step--completed', 'init-step--error');
            
            // Add new status class
            if (status !== 'waiting') {
                stepElement.classList.add(`init-step--${status}`);
            }
            
            // Update status text
            statusElement.textContent = message;
        }
    }

    showCredentials() {
        const credentialsDiv = document.getElementById('initCredentials');
        if (credentialsDiv) {
            credentialsDiv.style.display = 'block';
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new InitializationModule();
});