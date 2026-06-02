const fs = require("fs");

async function testAPI() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch("http://195.95.144.193:8080/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "asterix@irreductibles.fr", password: "Le Plus Rapide & Intelligent" }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();

    console.log(data);

    fs.writeFileSync(
      "resultat.json",
      JSON.stringify(data, null, 2),
      "utf8"
    );

    console.log("Résultat sauvegardé dans resultat.json");
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === "AbortError") {
      console.error("Timeout : le serveur ne répond pas après 5 secondes");
    } else {
      console.error("Erreur :", error.message);
    }
  }
}

testAPI();