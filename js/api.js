/* Variables globales */
const GUESSES_PAGE_SIZE = 10;
let guessesCurrentPage = 1;
let allGuessesData = [];

/* 
* Permet de se connecter à l'API avec les identifiants de l'utilisateur
* Stock les données dans localStorage pour les requêtes suivantes.
*/ 
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');

    if (!email || !password) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    loginBtn.innerText = "Connexion...";
    loginBtn.disabled = true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch("https://toutatix.axel-l.me/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: email, password: password }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) throw new Error("Identifiants incorrects");

        const data = await response.json();

        localStorage.setItem('token', data.token);
        localStorage.setItem('isadmin', data.isadmin);
        localStorage.setItem('username', data.username);

        window.location.href = 'home.html';
    } catch (error) {
        clearTimeout(timeout);
        alert(error.name === "AbortError" ? "Serveur indisponible" : "Erreur : " + error.message);
        loginBtn.innerText = "Se connecter";
        loginBtn.disabled = false;
    }
}

/**
 * Charge l'historique des "guesses" depuis l'API et les affiche sur la page.
 */
async function loadGuesses() {
    const token = localStorage.getItem('token');
    const listElement = document.getElementById('guesses-list');
    const tableElement = document.getElementById('guesses-table');
    const loadingElement = document.getElementById('loading-state');

    if (loadingElement) {
        loadingElement.classList.remove('hidden');
        loadingElement.innerText = "Chargement des données...";
    }
    if (tableElement) tableElement.classList.add('hidden');

    try {
        const response = await fetch(`https://toutatix.axel-l.me/api/guesses`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Erreur lors de la récupération de l'historique.");
        const guesses = await response.json();

        if (loadingElement) loadingElement.classList.add('hidden');
        if (tableElement) tableElement.classList.remove('hidden');

        allGuessesData = guesses;
        guessesCurrentPage = 1;
        renderGuessesPage();
        console.log('Guesses bruts:', guesses);

    } catch (error) {
        console.error("Erreur lors du chargement des guesses:", error);
        if (loadingElement) loadingElement.innerText = "Impossible de charger l'historique.";
    }
}

function renderGuessesPage() {
    const listElement = document.getElementById('guesses-list');
    if (!listElement) return;
    const start = (guessesCurrentPage - 1) * GUESSES_PAGE_SIZE;
    const end = start + GUESSES_PAGE_SIZE;
    const pageItems = allGuessesData.slice(start, end);
    listElement.innerHTML = pageItems.map(guessRowHTML).join('');
    renderPaginationControls();
}

function renderPaginationControls() {
    const container = document.getElementById('pagination-controls');
    if (!container) return;
    const totalPages = Math.ceil(allGuessesData.length / GUESSES_PAGE_SIZE);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    container.innerHTML = `
        <button onclick="goToGuessesPage(${guessesCurrentPage - 1})"
            class="w-10 h-10 rounded-full bg-white/60 backdrop-blur-md border border-white/25 shadow-lg flex items-center justify-center text-gray-800 hover:bg-white/70 transition disabled:opacity-30 disabled:cursor-not-allowed"
            ${guessesCurrentPage === 1 ? 'disabled' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
        </button>
        <span class="px-3 py-1 text-sm text-gray-800 font-medium self-center bg-white/40 backdrop-blur-sm rounded-full">${guessesCurrentPage} / ${totalPages}</span>
        <button onclick="goToGuessesPage(${guessesCurrentPage + 1})"
            class="w-10 h-10 rounded-full bg-white/60 backdrop-blur-md border border-white/25 shadow-lg flex items-center justify-center text-gray-800 hover:bg-white/70 transition disabled:opacity-30 disabled:cursor-not-allowed"
            ${guessesCurrentPage === totalPages ? 'disabled' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
        </button>`;
}

function goToGuessesPage(page) {
    const totalPages = Math.ceil(allGuessesData.length / GUESSES_PAGE_SIZE);
    if (page < 1 || page > totalPages) return;
    guessesCurrentPage = page;
    renderGuessesPage();
    document.getElementById('guesses-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Télécharge le ZIP contenant toutes les images des guesses.
 * Réservé aux admins (isadmin = 1).
 */
async function downloadImagesZip() {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isadmin');

    if (isAdmin !== 'true') {
        alert("Accès réservé aux administrateurs.");
        return;
    }

    try {
        const response = await fetch('https://toutatix.axel-l.me/api/guesses/images', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!response.ok) throw new Error('Erreur lors du téléchargement');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'images_toutatix.zip';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        alert('Erreur : ' + error.message);
    }
}

/**
 * Envoie une image à l'API pour analyse (Astérix / Obélix / Autre).
 * @param {File} file - Le fichier image à analyser
 * @returns {object} - { id, date, image_path, guess }
 */
async function uploadGuess(file) {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('guessimage', file);

    const response = await fetch('https://toutatix.axel-l.me/api/guesses', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
    });

    if (!response.ok) throw new Error('Erreur lors de l\'envoi de l\'image');
    return await response.json();
}

/**
 * Envoie un feedback à l'API pour un guess.
 * @param {number} id - L'ID du guess
 * @param {number} win - 1 (correct), -1 (incorrect), 0 (aucun des deux)
 */
async function sendFeedback(id, win) {
    const token = localStorage.getItem('token');

    const response = await fetch('https://toutatix.axel-l.me/api/guesses/' + id, {
        method: 'PUT',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ win: win })
    });

    if (!response.ok) throw new Error('Erreur HTTP ' + response.status);
    return await response.json();
}

/* Système de pagination pour l'historique des guesses 
* Génère le HTML d'une ligne. 
*/
function guessRowHTML(item) {
    const dateRaw = item.created_at || item.date || '';
    const dateFormatted = dateRaw ? new Date(dateRaw).toLocaleDateString('fr-FR') : '?';
    const imgPath = item.filename || item.image_path || item.imagepath || '';
    const imageUrl = imgPath ? 'https://toutatix.axel-l.me/data/' + imgPath : 'img/placeholder.png';
    const winVal = item.winned || item.win || 0;
    const winStatus = winVal == 1 ? 'Trouvé !' : 'Pas trouvé';
    const winClass = winVal == 1 ? 'bg-green-400/20 text-green-300' : 'bg-red-400/20 text-red-300';
    return `<tr class="table-row-separator"><td class="px-3 py-3"><img src="img/avatar.png" class="w-10 h-10 rounded-full object-cover border border-white/20" alt="avatar"></td><td class="px-3 py-3 text-sm text-gray-800">${dateFormatted}</td><td class="px-3 py-3"><img src="${imageUrl}" class="w-10 h-10 rounded-lg object-cover border border-white/20" alt="img" onerror="this.src='img/placeholder.png'"></td><td class="px-3 py-3 text-sm text-gray-800">${item.prediction || item.guess || 'Aucun'}</td><td class="px-3 py-3"><span class="${winClass} px-2 py-1 rounded-full text-xs">${winStatus}</span></td></tr>`;
}

/**
 * Récupère les guesses depuis l'API et calcule les statistiques
 * pour la page stats.html.
 * @returns {{ asterix: number, obelix: number, autres: number }|null}
 */
async function loadStats() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('https://toutatix.axel-l.me/api/guesses', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Erreur API');

        const guesses = await response.json();

        if (!Array.isArray(guesses) || guesses.length === 0) {
            return null;
        }

        const asterix = guesses.filter(g => {
            const val = (g.prediction || g.guess || '').toString().toLowerCase();
            return val === 'asterix';
        }).length;
        const obelix = guesses.filter(g => {
            const val = (g.prediction || g.guess || '').toString().toLowerCase();
            return val === 'obelix';
        }).length;
        const autres = guesses.length - asterix - obelix;

        return { asterix, obelix, autres };

    } catch (error) {
        console.error('Erreur chargement stats:', error);
        return null;
    }
}