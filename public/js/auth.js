class AuthService {
  constructor() {
    this.baseUrl = '/api/auth';
  }

  async register(username, email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Ошибка при регистрации');
      }

      alert('Регистрация успешна! Теперь вы можете войти.');
      return data;
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      throw error;
    }
  }

  async login(username, password) {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Ошибка при входе');
      }

      this.setAuthData(data.token, username);
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  logout() {
    this.clearAuthData();
    
    window.location.href = '/index.html';
  }

  setAuthData(token, username) {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
  }

  clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  }

  getToken() {
    return localStorage.getItem('token');
  }

  getUsername() {
    return localStorage.getItem('username');
  }

  isAuthenticated() {
    const token = this.getToken();
    return !!token;
  }

  checkAuth() {
    const currentPage = window.location.pathname;
    const isAuth = this.isAuthenticated();

    if (!isAuth && (currentPage === '/game.html' || currentPage === '/index.html')) {
      window.location.href = '/login.html';
      return;
    }
    
    if (isAuth && currentPage === '/login.html') {
      window.location.href = '/game.html';
      return;
    }
  }
}

const authService = new AuthService();

// Функции-обработчики для форм
async function handleSubmit(event, isLogin = true) {
  event.preventDefault();
  
  const prefix = isLogin ? 'login-' : 'register-';
  const username = document.getElementById(prefix + 'username').value;
  const password = document.getElementById(prefix + 'password').value;
  const email = isLogin ? null : document.getElementById('register-email').value;

  // Валидация полей
  if (!username || !password || (!isLogin && !email)) {
    alert('Пожалуйста, заполните все поля');
    return;
  }

  if (password.length < 6) {
    alert('Пароль должен быть не менее 6 символов');
    return;
  }

  if (!isLogin && !email.match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/)) {
    alert('Пожалуйста, введите корректный email');
    return;
  }

  try {
    if (isLogin) {
      await authService.login(username, password);
      window.location.href = '/game.html';
    } else {
      await authService.register(username, email, password);
      // После успешной регистрации показываем форму входа
      toggleForms();
      document.getElementById('registerForm').reset();
    }
  } catch (error) {
    alert(error.message);
  }
}

// Функции для кнопок
async function login(event) {
  await handleSubmit(event, true);
}

async function register(event) {
  await handleSubmit(event, false);
}

// Добавляем обработчики событий при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  // Проверяем авторизацию
  authService.checkAuth();

  // Находим формы
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // Добавляем обработчики событий для форм
  if (loginForm) {
    loginForm.addEventListener('submit', login);
  }
  if (registerForm) {
    registerForm.addEventListener('submit', register);
  }
}); 