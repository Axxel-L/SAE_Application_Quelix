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

        if (listElement) {
            listElement.innerHTML = guesses.map(item => {
                const dateRaw = item.created_at || item.date || '';
                const dateFormatted = dateRaw ? new Date(dateRaw).toLocaleDateString('fr-FR') : '?';
                // Image : utiliser image_path ou imagepath
                const imgPath = item.image_path || item.imagepath || '';
                const imageUrl = imgPath ? 'https://toutatix.axel-l.me/' + imgPath : 'img/placeholder.png';

                // Statut
                const winVal = item.win || 0;
                const winStatus = winVal === 1 ? 'Trouvé !' : 'Pas trouvé';
                const winClass = winVal === 1 ? 'bg-green-400/20 text-green-300' : 'bg-red-400/20 text-red-300';

                return `<tr class="table-row-separator"><td class="px-3 py-3"><img src="img/avatar.png" class="w-10 h-10 rounded-full object-cover border border-white/20" alt="avatar"></td><td class="px-3 py-3 text-sm text-gray-800">${dateFormatted}</td><td class="px-3 py-3"><img src="${imageUrl}" class="w-10 h-10 rounded-lg object-cover border border-white/20" alt="img" onerror="this.src='img/placeholder.png'"></td><td class="px-3 py-3 text-sm text-gray-800">${item.prediction || item.guess || 'Aucun'}</td><td class="px-3 py-3"><span class="${winClass} px-2 py-1 rounded-full text-xs">${winStatus}</span></td></tr>`;
            }).join('');
        }

    } catch (error) {
        console.error("Erreur lors du chargement des guesses:", error);
        if (loadingElement) loadingElement.innerText = "Impossible de charger l'historique.";
    }
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
