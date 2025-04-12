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