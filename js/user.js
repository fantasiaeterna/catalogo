// js/user.js - Implementação de Favoritos e Pedidos

import { db } from "./firebase-config.js";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Função para carregar e exibir o histórico de pedidos
export async function loadOrders(userId ) {
    const container = document.getElementById('orders-history');
    if (!container) return;

    container.innerHTML = "<h2>Histórico de Pedidos</h2><p>Carregando pedidos...</p>";

    try {
        const q = query(collection(db, "pedidos"), where("userId", "==", userId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = "<h2>Histórico de Pedidos</h2><p>Você ainda não fez nenhum pedido.</p>";
            return;
        }

        let html = "<h2>Histórico de Pedidos</h2><ul>";
        snapshot.forEach(doc => {
            const order = doc.data();
            const date = new Date(order.date).toLocaleDateString('pt-BR');
            html += `
                <li>
                    <strong>Pedido #${doc.id.substring(0, 8)}</strong> - Data: ${date} - Total: R$ ${order.total.toFixed(2)}
                    <p>Status: ${order.status}</p>
                    <ul>
                        ${order.items.map(item => `<li>${item.name} (x${item.quantity})</li>`).join('')}
                    </ul>
                </li>
            `;
        });
        html += "</ul>";
        container.innerHTML = html;

    } catch (error) {
        console.error("Erro ao carregar pedidos:", error);
        container.innerHTML = "<h2>Histórico de Pedidos</h2><p>Erro ao carregar histórico de pedidos.</p>";
    }
}

// Função para carregar e exibir os favoritos
export async function loadFavorites(userId) {
    const container = document.getElementById('favorites-list');
    if (!container) return;

    container.innerHTML = "<h2>Meus Favoritos</h2><p>Carregando favoritos...</p>";

    try {
        const userDocRef = doc(db, "users", userId);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists() || !userDocSnap.data().favorites || userDocSnap.data().favorites.length === 0) {
            container.innerHTML = "<h2>Meus Favoritos</h2><p>Você não tem nenhum produto favorito.</p>";
            return;
        }

        const favoriteIds = userDocSnap.data().favorites;
        
        // Busca os detalhes dos produtos favoritos
        let html = "<h2>Meus Favoritos</h2><div id='favorite-product-grid'>";
        for (const id of favoriteIds) {
            const productDocRef = doc(db, "produtos", id);
            const productDocSnap = await getDoc(productDocRef);
            
            if (productDocSnap.exists()) {
                const p = productDocSnap.data();
                const imageUrl = p.imagens && p.imagens.length > 0 ? p.imagens[0] : 'placeholder.png'; 
                
                // Usando o mesmo card de produto da página inicial para manter o layout
                html += `
                    <div class="produto">
                        <a href="product.html?id=${id}">
                            <img src="${imageUrl}" alt="${p.nome}">
                        </a>
                        <a href="product.html?id=${id}">
                            <h3>${p.nome}</h3>
                        </a>
                        <p class="price">R$ ${p.preco.toFixed(2)}</p>
                        <button onclick="toggleFavorite('${id}')" class="favorite-btn favorited"><i class="fas fa-heart"></i> Remover</button>
                    </div>
                `;
            }
        }
        html += "</div>";
        container.innerHTML = html;

    } catch (error) {
        console.error("Erro ao carregar favoritos:", error);
        container.innerHTML = "<h2>Meus Favoritos</h2><p>Erro ao carregar favoritos.</p>";
    }
}
