// js/auth.js - Corrigido para esperar o DOM

import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { loadOrders, loadFavorites } from "./user.js";

// Função para carregar o perfil e as listas
function loadProfileData(user ) {
    const profileInfo = document.getElementById('profile-info');
    if (profileInfo) {
        profileInfo.innerHTML = `
            <h2>Meu Perfil</h2>
            <p>Bem-vindo(a), ${user.email}</p>
            <button id="logout-button">Sair</button>
        `;
        document.getElementById('logout-button').addEventListener('click', () => {
            signOut(auth);
        });
    }
    
    // Carrega os dados do usuário
    loadOrders(user.uid);
    loadFavorites(user.uid);
}

// Função para verificar o status de login
export function checkLoginStatus() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuário logado
            loadProfileData(user);
        } else {
            // Usuário deslogado
            const profileContainer = document.getElementById('profile-container');
            if (profileContainer) {
                profileContainer.innerHTML = `
                    <div style="text-align: center; padding: 50px;">
                        <h2>Você precisa estar logado para acessar esta página.</h2>
                        <p>Por favor, faça login.</p>
                        <!-- Adicione um link ou formulário de login aqui -->
                    </div>
                `;
            }
        }
    });
}

// MUDANÇA CRUCIAL: Garante que o DOM esteja carregado antes de tentar executar o código
document.addEventListener('DOMContentLoaded', () => {
    // Se estiver na página de perfil, o script module no HTML chamará checkLoginStatus()
    // Se estiver em outra página, a lógica de login/logout deve ser tratada separadamente.
});
