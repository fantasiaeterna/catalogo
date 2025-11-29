// js/products.js - Versão Completa e Corrigida

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
    setDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { addToCart as addToCartReal } from "./cart.js";

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

// Função para popular o filtro de categorias
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
            if (p.categoria) {
                categories.add(p.categoria.trim()); // Adiciona trim() para remover espaços
            }
        });

        // Ordena as categorias alfabeticamente
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

// Função para popular os novos filtros (Tamanho e Cor)
export async function populateSizeAndColorFilters() {
    const sizeSelect = document.getElementById("size-filter");
    const colorSelect = document.getElementById("color-filter");
    if (!sizeSelect || !colorSelect) return;

    sizeSelect.innerHTML = '<option value="">Todos os Tamanhos</option>';
    colorSelect.innerHTML = '<option value="">Todas as Cores</option>';

    try {
        const q = query(collection(db, "produtos"));
        const snapshot = await getDocs(q);
        
        const sizes = new Set();
        const colors = new Set();
        
        snapshot.forEach(doc => {
            const p = doc.data();
            if (p.tamanhos && Array.isArray(p.tamanhos)) {
                p.tamanhos.forEach(size => sizes.add(size));
            }
            if (p.cores && Array.isArray(p.cores)) {
                p.cores.forEach(color => colors.add(color));
            }
        });

        sizes.forEach(size => {
            sizeSelect.innerHTML += `<option value="${size}">${size}</option>`;
        });
        colors.forEach(color => {
            colorSelect.innerHTML += `<option value="${color}">${color}</option>`;
        });

    } catch (err) {
        console.error("Erro ao popular filtros de tamanho/cor:", err);
    }
}

// Função para carregar produtos com filtros e ordenação
export async function loadProducts() {
    const container = document.getElementById("product-list");
    if (!container) return; // Se não estiver na página inicial, sai

    const categoryFilter = document.getElementById("category-filter");
    const sortOrder = document.getElementById("sort-order");
    const sizeFilter = document.getElementById("size-filter"); 
    const colorFilter = document.getElementById("color-filter"); 

    container.innerHTML = "Carregando produtos...";
    
    // MUDANÇA: Busca os favoritos APÓS a autenticação ser verificada
    await fetchUserFavorites(); 

    const selectedCategory = categoryFilter ? categoryFilter.value : "";
    const order = sortOrder ? sortOrder.value : "asc";
    const selectedSize = sizeFilter ? sizeFilter.value : ""; 
    const selectedColor = colorFilter ? colorFilter.value : ""; 

    try {
        let q = collection(db, "produtos");
        
        if (selectedCategory) {
            q = query(q, where("categoria", "==", selectedCategory));
        }
        
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = "Nenhum produto encontrado.";
            return;
        }

        let products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        // FILTRAGEM NO LADO DO CLIENTE (para Tamanho e Cor)
        products = products.filter(p => {
            const matchesSize = !selectedSize || (p.tamanhos && p.tamanhos.includes(selectedSize));
            const matchesColor = !selectedColor || (p.cores && p.cores.includes(selectedColor));
            return matchesSize && matchesColor;
        });
        
        if (products.length === 0) {
            container.innerHTML = "Nenhum produto encontrado com os filtros selecionados.";
            return;
        }

        // Ordenação no lado do cliente
        products.sort((a, b) => {
            if (order === "asc") {
                return a.preco - b.preco;
            } else {
                return b.preco - a.preco;
            }
        });

        let html = "";
        products.forEach(p => {
            const imageUrl = p.imagens && p.imagens.length > 0 ? p.imagens[0] : 'placeholder.png'; 
            
            const isFavorited = userFavorites.includes(p.id);
            const favoriteClass = isFavorited ? 'favorited' : '';
            const favoriteIcon = isFavorited ? 'fas fa-heart' : 'far fa-heart';
            
            html += `
                <div class="produto">
                    <a href="product.html?id=${p.id}">
                        <img src="${imageUrl}" alt="${p.nome}">
                    </a>
                    <a href="product.html?id=${p.id}">
                        <h3>${p.nome}</h3>
                    </a>
                    <p class="price">R$ ${p.preco.toFixed(2)}</p>
                    <button onclick="addToCart('${p.id}', '${p.nome}', ${p.preco}, ${p.tipo === 'encomenda'})">Adicionar ao Carrinho</button>
                    <button onclick="toggleFavorite('${p.id}')" class="favorite-btn ${favoriteClass}"><i class="${favoriteIcon}"></i></button>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (err) {
        console.error(err);
        container.innerHTML = "Erro ao carregar produtos.";
    }
}

// Funções de Carrinho e Favoritos
export function addToCart(id, nome, preco, isEncomenda = false) {
    const selectedSize = document.getElementById('select-tamanho')?.value || '';
    const selectedColor = document.getElementById('select-cores')?.value || '';
    const observation = document.getElementById(`obs-${id}`)?.value || '';
    
    addToCartReal(id, nome, preco, isEncomenda, selectedSize, selectedColor, observation);
}

// Implementação da função toggleFavorite
export async function toggleFavorite(productId) {
    const user = auth.currentUser;
    if (!user) {
        alert("Você precisa estar logado para adicionar favoritos.");
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            await setDoc(userRef, { favorites: [productId] });
            alert("Produto adicionado aos favoritos!");
        } else {
            const favorites = userSnap.data().favorites || [];
            const isFavorite = favorites.includes(productId);

            if (isFavorite) {
                await updateDoc(userRef, { favorites: arrayRemove(productId) });
                alert("Produto removido dos favoritos!");
            } else {
                await updateDoc(userRef, { favorites: arrayUnion(productId) });
                alert("Produto adicionado aos favoritos!");
            }
        }
        
        // MUDANÇA: Recarrega a lista de produtos para atualizar o ícone
        loadProducts(); 
        
        // MUDANÇA: Atualiza o ícone na página de detalhes, se estiver nela
        updateFavoriteIcon(productId);
        
    } catch (error) {
        console.error("Erro ao alternar favorito:", error);
        alert("Erro ao salvar favorito. Tente novamente.");
    }
}

// Função para atualizar o ícone de favorito na página de detalhes
async function updateFavoriteIcon(productId) {
    await fetchUserFavorites();
    const isFavorited = userFavorites.includes(productId);
    const btn = document.querySelector('.product-info .favorite-btn');
    if (btn) {
        btn.classList.toggle('favorited', isFavorited);
        btn.querySelector('i').className = isFavorited ? 'fas fa-heart' : 'far fa-heart';
    }
}

// Implementação da função de detalhes do produto
export async function loadProductDetails(productId) {
    const container = document.getElementById("product-details-container");
    if (!container) return;

    container.innerHTML = "Carregando detalhes do produto...";

    try {
        const docRef = doc(db, "produtos", productId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            container.innerHTML = "Produto não encontrado.";
            return;
        }

        const p = docSnap.data();
        
        // MUDANÇA: Busca favoritos para definir o estado inicial do botão
        await fetchUserFavorites();
        const isFavorited = userFavorites.includes(productId);
        const favoriteClass = isFavorited ? 'favorited' : '';
        const favoriteIcon = isFavorited ? 'fas fa-heart' : 'far fa-heart';
        
        const imagesHtml = p.imagens.map((imgUrl, index) => 
            `<img src="${imgUrl}" alt="Imagem ${index + 1}" onclick="changeMainImage('${imgUrl}')" class="${index === 0 ? 'active-thumb' : ''}">`
        ).join('');
        
        // Geração dos campos de seleção (Tamanho e Cores)
        const sizeOptions = p.tamanhos ? p.tamanhos.map(size => `<option value="${size}">${size}</option>`).join('') : '';
        const colorOptions = p.cores ? p.cores.map(color => `<option value="${color}">${color}</option>`).join('') : '';

        const sizeSelect = p.tamanhos && p.tamanhos.length > 0 ? `
            <div class="filter-group">
                <label for="select-tamanho">Tamanho:</label>
                <select id="select-tamanho">
                    ${sizeOptions}
                </select>
            </div>
        ` : '';
        
        const colorSelect = p.cores && p.cores.length > 0 ? `
            <div class="filter-group">
                <label for="select-cores">Cor:</label>
                <select id="select-cores">
                    ${colorOptions}
                </select>
            </div>
        ` : '';


        // HTML para a página de detalhes (product.html)
        container.innerHTML = `
            <div class="product-detail-layout">
                <div class="product-gallery">
                    <img id="main-product-image" src="${p.imagens[0]}" alt="${p.nome}">
                    <div class="thumbnails-details">
                        ${imagesHtml}
                    </div>
                </div>
                <div class="product-info">
                    <h1>${p.nome}</h1>
                    <p class="category">Categoria: ${p.categoria}</p>
                    <p class="price">R$ ${p.preco.toFixed(2)}</p>
                    <p>${p.descricao}</p>
                    
                    ${sizeSelect}
                    ${colorSelect}
                    
                    <!-- Campos de Encomenda (Se aplicável) -->
                    ${p.tipo === 'encomenda' ? `
                        <div class="custom-order-fields">
                            <h3>Detalhes da Encomenda</h3>
                            <textarea id="obs-${productId}" placeholder="Ex: Alça fina, detalhes em dourado..."></textarea>
                            <p class="small-text">Lembre-se: Encomendas requerem 50% de pagamento antecipado.</p>
                        </div>
                    ` : ''}

                    <button onclick="addToCart('${productId}', '${p.nome}', ${p.preco}, ${p.tipo === 'encomenda'})">Adicionar ao Carrinho</button>
                    <button onclick="toggleFavorite('${productId}')" class="favorite-btn ${favoriteClass}"><i class="${favoriteIcon}"></i></button>
                </div>
            </div>
        `;
        
        // Função auxiliar para trocar a imagem principal
        window.changeMainImage = (imgUrl) => {
            document.getElementById('main-product-image').src = imgUrl;
            document.querySelectorAll('.thumbnails-details img').forEach(img => img.classList.remove('active-thumb'));
            document.querySelector(`.thumbnails-details img[src="${imgUrl}"]`).classList.add('active-thumb');
        };

    } catch (err) {
        console.error("Erro ao carregar detalhes do produto:", err);
        container.innerHTML = "Erro ao carregar detalhes do produto.";
    }
}

// MUDANÇA: Adiciona listener para carregar produtos e filtros após a autenticação
onAuthStateChanged(auth, (user) => {
    // Carrega produtos e filtros apenas na página inicial
    if (document.getElementById("product-list")) {
        loadProducts();
        populateCategoryFilter();
        populateSizeAndColorFilters();
    }
});

