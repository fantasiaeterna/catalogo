// js/products.js - Versão Completa com Ordenação por Mais Recentes e "Carregar Mais"

import { db, auth } from "./firebase-config.js";
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    setDoc,
    orderBy,
    limit,
    startAfter,
    documentId // Importa documentId para ordenar pelo ID do documento
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// --- Variáveis Globais para Paginação ---
let lastVisibleProduct = null; // Guarda o último documento carregado para a próxima consulta
const PRODUCTS_PER_PAGE = 8;   // Define quantos produtos carregar por vez
let isLoading = false;         // Evita múltiplos carregamentos simultâneos

// Variável global para armazenar os favoritos do usuário logado
let userFavorites = [];

// Função auxiliar para buscar os favoritos do usuário
async function fetchUserFavorites( ) {
    const user = auth.currentUser;
    if (!user) {
        userFavorites = [];
        return;
    }
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        userFavorites = userSnap.exists() ? (userSnap.data().favorites || []) : [];
    } catch (error) {
        console.error("Erro ao buscar favoritos:", error);
        userFavorites = [];
    }
}

// Função para popular o filtro de categorias (sem duplicatas)
export async function populateCategoryFilter() {
    const select = document.getElementById("category-filter");
    if (!select) return;

    select.innerHTML = '<option value="">Todas as Categorias</option>';

    try {
        const q = query(collection(db, "produtos"));
        const snapshot = await getDocs(q);
        
        const categories = new Set();
        snapshot.forEach(doc => {
            const p = doc.data();
            if (p.categoria && p.categoria.trim()) {
                categories.add(p.categoria.trim());
            }
        });

        const sortedCategories = Array.from(categories).sort();
        
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            select.appendChild(option);
        });

    } catch (err) {
        console.error("Erro ao popular filtro de categorias:", err);
    }
}

// Função para popular o filtro de cores (sem duplicatas)
export async function populateColorFilter() {
    const select = document.getElementById("color-filter");
    if (!select) return;

    select.innerHTML = '<option value="">Todas as Cores</option>';

    try {
        const q = query(collection(db, "produtos"));
        const snapshot = await getDocs(q);
        
        const colors = new Set();
        snapshot.forEach(doc => {
            const p = doc.data();
            if (p.cores && Array.isArray(p.cores)) {
                p.cores.forEach(color => {
                    if (color && color.trim()) {
                        colors.add(color.trim());
                    }
                });
            }
        });

        const sortedColors = Array.from(colors).sort();
        
        sortedColors.forEach(color => {
            const option = document.createElement('option');
            option.value = color;
            option.textContent = color;
            select.appendChild(option);
        });

    } catch (err) {
        console.error("Erro ao popular filtro de cores:", err);
    }
}

// --- Função para carregar produtos com filtros, ordenação e paginação ---
export async function loadProducts(loadMore = false) {
    if (isLoading) return;
    isLoading = true;

    const container = document.getElementById("product-list");
    const loadMoreContainer = document.getElementById("load-more-container");
    if (!container || !loadMoreContainer) {
        isLoading = false;
        return;
    }

    const categoryFilter = document.getElementById("category-filter");
    const sortOrder = document.getElementById("sort-order");
    const colorFilter = document.getElementById("color-filter");

    if (!loadMore) {
        container.innerHTML = "Carregando produtos...";
        lastVisibleProduct = null; // Reseta a paginação ao aplicar novos filtros
    }
    
    loadMoreContainer.innerHTML = ''; // Limpa o botão "Carregar Mais"

    await fetchUserFavorites();

    const selectedCategory = categoryFilter ? categoryFilter.value : "";
    const order = sortOrder ? sortOrder.value : "recentes"; // Padrão é 'recentes'
    const selectedColor = colorFilter ? colorFilter.value : "";

    try {
        let q = collection(db, "produtos");
        
        if (selectedCategory) {
            q = query(q, where("categoria", "==", selectedCategory));
        }
        
        if (order === "asc") {
            q = query(q, orderBy("preco", "asc"));
        } else if (order === "desc") {
            q = query(q, orderBy("preco", "desc"));
        } else { // "recentes"
            q = query(q, orderBy(documentId(), "desc"));
        }

        if (loadMore && lastVisibleProduct) {
            q = query(q, startAfter(lastVisibleProduct), limit(PRODUCTS_PER_PAGE));
        } else {
            q = query(q, limit(PRODUCTS_PER_PAGE));
        }
        
        const snapshot = await getDocs(q);

        if (snapshot.empty && !loadMore) {
            container.innerHTML = "Nenhum produto encontrado.";
            isLoading = false;
            return;
        }

        if (!snapshot.empty) {
            lastVisibleProduct = snapshot.docs[snapshot.docs.length - 1];
        }

        let products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        if (selectedColor) {
            products = products.filter(p => 
                p.cores && p.cores.includes(selectedColor)
            );
        }
        
        if (products.length === 0 && !loadMore) {
            container.innerHTML = "Nenhum produto encontrado com os filtros selecionados.";
            isLoading = false;
            return;
        }

        let html = "";
        products.forEach(p => {
            const imageUrl = p.imagens && p.imagens.length > 0 ? p.imagens[0] : 'placeholder.png'; 
            const isFavorited = userFavorites.includes(p.id);
            const favoriteClass = isFavorited ? 'favorited' : '';
            const favoriteIcon = isFavorited ? 'fas fa-heart' : 'far fa-heart';
            const hasColors = p.cores && p.cores.length > 0;
            const buttonHtml = hasColors 
                ? `<a href="product.html?id=${p.id}" class="btn btn-primary" style="width: 100%; display: block; box-sizing: border-box;">Ver Detalhes</a>`
                : `<button onclick="handleAddToCart('${p.id}', '${p.nome}', ${parseFloat(p.preco || 0)}, ${p.tipo === 'Sob encomenda'}, false)">Adicionar ao Carrinho</button>`;
            
            html += `
                <div class="produto">
                    <a href="product.html?id=${p.id}">
                        <img src="${imageUrl}" alt="${p.nome}">
                    </a>
                    <a href="product.html?id=${p.id}">
                        <h3>${p.nome}</h3>
                    </a>
                    <p class="price">R$ ${parseFloat(p.preco || 0).toFixed(2)}</p>
                    ${buttonHtml}
                    <button onclick="toggleFavorite('${p.id}')" class="favorite-btn ${favoriteClass}"><i class="${favoriteIcon}"></i></button>
                </div>
            `;
        });

        if (loadMore) {
            container.innerHTML += html;
        } else {
            container.innerHTML = html;
        }

        if (snapshot.docs.length === PRODUCTS_PER_PAGE) {
            loadMoreContainer.innerHTML = `<button id="load-more-btn" class="btn btn-secondary">Carregar Mais</button>`;
            document.getElementById("load-more-btn").addEventListener('click', () => loadProducts(true));
        }

    } catch (err) {
        console.error("Erro detalhado ao carregar produtos:", err); // Log de erro mais detalhado
        if (!loadMore) {
            container.innerHTML = "Erro ao carregar produtos. Verifique o console para mais detalhes.";
        }
    } finally {
        isLoading = false;
    }
}

// Função para lidar com adição ao carrinho
export async function handleAddToCart(productId, name, price, isEncomenda, hasColors) {
    window.addToCart(productId, name, price, isEncomenda);
}

// Implementação da função toggleFavorite
export async function toggleFavorite(productId) {
    const user = auth.curre
