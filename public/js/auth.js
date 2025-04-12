// Базовый URL API
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : 'https://your-render-domain.onrender.com/api';

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
    this.baseUrl = window.location.origin + '/api/auth';
  }

  async register(username, email, password) {
    try {
      console.log('Отправка запроса на регистрацию:', {
        url: `${this.baseUrl}/register`,
        body: { username, email, password }
      });

      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ответ сервера:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Ошибка при регистрации');
        } catch (e) {
          throw new Error(`Ошибка при регистрации: ${errorText}`);
        }
      }

      const data = await response.json();
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
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

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
    await authService.login(username, password);
    window.location.href = '/game.html';
  } catch (error) {
    alert(error.message);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  // Валидация полей
  if (!username || !password || !email) {
    alert('Пожалуйста, заполните все поля');
    return;
  }

  if (password.length < 6) {
    alert('Пароль должен быть не менее 6 символов');
    return;
  }

  if (!email.match(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/)) {
    alert('Пожалуйста, введите корректный email');
    return;
  }

  try {
    await authService.register(username, email, password);
    // После успешной регистрации показываем форму входа
    toggleForms();
    document.getElementById('registerForm').reset();
  } catch (error) {
    alert(error.message);
  }
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
    loginForm.addEventListener('submit', handleLogin);
  }
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
}); 