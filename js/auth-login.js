// js/auth-login.js
import { auth } from "./firebase-config.js";
import { 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const loginForm = document.getElementById("login-form");
const registerButton = document.getElementById("register-button");
const message = document.getElementById("auth-message");

// LOGIN
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            window.location.href = "index.html";
        })
        .catch((err) => {
            message.textContent = "Erro: " + err.message;
        });
});

// CADASTRO
registerButton.addEventListener("click", () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    createUserWithEmailAndPassword(auth, email, password)
        .then(() => {
            message.style.color = "green";
            message.textContent = "Conta criada com sucesso! Agora faça login.";
        })
        .catch((err) => {
            message.style.color = "red";
            message.textContent = "Erro: " + err.message;
        });
});
