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
        const response = await fetch("http://195.95.144.193:8080/api/login", {
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