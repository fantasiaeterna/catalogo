// js/cart.js
import { PRODUTOS } from './data.js';

// --- helpers localStorage ---
export function getCart() {
    try { return JSON.parse(localStorage.getItem('cart')) || []; }
    catch { return []; }
}
function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}
export function getCartTotal() {
    return getCart().reduce((sum, item) => sum + ((item.price||0) * (item.quantity||1)), 0);
}

// --- Adicionar ao carrinho (página inicial) ---
export function addToCart(id, name, price, isEncomenda = false) {
    const product = PRODUTOS.find(p => p.id === id);
    const imageUrl = product && product.imagens && product.imagens.length > 0 ? product.imagens[0] : '';

    const cart = getCart();

    if (!isEncomenda) {
        const existing = cart.find(item =>
            item.id === id && !item.isEncomenda && !item.color && !item.observation
        );
        if (existing) {
            existing.quantity += 1;
            saveCart(cart);
            alert(`${name} adicionado ao carrinho!`);
            if (document.getElementById('cart-items')) loadCart();
            return;
        }
    }

    cart.push({ id, name, price, quantity: 1, isEncomenda, color: '', observation: '', imageUrl });
    saveCart(cart);
    alert(`${name} adicionado ao carrinho!`);
    if (document.getElementById('cart-items')) loadCart();
}

// --- Adicionar ao carrinho (página de detalhes) ---
export function addToCartFromDetail(productId, name, price, isEncomenda) {
    const colorSelect = document.getElementById('select-cores');
    const observation = document.getElementById(`obs-${productId}`);
    const product = PRODUTOS.find(p => p.id === productId);

    if (!product) { alert('Produto não encontrado.'); return; }

    // Valida cor
    if (product.cores && product.cores.length > 0) {
        if (!colorSelect || !colorSelect.value) {
            alert('Por favor, selecione uma cor antes de adicionar ao carrinho!');
            return;
        }
    }

    // Valida medidas se sob encomenda
    if (isEncomenda) {
        if (!observation || !observation.value.trim()) {
            alert('Escreva suas medidas. (Ex: busto, cintura, torax)');
            if (observation) observation.focus();
            return;
        }
    }

    const imageUrl = product.imagens && product.imagens.length > 0 ? product.imagens[0] : '';
    const color = colorSelect ? colorSelect.value : '';
    const obs = observation ? observation.value.trim() : '';

    const cart = getCart();
    cart.push({
        id: productId, name, price,
        quantity: 1, isEncomenda,
        color, observation: obs,
        imageUrl,
        availableColors: product.cores || []
    });
    saveCart(cart);
    alert(`${name} adicionado ao carrinho!`);
    if (document.getElementById('cart-items')) loadCart();
}

// --- Remover item ---
export function removeItem(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    loadCart();
}

// --- Atualizar quantidade ---
export function updateQuantity(index, newQuantity) {
    const cart = getCart();
    const item = cart[index];
    if (item.isEncomenda || item.color || item.observation) {
        alert('A quantidade de itens personalizados não pode ser alterada diretamente. Remova e adicione novamente se necessário.');
        loadCart();
        return;
    }
    const qty = parseInt(newQuantity);
    if (qty > 0) { item.quantity = qty; }
    else { removeItem(index); return; }
    saveCart(cart);
    loadCart();
}

// --- Atualizar cor ---
export function updateItemColor(index, newColor) {
    if (!newColor) { alert('Por favor, selecione uma cor válida!'); loadCart(); return; }
    const cart = getCart();
    cart[index].color = newColor;
    saveCart(cart);
    loadCart();
}

// --- Renderizar carrinho (cart.html) ---
export function loadCart() {
    const cart = getCart();
    const container = document.getElementById('cart-items');
    const subtotalSpan = document.getElementById('cart-subtotal');
    const totalSpan = document.getElementById('cart-total');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = "<p style='text-align:center;padding:20px'>Seu carrinho está vazio. <a href='index.html'>Ver catálogo</a></p>";
        if (subtotalSpan) subtotalSpan.textContent = 'R$ 0,00';
        if (totalSpan) totalSpan.textContent = 'R$ 0,00';
        return;
    }

    let html = '';
    let subtotal = 0;

    cart.forEach((item, index) => {
        const itemTotal = (item.price||0) * (item.quantity||1);
        subtotal += itemTotal;

        let detailsHtml = '';
        if (item.color) detailsHtml += `<span style="font-size:.83rem;color:#4A4540">Cor: ${item.color}</span>`;
        if (item.observation) detailsHtml += `<span style="font-size:.83rem;color:#4A4540"> | Obs: ${item.observation}</span>`;

        let colorSelectHtml = '';
        if (item.color && item.availableColors && item.availableColors.length > 0) {
            const opts = item.availableColors.map(c =>
                `<option value="${c}" ${c === item.color ? 'selected' : ''}>${c}</option>`
            ).join('');
            colorSelectHtml = `
                <div class="color-select-container">
                    <label>Alterar Cor:</label>
                    <select onchange="updateItemColor(${index}, this.value)">${opts}</select>
                </div>
            `;
        }

        html += `
            <li class="cart-item ${item.isEncomenda ? 'encomenda-item' : ''}">
                <a href="product.html?id=${item.id}" style="flex-shrink:0">
                    <img src="${item.imageUrl || ''}" alt="${item.name}"
                         onerror="this.style.display='none'"
                         style="width:80px;height:80px;object-fit:cover;border-radius:8px;display:block">
                </a>
                <div class="item-details">
                    <a href="product.html?id=${item.id}" style="text-decoration:none;color:inherit">
                        <h4>${item.name}</h4>
                    </a>
                    <p style="font-size:.83rem;color:#4A4540;margin:2px 0">Preço Unitário: R$ ${(item.price||0).toFixed(2)}</p>
                    ${detailsHtml}
                    ${colorSelectHtml}
                </div>
                <div class="item-quantity">
                    <label for="qty-${index}">Qtd:</label>
                    <input type="number" id="qty-${index}" value="${item.quantity||1}" min="1"
                           onchange="updateQuantity(${index}, this.value)"
                           ${item.isEncomenda || item.color || item.observation ? 'disabled' : ''}>
                </div>
                <div class="item-price">R$ ${itemTotal.toFixed(2)}</div>
                <button class="remove-item-btn" onclick="removeItem(${index})" title="Remover Item">
                    <i class="fas fa-times"></i>
                </button>
            </li>
        `;
    });

    container.innerHTML = html;
    if (subtotalSpan) subtotalSpan.textContent = `R$ ${subtotal.toFixed(2)}`;
    if (totalSpan) totalSpan.textContent = `R$ ${subtotal.toFixed(2)}`;
}

// --- displayCheckout ---
export function displayCheckout() {
    // não usada diretamente, lógica está inline no checkout.html
}

// --- saveOrder — gera ID local, redireciona ---
export function saveOrder() {
    const cart = getCart();
    if (cart.length === 0) { alert('Seu carrinho está vazio.'); return false; }

    const orderId = Date.now().toString(36).toUpperCase() +
                    Math.random().toString(36).substring(2, 5).toUpperCase();

    localStorage.setItem('lastOrder', JSON.stringify({ orderId, items: cart, total: getCartTotal() }));
    saveCart([]);
    window.location.href = `confirmation.html?orderId=${orderId}`;
    return orderId;
}
