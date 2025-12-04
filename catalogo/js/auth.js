// js/auth.js
import { auth } from "./firebase-config.js";
import { 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { loadOrders, loadFavorites } from "./user.js";

function loadProfile(user) {
    const box = document.getElementById("profile-info");

    if (!box) return;

    box.innerHTML = `
        <h2>Meu Perfil</h2>
        <p>${user.email}</p>
        <button id="logout-button">Sair</button>
    `;

    document.getElementById("logout-button").onclick = () => signOut(auth);

    loadOrders(user.uid);
    loadFavorites(user.uid);
}

export function checkLoginStatus() {
    onAuthStateChanged(auth, (user) => {
        const container = document.getElementById("profile-container");

        if (!container) return;

        if (user) {
            loadProfile(user);
        } else {
            container.innerHTML = `
                <div style="text-align:center;padding:40px;">
                    <h2>Você não está logado</h2>
                    <p>Faça login para acessar seus pedidos.</p>
                    <a href="login.html">Ir para o Login</a>
                </div>
            `;
        }
    });
}
