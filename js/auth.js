/**
 * Vérifie si l'utilisateur est connecté via le token dans le localStorage.
 * Si aucun token n'est présent, redirige vers la page de connexion.
 */
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
    }
}

checkAuth();