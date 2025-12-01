import { db } from "./firebase-config.js";
import { auth } from "./firebase-config.js";
import { collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Função para inicializar o carrinho no localStorage se ele não existir
function getCart( ) {
    const cart = localStorage.getItem('cart');
    return cart ? JSON.parse(cart) : [];
}

// Função para salvar o carrinho no localStorage
function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Função para adicionar item ao carrinho (página inicial - sem cores obrigatórias)
export async function addToCart(id, name, price, isEncomenda = false) {
    const cart = getCart();
    
    // Busca a imagem do produto no Firebase
    let imageUrl = '';
    try {
        const docRef = doc(db, "produtos", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const product = docSnap.data();
            imageUrl = product.imagens && product.imagens.length > 0 ? product.imagens[0] : '';
        }
    } catch (err) {
        console.error("Erro ao buscar imagem do produto:", err);
    }
	    
	    // Na página inicial, tentamos agrupar itens idênticos (sem opções extras)
	    if (!isEncomenda) {
	        const existingItem = cart.find(item => 
	            item.id === id && !item.isEncomenda && !item.color && !item.observation
	        );
	        
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
	
	    // Se for encomenda ou novo item simples
	    cart.push({ id, name, price, quantity: 1, isEncomenda, color: '', observation: '', imageUrl: imageUrl });
	    saveCart(cart);
	    alert(`${name} adicionado ao carrinho!`);
	    
	    if (document.getElementById('cart-items')) {
	        loadCart();
	    }

// Função para adicionar item ao carrinho (página de detalhes - com validação de cores)
export async function addToCartFromDetail(productId, name, price, isEncomenda) {
    const colorSelect = document.getElementById('select-cores');
    const observation = document.getElementById(`obs-${productId}`);
    
    // Busca o produto para saber se ele tem cores e para pegar a imagem
    try {
        const docRef = doc(db, "produtos", productId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const product = docSnap.data();
            
            // Se o produto tem cores, obriga a seleção
            if (product.cores && product.cores.length > 0) {
                if (!colorSelect || !colorSelect.value) {
                    alert("Por favor, selecione uma cor antes de adicionar ao carrinho!");
                    return;
                }
            }

	            // Se for sob encomenda, obriga o preenchimento da observação
		            if (product.tipo === 'Sob encomenda') {
	                if (!observation || !observation.value.trim()) {
	                    alert("Este produto é sob encomenda. Por favor, preencha o campo de observações com suas medidas.");
	                    return;
	                }
	            }

            // Pega a imagem do produto
            const imageUrl = product.imagens && product.imagens.length > 0 ? product.imagens[0] : '';
            
            const color = colorSelect ? colorSelect.value : '';
            const obs = observation ? observation.value : '';
            
            const cart = getCart();
            
            // Sempre adiciona como novo item na página de detalhes (para diferentes cores/observações)
            cart.push({ 
                id: productId, 
                name, 
                price, 
                quantity: 1, 
                isEncomenda, 
                color, 
                observation: obs,
                imageUrl: imageUrl,
                availableColors: product.cores || [] // Salva as cores disponíveis
            });

            saveCart(cart);
            alert(`${name} adicionado ao carrinho!`);
            
            if (document.getElementById('cart-items')) {
                loadCart();
            }
        }
    } catch (err) {
        console.error("Erro ao buscar produto:", err);
    }
}
// --- Tornar funções acessíveis ao HTML inline (pages usam onclick)
window.addToCart = addToCart;                   // usado na listagem (produtos sem cor)
window.addToCartFromDetail = addToCartFromDetail; // usado no product.html (detalhes)
window.getCart = getCart;
window.saveCart = saveCart;
	

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
    loadCart();
}

// Função para atualizar a quantidade de um item
export function updateQuantity(index, newQuantity) {
    const cart = getCart();
    const item = cart[index];
    
    // Se o item tiver opções ou for encomenda, não permite alterar a quantidade
    if (item.isEncomenda || item.color || item.observation) {
        alert("A quantidade de itens personalizados não pode ser alterada diretamente. Remova e adicione novamente se necessário.");
        loadCart();
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
    loadCart();
}

// Função para atualizar a cor de um item no carrinho
export async function updateItemColor(index, newColor) {
    const cart = getCart();
    const item = cart[index];
    
    if (newColor === '') {
        alert("Por favor, selecione uma cor válida!");
        loadCart();
        return;
    }
    
    item.color = newColor;
    saveCart(cart);
    loadCart();
}

// Função para exibir o carrinho na página cart.html
export function loadCart() {
    const cart = getCart();
    const container = document.getElementById('cart-items');
    const subtotalSpan = document.getElementById('cart-subtotal');
    const totalSpan = document.getElementById('cart-total');
    
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = "<p style='text-align: center; padding: 20px;'>Seu carrinho está vazio.</p>";
        if (subtotalSpan) subtotalSpan.textContent = "R$ 0,00";
        if (totalSpan) totalSpan.textContent = "R$ 0,00";
        return;
    }

    let html = "";
    let subtotal = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        let detailsHtml = '';
        if (item.color) detailsHtml += `<span>Cor: ${item.color}</span>`;
        if (item.observation) detailsHtml += `<span> | Obs: ${item.observation}</span>`;
        
        const isEncomendaClass = item.isEncomenda ? 'encomenda-item' : '';
        
        // Se o item tem cor, mostra um select para alterar
        let colorSelectHtml = '';
        if (item.color && item.availableColors && item.availableColors.length > 0) {
            const colorOptions = item.availableColors.map(color => 
                `<option value="${color}" ${color === item.color ? 'selected' : ''}>${color}</option>`
            ).join('');
            
            colorSelectHtml = `
                <div class="color-select-container">
                    <label>Alterar Cor:</label>
                    <select onchange="updateItemColor(${index}, this.value)">
                        ${colorOptions}
                    </select>
                </div>
            `;
        }
        
               html += `
            <li class="cart-item ${isEncomendaClass}">
                <a href="product.html?id=${item.id}" style="text-decoration: none; color: inherit; cursor: pointer;">
                    <img src="${item.imageUrl || 'placeholder.png'}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover;">
                </a>
                <div class="item-details">
                    <a href="product.html?id=${item.id}" style="text-decoration: none; color: inherit; cursor: pointer;">
                        <h4>${item.name}</h4>
                    </a>
                    <p>Preço Unitário: R$ ${item.price.toFixed(2)}</p>
                    ${detailsHtml}
                    ${colorSelectHtml}
                </div>
                <div class="item-quantity">
                    <label for="qty-${index}">Qtd:</label>
                    <input type="number" id="qty-${index}" value="${item.quantity}" min="1" 
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

export function displayCheckout() {
    const cart = getCart();
    const total = getCartTotal();
    const halfTotal = total / 2;

    const itemsContainer = document.getElementById("checkout-cart-items");
    const detailsDiv = document.getElementById("payment-details");

    if (!itemsContainer || !detailsDiv) return;

    if (cart.length > 0) {
        let itemsHtml = "<ul>";
        cart.forEach(item => {
            const optionsHtml = [
                item.color ? `Cor: ${item.color}` : null,
                item.observation ? `Obs: ${item.observation}` : null
            ].filter(Boolean).join(" | ");
            
            itemsHtml += `<li>${item.quantity}x ${item.name} ${optionsHtml ? `(${optionsHtml})` : ""} - <strong>R$ ${(item.price * item.quantity).toFixed(2)}</strong></li>`;
        });
        itemsHtml += "</ul>";
        itemsContainer.innerHTML += itemsHtml;
    } else {
        itemsContainer.innerHTML += "<p>Seu carrinho está vazio.</p>";
    }

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
        
        saveCart([]); 
        
        return docRef.id;
    } catch (error) {
        console.error("Erro ao salvar o pedido:", error);
        alert("Ocorreu um erro ao finalizar o pedido. Tente novamente.");
        return false;
    }
}




