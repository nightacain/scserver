# Shadow Checkers Server

Серверная часть многопользовательской игры в шашки с поддержкой PvP через Socket.IO.

## Технологии

- Node.js
- Express
- Socket.IO
- MongoDB
- JWT для аутентификации

## Функциональность

- Регистрация и аутентификация пользователей
- Matchmaking система для поиска игр
- Real-time PvP через WebSocket
- Сохранение истории матчей
- Статистика игроков

## Установка и запуск

1. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/shadow-checkers-server.git
cd shadow-checkers-server
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл .env на основе .env.example и настройте переменные окружения:
```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLIENT_URL=your_client_url
```

4. Запустите сервер:
```bash
# Для разработки
npm run dev

# Для продакшена
npm start
```

## API Endpoints

### Аутентификация
- POST `/api/auth/register` - Регистрация
- POST `/api/auth/login` - Вход
- GET `/api/auth/profile` - Получение профиля

### Матчи
- GET `/api/matches/history` - История матчей
- GET `/api/matches/stats` - Статистика игрока

## Socket.IO События

### Клиент -> Сервер
- `find_game` - Поиск игры
- `join_game` - Присоединение к игре
- `make_move` - Выполнение хода
- `surrender` - Сдаться

### Сервер -> Клиент
- `game_found` - Игра найдена
- `game_state` - Обновление состояния игры
- `game_ended` - Игра завершена
- `invalid_move` - Недопустимый ход

## Структура проекта

```
src/
├── controllers/     # Контроллеры
├── models/         # Mongoose модели
├── routes/         # Express маршруты
├── services/       # Бизнес-логика
└── server.js       # Точка входа
```

## Лицензия

MIT