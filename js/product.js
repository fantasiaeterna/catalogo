import { db } from "./firebase-config.js";

// pega ID da URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

if (!productId) {
    alert("Produto não encontrado.");
}

// carrega produto
db.collection("produtos").doc(productId).get().then(doc => {
    if (!doc.exists) {
        alert("Produto não encontrado.");
        return;
    }

    const produto = doc.data();

    // preencher campos
    document.getElementById("product-title").textContent = produto.nome;
    document.getElementById("product-price").textContent = "R$ " + produto.preco;
    document.getElementById("product-description").textContent = produto.descricao;

    // imagens
    const img = document.getElementById("product-image");
    img.src = produto.imagens?.[0] || "img/placeholder.png";

    // cores
    const corContainer = document.getElementById("cor-container");
    if (produto.cores && produto.cores.length > 0) {
        produto.cores.forEach(c => {
            const div = document.createElement("div");
            div.innerHTML = `
                <label>
                    <input type="radio" name="cor" value="${c}">
                    ${c}
                </label>
            `;
            corContainer.appendChild(div);
        });
    } else {
        corContainer.style.display = "none";
    }

    // sob encomenda → observação obrigatória
    if (produto.tipo === "Sob encomenda") {
        const obsContainer = document.getElementById("obs-container");
        obsContainer.style.display = "block";
        document.getElementById("observacao").required = true;
        document.getElementById("observacao").placeholder = "Coloque aqui suas medidas";
    }

    // botão adicionar ao carrinho
    document.getElementById("btn-add-cart").onclick = () => {
        adicionarAoCarrinho(produto, productId);
    };
});

// função carrinho
function adicionarAoCarrinho(produto, productId) {
    // valida cor
    if (produto.cores && produto.cores.length > 0) {
        const selecionada = document.querySelector("input[name='cor']:checked");
        if (!selecionada) {
            alert("Selecione uma cor antes de adicionar ao carrinho.");
            return;
        }
        produto.corEscolhida = selecionada.value;
    }

    // valida observação sob encomenda
    if (produto.tipo === "Sob encomenda") {
        const obs = document.getElementById("observacao").value.trim();
        if (!obs) {
            alert("Coloque aqui suas medidas.");
            return;
        }
        produto.observacao = obs;
    }

    // salvar no localStorage
    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    cart.push({
        id: productId,
        nome: produto.nome,
        preco: produto.preco,
        imagem: produto.imagens?.[0] || "img/placeholder.png",
        quantidade: 1,
        cor: produto.corEscolhida || null,
        observacao: produto.observacao || null,
    });

    localStorage.setItem("cart", JSON.stringify(cart));

    alert("Produto adicionado ao carrinho.");
}
