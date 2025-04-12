// Базовый URL API
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : 'https://scserver-1.onrender.com/api';

// Функция для отображения ошибок
function showError(message) {
    alert(message);
}

// Функции для работы с токеном
const saveToken = (token) => {
    localStorage.setItem('token', token);
};

const getToken = () => {
    return localStorage.getItem('token');
};

const removeToken = () => {
    localStorage.removeItem('token');
};

// Функция для проверки авторизации
const checkAuth = async () => {
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    try {
        const response = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error('Токен недействителен');
        }
        return true;
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        removeToken();
        window.location.href = '/login.html';
        return false;
    }
};

// Функция входа
const login = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Ошибка входа');
        }

        saveToken(data.token);
        window.location.href = '/game.html';
    } catch (error) {
        alert(error.message || 'Произошла ошибка при входе');
    }
};

// Функция регистрации
const register = async () => {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!username || !email || !password || !confirmPassword) {
        alert('Пожалуйста, заполните все поля');
        return;
    }

    if (password !== confirmPassword) {
        alert('Пароли не совпадают');
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Ошибка регистрации');
        }

        saveToken(data.token);
        window.location.href = '/game.html';
    } catch (error) {
        alert(error.message || 'Произошла ошибка при регистрации');
    }
};

// Функция выхода
const logout = () => {
    removeToken();
    window.location.href = '/login.html';
};

// Проверка авторизации при загрузке защищенных страниц
if (window.location.pathname !== '/login.html' && 
    window.location.pathname !== '/register.html') {
    checkAuth();
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

  async login(email, password) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Ошибка при входе');
      }

      this.setAuthData(data.token, email);
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

// Функции-обработчики для форм
async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showError('Пожалуйста, заполните все поля');
    return;
  }

  try {
    await authService.login(email, password);
  } catch (error) {
    console.error('Ошибка входа:', error);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!username || !email || !password || !confirmPassword) {
    showError('Пожалуйста, заполните все поля');
    return;
  }

  if (password !== confirmPassword) {
    showError('Пароли не совпадают');
    return;
  }

  try {
    await authService.register(username, email, password);
  } catch (error) {
    console.error('Ошибка регистрации:', error);
  }
}

// Автоматическая проверка авторизации на защищенных страницах
(async () => {
  const currentPage = window.location.pathname;
  const publicPages = ['/login.html', '/register.html'];
  
  if (!publicPages.includes(currentPage)) {
    const isAuth = await authService.checkAuth();
    if (!isAuth) {
      window.location.href = '/login.html';
    }
  }
})();

// Добавляем обработчики событий при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  // Проверяем авторизацию
  authService.checkAuth();

  // Находим формы
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // Добавляем обработчики событий для форм
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
}); 