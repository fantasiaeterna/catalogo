import { db } from "./firebase-config.js";
import { auth } from "./firebase-config.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Função para inicializar o carrinho no localStorage se ele não existir
function getCart( ) {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
}

// Função para salvar o carrinho no localStorage
function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// MUDANÇA: Função completa para adicionar item (usada na página de detalhes)
export function addToCartFull(id, name, price, isEncomenda = false, size = '', color = '', observation = '') {
    const cart = getCart();
    
    // Para produtos com opções ou encomendas, sempre adicionamos como um novo item
    // para que diferentes tamanhos/cores/observações não sejam agrupados.
    cart.push({ id, name, price, quantity: 1, isEncomenda, size, color, observation });

    saveCart(cart);
    alert(`${name} adicionado ao carrinho!`);
    
    // Se estiver na página do carrinho, recarrega
    if (document.getElementById('cart-items')) {
        loadCart();
    }
}

// MUDANÇA: Função simples para adicionar item (usada na página inicial)
export function addToCart(id, name, price, isEncomenda = false, size = '', color = '', observation = '') {
    const cart = getCart();
    
    // Na página inicial, tentamos agrupar itens idênticos (sem opções extras)
    if (!isEncomenda && !size && !color && !observation) {
        const existingItem = cart.find(item => item.id === id && !item.isEncomenda && !item.size && !item.color && !item.observation);
        
        if (existingItem) {
            existingItem.quantity += 1;
            saveCart(cart);
            alert(`${name} adicionado ao carrinho!`);
            if (document.getElementById('cart-items')) {
                loadCart();
            }
            return;
        }
    }
    
    // Se for encomenda, tiver opções, ou for um novo item simples
    cart.push({ id, name, price, quantity: 1, isEncomenda, size, color, observation });
    saveCart(cart);
    alert(`${name} adicionado ao carrinho!`);
    
    if (document.getElementById('cart-items')) {
        loadCart();
    }
}

// Função para obter o total do carrinho
export function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Função para remover um item do carrinho
export function removeItem(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    loadCart(); // Recarrega o carrinho após a remoção
}

// Função para atualizar a quantidade de um item (se não for encomenda)
export function updateQuantity(index, newQuantity) {
    const cart = getCart();
    const item = cart[index];
    
    // Se o item tiver opções ou for encomenda, não permite alterar a quantidade
    if (item.isEncomenda || item.size || item.color || item.observation) {
        alert("A quantidade de itens personalizados não pode ser alterada diretamente. Remova e adicione novamente se necessário.");
        loadCart(); // Recarrega para resetar o input
        return;
    }

    const quantity = parseInt(newQuantity);
    if (quantity > 0) {
        item.quantity = quantity;
    } else {
        removeItem(index);
        return;
    }
    
    saveCart(cart);
    loadCart(); // Recarrega o carrinho após a atualização
}

// Função para exibir o carrinho na página cart.html (Refatorada para o novo layout)
export function loadCart() {
    const cart = getCart();
    const container = document.getElementById('cart-items');
    const subtotalSpan = document.getElementById('cart-subtotal');
    const totalSpan = document.getElementById('cart-total');
    
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = "<p style='text-align: center; padding: 20px;'>Seu carrinho está vazio.</p>";
        subtotalSpan.textContent = "R$ 0,00";
        totalSpan.textContent = "R$ 0,00";
        return;
    }

    let html = "";
    let subtotal = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        let detailsHtml = '';
        if (item.size) detailsHtml += `<span>Tamanho: ${item.size}</span>`;
        if (item.color) detailsHtml += `<span> | Cor: ${item.color}</span>`;
        if (item.observation) detailsHtml += `  
<span>Detalhes Encomenda: ${item.observation}</span>`;
        
        const isEncomendaClass = item.isEncomenda ? 'encomenda-item' : '';
        
        html += `
            <li class="cart-item ${isEncomendaClass}">
                <img src="${item.imageUrl || 'placeholder.png'}" alt="${item.name}">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p>Preço Unitário: R$ ${item.price.toFixed(2)}</p>
                    ${detailsHtml}
                </div>
                <div class="item-quantity">
                    <label for="qty-${index}">Qtd:</label>
                    <input type="number" id="qty-${index}" value="${item.quantity}" min="1" 
                           onchange="updateQuantity(${index}, this.value)" 
                           ${item.isEncomenda || item.size || item.color || item.observation ? 'disabled' : ''}>
                </div>
                <div class="item-price">R$ ${itemTotal.toFixed(2)}</div>
                <button class="remove-item-btn" onclick="removeItem(${index})" title="Remover Item">
                    <i class="fas fa-times"></i>
                </button>
            </li>
        `;
    });

    container.innerHTML = html;
    subtotalSpan.textContent = `R$ ${subtotal.toFixed(2)}`;
    totalSpan.textContent = `R$ ${subtotal.toFixed(2)}`; // Total é igual ao subtotal por enquanto
}

export function displayCheckout() {
    const cart = getCart();
    const total = getCartTotal();
    const halfTotal = total / 2;

    const itemsContainer = document.getElementById("checkout-cart-items");
    const detailsDiv = document.getElementById("payment-details");

    if (!itemsContainer || !detailsDiv) return;

    // 1. Exibe os itens do carrinho
    if (cart.length > 0) {
        let itemsHtml = "<ul>";
        cart.forEach(item => {
            const optionsHtml = [
                item.size ? `Tamanho: ${item.size}` : null,
                item.color ? `Cor: ${item.color}` : null,
                item.observation ? `Obs: ${item.observation}` : null
            ].filter(Boolean).join(" | ");

            itemsHtml += `<li>${item.quantity}x ${item.nome} ${optionsHtml ? `(${optionsHtml})` : ""} - <strong>R$ ${(item.preco * item.quantity).toFixed(2)}</strong></li>`;
        });
        itemsHtml += "</ul>";
        itemsContainer.innerHTML += itemsHtml;
    } else {
        itemsContainer.innerHTML += "<p>Seu carrinho está vazio.</p>";
    }

    // 2. Detalhes do Pagamento
    detailsDiv.innerHTML = `
        <p>Valor Total a Pagar: <strong>R$ ${total.toFixed(2)}</strong></p>
        <p>Valor Mínimo para Encomendas (50%): <strong>R$ ${halfTotal.toFixed(2)}</strong></p>
    `;
}

// Função para salvar o pedido no Firestore
export async function saveOrder() {
    const user = auth.currentUser;
    const cart = getCart();
    const total = getCartTotal();

    if (!user) {
        alert("Você precisa estar logado para finalizar o pedido.");
        return false;
    }

    if (cart.length === 0) {
        alert("Seu carrinho está vazio.");
        return false;
    }

    try {
        const orderData = {
            userId: user.uid,
            email: user.email,
            items: cart,
            total: total,
            date: new Date().toISOString(),
            status: "Aguardando Pagamento"
        };

        const docRef = await addDoc(collection(db, "pedidos"), orderData);
        
        // Limpa o carrinho após o pedido ser salvo
        saveCart([]); 
        
        return docRef.id; // Retorna o ID do pedido
    } catch (error) {
        console.error("Erro ao salvar o pedido:", error);
        alert("Ocorreu um erro ao finalizar o pedido. Tente novamente.");
        return false;
    }
}
