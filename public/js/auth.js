// Базовый URL API
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : 'https://scserver-1.onrender.com/api';

// Функция для отображения ошибок
function showError(message) {
    alert(message);
}

class AuthService {
  constructor() {
    this.baseUrl = API_URL;
  }

  async register(username, email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
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

      this.setAuthData(data.token, username);
      window.location.href = '/game.html';
      return data;
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      showError(error.message);
      throw error;
    }
  }

  async login(username, password) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
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
      window.location.href = '/game.html';
      return data;
    } catch (error) {
      showError(error.message);
      throw error;
    }
  }

  logout() {
    this.clearAuthData();
    window.location.href = '/login.html';
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

  async checkAuth() {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    try {
      const response = await fetch(`${this.baseUrl}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
      return false;
    }
  }
}

const authService = new AuthService();

// Функции-обработчики форм
function getFormElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Элемент с id '${id}' не найден на странице ${window.location.pathname}`);
    return null;
  }
  return element;
}

// Инициализация форм после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM загружен, текущая страница:', window.location.pathname);

  // Обработчик формы входа
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    console.log('Найдена форма входа');
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      try {
        await authService.login(username, password);
      } catch (error) {
        console.error('Ошибка:', error);
      }
    });
  }

  // Обработчик формы регистрации
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    console.log('Найдена форма регистрации');
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (password !== confirmPassword) {
        alert('Пароли не совпадают');
        return;
      }

      try {
        await authService.register(username, email, password);
      } catch (error) {
        console.error('Ошибка:', error);
      }
    });
  }

  // Проверка авторизации на защищенных страницах
  const currentPage = window.location.pathname;
  const publicPages = ['/login.html', '/register.html', '/index.html'];
  
  if (!publicPages.includes(currentPage)) {
    console.log('Проверка авторизации для защищенной страницы:', currentPage);
    authService.checkAuth().then(isAuth => {
      if (!isAuth) {
        window.location.href = '/login.html';
      }
    });
  }
}); 