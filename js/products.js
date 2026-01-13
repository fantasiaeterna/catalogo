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
    setDoc,
    orderBy,
    limit,
    startAfter,
    documentId // Importa documentId para ordenar pelo ID do documento
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// --- Variáveis Globais para Paginação ---
let lastVisibleProduct = null;
const PRODUCTS_PER_PAGE = 8;
let isLoading = false;

let userFavorites = [];

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

// --- Função para carregar produtos com ordenação por MAIS RECENTES ---
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
        lastVisibleProduct = null;
    }
    
    loadMoreContainer.innerHTML = '';

    await fetchUserFavorites(); 

    const selectedCategory = categoryFilter ? categoryFilter.value : "";
    // O valor padrão do seletor de ordenação deve ser 'recentes'
    const order = sortOrder ? sortOrder.value : "recentes"; 
    const selectedColor = colorFilter ? colorFilter.value : "";

    try {
        let q = collection(db, "produtos");
        
        if (selectedCategory) {
            q = query(q, where("categoria", "==", selectedCategory));
        }
        
        // --- LÓGICA DE ORDENAÇÃO ATUALIZADA ---
        if (order === "asc") {
            q = query(q, orderBy("preco", "asc"));
        } else if (order === "desc") {
            q = query(q, orderBy("preco", "desc"));
        } else { // "recentes" (padrão)
            // Ordena pelos IDs dos documentos em ordem decrescente (mais novos primeiro)
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
        console.error(err);
        if (!loadMore) {
            container.innerHTML = "Erro ao carregar produtos.";
        }
    } finally {
        isLoading = false;
    }
}

// Função para lidar com adição ao carrinho (verifica se tem cores)
// A função handleAddToCart não é mais necessária, pois a lógica foi movida para loadProducts.
// Apenas a função window.addToCart será chamada diretamente para produtos sem cores.
// Mantendo a função para evitar erros, mas simplificando-a.
export async function handleAddToCart(productId, name, price, isEncomenda, hasColors) {
    // Esta função só será chamada para produtos SEM cores (hasColors será 'false')
    // Produtos com cores agora usam um link direto para a página de detalhes.
    window.addToCart(productId, name, price, isEncomenda);
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
        
        loadProducts(); 
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
        
        await fetchUserFavorites();
        const isFavorited = userFavorites.includes(productId);
        const favoriteClass = isFavorited ? 'favorited' : '';
        const favoriteIcon = isFavorited ? 'fas fa-heart' : 'far fa-heart';
        
        const images = p.imagens || [];
        const imagesHtml = images.map((imgUrl, index) => 
            `<img src="${imgUrl}" alt="Imagem ${index + 1}" onclick="changeMainImage('${imgUrl}')" class="${index === 0 ? 'active-thumb' : ''}">`
        ).join('');
        
        // Geração dos campos de seleção de cores
	        const colorOptions = p.cores ? p.cores.map(color => `<option value="${color}">${color}</option>`).join('') : '';
		        const colorSelect = p.cores && p.cores.length > 0 ? `
		            <div class="filter-group">
		                <label for="select-cores">Cor: <span style="color: red;">*</span></label>
		                <select id="select-cores" required>
		                    <option value="">Selecione uma cor</option>
		                    ${colorOptions}
		                </select>
		            </div>
		        ` : '';

			        const isEncomenda = p.tipo === 'Sob encomenda';
		        
		        // Campo de observações com as regras de preenchimento
		        const observationLabel = isEncomenda 
		            ? 'Observações (Obrigatório): <span style="color: red;">*</span>' 
		            : 'Observações:';
		        const observationPlaceholder = isEncomenda 
		            ? 'Escreva suas medidas. (Ex: busto, cintura, torax)' 
		            : 'Digite suas observações aqui...';
		        const observationRequired = isEncomenda ? 'required' : '';
		        
		        const observationField = `
		            <div class="filter-group">
		                <label for="obs-${productId}">${observationLabel}</label>
		                <textarea id="obs-${productId}" placeholder="${observationPlaceholder}" ${observationRequired} style="min-height: 120px; resize: vertical;"></textarea>
		            </div>
		        `;

	        // HTML para a página de detalhes (product.html)
	        container.innerHTML = `
		            <div class="product-detail-layout">
		                <div class="product-gallery">
		                    <img id="main-product-image" src="${images.length > 0 ? images[0] : 'placeholder.png'}" alt="${p.nome}">
	                    <div class="thumbnails-details">
	                        ${imagesHtml}
	                    </div>
	                </div>
	                <div class="product-info">
	                    <h1>${p.nome}</h1>
	                    <p class="category">Categoria: ${p.categoria}</p>
	                    <p class="price">R$ ${parseFloat(p.preco || 0).toFixed(2)}</p>
	                    <p>${p.descricao}</p>
	                    
	                    ${colorSelect}
	                    ${observationField}
	                    
	                    ${isEncomenda ? `
	                        <div class="custom-order-fields">
	                            <p class="small-text">Lembre-se: Encomendas requerem 50% de pagamento antecipado.</p>
	                        </div>
	                    ` : ''}

		                    <button onclick="addToCartFromDetail('${productId}', '${p.nome}', ${parseFloat(p.preco || 0)}, ${isEncomenda})">Adicionar ao Carrinho</button>
	                    <button onclick="toggleFavorite('${productId}')" class="favorite-btn ${favoriteClass}"><i class="${favoriteIcon}"></i></button>
	                </div>
	            </div>
	        `;
        


    } catch (err) {
        console.error("Erro ao carregar detalhes do produto:", err);
        container.innerHTML = "Erro ao carregar detalhes do produto.";
    }
}

// Adiciona listener para carregar produtos e filtros após a autenticação
onAuthStateChanged(auth, (user) => {
    if (document.getElementById("product-list")) {
        loadProducts();
        populateCategoryFilter();
        populateColorFilter();
    }
});

