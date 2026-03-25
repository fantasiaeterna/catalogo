// js/products.js
import { PRODUTOS } from './data.js';

// --- Paginação ---
const PRODUCTS_PER_PAGE = 16;
let filteredProducts = [];
let currentPage = 0;
let isLoading = false;

// --- Favoritos via localStorage ---
function getFavorites() {
    try { return JSON.parse(localStorage.getItem('fe_favorites')) || []; }
    catch { return []; }
}
function saveFavorites(favs) {
    localStorage.setItem('fe_favorites', JSON.stringify(favs));
}

export function toggleFavorite(productId) {
    const favs = getFavorites();
    const idx = favs.indexOf(productId);
    if (idx === -1) {
        favs.push(productId);
        saveFavorites(favs);
        showToast('Adicionado aos favoritos ♡');
    } else {
        favs.splice(idx, 1);
        saveFavorites(favs);
        showToast('Removido dos favoritos');
    }
    // Atualiza todos os botões com esse id na página
    document.querySelectorAll(`.favorite-btn[data-id="${productId}"]`).forEach(btn => {
        refreshFavoriteBtn(btn, productId);
    });
}

function refreshFavoriteBtn(btn, productId) {
    const isFav = getFavorites().includes(productId);
    btn.classList.toggle('favorited', isFav);
    const icon = btn.querySelector('i');
    if (icon) icon.className = isFav ? 'fas fa-heart' : 'far fa-heart';
    btn.title = isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
}

function showToast(msg) {
    const existing = document.getElementById('fe-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'fe-toast';
    toast.textContent = msg;
    toast.style.cssText = `
        position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);
        background:#1A1714;color:#FAF8F5;padding:.6rem 1.4rem;
        border-radius:100px;font-size:.83rem;z-index:9999;
        box-shadow:0 4px 16px rgba(0,0,0,.2);pointer-events:none;
        animation:feToastIn .2s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
}

// Injeta keyframe uma vez
(function() {
    if (document.getElementById('fe-toast-style')) return;
    const s = document.createElement('style');
    s.id = 'fe-toast-style';
    s.textContent = `@keyframes feToastIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
    document.head.appendChild(s);
})();

// --- Popular filtros ---
export function populateCategoryFilter() {
    const select = document.getElementById('category-filter');
    if (!select) return;
    select.innerHTML = '<option value="">Todas as Categorias</option>';
    const cats = [...new Set(PRODUTOS.map(p => p.categoria).filter(Boolean))].sort();
    cats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.textContent = cat;
        select.appendChild(opt);
    });
}

export function populateColorFilter() {
    const select = document.getElementById('color-filter');
    if (!select) return;
    select.innerHTML = '<option value="">Todas as Cores</option>';
    const colors = new Set();
    PRODUTOS.forEach(p => {
        if (Array.isArray(p.cores)) p.cores.forEach(c => { if (c) colors.add(c.trim()); });
    });
    [...colors].sort().forEach(color => {
        const opt = document.createElement('option');
        opt.value = color; opt.textContent = color;
        select.appendChild(opt);
    });
}

// --- Renderiza uma página ---
function renderPage(products, append) {
    const container = document.getElementById('product-list');
    const loadMoreContainer = document.getElementById('load-more-container');
    if (!container) return;

    const favs = getFavorites();
    const start = currentPage * PRODUCTS_PER_PAGE;
    const end = start + PRODUCTS_PER_PAGE;
    const page = products.slice(start, end);

    let html = '';
    page.forEach(p => {
        const imgSrc = p.imagens && p.imagens.length > 0 ? p.imagens[0] : '';
        const isFav = favs.includes(p.id);
        const hasChoices = (p.cores && p.cores.length > 0) || p.sob_encomenda;

        const btnHtml = hasChoices
            ? `<a href="product.html?id=${p.id}" class="btn btn-primary">Ver Detalhes</a>`
            : `<button onclick="handleAddToCart('${p.id}','${p.nome.replace(/'/g,"\\'")}',${parseFloat(p.preco||0)},false)">Adicionar ao Carrinho</button>`;

        html += `
            <div class="produto">
                <a href="product.html?id=${p.id}">
                    ${imgSrc
                        ? `<img src="${imgSrc}" alt="${p.nome}" loading="lazy">`
                        : `<div style="aspect-ratio:1;background:#F2EDE6;display:flex;align-items:center;justify-content:center;font-size:.75rem;color:#8A837C">Sem imagem</div>`
                    }
                </a>
                ${p.sob_encomenda ? '<span class="sob-badge">Sob encomenda</span>' : ''}
                <button class="favorite-btn ${isFav ? 'favorited' : ''}" data-id="${p.id}"
                        onclick="toggleFavorite('${p.id}')"
                        title="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
                    <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                </button>
                <a href="product.html?id=${p.id}"><h3>${p.nome}</h3></a>
                <p class="price">${p.preco ? 'R$&nbsp;' + parseFloat(p.preco).toFixed(2) : 'Consultar'}</p>
                ${btnHtml}
            </div>
        `;
    });

    container.innerHTML = append ? container.innerHTML + html : html;

    if (loadMoreContainer) {
        if (end < products.length) {
            loadMoreContainer.innerHTML = `<button id="load-more-btn" class="btn btn-secondary">Carregar Mais</button>`;
            document.getElementById('load-more-btn').addEventListener('click', () => loadProducts(true));
        } else {
            loadMoreContainer.innerHTML = '';
        }
    }
}

// --- loadProducts ---
export function loadProducts(loadMore = false) {
    if (isLoading) return;
    isLoading = true;

    const container = document.getElementById('product-list');
    const loadMoreContainer = document.getElementById('load-more-container');
    if (!container) { isLoading = false; return; }

    if (!loadMore) {
        container.innerHTML = Array(6).fill('<div class="skeleton"></div>').join('');
        currentPage = 0;
        if (loadMoreContainer) loadMoreContainer.innerHTML = '';
    }

    const catVal   = (document.getElementById('category-filter') || {}).value || '';
    const sortVal  = (document.getElementById('sort-order')      || {}).value || 'recentes';
    const colorVal = (document.getElementById('color-filter')    || {}).value || '';

    let products = [...PRODUTOS];
    if (catVal)   products = products.filter(p => p.categoria === catVal);
    if (colorVal) products = products.filter(p => Array.isArray(p.cores) && p.cores.includes(colorVal));
    if (sortVal === 'asc')  products.sort((a, b) => (a.preco||0) - (b.preco||0));
    if (sortVal === 'desc') products.sort((a, b) => (b.preco||0) - (a.preco||0));

    filteredProducts = products;

    setTimeout(() => {
        if (!loadMore) container.innerHTML = '';

        if (products.length === 0) {
            container.innerHTML = "<p style='padding:2rem;color:#8A837C'>Nenhum produto encontrado com os filtros selecionados.</p>";
            isLoading = false;
            return;
        }

        if (loadMore) currentPage++;
        renderPage(filteredProducts, loadMore);
        isLoading = false;
    }, 120);
}

// --- handleAddToCart ---
export function handleAddToCart(productId, name, price, isEncomenda) {
    window.addToCart(productId, name, price, isEncomenda);
}

// --- loadProductDetails ---
export function loadProductDetails(productId) {
    const container = document.getElementById('product-details-container');
    if (!container) return;

    const p = PRODUTOS.find(prod => prod.id === productId);
    if (!p) { container.innerHTML = '<p style="padding:2rem">Produto não encontrado. <a href="index.html">Voltar ao catálogo</a></p>'; return; }

    document.title = `${p.nome} — Fantasia Eterna`;

    const isFav = getFavorites().includes(productId);
    const images = p.imagens || [];

    const thumbsHtml = images.map((src, i) =>
        `<img src="${src}" alt="Imagem ${i+1}" onclick="changeMainImage('${src}')"
              class="${i === 0 ? 'active-thumb' : ''}" loading="lazy">`
    ).join('');

    const colorOptions = (p.cores || []).map(c => `<option value="${c}">${c}</option>`).join('');
    const colorSelect = p.cores && p.cores.length > 0 ? `
        <div class="filter-group">
            <label for="select-cores">Cor: <span style="color:#C9935A">*</span></label>
            <select id="select-cores" required>
                <option value="">Selecione uma cor</option>
                ${colorOptions}
            </select>
        </div>
    ` : '';

    const isEncomenda = p.sob_encomenda;
    const obsLabel = isEncomenda
        ? 'Observações (Obrigatório): <span style="color:#C9935A">*</span>'
        : 'Observações:';
    const obsPlaceholder = isEncomenda
        ? 'Escreva suas medidas. (Ex: busto, cintura, torax)'
        : 'Digite suas observações aqui...';

    container.innerHTML = `
        <div class="product-detail-layout">
            <div class="product-gallery">
                <img id="main-product-image"
                     src="${images.length > 0 ? images[0] : ''}"
                     alt="${p.nome}">
                <div class="thumbnails-details">${thumbsHtml}</div>
            </div>
            <div class="product-info">
                <p class="category">${p.categoria || ''}</p>
                <h1>${p.nome}</h1>
                ${isEncomenda ? '<span class="product-type">Sob encomenda</span>' : ''}
                <p class="price">${p.preco ? 'R$ ' + parseFloat(p.preco).toFixed(2) : 'Consultar'}</p>
                ${p.descricao && p.descricao !== p.nome ? `<p>${p.descricao}</p>` : ''}
                ${colorSelect}
                <div class="filter-group">
                    <label for="obs-${productId}">${obsLabel}</label>
                    <textarea id="obs-${productId}" placeholder="${obsPlaceholder}"
                              ${isEncomenda ? 'required' : ''} style="min-height:100px;resize:vertical"></textarea>
                </div>
                ${isEncomenda ? `
                    <div class="custom-order-fields">
                        <p class="small-text">Lembre-se: Encomendas requerem 50% de pagamento antecipado.</p>
                    </div>
                ` : ''}
                <div style="display:flex;gap:.75rem;align-items:flex-end;flex-wrap:wrap;margin-top:1.25rem">
                    <button style="margin-top:0;flex:1;max-width:260px"
                            onclick="addToCartFromDetail('${productId}','${p.nome.replace(/'/g,"\\'")}',${parseFloat(p.preco||0)},${isEncomenda})">
                        Adicionar ao Carrinho
                    </button>
                    <button class="favorite-btn ${isFav ? 'favorited' : ''}" data-id="${productId}"
                            onclick="toggleFavorite('${productId}')"
                            title="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
                            style="position:static;width:44px;height:44px;flex-shrink:0">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}
