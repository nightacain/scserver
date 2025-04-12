// Проверяем наличие токена перед подключением
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/index.html';
}

// URL сервера на Render
const BACKEND_URL = 'https://scserver.onrender.com';

// Инициализация Socket.IO с URL сервера и токеном
const socket = io(BACKEND_URL, {
    auth: {
        token: token
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

// Состояние игры
let gameState = {
    isMyTurn: false,
    selectedPiece: null,
    gameStarted: false,
    playerColor: null,
    board: null
};

// Обработка ошибок авторизации
socket.on('connect_error', (error) => {
    console.error('Ошибка подключения:', error);
    if (error.message === 'Invalid token' || error.message === 'Token required') {
        localStorage.removeItem('token');
        window.location.href = '/index.html';
    } else {
        alert('Ошибка подключения к серверу. Проверьте соединение с интернетом.');
    }
});

// Подключение к серверу
socket.on('connect', () => {
    console.log('Подключено к серверу');
    
    // Отправляем запрос на присоединение к игре
    socket.emit('joinGame', {
        token: token,
        username: localStorage.getItem('username')
    });
    
    document.getElementById('moveButton').disabled = true;
});

socket.on('disconnect', () => {
    console.log('Отключено от сервера');
    document.getElementById('moveButton').disabled = true;
    alert('Соединение с сервером потеряно. Пытаемся переподключиться...');
});

// Начало игры
socket.on('gameStart', (data) => {
    console.log('Игра началась', data);
    gameState.gameStarted = true;
    gameState.playerColor = data.color;
    gameState.isMyTurn = data.color === 'white'; // Белые ходят первыми
    gameState.board = data.board;
    
    updateBoard(data.board);
    updateGameStatus();
    
    alert(`Игра началась! Вы играете ${data.color === 'white' ? 'белыми' : 'черными'}`);
});

// Ход противника
socket.on('enemyMove', (data) => {
    console.log('Ход противника', data);
    gameState.board = data.board;
    gameState.isMyTurn = true;
    
    updateBoard(data.board);
    updateGameStatus();
});

// Обновление состояния игры
socket.on('gameState', (data) => {
    console.log('Обновление состояния игры', data);
    gameState.board = data.board;
    gameState.isMyTurn = data.currentPlayer === socket.id;
    
    updateBoard(data.board);
    updateGameStatus();
});

// Конец игры
socket.on('gameOver', (data) => {
    console.log('Игра окончена', data);
    gameState.gameStarted = false;
    gameState.isMyTurn = false;
    
    const message = data.winner === socket.id ? 'Вы победили!' : 'Вы проиграли!';
    alert(message);
    
    document.getElementById('moveButton').disabled = true;
});

// Обработка ошибок
socket.on('error', (error) => {
    console.error('Ошибка:', error);
    alert(error.message || 'Произошла ошибка');
});

// Функция для отправки хода
function sendMove() {
    if (!gameState.isMyTurn || !gameState.selectedPiece) {
        alert('Сейчас не ваш ход или не выбрана фигура');
        return;
    }

    // Проверяем, что выбрана своя фигура
    const piece = gameState.board[gameState.selectedPiece.x][gameState.selectedPiece.y];
    if (!piece || piece.color !== gameState.playerColor) {
        alert('Выберите свою фигуру');
        return;
    }

    const move = {
        from: gameState.selectedPiece,
        to: { x: 0, y: 0 }, // Координаты заполняются при клике на целевую клетку
        color: gameState.playerColor
    };

    // Отправляем ход на сервер
    socket.emit('playerMove', move);
    
    // Сбрасываем выбранную фигуру
    const cells = document.querySelectorAll('.cell');
    cells[gameState.selectedPiece.x * 8 + gameState.selectedPiece.y].classList.remove('selected');
    gameState.selectedPiece = null;
    gameState.isMyTurn = false;
}

// Функция обновления статуса игры
function updateGameStatus() {
    const moveButton = document.getElementById('moveButton');
    moveButton.disabled = !gameState.isMyTurn || !gameState.gameStarted;
}

// Функция обновления игрового поля
function updateBoard(board) {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.innerHTML = '';

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const cell = document.createElement('div');
            cell.className = `cell ${(i + j) % 2 === 0 ? 'white' : 'black'}`;
            
            if (board[i][j]) {
                const piece = document.createElement('div');
                piece.className = `piece ${board[i][j].color}`;
                if (board[i][j].isKing) {
                    piece.classList.add('king');
                }
                cell.appendChild(piece);
            }

            cell.addEventListener('click', () => handleCellClick(i, j));
            gameBoard.appendChild(cell);
        }
    }
}

// Обработчик клика по клетке
function handleCellClick(x, y) {
    if (!gameState.isMyTurn || !gameState.gameStarted) return;

    const piece = gameState.board[x][y];

    if (!gameState.selectedPiece) {
        // Проверяем, что выбрана своя фигура
        if (piece && piece.color === gameState.playerColor) {
            gameState.selectedPiece = { x, y };
            const cells = document.querySelectorAll('.cell');
            cells[x * 8 + y].classList.add('selected');
        }
    } else {
        // Делаем ход
        const move = {
            from: gameState.selectedPiece,
            to: { x, y },
            color: gameState.playerColor
        };

        socket.emit('playerMove', move);
        
        // Снимаем выделение
        const cells = document.querySelectorAll('.cell');
        cells[gameState.selectedPiece.x * 8 + gameState.selectedPiece.y].classList.remove('selected');
        gameState.selectedPiece = null;
        gameState.isMyTurn = false;
    }
}

// Добавляем стили для доски
const style = document.createElement('style');
style.textContent = `
    .game-board {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 2px;
        padding: 10px;
        background: #2c3e50;
        border-radius: 8px;
        max-width: 600px;
        margin: 0 auto;
    }

    .cell {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
    }

    .cell.white {
        background: #ecf0f1;
    }

    .cell.black {
        background: #34495e;
    }

    .cell.selected {
        box-shadow: inset 0 0 0 3px #e74c3c;
    }

    .piece {
        width: 80%;
        height: 80%;
        border-radius: 50%;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s;
    }

    .piece.white {
        background: #fff;
        border: 2px solid #bdc3c7;
    }

    .piece.black {
        background: #2c3e50;
        border: 2px solid #34495e;
    }

    .piece.king::after {
        content: '👑';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 1.2em;
    }

    .piece:hover {
        transform: scale(1.1);
    }
`;
document.head.appendChild(style); 