// js/auth-login.js - Versão com Validação e Redefinição de Senha
import { auth } from "./firebase-config.js";
import { 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const authForm = document.getElementById("auth-form" );
const toggleButton = document.getElementById("toggle-auth-mode");
const submitButton = document.getElementById("submit-button");
const forgotPasswordLink = document.getElementById("forgot-password-link");
const passwordHint = document.getElementById("password-hint");
const confirmPasswordGroup = document.getElementById("confirm-password-group");
const message = document.getElementById("auth-message");

let isLoginMode = true;

// Função de validação de senha
function validatePassword(password) {
    // Mínimo 6 caracteres e 1 caractere especial (não alfanumérico)
    const minLength = 6;
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
        return `A senha deve ter no mínimo ${minLength} caracteres.`;
    }
    if (!hasSpecialChar) {
        return "A senha deve conter pelo menos 1 caractere especial.";
    }
    return null; // Válido
}

// Alternar entre Login e Cadastro
toggleButton.addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    
    // Atualiza o texto do botão principal
    submitButton.textContent = isLoginMode ? "Entrar" : "Cadastrar";
    
    // Atualiza o texto do botão de alternância
    toggleButton.textContent = isLoginMode ? "Cadastrar" : "Voltar para Login";
    
		    // Exibe/Esconde a dica de senha e a confirmação de senha
		    passwordHint.style.display = isLoginMode ? "none" : "block";
		    confirmPasswordGroup.style.display = isLoginMode ? "none" : "block";
    
    // Exibe/Esconde o link de esqueci a senha
    forgotPasswordLink.style.display = isLoginMode ? "block" : "none";
    
    // Limpa a mensagem de erro
    message.textContent = "";
});

// Lógica de Submissão do Formulário
authForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirm-password") ? document.getElementById("confirm-password").value.trim() : null;

    if (isLoginMode) {
        // LOGIN
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                window.location.href = "index.html";
            })
            .catch((err) => {
                message.style.color = "red";
                message.textContent = "Erro ao fazer login. Verifique seu email e senha.";
                console.error(err);
            });
    } else {
        // CADASTRO
        const validationError = validatePassword(password);
        
        if (validationError) {
            message.style.color = "red";
            message.textContent = validationError;
            return;
        }
        
        if (password !== confirmPassword) {
            message.style.color = "red";
            message.textContent = "As senhas não coincidem.";
            return;
        }

                createUserWithEmailAndPassword(auth, email, password)
            .then(() => {
                // Exibe mensagem de sucesso
                message.style.color = "green";
                message.textContent = "✓ Conta criada com sucesso! Agora você pode fazer login.";
                
                // Limpa o formulário
                authForm.reset();
                
                // Aguarda 2 segundos e volta para o modo login
                setTimeout(() => {
                    isLoginMode = true;
                    
                    // Atualiza o texto dos botões
                    submitButton.textContent = "Entrar";
                    toggleButton.textContent = "Cadastrar";
                    
                    // Esconde a dica de senha e a confirmação de senha
                    passwordHint.style.display = "none";
                    confirmPasswordGroup.style.display = "none";
                    
                    // Exibe o link de esqueci a senha
                    forgotPasswordLink.style.display = "block";
                    
                    // Limpa a mensagem
                    message.textContent = "";
                }, 2000);
            })
            .catch((err) => {
                message.style.color = "red";
                message.textContent = "Erro ao cadastrar: " + err.message;
                console.error(err);
            });

    }
});

// Redefinir Senha
forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();

    if (!email) {
        message.style.color = "red";
        message.textContent = "Por favor, digite seu email no campo acima para redefinir a senha.";
        return;
    }

    // O Firebase envia um email de redefinição para o endereço fornecido.
    sendPasswordResetEmail(auth, email)
        .then(() => {
            message.style.color = "green";
            message.textContent = `Um link de redefinição de senha foi enviado para ${email}. Verifique sua caixa de entrada e spam.`;
        })
        .catch((err) => {
            message.style.color = "red";
            message.textContent = "Erro ao enviar email de redefinição. Verifique se o email está correto.";
            console.error(err);
        });
});

