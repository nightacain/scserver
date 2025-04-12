class AuthService {
  constructor() {
    this.baseUrl = '/api/auth';
  }

  async register(username, password) {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Ошибка при регистрации');
      }

      alert('Регистрация успешна! Теперь вы можете войти.');
      return data;
    } catch (error) {
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
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  // Валидация полей
  if (!username || !password) {
    alert('Пожалуйста, заполните все поля');
    return;
  }

  if (password.length < 6) {
    alert('Пароль должен быть не менее 6 символов');
    return;
  }

  try {
    if (isLogin) {
      await authService.login(username, password);
      window.location.href = '/game.html';
    } else {
      await authService.register(username, password);
      // После регистрации оставляем на странице логина
      document.getElementById('loginForm').reset();
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