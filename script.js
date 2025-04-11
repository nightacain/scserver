// Инициализация меню и игры
const mainMenu = document.getElementById('main-menu');
const startGameButton = document.getElementById('start-game');
const rulesButton = document.getElementById('rules');
const settingsButton = document.getElementById('settings');
const board = document.getElementById('board');

// Счетчики пешек - делаем их переменными, чтобы можно было обновлять
let whitePiecesCount, blackPiecesCount;

// Функция для инициализации и обновления переменных счетчиков
function initCounters() {
    whitePiecesCount = document.getElementById('white-pieces-count');
    blackPiecesCount = document.getElementById('black-pieces-count');
    console.log('Инициализация счетчиков пешек:', whitePiecesCount, blackPiecesCount);
}

// Состояние игры
let gameStarted = false;
let selectedPiece = null;
let currentPlayer = 'white';
let gameState = [];
let currentTurn = 'white';
let gameTurns = 0; // Счетчик ходов/раундов

// Добавляем переменную для паузы
let isPaused = false;

// Добавляем переменные для таймера
let turnTimer = null;
const TURN_TIME = 60; // время хода в секундах
let remainingTime = TURN_TIME;
let timerDisplay = document.createElement('div');
timerDisplay.className = 'timer-display';
timerDisplay.style.display = 'none'; // Скрываем таймер изначально
document.body.appendChild(timerDisplay);

// Создаем элемент для отображения текущего раунда
let roundsDisplay = null;

// Добавляем статистику для каждой пешки
let piecesStats = {};

// Объект с определениями уникальных способностей
const uniqueAbilities = {
    regeneration: {
        name: 'Регенерация',
        description: 'Восстанавливает 1 здоровье в конце каждого хода',
        icon: 'healing',
        requiresHealth: 3,
        requiresAttack: 1,
        effect: (stats) => {
            // Логика регенерации реализована в функции endTurn
            if (stats.health < stats.maxHealth) {
                stats.health = Math.min(stats.health + 1, stats.maxHealth);
                return true; // Способность была активирована
            }
            return false; // Способность не была активирована (уже макс. здоровье)
        }
    },
    rage: {
        name: 'Ярость',
        description: 'Наносит на 1 дополнительный урон, если здоровье ниже 50%',
        icon: 'local_fire_department',
        requiresHealth: 1,
        requiresAttack: 3,
        effect: (stats, target) => {
            // Проверяем условие ярости: здоровье < 50% максимального
            return stats.health < stats.maxHealth / 2;
        }
    },
    deathStrike: {
        name: 'Смертельный удар',
        description: 'Шанс 25% мгновенно убить вражескую фигуру при атаке',
        icon: 'flash_on',
        requiresHealth: 0,
        requiresAttack: 4,
        effect: (stats, target) => {
            // 25% шанс мгновенного убийства
            return Math.random() < 0.25;
        }
    },
    invulnerability: {
        name: 'Неуязвимость',
        description: 'Получает на 1 очко меньше урона от всех атак',
        icon: 'shield',
        requiresHealth: 4,
        requiresAttack: 0,
        effect: (stats, damage) => {
            // Возвращаем модифицированный урон
            return Math.max(1, damage - 1);
        }
    },
    bloodThirst: {
        name: 'Жажда крови',
        description: 'Восстанавливает здоровье, равное 50% от нанесённого урона',
        icon: 'bloodtype',
        requiresHealth: 2,
        requiresAttack: 2,
        effect: (stats, damageDealt) => {
            const healing = Math.floor(damageDealt * 0.5);
            if (healing > 0 && stats.health < stats.maxHealth) {
                stats.health = Math.min(stats.health + healing, stats.maxHealth);
                return true; // Способность была активирована
            }
            return false; // Способность не была активирована
        }
    }
};

// Функция для определения уникальной способности пешки на основе её прокачки
function determineUniqueAbility(stats) {
    if (!stats || stats.level < 4) return null;
    
    // Подсчитываем количество улучшений здоровья и атаки
    // Начальные значения: 1 здоровье и 1 атака (или 3 здоровья и 2 атаки для дамки)
    const baseHealth = stats.isKing ? 3 : 1;
    const baseAttack = stats.isKing ? 2 : 1;
    
    const healthUpgrades = stats.maxHealth - baseHealth;
    const attackUpgrades = stats.attack - baseAttack;
    
    // Проверяем каждую способность
    if (healthUpgrades >= 3 && attackUpgrades >= 1) {
        return 'regeneration';
    } else if (healthUpgrades >= 1 && attackUpgrades >= 3) {
        return 'rage';
    } else if (attackUpgrades >= 4) {
        return 'deathStrike';
    } else if (healthUpgrades >= 4) {
        return 'invulnerability';
    } else if (healthUpgrades >= 2 && attackUpgrades >= 2) {
        return 'bloodThirst';
    }
    
    return null;
}

// Функция для инициализации статистики пешки
function initPieceStats(row, col, color, isKing = false) {
    const pieceId = `${row}-${col}`;
    
    // Проверяем, существует ли пешка на доске и имеет ли она класс 'king'
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (square) {
        const piece = square.querySelector('.piece');
        if (piece && piece.classList.contains('king')) {
            isKing = true;
        }
    }
    
    piecesStats[pieceId] = {
        moves: 0,
        captures: 0,
        isKing: isKing,
        color: color,
        health: isKing ? 3 : 1,      // Король имеет больше здоровья
        maxHealth: isKing ? 3 : 1,    // Король имеет больше макс. здоровья
        attack: isKing ? 2 : 1,       // Король имеет больше атаки
        level: isKing ? 1 : 0,        // Король имеет более высокий уровень
        uniqueAbility: null,          // Уникальная способность (определяется при достижении 4-го уровня)
        healthUpgrades: 0,            // Счетчик улучшений здоровья
        attackUpgrades: 0             // Счетчик улучшений атаки
    };
    
    return piecesStats[pieceId];
}

// Функция для управления паузой
function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        // Остановка таймера при паузе
        clearInterval(turnTimer);
        
        // Показываем оверлей паузы
        showPauseOverlay();
        
        // Воспроизводим звук паузы
        soundManager.play('pause');
        
        // Обновляем иконку на кнопке паузы
        const pauseButton = document.querySelector('.pause-button');
        if (pauseButton) {
            const icon = pauseButton.querySelector('.material-icons-round');
            icon.textContent = 'play_arrow';
            pauseButton.title = 'Продолжить (P)';
        }
    } else {
        // Возобновляем таймер
        turnTimer = setInterval(updateTimer, 1000);
        
        // Скрываем оверлей паузы
        hidePauseOverlay();
        
        // Воспроизводим звук возобновления
        soundManager.play('resume');
        
        // Обновляем иконку на кнопке паузы
        const pauseButton = document.querySelector('.pause-button');
        if (pauseButton) {
            const icon = pauseButton.querySelector('.material-icons-round');
            icon.textContent = 'pause';
            pauseButton.title = 'Пауза (P)';
        }
    }
}

// Функция для отображения оверлея паузы
function showPauseOverlay() {
    // Создаем оверлей, если его еще нет
    let pauseOverlay = document.getElementById('pause-overlay');
    if (!pauseOverlay) {
        pauseOverlay = document.createElement('div');
        pauseOverlay.id = 'pause-overlay';
        pauseOverlay.className = 'pause-overlay';
        
        const pauseMessage = document.createElement('div');
        pauseMessage.className = 'pause-message';
        pauseMessage.innerHTML = '<h2>Игра на паузе</h2><p>Нажмите <kbd>P</kbd> для продолжения</p>';
        
        pauseOverlay.appendChild(pauseMessage);
        document.body.appendChild(pauseOverlay);
    }
    
    // Показываем оверлей
    pauseOverlay.style.display = 'flex';
}

// Функция для скрытия оверлея паузы
function hidePauseOverlay() {
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
        pauseOverlay.style.display = 'none';
    }
}

// Функция для форматирования времени
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Функция обновления таймера
function updateTimer() {
    // Если игра на паузе, не обновляем таймер
    if (isPaused) {
        return;
    }
    
    if (remainingTime > 0) {
        remainingTime--;
        timerDisplay.textContent = `${currentPlayer === 'white' ? 'Белые' : 'Черные'}: ${formatTime(remainingTime)}`;
        
        // Добавляем предупреждение, когда остается 10 секунд
        if (remainingTime === 10) {
            timerDisplay.classList.add('timer-warning');
            soundManager.play('timer_low'); // Звук предупреждения о времени
        }
    } else {
        // Время истекло
        clearInterval(turnTimer);
        timerDisplay.classList.remove('timer-warning');
        
        // Снимаем выделение с выбранной пешки и очищаем подсветку
        selectedPiece?.classList.remove('selected');
        selectedPiece = null;
        clearHighlights();
        
        soundManager.play('timer_end'); // Звук окончания времени
        
        // Проверяем, есть ли монеты у текущего игрока
        const currentPlayerCoins = window.rpg.getCoins(currentPlayer);
        
        if (currentPlayerCoins > 0) {
            // Списываем монету у текущего игрока
            window.rpg.spendCoins(currentPlayer, 1);
            
            // Показываем уведомление о списании монеты
            showNotification(`${currentPlayer === 'white' ? 'Белые' : 'Черные'} теряют 1 монету за истечение времени!`, 'warning');
            
            // Анимация списания монеты
            const currentUI = document.querySelector(`.${currentPlayer}-ui`);
            if (currentUI) {
                showCoinAnimation(currentUI, -1);
            }
            
            // Добавляем 30 секунд
            remainingTime = 30;
            timerDisplay.textContent = `${currentPlayer === 'white' ? 'Белые' : 'Черные'}: ${formatTime(remainingTime)}`;
            
            // Запускаем таймер заново
            turnTimer = setInterval(updateTimer, 1000);
            
            // Показываем уведомление о дополнительном времени
            showNotification(`Добавлено 30 секунд дополнительного времени!`, 'info');
        } else {
            // Если у игрока нет монет, переключаем ход
            // Показываем сообщение о переходе хода
            const message = `Время ${currentPlayer === 'white' ? 'белых' : 'черных'} истекло, и нет монет для продления!`;
            setTimeout(() => alert(message), 100);
            
            // Переключаем на другого игрока
            currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
            currentTurn = currentPlayer;
            
            // Обновляем счетчик пешек при переключении хода
            updatePiecesCounter();
            
            // Проверяем, есть ли возможные ходы у нового игрока
            if (!canPlayerMove(currentPlayer)) {
                setTimeout(() => {
                    alert(`У ${currentPlayer === 'white' ? 'белых' : 'черных'} нет возможных ходов! Ход пропущен.`);
                }, 200);
                
                // Проверяем наличие пешек у игрока
                let playerHasPieces = false;
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        if (gameState[row][col] && gameState[row][col].color === currentPlayer) {
                            playerHasPieces = true;
                            break;
                        }
                    }
                    if (playerHasPieces) break;
                }
                
                // Только если у игрока нет пешек, проверяем на окончание игры
                if (!playerHasPieces) {
                    checkGameOver();
                } else {
                    // Если у игрока есть пешки, но он не может ходить, переключаем ход
                    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
                    currentTurn = currentPlayer;
                    updateTurnIndicator();
                    startTurnTimer();
                }
            } else {
                updateTurnIndicator();
                startTurnTimer();
                // Обновляем активные шашки нового игрока
                updateActivePlayerPieces();
            }
        }
    }
}

// Функция обновления отображения раундов
function updateRoundsDisplay() {
    if (!roundsDisplay) {
        roundsDisplay = document.createElement('div');
        roundsDisplay.className = 'rounds-display';
        document.body.appendChild(roundsDisplay);
    }
    
    roundsDisplay.textContent = `Раунд: ${gameTurns}`;
    
    // Показываем счетчик только если игра активна
    if (gameStarted && document.body.classList.contains('in-game')) {
        roundsDisplay.style.display = 'block';
        roundsDisplay.style.visibility = 'visible';
        roundsDisplay.style.opacity = '1';
    } else {
        roundsDisplay.style.display = 'none';
        roundsDisplay.style.visibility = 'hidden';
        roundsDisplay.style.opacity = '0';
    }
    
    // Добавляем лог для отслеживания изменения счетчика раундов
    console.log(`Обновление счетчика раундов: ${gameTurns}`);
    
    // Всегда показываем счетчик пешек при отображении раундов
    const piecesCounter = document.getElementById('pieces-counter');
    if (piecesCounter) {
        piecesCounter.style.display = gameStarted ? 'flex' : 'none';
        piecesCounter.style.visibility = gameStarted ? 'visible' : 'hidden';
        piecesCounter.style.opacity = gameStarted ? '1' : '0';
    }
}

// Функция запуска таймера хода
function startTurnTimer() {
    console.log(`Запуск таймера для игрока: ${currentPlayer}`);
    
    // Очищаем список оглушенных пешек предыдущего игрока
    if (window.rpg) {
        const previousPlayer = currentPlayer === 'white' ? 'black' : 'white';
        window.rpg.clearStunnedPieces(previousPlayer);
    }
    
    // Обновляем счетчик пешек при старте хода
    updatePiecesCounter();
    
    // Если начался ход белых, увеличиваем счетчик раундов
    if (currentPlayer === 'white') {
        gameTurns += 1;
        // Показываем счетчик раундов при первом ходе
        if (gameTurns === 1) {
            roundsDisplay = document.createElement('div');
            roundsDisplay.className = 'rounds-display';
            roundsDisplay.style.display = 'block';
            document.body.appendChild(roundsDisplay);
        }
        updateRoundsDisplay();
        
        // Вызываем функцию вознаграждения за раунды
        if (typeof rewardCoinsForRounds === 'function') {
            rewardCoinsForRounds(gameTurns);
        }
        
        console.log(`Новый раунд: ${gameTurns}`);
    }

    // Добавляем ману в начале хода
    if (window.rpg) {
        window.rpg.addMana(currentPlayer, 1);
        showNotification(`+1 мана`, 'info');
    }
    
    // Проверяем, может ли текущий игрок сделать ход
    if (!canPlayerMove(currentPlayer)) {
        console.log(`Игрок ${currentPlayer} не может ходить, проверяем наличие пешек`);
        
        // Проверяем, есть ли у игрока пешки
        let playerHasPieces = false;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (gameState[row][col] && gameState[row][col].color === currentPlayer) {
                    playerHasPieces = true;
                    break;
                }
            }
            if (playerHasPieces) break;
        }
        
        // Если у игрока нет пешек, проверяем окончание игры
        if (!playerHasPieces && checkGameOver()) {
            return;
        }
        
        // Если у игрока есть пешки, но он не может ходить, показываем сообщение и пропускаем ход
        if (playerHasPieces) {
            setTimeout(() => {
                alert(`У ${currentPlayer === 'white' ? 'белых' : 'черных'} нет возможных ходов! Ход пропущен.`);
            }, 100);
        }
        
        // Переключаем на другого игрока
        console.log(`Игра не окончена, переключаем на другого игрока`);
        currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
        currentTurn = currentPlayer;
        updateTurnIndicator();
        
        // Рекурсивно запускаем функцию для нового игрока
        startTurnTimer();
        return;
    }
    
    // Очищаем интервал таймера
    clearInterval(turnTimer);
    remainingTime = TURN_TIME;
    timerDisplay.classList.remove('timer-warning');
    timerDisplay.textContent = `${currentPlayer === 'white' ? 'Белые' : 'Черные'}: ${formatTime(remainingTime)}`;
    
    // Устанавливаем новый таймер
    turnTimer = setInterval(updateTimer, 1000);
    soundManager.play('turn_start'); // Звук начала хода
    
    // Отладочная информация
    console.log(`Таймер запущен для игрока ${currentPlayer}, осталось ${remainingTime} секунд`);
    
    // Обновляем шашки активного игрока
    updateActivePlayerPieces();
}

// Динамический фон
class DynamicBackground {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'dynamic-background';
        document.body.appendChild(this.container);
        
        this.stars = [];
        this.raindrops = [];
        this.maxStars = 100;
        this.maxRaindrops = 50;
        this.createStars();
        this.createRain();
        
        // Изменение цвета фона в зависимости от прогресса игры
        this.progressColor = 0;
        this.updateBackgroundColor();
    }
    
    createStars() {
        const createStar = () => {
            const star = document.createElement('div');
            star.className = 'star';
            
            // Добавляем случайный размер звезды
            const sizes = ['small', 'medium', 'large'];
            const randomSize = sizes[Math.floor(Math.random() * sizes.length)];
            star.classList.add(randomSize);
            
            // Случайная позиция по горизонтали и вертикали
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            
            // Случайная скорость анимации (делаем медленнее)
            star.style.animationDuration = `${4 + Math.random() * 4}s`;
            
            // Случайная задержка появления
            star.style.animationDelay = `${Math.random() * 3}s`;
            
            this.container.appendChild(star);
            
            star.addEventListener('animationend', () => {
                star.remove();
                this.stars = this.stars.filter(s => s !== star);
                if (this.stars.length < this.maxStars) {
                    this.stars.push(createStar());
                }
            });
            
            return star;
        };
        
        // Создаем звезды с небольшой задержкой, чтобы они появлялись постепенно
        for (let i = 0; i < this.maxStars; i++) {
            setTimeout(() => {
                this.stars.push(createStar());
            }, i * 50);
        }
    }
    
    updateBackgroundColor() {
        // Замедляем изменение цвета
        this.progressColor = (this.progressColor + 0.2) % 360;
        
        // Используем более мягкие цвета с низкой насыщенностью и высокой светлотой
        const hue = this.progressColor;
        document.documentElement.style.setProperty(
            '--bg-color-start', 
            `hsl(${hue}, 30%, 35%)`
        );
        document.documentElement.style.setProperty(
            '--bg-color-end', 
            `hsl(${(hue + 30) % 360}, 25%, 45%)`
        );
        
        setTimeout(() => this.updateBackgroundColor(), 100);
    }

    createRain() {
        const createRaindrop = () => {
            const raindrop = document.createElement('div');
            raindrop.className = 'raindrop';
            
            // Случайная позиция по горизонтали
            raindrop.style.left = `${Math.random() * 100}%`;
            
            // Случайная длина капли
            const length = 15 + Math.random() * 25;
            raindrop.style.height = `${length}px`;
            
            // Случайная скорость падения
            raindrop.style.animationDuration = `${0.5 + Math.random()}s`;
            
            // Случайная задержка появления
            raindrop.style.animationDelay = `${Math.random() * 2}s`;
            
            this.container.appendChild(raindrop);
            
            raindrop.addEventListener('animationend', () => {
                raindrop.remove();
                this.raindrops = this.raindrops.filter(r => r !== raindrop);
                if (this.raindrops.length < this.maxRaindrops) {
                    this.raindrops.push(createRaindrop());
                }
            });
            
            return raindrop;
        };
        
        // Создаем капли с небольшой задержкой
        for (let i = 0; i < this.maxRaindrops; i++) {
            setTimeout(() => {
                this.raindrops.push(createRaindrop());
            }, i * 100);
        }
    }
}

// Создаем экземпляр динамического фона
const dynamicBg = new DynamicBackground();

// Создаем видео фон
function createBackgroundVideo() {
    const video = document.createElement('video');
    video.id = 'background-video';
    video.src = 'videos/video.mp4';
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    document.body.insertBefore(video, document.body.firstChild);
}

// Определение стадий игры
const GAME_STAGES = {
    EARLY: { name: 'Ранняя', end: 9 },
    MID: { name: 'Средняя', end: 19 },
    LATE: { name: 'Поздняя', end: Infinity }
};

// Определение улучшений для каждой стадии
const STAGE_UPGRADES = {
    EARLY: [
        {
            id: 'manaBoost',
            name: 'Прилив маны',
            description: 'Увеличивает максимальный запас маны на 2',
            effect: (player) => {
                // Обновляем и playerUpgrades, и playerState
                playerUpgrades[currentPlayer].mana += 2;
                playerState[currentPlayer].mana += 2;
                window.rpg.updateUI(); // Обновляем UI через rpg модуль
            }
        },
        {
            id: 'goldBoost',
            name: 'Золотая жила',
            description: 'Получите 3 золота немедленно',
            effect: (player) => {
                // Обновляем и playerUpgrades, и playerState
                playerUpgrades[currentPlayer].gold += 3;
                playerState[currentPlayer].coins += 3;
                window.rpg.updateUI(); // Обновляем UI через rpg модуль
            }
        },
        {
            id: 'trapMastery',
            name: 'Мастерство ловушек',
            description: 'Открывает способность установки ловушек',
            effect: (player) => {
                // Активируем способность ловушки для игрока
                window.rpg.playerState[player].hasTrapPowerup = true;
                // Добавляем ловушку в список доступных способностей
                if (!window.rpg.playerState[player].availablePowerups.includes('trap')) {
                    window.rpg.playerState[player].availablePowerups.push('trap');
                }
                window.rpg.updateUI(); // Обновляем UI
                showNotification(`Игрок получил способность устанавливать ловушки!`, 'special');
                soundManager.play('powerup', 0.8);
            }
        },
        {
            id: 'stunMastery',
            name: 'Мастерство оглушения',
            description: 'Открывает способность оглушать вражеские пешки',
            effect: (player) => {
                // Активируем способность оглушения для игрока
                window.rpg.playerState[player].hasStunPowerup = true;
                // Добавляем оглушение в список доступных способностей
                if (!window.rpg.playerState[player].availablePowerups.includes('stun')) {
                    window.rpg.playerState[player].availablePowerups.push('stun');
                }
                window.rpg.updateUI(); // Обновляем UI
                showNotification(`Игрок получил способность оглушать вражеские пешки!`, 'special');
                soundManager.play('powerup', 0.8);
            }
        }
    ],
    MID: [
        {
            id: 'uniqueDiscount',
            name: 'Мастерство',
            description: 'Уникальные способности стоят на 1 ману меньше',
            effect: (player) => {
                playerUpgrades[currentPlayer].uniqueSkillDiscount += 1;
            }
        },
        {
            id: 'manaRegen',
            name: 'Регенерация маны',
            description: 'Получайте +1 ману каждые 3 хода',
            effect: (player) => {
                playerUpgrades[currentPlayer].manaRegen = true;
            }
        },
        {
            id: 'timeControl',
            name: 'Мастерство времени',
            description: 'Открывает способность возвращать пешки на предыдущие позиции',
            effect: (player) => {
                // Активируем способность шага назад для игрока
                window.rpg.playerState[player].hasStepBackPowerup = true;
                // Добавляем шаг назад в список доступных способностей
                if (!window.rpg.playerState[player].availablePowerups.includes('stepBack')) {
                    window.rpg.playerState[player].availablePowerups.push('stepBack');
                }
                window.rpg.updateUI(); // Обновляем UI
                showNotification(`Игрок получил способность возвращать пешки назад!`, 'special');
                soundManager.play('powerup', 0.8);
            }
        }
    ],
    LATE: [
        {
            id: 'dominance',
            name: 'Доминирование',
            description: 'Если у вас больше фигур чем у противника, он теряет 1 ману в конце хода',
            effect: (player) => {
                playerUpgrades[currentPlayer].dominanceEffect = true;
            }
        },
        {
            id: 'ultimatePower',
            name: 'Абсолютная сила',
            description: 'Все ваши фигуры получают +1 к атаке',
            effect: (player) => {
                playerUpgrades[currentPlayer].attackBoost = true;
                // Обновляем атаку всех фигур текущего игрока
                const pieces = document.querySelectorAll(`.piece.${currentPlayer}`);
                pieces.forEach(piece => {
                    const row = parseInt(piece.parentElement.dataset.row);
                    const col = parseInt(piece.parentElement.dataset.col);
                    if (piecesStats[`${row}-${col}`]) {
                        piecesStats[`${row}-${col}`].attack += 1;
                        updatePieceStats(row, col);
                    }
                });
            }
        },
        {
            id: 'destructionMastery',
            name: 'Мастерство разрушения',
            description: 'Открывает способность уничтожать вражеские пешки',
            effect: (player) => {
                // Активируем способность уничтожения для игрока
                window.rpg.playerState[player].hasDestroyPowerup = true;
                // Добавляем уничтожение в список доступных способностей
                if (!window.rpg.playerState[player].availablePowerups.includes('destroyPiece')) {
                    window.rpg.playerState[player].availablePowerups.push('destroyPiece');
                }
                window.rpg.updateUI(); // Обновляем UI
                showNotification(`Игрок получил способность уничтожать вражеские пешки!`, 'special');
                soundManager.play('powerup', 0.8);
            }
        }
    ]
};

// Состояние улучшений игроков
const playerUpgrades = {
    white: {
        mana: 0,
        gold: 0,
        uniqueSkillDiscount: 0,
        dominanceEffect: false,
        hasEarlyStageUpgrade: false,
        hasMidStageUpgrade: false,
        hasLateStageUpgrade: false,
        manaRegen: false,
        attackBoost: false
    },
    black: {
        mana: 0,
        gold: 0,
        uniqueSkillDiscount: 0,
        dominanceEffect: false,
        hasEarlyStageUpgrade: false,
        hasMidStageUpgrade: false,
        hasLateStageUpgrade: false,
        manaRegen: false,
        attackBoost: false
    }
};

// История ходов
const moveHistory = [];

// Функция для сохранения хода в историю
function saveMoveToHistory(piece, fromRow, fromCol, toRow, toCol, piecesStats) {
    const pieceColor = piece.classList.contains('white') ? 'white' : 'black';
    const isKing = piece.classList.contains('king');
    const stats = piecesStats[`${fromRow}-${fromCol}`] ? { ...piecesStats[`${fromRow}-${fromCol}`] } : null;
    
    moveHistory.push({
        pieceColor,
        isKing,
        fromRow,
        fromCol,
        toRow,
        toCol,
        stats,
        turnNumber: gameTurns
    });
    
    // Ограничиваем историю последними 10 ходами
    if (moveHistory.length > 10) {
        moveHistory.shift();
    }
}

// Функция для отмены последнего хода
function undoMove(moveData) {
    const { pieceColor, isKing, fromRow, fromCol, toRow, toCol, stats } = moveData;
    
    // Находим пешку на текущей позиции
    const currentSquare = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
    const piece = currentSquare.querySelector('.piece');
    
    if (!piece) {
        console.error('Пешка не найдена для отмены хода');
        return false;
    }
    
    // Находим исходную клетку
    const targetSquare = document.querySelector(`[data-row="${fromRow}"][data-col="${fromCol}"]`);
    
    if (!targetSquare) {
        console.error('Целевая клетка не найдена для отмены хода');
        return false;
    }
    
    // Перемещаем пешку обратно
    targetSquare.appendChild(piece);
    gameState[fromRow][fromCol] = { color: pieceColor, isKing };
    gameState[toRow][toCol] = null;
    
    // Восстанавливаем статистику пешки
    if (stats) {
        piecesStats[`${fromRow}-${fromCol}`] = stats;
        delete piecesStats[`${toRow}-${toCol}`];
        updatePieceStats(fromRow, fromCol);
    }
    
    return true;
}

// Функция для удаления resource-display
function removeResourceDisplay() {
    const resourceDisplay = document.querySelector('.resource-display');
    if (resourceDisplay) {
        resourceDisplay.remove();
    }
}

// Инициализация игрового поля
function initBoard() {
    // Создаем видео фон
    createBackgroundVideo();
    
    // Удаляем resource-display
    removeResourceDisplay();
    
    // Создаем счетчик раундов, но не показываем его
    if (!roundsDisplay) {
        roundsDisplay = document.createElement('div');
        roundsDisplay.className = 'rounds-display';
        document.body.appendChild(roundsDisplay);
    }
    roundsDisplay.style.display = 'none';
    gameTurns = 0;
    updateRoundsDisplay();
    
    // Показываем счетчик пешек при инициализации доски
    forceShowPiecesCounter();
    
    // Очищаем доску и информацию о пешках перед инициализацией
    board.innerHTML = '';
    clearPieceInfo();
    gameState = [];
    
    // Сбрасываем статистику всех пешек при инициализации доски
    piecesStats = {};
    
    // Сбрасываем улучшения игроков
    playerUpgrades.white = { 
        mana: 0, 
        gold: 0, 
        uniqueSkillDiscount: 0, 
        dominanceEffect: false,
        hasEarlyStageUpgrade: false,
        hasMidStageUpgrade: false,
        hasLateStageUpgrade: false
    };
    playerUpgrades.black = { 
        mana: 0, 
        gold: 0, 
        uniqueSkillDiscount: 0, 
        dominanceEffect: false,
        hasEarlyStageUpgrade: false,
        hasMidStageUpgrade: false,
        hasLateStageUpgrade: false
    };
    
    // Сбрасываем состояние powerups
    if (window.rpg && window.rpg.playerState) {
        // Сбрасываем флаги доступности способностей
        window.rpg.playerState.white.hasTrapPowerup = false;
        window.rpg.playerState.black.hasTrapPowerup = false;
        window.rpg.playerState.white.hasStunPowerup = false;
        window.rpg.playerState.black.hasStunPowerup = false;
        window.rpg.playerState.white.hasStepBackPowerup = false;
        window.rpg.playerState.black.hasStepBackPowerup = false;
        window.rpg.playerState.white.hasDestroyPowerup = false;
        window.rpg.playerState.black.hasDestroyPowerup = false;
        
        // Сбрасываем списки доступных способностей
        window.rpg.playerState.white.availablePowerups = [];
        window.rpg.playerState.black.availablePowerups = [];
        
        // Очищаем массивы ловушек и оглушенных пешек
        window.rpg.playerState.white.traps = [];
        window.rpg.playerState.black.traps = [];
        window.rpg.playerState.white.stunnedPieces = [];
        window.rpg.playerState.black.stunnedPieces = [];
    }
    
    // Принудительно показываем счетчик пешек и инициализируем счетчики
    forceShowPiecesCounter();
    initCounters();
    
    soundManager.play('game_start'); // Звук начала игры
    
    // Инициализация доски
    for (let row = 0; row < 8; row++) {
        gameState[row] = [];
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = (row + col) % 2 === 0 ? 'square white' : 'square black';
            square.dataset.row = row;
            square.dataset.col = col;
            
            // Размещение шашек
            if ((row + col) % 2 !== 0) {
                if (row < 3) {
                    createPiece(square, 'black');
                    gameState[row][col] = { color: 'black', isKing: false };
                } else if (row > 4) {
                    createPiece(square, 'white');
                    gameState[row][col] = { color: 'white', isKing: false };
                } else {
                    gameState[row][col] = null;
                }
            } else {
                gameState[row][col] = null;
            }
            
            square.addEventListener('click', handleSquareClick);
            board.appendChild(square);
        }
    }
    
    // Обновляем отображение уровня для всех пешек
    updateAllPiecesLevelDisplay();
    
    // Создаем кнопку паузы
    createPauseButton();
    
    // Инициализируем активные шашки игрока
    updateActivePlayerPieces();
    
    // Обновляем счетчик пешек после инициализации доски
    updatePiecesCounter();
    
    // Устанавливаем начальный ход и показываем окно улучшений
    currentPlayer = 'white';
    gameTurns = 0;
    
    // Показываем окно улучшений для первого игрока после небольшой задержки
    setTimeout(() => {
        if (shouldShowUpgradeWindow()) {
            showUpgradeWindow();
        }
    }, 1000);
}

// Создание шашки
function createPiece(square, color) {
    const piece = document.createElement('div');
    piece.className = `piece ${color}`;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    
    // Инициализируем статистику для новой пешки
    initPieceStats(row, col, color);
    
    square.appendChild(piece);
    
    // Добавляем отображение статистики
    updatePieceStats(row, col);
}

// Добавляем функцию для атаки пешки без прыжка
function attackPiece(attackerPiece, targetSquare, targetRow, targetCol, damage) {
    const attackerSquare = attackerPiece.parentElement;
    const attackerRow = parseInt(attackerSquare.dataset.row);
    const attackerCol = parseInt(attackerSquare.dataset.col);
    
    // Очищаем подсветку и снимаем выделение
    clearHighlights();
    attackerPiece.classList.remove('selected');
    
    // Получаем статистику атакующей пешки
    const attackerStats = piecesStats[`${attackerRow}-${attackerCol}`];
    
    // Проверяем наличие способностей, влияющих на атаку
    let finalDamage = damage;
    let instantKill = false;
    
    if (attackerStats && attackerStats.uniqueAbility) {
        const ability = attackerStats.uniqueAbility;
        
        // Проверяем способность "Ярость"
        if (ability === 'rage') {
            // Если здоровье ниже 50%, добавляем +1 к урону
            if (uniqueAbilities.rage.effect(attackerStats)) {
                finalDamage += 1;
                console.log(`Способность "Ярость" увеличила урон до ${finalDamage}`);
                
                // Показываем анимацию активации способности
                showAbilityActivation(attackerRow, attackerCol);
                
                // Воспроизводим звук активации способности
                soundManager.play('rage', 0.5);
            }
        }
        // Проверяем способность "Смертельный удар"
        else if (ability === 'deathStrike') {
            // Проверяем шанс мгновенного убийства (25%)
            if (uniqueAbilities.deathStrike.effect(attackerStats)) {
                instantKill = true;
                console.log(`Способность "Смертельный удар" активирована! Мгновенное убийство!`);
                
                // Показываем анимацию активации способности
                showAbilityActivation(attackerRow, attackerCol);
                
                // Воспроизводим звук активации способности
                soundManager.play('deathStrike', 0.8);
            }
        }
    }
    
    // Показываем анимацию атаки
    showAttackAnimation(attackerSquare, targetSquare, finalDamage);
    
    // Если сработало мгновенное убийство, наносим большой урон
    if (instantKill) {
        // Устанавливаем урон, гарантирующий смерть (например, 100)
        damagePiece(targetRow, targetCol, 100);
    } else {
        // Наносим обычный (возможно модифицированный) урон пешке противника
        damagePiece(targetRow, targetCol, finalDamage);
    }
    
    // Воспроизводим звук атаки
    soundManager.play('attack', 0.7);
    
    // После успешной атаки, проверяем способность "Жажда крови"
    if (attackerStats && attackerStats.uniqueAbility === 'bloodThirst') {
        // Пытаемся восстановить здоровье на основе нанесенного урона
        if (uniqueAbilities.bloodThirst.effect(attackerStats, finalDamage)) {
            console.log(`Способность "Жажда крови" восстановила здоровье!`);
            
            // Показываем анимацию активации способности
            showAbilityActivation(attackerRow, attackerCol);
            
            // Воспроизводим звук лечения
            soundManager.play('healing', 0.5);
            
            // Обновляем информацию о пешке, если она выбрана
            if (selectedPiece && selectedPiece === attackerPiece) {
                updatePieceInfo(selectedPiece);
            }
        }
    }
    
    // Обновляем статистику пешки
    if (attackerStats) {
        attackerStats.moves++;
    }
    
    return true;
}

// Обработка клика по клетке
function handleSquareClick(event) {
    // Проверяем окно улучшений в начале хода
    if (typeof shouldShowUpgradeWindow === 'function' && shouldShowUpgradeWindow()) {
        showUpgradeWindow();
        return; // Прерываем обработку клика, пока игрок не выберет улучшение
    }

    if (isPaused) return;
    
    // Если активно усиление, обрабатываем его
    if (window.rpg && window.rpg.isPowerupActive()) {
        if (window.rpg.handlePowerupTarget(event.target)) {
            return;
        }
    }
    
    const square = event.target.closest('.square');
    if (!square) return;
    
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const piece = square.querySelector('.piece');
    
    // Проверяем наличие обязательных взятий
    const hasForceJumps = checkForceJumps();
    
    // Если клик по пешке текущего игрока
    if (piece && piece.classList.contains(currentPlayer)) {
        // Проверяем, не оглушена ли пешка
        if (window.rpg && window.rpg.isStunned(row, col, currentPlayer)) {
            soundManager.play('invalid_move');
            showNotification('Эта пешка оглушена и не может ходить в этот ход!', 'error');
            return;
        }
        
        // Скрываем предыдущую подсветку
        clearHighlights();
        clearAttackableTargets();
        
        // Если выбрана та же пешка, снимаем выделение
        if (selectedPiece === piece) {
            selectedPiece.classList.remove('selected');
            selectedPiece = null;
            document.getElementById('piece-info').classList.remove('visible');
            return;
        }

        // Получаем возможные ходы для пешки
        const moves = getValidMoves(row, col);
        const pieceHasJump = moves.some(move => move.isJump);

        // Если есть обязательные взятия и эта пешка не может взять, не выбираем её
        if (hasForceJumps && !pieceHasJump) {
            soundManager.play('invalid_move');
            return;
        }
        
        // Выбираем новую пешку
        if (selectedPiece) {
            selectedPiece.classList.remove('selected');
        }
        selectedPiece = piece;
        piece.classList.add('selected');
        
        // Показываем информацию о пешке
        updatePieceInfo(piece);
        
        // Обновляем обработчики улучшений после выбора пешки
        updateUpgradeHandlers();
        
        // Подсвечиваем возможные ходы
        const validMoves = hasForceJumps ? moves.filter(move => move.isJump) : moves;
        highlightMoves(validMoves);
        
        // Показываем метки на пешках, которые можно атаковать
        showAttackableTargets(validMoves);
        
        // Воспроизводим звук выбора пешки
        soundManager.play('piece_select');
    } else if (selectedPiece) {
        // Если клик по пустой клетке или пешке противника
        const fromRow = parseInt(selectedPiece.parentElement.dataset.row);
        const fromCol = parseInt(selectedPiece.parentElement.dataset.col);
        
        // Получаем возможные ходы для выбранной пешки
        const moves = getValidMoves(fromRow, fromCol);
        const validMoves = hasForceJumps ? moves.filter(move => move.isJump) : moves;
        
        // Проверяем, является ли выбранное поле допустимым ходом
        const selectedMove = validMoves.find(move => move.row === row && move.col === col);
        
        if (selectedMove) {
            if (selectedMove.isAttackOnly) {
                // Если это ход только для атаки, а не для перемещения
                attackPiece(selectedPiece, square, row, col, selectedMove.damage);
                
                // Скрываем информацию о пешке после хода
                document.getElementById('piece-info').classList.remove('visible');
                selectedPiece = null;
                
                // Проверяем окончание игры
                if (!checkEndGameAfterMove()) {
                    // Больше ничего делать не надо, т.к. переключение хода
                    // происходит внутри checkEndGameAfterMove
                    
                    // Обновляем активные шашки
                    updateActivePlayerPieces();
                }
            } else if (selectedMove.isCaptureAndAttack) {
                // Это комбинированный ход: захват + атака
                
                // Сначала выполняем захваты
                const targetSquare = document.querySelector(`[data-row="${selectedMove.jumpToRow}"][data-col="${selectedMove.jumpToCol}"]`);
                if (!targetSquare) {
                    console.error('Целевая клетка не найдена!');
                    return;
                }
                
                // Перемещаем пешку на промежуточную позицию после захватов
                movePiece(selectedPiece, targetSquare, selectedMove.jumpToRow, selectedMove.jumpToCol, selectedMove.captures);
                
                // Затем выполняем атаку из новой позиции
                const attackSquare = document.querySelector(`[data-row="${selectedMove.row}"][data-col="${selectedMove.col}"]`);
                if (!attackSquare) {
                    console.error('Клетка для атаки не найдена!');
                    return;
                }
                
                // Находим пешку после того, как она переместилась
                selectedPiece = targetSquare.querySelector(`.piece.${currentPlayer}`);
                if (!selectedPiece) {
                    console.error('Пешка не найдена после перемещения!');
                    return;
                }
                
                // Выполняем атаку
                setTimeout(() => {
                    attackPiece(selectedPiece, attackSquare, selectedMove.row, selectedMove.col, selectedMove.damage);
                    
                    // Скрываем информацию о пешке после хода
                    document.getElementById('piece-info').classList.remove('visible');
                    selectedPiece = null;
                    
                    // Проверяем окончание игры
                    if (!checkEndGameAfterMove()) {
                        // Больше ничего делать не надо, т.к. переключение хода
                        // происходит внутри checkEndGameAfterMove
                        
                        // Обновляем активные шашки
                        updateActivePlayerPieces();
                    }
                }, 500); // Небольшая задержка между перемещением и атакой
                
                // Воспроизводим звук
                soundManager.play('capture');
            } else {
                // Выполняем обычный ход с перемещением
                movePiece(selectedPiece, square, row, col, selectedMove.captures || []);
                
                // Воспроизводим соответствующий звук
                if (gameState[row][col]?.isKing) {
                    soundManager.play('king_move');
                } else if (selectedMove.isJump) {
                    soundManager.play('capture');
                } else {
                    soundManager.play('move');
                }
                
                // Скрываем информацию о пешке после хода
                document.getElementById('piece-info').classList.remove('visible');
                selectedPiece = null;
                
                // Проверяем окончание игры
                if (!checkEndGameAfterMove()) {
                    // Больше ничего делать не надо, т.к. переключение хода
                    // происходит внутри checkEndGameAfterMove
                    
                    // Обновляем активные шашки
                    updateActivePlayerPieces();
                }
            }
        } else {
            // Неверный ход
            soundManager.play('invalid_move');
            selectedPiece.classList.remove('selected');
            selectedPiece = null;
            clearHighlights();
            document.getElementById('piece-info').classList.remove('visible');
        }
    } else {
        // Если клик по пустой клетке и нет выбранной пешки, скрываем информацию о вражеской пешке
        const pieceInfo = document.getElementById('piece-info');
        if (pieceInfo.classList.contains('visible') && pieceInfo.classList.contains('enemy-info')) {
            pieceInfo.classList.remove('visible');
            pieceInfo.classList.remove('enemy-info');
        }
    }
}

// Получение возможных ходов
function getValidMoves(row, col, isMultiJump = false) {
    const moves = [];
    const piece = gameState[row][col];
    if (!piece) return moves; // Защита от ошибок
    
    // Проверяем, не оглушена ли пешка
    if (window.rpg && window.rpg.isStunned(row, col, piece.color)) {
        return moves; // Возвращаем пустой массив для оглушенной пешки
    }
    
    const direction = piece.color === 'white' ? -1 : 1;
    
    function checkJump(r, c, dr, dc, capturedPieces = [], jumpLength = 0, isFirstJump = true, remainingAttack = null) {
        // Если remainingAttack не передан, используем всю атаку пешки
        if (remainingAttack === null) {
            const attackerStats = piecesStats[`${r}-${c}`];
            remainingAttack = attackerStats ? attackerStats.attack : 0;
        }
        
        // Для обычной пешки проверяем только прыжки на 2 клетки
        if (!piece.isKing) {
            const jumpRow = r + dr * 2;
            const jumpCol = c + dc * 2;
            
            // Проверяем, что прыжок в пределах доски
            if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8) {
                const midRow = r + dr;
                const midCol = c + dc;
                const midPiece = gameState[midRow][midCol];
                
                // Добавляем дополнительную проверку: убедимся, что midPiece существует
                if (midPiece && 
                    midPiece.color !== piece.color && 
                    !gameState[jumpRow][jumpCol]) {
                    
                    // Проверка на фактическое существование пешки на доске
                    const midSquare = document.querySelector(`[data-row="${midRow}"][data-col="${midCol}"]`);
                    const hasPieceElement = midSquare && midSquare.querySelector('.piece');
                    
                    // Если пешка существует как в состоянии, так и на доске
                    if (hasPieceElement) {
                        // Получаем статистику атакующей и защищающейся пешек
                        const attackerStats = piecesStats[`${r}-${c}`];
                        const defenderStats = piecesStats[`${midRow}-${midCol}`];
                        
                        // Проверяем, можем ли мы перепрыгнуть (если атака >= здоровью)
                        // или только атаковать (если атака < здоровья)
                        if (defenderStats && attackerStats && attackerStats.attack < defenderStats.health) {
                            // Атака меньше здоровья - можем только атаковать, но не перепрыгивать
                            
                            // Проверяем, не захватывали ли мы уже эту пешку
                            const alreadyAttacked = capturedPieces.some(
                                captured => captured.row === midRow && captured.col === midCol
                            );
                            
                            if (!alreadyAttacked) {
                                const attackMove = {
                                    row: midRow,
                                    col: midCol,
                                    isJump: true,
                                    isAttackOnly: true,
                                    attackTarget: { row: midRow, col: midCol },
                                    damage: attackerStats.attack,
                                    fromRow: r,
                                    fromCol: c
                                };
                                
                                // Проверяем наличие дубликата в списке ходов
                                const existingMove = moves.find(move => 
                                    move.row === attackMove.row && 
                                    move.col === attackMove.col && 
                                    move.isAttackOnly === true);
                                    
                                if (!existingMove) {
                                    moves.push(attackMove);
                                }
                            }
                        } else if (defenderStats && remainingAttack >= defenderStats.health) {
                            // Атака >= здоровью и оставшейся атаки достаточно
                            // Проверяем, не захватывали ли мы уже эту пешку
                            const alreadyCaptured = capturedPieces.some(
                                captured => captured.row === midRow && captured.col === midCol
                            );
                            
                            if (!alreadyCaptured) {
                                const newCapturedPieces = [
                                    ...capturedPieces,
                                    { row: midRow, col: midCol }
                                ];
                                
                                // Обновляем оставшуюся атаку после захвата
                                const newRemainingAttack = remainingAttack - defenderStats.health;
                                
                                // Добавляем ход в список доступных
                                const jumpMove = {
                                    row: jumpRow,
                                    col: jumpCol,
                                    isJump: true,
                                    captures: newCapturedPieces,
                                    fromRow: r,
                                    fromCol: c,
                                    remainingAttack: newRemainingAttack // Сохраняем оставшуюся атаку
                                };
                                
                                // Проверяем, нет ли уже такого же хода в списке
                                const existingMove = moves.find(move => 
                                    move.row === jumpMove.row && 
                                    move.col === jumpMove.col && 
                                    move.isJump === jumpMove.isJump);
                                    
                                if (!existingMove) {
                                    moves.push(jumpMove);
                                }
                                
                                // Проверяем возможность следующего прыжка
                                if (newRemainingAttack > 0) {
                                    let foundNextJump = false;
                                    
                                    // Перебираем все возможные направления для следующего прыжка
                                    for (let nextDr of [-1, 1]) {
                                        for (let nextDc of [-1, 1]) {
                                            // Проверяем возможный следующий прыжок
                                            const nextJumpRow = jumpRow + nextDr * 2;
                                            const nextJumpCol = jumpCol + nextDc * 2;
                                            
                                            if (nextJumpRow >= 0 && nextJumpRow < 8 && nextJumpCol >= 0 && nextJumpCol < 8) {
                                                const nextMidRow = jumpRow + nextDr;
                                                const nextMidCol = jumpCol + nextDc;
                                                const nextMidPiece = gameState[nextMidRow][nextMidCol];
                                                
                                                // Проверяем, есть ли пешка противника для следующего прыжка
                                                if (nextMidPiece && 
                                                    nextMidPiece.color !== piece.color && 
                                                    !gameState[nextJumpRow][nextJumpCol]) {
                                                    
                                                    // Проверяем, не захватывали ли уже эту пешку
                                                    const alreadyCapturedNext = newCapturedPieces.some(
                                                        captured => captured.row === nextMidRow && captured.col === nextMidCol
                                                    );
                                                    
                                                    if (!alreadyCapturedNext) {
                                                        const nextDefenderStats = piecesStats[`${nextMidRow}-${nextMidCol}`];
                                                        
                                                        // Если атаки не хватает на полный захват, но достаточно для нанесения урона
                                                        if (nextDefenderStats && newRemainingAttack < nextDefenderStats.health && newRemainingAttack > 0) {
                                                            foundNextJump = true;
                                                            
                                                            // Создаем специальный ход: захват + атака
                                                            const captureAndAttackMove = {
                                                                row: nextMidRow,
                                                                col: nextMidCol,
                                                                isJump: true,
                                                                isCaptureAndAttack: true,  // Новое свойство для комбинированного хода
                                                                captures: newCapturedPieces,  // Предыдущие захваты
                                                                attackTarget: { row: nextMidRow, col: nextMidCol }, // Цель атаки
                                                                damage: newRemainingAttack, // Оставшаяся атака становится уроном
                                                                fromRow: r,
                                                                fromCol: c,
                                                                jumpToRow: jumpRow, // Куда прыгнуть после захватов
                                                                jumpToCol: jumpCol
                                                            };
                                                            
                                                            // Проверяем наличие дубликата
                                                            const existingCaptureAndAttack = moves.find(move => 
                                                                move.row === captureAndAttackMove.row && 
                                                                move.col === captureAndAttackMove.col && 
                                                                move.isCaptureAndAttack === true);
                                                                
                                                            if (!existingCaptureAndAttack) {
                                                                moves.push(captureAndAttackMove);
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    
                                    // Если не нашли ход захват+атака, продолжаем обычный поиск мультизахвата
                                    if (!foundNextJump) {
                                        for (let nextDr of [-1, 1]) {
                                            for (let nextDc of [-1, 1]) {
                                                checkJump(jumpRow, jumpCol, nextDr, nextDc, newCapturedPieces, jumpLength + 1, false, newRemainingAttack);
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (defenderStats && defenderStats.health > remainingAttack) {
                            // Здоровье больше оставшейся атаки - можем только атаковать
                            const alreadyAttacked = capturedPieces.some(
                                captured => captured.row === midRow && captured.col === midCol
                            );
                            
                            if (!alreadyAttacked) {
                                const attackMove = {
                                    row: midRow,
                                    col: midCol,
                                    isJump: true,
                                    isAttackOnly: true,
                                    attackTarget: { row: midRow, col: midCol },
                                    damage: remainingAttack,
                                    fromRow: r,
                                    fromCol: c
                                };
                                
                                // Проверяем наличие дубликата в списке ходов
                                const existingMove = moves.find(move => 
                                    move.row === attackMove.row && 
                                    move.col === attackMove.col && 
                                    move.isAttackOnly === true);
                                    
                                if (!existingMove) {
                                    moves.push(attackMove);
                                }
                            }
                        }
                    } else {
                        // В случае несоответствия, исправляем gameState
                        console.warn(`Несоответствие: gameState содержит пешку на [${midRow},${midCol}], но на доске её нет. Исправляю...`);
                        gameState[midRow][midCol] = null;
                    }
                }
            }
        } else {
            // Логика для дамки - может прыгать на любое расстояние по диагонали
            let currentRow = r;
            let currentCol = c;
            let foundOpponent = false;
            let opponentRow, opponentCol;
            
            while (true) {
                currentRow += dr;
                currentCol += dc;
                
                if (currentRow < 0 || currentRow >= 8 || currentCol < 0 || currentCol >= 8) break;
                
                // Если встретили свою шашку, прекращаем поиск
                if (gameState[currentRow][currentCol]?.color === piece.color) break;
                
                // Если встретили шашку противника
                if (gameState[currentRow][currentCol]?.color === (piece.color === 'white' ? 'black' : 'white')) {
                    // Проверяем, существует ли пешка на самом деле в DOM
                    const opponentSquare = document.querySelector(`[data-row="${currentRow}"][data-col="${currentCol}"]`);
                    const hasPieceElement = opponentSquare && opponentSquare.querySelector('.piece');
                    
                    // Если пешки нет в DOM, но она есть в gameState, исправляем
                    if (!hasPieceElement) {
                        console.warn(`Несоответствие: gameState содержит пешку на [${currentRow},${currentCol}], но на доске её нет. Исправляю...`);
                        gameState[currentRow][currentCol] = null;
                        continue; // Продолжаем поиск
                    }
                    
                    if (foundOpponent) break; // Если уже нашли одну шашку противника, прекращаем поиск
                    foundOpponent = true;
                    opponentRow = currentRow;
                    opponentCol = currentCol;
                    
                    // Получаем статистику атакующей и защищающейся пешек
                    const attackerStats = piecesStats[`${r}-${c}`];
                    const defenderStats = piecesStats[`${opponentRow}-${opponentCol}`];
                    
                    // Если атака меньше здоровья или оставшаяся атака меньше здоровья, можем только атаковать
                    if (defenderStats && attackerStats && (attackerStats.attack < defenderStats.health || remainingAttack < defenderStats.health)) {
                        const damage = Math.min(remainingAttack, attackerStats.attack);
                        const attackMove = {
                            row: opponentRow,
                            col: opponentCol,
                            isJump: true,
                            isAttackOnly: true,
                            attackTarget: { row: opponentRow, col: opponentCol },
                            damage: damage,
                            fromRow: r,
                            fromCol: c
                        };
                        
                        // Проверяем наличие дубликата в списке ходов
                        const existingMove = moves.find(move => 
                            move.row === attackMove.row && 
                            move.col === attackMove.col && 
                            move.isAttackOnly === true);
                            
                        if (!existingMove) {
                            moves.push(attackMove);
                        }
                        
                        break; // Прекращаем поиск, так как не можем прыгнуть дальше
                    }
                    
                    continue;
                }
                
                // Если нашли пустую клетку после шашки противника
                if (foundOpponent && !gameState[currentRow][currentCol]) {
                    const alreadyCaptured = capturedPieces.some(
                        captured => captured.row === opponentRow && captured.col === opponentCol
                    );
                    
                    if (!alreadyCaptured) {
                        const defenderStats = piecesStats[`${opponentRow}-${opponentCol}`];
                        
                        // Проверяем, хватает ли оставшейся атаки для захвата
                        if (defenderStats && remainingAttack >= defenderStats.health) {
                            const newCapturedPieces = [
                                ...capturedPieces,
                                { row: opponentRow, col: opponentCol }
                            ];
                            
                            const jumpMove = {
                                row: currentRow,
                                col: currentCol,
                                isJump: true,
                                captures: newCapturedPieces,
                                fromRow: r,
                                fromCol: c
                            };
                            
                            // Проверяем, нет ли уже такого же хода в списке
                            const existingMove = moves.find(move => 
                                move.row === jumpMove.row && 
                                move.col === jumpMove.col && 
                                move.isJump === jumpMove.isJump);
                                
                            if (!existingMove) {
                                moves.push(jumpMove);
                                
                                // Проверяем возможность следующего прыжка только если осталась атака
                                const newRemainingAttack = remainingAttack - defenderStats.health;
                                if (newRemainingAttack > 0) {
                                    // Рекурсивно проверяем возможность следующего прыжка для дамки из новой позиции
                                    for (let nextDr of [-1, 1]) {
                                        for (let nextDc of [-1, 1]) {
                                            checkJump(currentRow, currentCol, nextDr, nextDc, newCapturedPieces, jumpLength + 1, false, newRemainingAttack);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Проверяем все возможные прыжки
    if (!piece.isKing) {
        // Для обычной пешки проверяем прыжки во всех диагональных направлениях
        // Пешка может бить в любом направлении, даже назад
        for (let dr of [-1, 1]) {
            for (let dc of [-1, 1]) {
                checkJump(row, col, dr, dc, [], 0, true);
            }
        }
    } else {
        // Для дамки
        for (let dr of [-1, 1]) {
            for (let dc of [-1, 1]) {
                checkJump(row, col, dr, dc, [], 0, true);
            }
        }
    }

    // Если это не продолжение множественного прыжка, проверяем обычные ходы
    if (!isMultiJump) {
        if (!piece.isKing) {
            // Обычные ходы только вперед для пешек
            const newRow = row + direction;
            
            // Проверяем, что ход в пределах доски
            if (newRow >= 0 && newRow < 8) {
                // Проверяем ход влево
                if (col - 1 >= 0 && !gameState[newRow][col - 1]) {
                    const moveLeft = {row: newRow, col: col - 1, isJump: false};
                    
                    // Проверяем наличие дубликата
                    if (!moves.some(move => move.row === moveLeft.row && move.col === moveLeft.col && !move.isJump)) {
                        moves.push(moveLeft);
                    }
                }
                
                // Проверяем ход вправо
                if (col + 1 < 8 && !gameState[newRow][col + 1]) {
                    const moveRight = {row: newRow, col: col + 1, isJump: false};
                    
                    // Проверяем наличие дубликата
                    if (!moves.some(move => move.row === moveRight.row && move.col === moveRight.col && !move.isJump)) {
                        moves.push(moveRight);
                    }
                }
            }
        } else {
            // Логика для дамки - может ходить на любое расстояние по диагонали
            for (let dr of [-1, 1]) {
                for (let dc of [-1, 1]) {
                    let newRow = row + dr;
                    let newCol = col + dc;
                    
                    while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
                        if (!gameState[newRow][newCol]) {
                            const move = {row: newRow, col: newCol, isJump: false};
                            
                            // Проверяем наличие дубликата
                            if (!moves.some(m => m.row === move.row && m.col === move.col && !m.isJump)) {
                                moves.push(move);
                            }
                            
                            newRow += dr;
                            newCol += dc;
                        } else {
                            break;
                        }
                    }
                }
            }
        }
    }
    
    // Проверяем наличие дубликатов ходов и удаляем их
    const uniqueMoves = [];
    for (const move of moves) {
        const existingMove = uniqueMoves.find(m => 
            m.row === move.row && 
            m.col === move.col && 
            m.isJump === move.isJump);
            
        if (!existingMove) {
            uniqueMoves.push(move);
        }
    }

    // Для отладки
    console.log(`Найдено ${uniqueMoves.length} возможных ходов для пешки на [${row},${col}]`);
    
    return uniqueMoves;
}

// Проверка, находится ли шашка рядом с шашкой противника
function isAdjacentToOpponent(row, col, player) {
    const directions = [
        { dr: -1, dc: -1 },
        { dr: -1, dc: 1 },
        { dr: 1, dc: -1 },
        { dr: 1, dc: 1 }
    ];

    for (const dir of directions) {
        const r = row + dir.dr;
        const c = col + dir.dc;

        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const piece = gameState[r][c];
            if (piece && piece.color !== player) {
                return true; // Рядом есть шашка противника
            }
        }
    }

    return false; // Рядом нет шашек противника
}

// Перемещение шашки
function movePiece(piece, targetSquare, newRow, newCol, captures) {
    const oldSquare = piece.parentElement;
    const oldRow = parseInt(oldSquare.dataset.row);
    const oldCol = parseInt(oldSquare.dataset.col);
    
    // Сохраняем ход в историю
    saveMoveToHistory(piece, oldRow, oldCol, newRow, newCol, piecesStats);
    
    // Если есть захваты, обрабатываем их
    if (captures && captures.length > 0) {
        captures.forEach((capture, index) => {
            const captureSquare = document.querySelector(`[data-row="${capture.row}"][data-col="${capture.col}"]`);
            if (captureSquare) {
                const capturedPiece = captureSquare.querySelector('.piece');
                if (capturedPiece) {
                    // Наносим урон захваченной пешке
                    damagePiece(capture.row, capture.col, piecesStats[`${oldRow}-${oldCol}`].attack);
                }
            }
        });
    }
    
    // Перемещаем пешку
    targetSquare.appendChild(piece);
    gameState[newRow][newCol] = gameState[oldRow][oldCol];
    gameState[oldRow][oldCol] = null;
    
    // Убираем все классы анимации и подсветки с пешки
    piece.classList.remove('active-player-piece', 'selected', 'ending-turn');
    
    // Обновляем статистику пешки ПЕРЕД проверкой ловушки
    const pieceId = `${oldRow}-${oldCol}`;
    const newPieceId = `${newRow}-${newCol}`;
    
    if (piecesStats[pieceId]) {
        piecesStats[pieceId].moves++;
        if (captures.length > 0) {
            piecesStats[pieceId].captures++;
        }
        
        // Обновляем ID пешки в статистике
        piecesStats[newPieceId] = piecesStats[pieceId];
        delete piecesStats[pieceId];
        
        // Обновляем отображение уровня на пешке после перемещения
        updatePieceLevelDisplay(newRow, newCol);
        
        // Обновляем значок способности, если она есть
        if (piecesStats[newPieceId].uniqueAbility) {
            updateAbilityIcon(oldRow, oldCol, newRow, newCol);
        }
        
        // Обновляем отображение статистики после перемещения
        updatePieceStats(newRow, newCol);
    }
    
    // ТЕПЕРЬ проверяем ловушку после перемещения и обновления статистики
    if (window.rpg.checkAndTriggerTrap(newRow, newCol, currentPlayer)) {
        console.log(`Ловушка активирована! Урон пешке на [${newRow},${newCol}]`);
        
        // Проверяем текущие очки здоровья пешки перед нанесением урона
        const currentHealth = piecesStats[newPieceId] ? piecesStats[newPieceId].health : 0;
        
        // Если у пешки 2 или меньше жизней, она будет уничтожена
        const willBeDestroyed = currentHealth <= 2;
        
        if (willBeDestroyed) {
            console.log(`Пешка будет уничтожена ловушкой (текущее здоровье: ${currentHealth})`);
        }
        
        // Ловушка наносит 2 единицы урона
        const pieceDamaged = damagePiece(newRow, newCol, 2);
        soundManager.play('trap', 0.8);

        // Передаем ход следующему игроку после активации ловушки
        currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
        currentTurn = currentPlayer;
        updateTurnIndicator();
        startTurnTimer();
    }
    
    // Обновляем счетчик пешек всегда после перемещения
    updatePiecesCounter();
    
    // Проверяем необходимость показа окна улучшений
    if (shouldShowUpgradeWindow()) {
        upgradeWindowShown = false;
        showUpgradeWindow();
    }
    
    // Применяем эффект доминирования, если он активен
    if (playerUpgrades[currentPlayer].dominanceEffect) {
        const currentPieces = currentPlayer === 'white' ? whitePiecesCount.textContent : blackPiecesCount.textContent;
        const enemyPieces = currentPlayer === 'white' ? blackPiecesCount.textContent : whitePiecesCount.textContent;
        
        if (parseInt(currentPieces) > parseInt(enemyPieces)) {
            const opponent = currentPlayer === 'white' ? 'black' : 'white';
            playerUpgrades[opponent].mana = Math.max(0, playerUpgrades[opponent].mana - 1);
            showNotification('Эффект доминирования: противник теряет 1 ману!', 'info');
            updateResourceDisplay();
        }
    }
    
    // Проверяем достижение пешкой последнего ряда для превращения в дамку
    if (!piecesStats[newPieceId].isKing) {
        const color = piecesStats[newPieceId].color;
        
        // Проверяем, не является ли пешка рыцарем (максимальный уровень 4)
        if (piecesStats[newPieceId].level < 4) {
            // Для белых последний ряд - это ряд 0, для черных - ряд 7
            if ((color === 'white' && newRow === 0) || (color === 'black' && newRow === 7)) {
                // Превращаем пешку в дамку
                piece.classList.add('king');
                
                // Обновляем флаг isKing в объекте gameState
                if (gameState[newRow][newCol]) {
                    gameState[newRow][newCol].isKing = true;
                }
                
                promoteToKing(newRow, newCol);
                console.log(`Пешка ${color} достигла последнего ряда и превратилась в дамку!`);
                soundManager.play('king_move');
            }
        } else {
            // Для рыцаря (уровень 4+) просто показываем уведомление
            if ((color === 'white' && newRow === 0) || (color === 'black' && newRow === 7)) {
                console.log(`Рыцарь ${color} достиг последнего ряда, но не превращается в дамку!`);
                showNotification(`Рыцарь уже достиг максимального уровня и не может стать дамкой!`, 'info');
            }
        }
    }
    
    return true;
}

// Подсветка возможных ходов
function highlightMoves(moves) {
    // Сначала очищаем существующую подсветку
    clearHighlights();
    
    // Затем подсвечиваем все новые допустимые ходы
    moves.forEach(move => {
        const square = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
        if (square) {
            square.classList.add('highlight');
            
            // Если это взятие, добавим особую подсветку
            if (move.isJump && !move.isAttackOnly && !move.isCaptureAndAttack) {
                square.classList.add('highlight-jump');
            }
            
            // Если это атака без прыжка, добавим другую подсветку
            if (move.isAttackOnly || move.isCaptureAndAttack) {
                square.classList.add('highlight-attack');
            }
            
            // Если это комбинированный ход (захват + атака), добавляем дополнительную подсветку
            if (move.isCaptureAndAttack) {
                // Подсвечиваем промежуточную клетку, куда прыгнет пешка после захватов
                const jumpSquare = document.querySelector(`[data-row="${move.jumpToRow}"][data-col="${move.jumpToCol}"]`);
                if (jumpSquare) {
                    jumpSquare.classList.add('highlight');
                    jumpSquare.classList.add('highlight-jump-intermediate');
                    
                    // Добавляем стрелку или линию от jumpSquare к square
                    // Это можно реализовать с помощью CSS или JS, но для простоты просто добавим класс
                    square.classList.add('highlight-attack-target');
                }
            }
        }
    });
    
    // Сообщаем в консоль количество подсвеченных ходов для отладки
    console.log(`Подсвечено ${moves.length} возможных ходов`);
}

// Очистка подсветки
function clearHighlights() {
    const highlights = document.querySelectorAll('.highlight, .highlight-jump, .highlight-attack, .highlight-jump-intermediate, .highlight-attack-target');
    highlights.forEach(square => {
        square.classList.remove('highlight');
        square.classList.remove('highlight-jump');
        square.classList.remove('highlight-attack');
        square.classList.remove('highlight-jump-intermediate');
        square.classList.remove('highlight-attack-target');
    });
    clearAttackableTargets(); // Очищаем метки атакуемых пешек
}

// Добавляем новую функцию для проверки обязательных взятий
function checkForceJumps() {
    let hasJumps = false;
    let hasAttackMoves = false;
    let availableJumps = [];
    let availableAttacks = [];
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState[row][col];
            
            // Проверяем, существует ли пешка физически на доске
            const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            const hasPiece = square && square.querySelector(`.piece.${currentPlayer}`);
            
            // Если в gameState есть пешка, но в DOM её нет, исправляем несоответствие
            if (piece && piece.color === currentPlayer && !hasPiece) {
                console.warn(`Несоответствие: gameState содержит пешку на [${row},${col}], но на доске её нет. Исправляю...`);
                gameState[row][col] = null;
                continue;
            }
            
            // Проверяем, принадлежит ли пешка текущему игроку и не оглушена ли она
            if (piece && piece.color === currentPlayer && hasPiece && !window.rpg.isStunned(row, col, currentPlayer)) {
                const moves = getValidMoves(row, col);
                
                // Проверяем наличие взятий или атак
                moves.forEach(move => {
                    if (move.isJump) {
                        if (move.isAttackOnly) {
                            hasAttackMoves = true;
                            availableAttacks.push({ row, col, move });
                        } else {
                            hasJumps = true;
                            availableJumps.push({ row, col, move });
                        }
                    }
                });
            }
        }
    }
    
    // Если есть взятия, подсвечиваем пешки, которые могут взять
    if (hasJumps || hasAttackMoves) {
        const piecesToHighlight = hasJumps ? availableJumps : availableAttacks;
        piecesToHighlight.forEach(({ row, col }) => {
            const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (square) {
                const piece = square.querySelector('.piece');
                if (piece) {
                    piece.classList.add('can-attack');
                }
            }
        });
    }
    
    return hasJumps || hasAttackMoves;
}

// Проверка, может ли игрок сделать ход
function canPlayerMove(player) {
    let hasJumps = false;
    let hasAttacks = false;
    let hasMoves = false;
    let availablePieces = [];
    
    // Проверка и синхронизация gameState с DOM
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState[row][col];
            
            // Проверяем, существует ли пешка физически на доске
            if (piece) {
                const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const hasPiece = square && square.querySelector(`.piece.${piece.color}`);
                
                if (!hasPiece) {
                    // Если в gameState есть пешка, но в DOM её нет, исправляем
                    console.warn(`Несоответствие в canPlayerMove: gameState содержит пешку на [${row},${col}], но на доске её нет. Исправляю...`);
                    gameState[row][col] = null;
                    continue;
                }
            }
        }
    }
    
    // Сначала проверяем, есть ли взятия
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState[row][col];
            if (piece && piece.color === player) {
                // Дополнительная проверка физического существования пешки
                const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const hasPiece = square && square.querySelector(`.piece.${player}`);
                
                if (!hasPiece) {
                    continue; // Если пешки нет в DOM, пропускаем
                }
                
                const moves = getValidMoves(row, col);
                
                // Проверка на взятия и атаки
                const jumps = moves.filter(move => move.isJump && !move.isAttackOnly);
                const attacks = moves.filter(move => move.isAttackOnly);
                
                if (jumps.length > 0) {
                    hasJumps = true;
                    availablePieces.push({
                        row, col, 
                        type: 'jump',
                        moves: jumps.length
                    });
                }
                
                if (attacks.length > 0) {
                    hasAttacks = true;
                    availablePieces.push({
                        row, col, 
                        type: 'attack',
                        moves: attacks.length
                    });
                }
                
                // Проверка на любые ходы
                if (moves.length > 0) {
                    hasMoves = true;
                    if (!availablePieces.some(p => p.row === row && p.col === col)) {
                        availablePieces.push({
                            row, col, 
                            type: 'move',
                            moves: moves.length
                        });
                    }
                }
            }
        }
    }
    
    if (hasJumps || hasAttacks || hasMoves) {
        console.log(`Игрок ${player} может ходить. Доступные фигуры:`, availablePieces);
    } else {
        console.log(`Игрок ${player} не может ходить`);
    }
    
    // Если есть взятия или атаки или обычные ходы
    return hasJumps || hasAttacks || hasMoves;
}

// Проверка конца игры
function checkGameOver() {
    let whitePieces = 0;
    let blackPieces = 0;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState[row][col];
            if (piece) {
                if (piece.color === 'white') {
                    whitePieces++;
                } else {
                    blackPieces++;
                }
            }
        }
    }
    
    // Обновляем счетчик пешек
    updatePiecesCounter();

    if (whitePieces === 0 || blackPieces === 0) {
        // Удаляем класс in-game с body
        document.body.classList.remove('in-game');
        
        soundManager.play(currentPlayer === (whitePieces === 0 ? 'black' : 'white') ? 'game_win' : 'game_lose');
        
        // Удаляем счетчик раундов
        if (roundsDisplay) {
            roundsDisplay.remove();
            roundsDisplay = null;
        }
        
        // Скрываем счетчик пешек
        document.getElementById('pieces-counter').style.display = 'none';
        
        alert(whitePieces === 0 ? 'Чёрные выиграли!' : 'Белые выиграли!');
        return true;
    }

    return false; // Игра продолжается
}

// Обновляем функцию updateTurnIndicator
function updateTurnIndicator() {
    // Обновляем индикатор хода в rpg.js
    window.rpg.updateUI();
    
    // Обновляем активные шашки
    updateActivePlayerPieces();
}

// Функция анимации получения монеты
function showCoinAnimation(element, amount = 1) {
    // Проверяем, существует ли элемент
    if (!element) return;
    
    for (let i = 0; i < amount; i++) {
        setTimeout(() => {
            const coin = document.createElement('div');
            coin.className = 'coin-animation';
            
            // Создаем иконку монеты
            const coinIcon = document.createElement('span');
            coinIcon.className = 'material-icons-round';
            coinIcon.textContent = 'monetization_on';
            coin.appendChild(coinIcon);
            
            // Получаем координаты и размеры элемента
            const rect = element.getBoundingClientRect();
            
            // Случайная начальная позиция в пределах элемента
            const startX = rect.left + Math.random() * rect.width;
            const startY = rect.top + Math.random() * rect.height;
            
            // Конечная позиция - случайное направление вверх
            const endX = startX + (Math.random() * 100 - 50);
            const endY = startY - 100 - Math.random() * 50;
            
            // Устанавливаем начальную позицию
            coin.style.left = `${startX}px`;
            coin.style.top = `${startY}px`;
            
            // Добавляем на страницу
            document.body.appendChild(coin);
            
            // Запускаем анимацию
            requestAnimationFrame(() => {
                coin.style.transform = 'translateY(-100px) scale(1.5)';
                coin.style.opacity = '0';
                coin.style.left = `${endX}px`;
                coin.style.top = `${endY}px`;
            });
                
            // Удаляем после анимации
            setTimeout(() => {
                coin.remove();
                
                // После завершения всей анимации обновляем обработчики кнопок улучшения
                if (i === amount - 1) {
                    updateUpgradeHandlers();
                }
            }, 1000);
        }, i * 150); // Задержка для последовательного появления монет
    }
}

// Инициализируем RPG UI при загрузке игры
window.addEventListener('DOMContentLoaded', () => {
    initBoard();
    if (window.rpg) {
        window.rpg.initializeRPGUI();
    }
    
    // Добавляем обработчики для кнопок улучшения
    const healthUpgrade = document.getElementById('health-upgrade');
    const attackUpgrade = document.getElementById('attack-upgrade');
    
    if (healthUpgrade) {
        healthUpgrade.addEventListener('click', upgradeHealth);
    }
    
    if (attackUpgrade) {
        attackUpgrade.addEventListener('click', upgradeAttack);
    }
});

// Добавляем обработчик клавиши P для паузы
document.addEventListener('keydown', (event) => {
    if (event.key === 'p' || event.key === 'P' || event.key === 'з' || event.key === 'З') {
        togglePause();
    }
});

// Функция для создания кнопок управления
function createPauseButton() {
    // Удаляем существующие кнопки управления, если они есть
    const existingControls = document.querySelector('.game-controls');
    if (existingControls) {
        existingControls.remove();
    }
    
    // Создаем контейнер для кнопок управления
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'game-controls';
    
    // Создаем кнопку паузы
    const pauseButton = document.createElement('button');
    pauseButton.className = 'control-button pause-button';
    pauseButton.innerHTML = '<span class="material-icons-round">pause</span>';
    pauseButton.title = 'Пауза (P)';
    
    // Создаем кнопку звука
    const soundButton = document.createElement('button');
    soundButton.className = 'control-button sound-button';
    soundButton.innerHTML = '<span class="material-icons-round">volume_up</span>';
    soundButton.title = 'Выключить звук (M)';
    
    // Создаем кнопку выхода в меню
    const menuButton = document.createElement('button');
    menuButton.className = 'control-button menu-exit-button';
    menuButton.innerHTML = '<span class="material-icons-round">home</span>';
    menuButton.title = 'Выйти в меню (Esc)';
    
    // Добавляем обработчик для кнопки паузы
    pauseButton.addEventListener('click', () => {
        togglePause();
        
        // Меняем иконку на кнопке
        const icon = pauseButton.querySelector('.material-icons-round');
        if (isPaused) {
            icon.textContent = 'play_arrow';
            pauseButton.title = 'Продолжить (P)';
        } else {
            icon.textContent = 'pause';
            pauseButton.title = 'Пауза (P)';
        }
    });

    // Добавляем обработчик для кнопки звука
    soundButton.addEventListener('click', () => {
        const isMuted = soundManager.toggleMute();
        const icon = soundButton.querySelector('.material-icons-round');
        if (isMuted) {
            icon.textContent = 'volume_off';
            soundButton.title = 'Включить звук (M)';
        } else {
            icon.textContent = 'volume_up';
            soundButton.title = 'Выключить звук (M)';
        }
    });
    
    // Добавляем обработчик для кнопки меню
    menuButton.addEventListener('click', () => {
        // Удаляем видео фон
        const video = document.getElementById('background-video');
        if (video) {
            video.remove();
        }
        
        // Удаляем туман
        const fogContainer = document.querySelector('.fog-container');
        if (fogContainer) {
            fogContainer.remove();
        }
        
        // Скрываем игровое поле
        board.style.display = 'none';
        
        // Показываем главное меню
        mainMenu.style.display = 'block';
        
        // Скрываем таймер
        timerDisplay.style.display = 'none';
        // Скрываем счетчик пешек
        document.getElementById('pieces-counter').style.display = 'none';
        
        // Скрываем счетчик раундов
        if (roundsDisplay) {
            roundsDisplay.style.display = 'none';
        }
        
        // Скрываем RPG UI
        const whiteUI = document.querySelector('.white-ui');
        const blackUI = document.querySelector('.black-ui');
        if (whiteUI) whiteUI.style.display = 'none';
        if (blackUI) blackUI.style.display = 'none';
        
        // Скрываем контейнер с кнопками управления
        const gameControls = document.querySelector('.game-controls');
        if (gameControls) {
            gameControls.style.display = 'none';
        }
        
        // Очищаем фон игры
        document.body.classList.remove('in-game');
        
        // Останавливаем таймер
        if (turnTimer) {
            clearInterval(turnTimer);
        }
    });
    
    // Добавляем обработчик клавиши M для управления звуком
    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'm') {
            soundButton.click();
        }
    });
    
    // Добавляем кнопки в контейнер
    controlsContainer.appendChild(pauseButton);
    controlsContainer.appendChild(soundButton);
    controlsContainer.appendChild(menuButton);
    
    // Добавляем контейнер на страницу
    document.body.appendChild(controlsContainer);
    
    return controlsContainer;
}

// Обработчики событий меню
startGameButton.addEventListener('click', () => {
    console.log('Начинаем игру, показываем счетчик пешек');
    mainMenu.style.display = 'none';
    board.style.display = 'grid';
    timerDisplay.style.display = 'block'; // Показываем таймер
    
    // Добавляем класс in-game к body
    document.body.classList.add('in-game');
    
    // Удаляем resource-display
    removeResourceDisplay();
    
    // Показываем счетчик раундов
    if (roundsDisplay) {
        roundsDisplay.style.display = 'block';
    }
    
    // Принудительно показываем счетчик пешек
    forceShowPiecesCounter();
    
    if (!gameStarted) {
        initBoard();
        gameStarted = true;
    }

    // Инициализируем и показываем RPG UI в любом случае
    if (window.rpg) {
        window.rpg.initializeRPGUI();
        window.rpg.showRPGUI();
    }
    
    // Сбрасываем и запускаем таймер
    remainingTime = TURN_TIME;
    startTurnTimer();
    
    // Показываем счетчик пешек при старте игры и обновляем его
    piecesCounter.style.display = 'flex';
    updatePiecesCounter();
    
    // Дополнительная проверка через небольшую задержку
    setTimeout(() => {
        console.log('Проверка отображения счетчика пешек через 500мс:');
        console.log('Стиль display:', piecesCounter.style.display);
        console.log('Элемент виден?', piecesCounter.offsetParent !== null);
        
        // Принудительно показываем еще раз на всякий случай
        piecesCounter.style.display = 'flex';
        updatePiecesCounter();
    }, 500);
});

rulesButton.addEventListener('click', () => {
    const rulesText = `
    Правила игры:
    1. Ходите по диагонали на одну клетку вперед
    2. Бейте фигуры противника, перепрыгивая через них
    3. При достижении противоположного края доски шашка становится дамкой
    4. Дамка может ходить на любое количество клеток по диагонали
    5. Если есть возможность взятия, оно обязательно
    6. Новое! Если значение атаки вашей пешки меньше здоровья противника, вы не можете перепрыгнуть через неё, но можете атаковать, нанося урон в размере атаки. После атаки ход переходит противнику.
    7. Новое! При мультизахвате пешка может сделать только столько захватов, на сколько хватает её атаки. Если суммарное здоровье противников в цепочке захвата превышает атаку пешки, она сможет захватить только часть пешек в цепочке.
    8. Новое! Если при мультизахвате атаки хватает, чтобы срубить первую пешку, но не хватает для полного уничтожения следующей, то пешка выполнит захват первой и нанесет урон второй.
    9. Атака подсвечивается красным цветом, обычное взятие - желтым, а обычный ход - зеленым. Оранжевым подсвечиваются промежуточные клетки при комбинированном ходе захват+атака.
    `;
    alert(rulesText);
});

settingsButton.addEventListener('click', () => {
    // Здесь будет реализация настроек в будущем
    alert('Настройки будут доступны в следующем обновлении!');
});

// Добавляем обработчик клавиши Escape для возврата в меню
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameStarted) {
        if (confirm('Вернуться в главное меню? Текущий прогресс игры будет сохранен.')) {
            // Удаляем видео фон
            const video = document.getElementById('background-video');
            if (video) {
                video.remove();
            }
            
            // Удаляем туман
            const fogContainer = document.querySelector('.fog-container');
            if (fogContainer) {
                fogContainer.remove();
            }
            
            // Скрываем игровое поле
            board.style.display = 'none';
            
            // Показываем главное меню
            mainMenu.style.display = 'block';
            
            // Скрываем таймер
            timerDisplay.style.display = 'none';
            // Скрываем счетчик пешек
            document.getElementById('pieces-counter').style.display = 'none';
            
            // Скрываем счетчик раундов
            if (roundsDisplay) {
                roundsDisplay.style.display = 'none';
            }
            
            // Скрываем RPG UI
            const whiteUI = document.querySelector('.white-ui');
            const blackUI = document.querySelector('.black-ui');
            if (whiteUI) whiteUI.style.display = 'none';
            if (blackUI) blackUI.style.display = 'none';
            
            // Скрываем контейнер с кнопками управления
            const gameControls = document.querySelector('.game-controls');
            if (gameControls) {
                gameControls.style.display = 'none';
            }
            
            // Очищаем фон игры
            document.body.classList.remove('in-game');
            
            // Останавливаем таймер
            if (turnTimer) {
                clearInterval(turnTimer);
            }
        }
    }
});

// Функция для обновления информации о пешке
function updatePieceInfo(piece) {
    const pieceInfo = document.getElementById('piece-info');
    const row = parseInt(piece.parentElement.dataset.row);
    const col = parseInt(piece.parentElement.dataset.col);
    const pieceId = `${row}-${col}`;
    const stats = piecesStats[pieceId];
    
    if (!stats) return;
    
    // Проверяем, является ли пешка дамкой на визуальном уровне
    const isKingVisual = piece.classList.contains('king');
    
    // Синхронизируем статус короля в stats с визуальным статусом
    if (isKingVisual && !stats.isKing) {
        stats.isKing = true;
        stats.attack += 1; // Увеличиваем атаку
        stats.maxHealth += 2; // Увеличиваем максимальное здоровье
        
        // Также обновляем флаг isKing в gameState
        if (gameState[row][col]) {
            gameState[row][col].isKing = true;
        }
    }
    
    // Обновляем иконку
    const pieceInfoIcon = pieceInfo.querySelector('.piece-info-icon');
    pieceInfoIcon.className = `piece-info-icon ${stats.color}`;
    
    // Проверяем, достигнут ли максимальный уровень прокачки (4)
    if (stats.level >= 4) {
        // Устанавливаем иконку рыцаря
        pieceInfoIcon.innerHTML = '⚔️';
        pieceInfoIcon.style.fontSize = '24px';
        pieceInfoIcon.style.textAlign = 'center';
        pieceInfoIcon.style.lineHeight = '36px';
    } else if (stats.isKing) {
        pieceInfoIcon.innerHTML = '★';
        pieceInfoIcon.style.color = '#ffd700';
        pieceInfoIcon.style.fontSize = '24px';
        pieceInfoIcon.style.textAlign = 'center';
        pieceInfoIcon.style.lineHeight = '36px';
    } else {
        pieceInfoIcon.innerHTML = '';
    }
    
    // Обновляем заголовок
    const title = pieceInfo.querySelector('.piece-info-title');
    if (stats.level >= 4) {
        title.textContent = `${stats.color === 'white' ? 'Белый' : 'Черный'} рыцарь`;
    } else {
        title.textContent = `${stats.color === 'white' ? 'Белая' : 'Черная'} ${stats.isKing ? 'дамка' : 'пешка'}`;
    }
    
    // Обновляем уровень
    const levelDisplay = pieceInfo.querySelector('.piece-info-level');
    if (stats.level > 0) {
        levelDisplay.textContent = `+${stats.level}`;
        levelDisplay.style.display = 'block';
    } else {
        levelDisplay.style.display = 'none';
    }
    
    // Обновляем статистику
    document.getElementById('health-stat').textContent = `${stats.health}/${stats.maxHealth}`;
    document.getElementById('attack-stat').textContent = stats.attack;
    document.getElementById('moves-stat').textContent = stats.moves;
    document.getElementById('captures-stat').textContent = stats.captures;
    
    // Обновляем статус пешки в зависимости от уровня
    if (stats.level >= 4) {
        document.getElementById('status-stat').textContent = 'Рыцарь';
    } else {
        document.getElementById('status-stat').textContent = stats.isKing ? 'Дамка' : 'Обычная';
    }
    
    // Обновляем полоску здоровья
    const healthBarFill = pieceInfo.querySelector('.health-bar-fill');
    const healthPercentage = (stats.health / stats.maxHealth) * 100;
    healthBarFill.style.width = `${healthPercentage}%`;
    
    // Устанавливаем цвет полоски здоровья в зависимости от процента
    if (healthPercentage > 66) {
        healthBarFill.style.backgroundColor = '#4CAF50'; // Зеленый
    } else if (healthPercentage > 33) {
        healthBarFill.style.backgroundColor = '#FFC107'; // Желтый
    } else {
        healthBarFill.style.backgroundColor = '#F44336'; // Красный
    }
    
    // Обновляем информацию о способностях
    const abilities = document.getElementById('piece-abilities');
    
    // Сначала проверяем, есть ли у пешки уникальная способность
    if (stats.uniqueAbility && uniqueAbilities[stats.uniqueAbility]) {
        const ability = uniqueAbilities[stats.uniqueAbility];
        
        // Создаем иконку для способности
        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-icons-round ability-icon-info';
        iconSpan.textContent = ability.icon;
        
        // Создаем текст способности
        const abilityText = document.createElement('span');
        
        // Для рыцаря добавляем информацию об отсутствии возможности стать дамкой
        if (stats.level >= 4) {
            abilityText.innerHTML = `<strong>${ability.name}:</strong> ${ability.description}<br><br><strong>Особенность:</strong> Рыцарь представляет собой высший ранг и не может стать дамкой.`;
        } else {
            abilityText.innerHTML = `<strong>${ability.name}:</strong> ${ability.description}`;
        }
        
        // Очищаем предыдущее содержимое
        abilities.innerHTML = '';
        
        // Добавляем новые элементы
        abilities.appendChild(iconSpan);
        abilities.appendChild(abilityText);
        
        // Добавляем класс для стилизации
        abilities.classList.add('has-unique-ability');
    } else if (stats.isKing) {
        abilities.textContent = 'Может ходить на любое количество клеток по диагонали';
        abilities.classList.remove('has-unique-ability');
    } else if (stats.level >= 4) {
        // Для рыцаря без уникальной способности
        abilities.innerHTML = 'Может ходить на одну клетку по диагонали вперед<br><br><strong>Особенность:</strong> Рыцарь представляет собой высший ранг и не может стать дамкой.';
        abilities.classList.add('has-unique-ability');
    } else {
        abilities.textContent = 'Может ходить на одну клетку по диагонали вперед';
        abilities.classList.remove('has-unique-ability');
    }
    
    // Восстанавливаем кнопки улучшения для собственной пешки
    handleUpgradeButtonsDisplay('restore');
    
    // Показываем информацию
    pieceInfo.classList.add('visible');
    pieceInfo.classList.remove('enemy-info'); // Убираем класс вражеской пешки, если был
    
    // Обновляем обработчики для кнопок улучшения
    updateUpgradeHandlers();
}

// Функция для обновления обработчиков кнопок улучшения
function updateUpgradeHandlers() {
    console.log('Обновление обработчиков кнопок улучшения');
    const healthUpgrade = document.getElementById('health-upgrade');
    const attackUpgrade = document.getElementById('attack-upgrade');
    
    // Сначала удаляем существующие обработчики
    if (healthUpgrade) {
        // Копируем функцию для удаления всех лишних обработчиков
        const healthUpgradeClone = healthUpgrade.cloneNode(true);
        healthUpgrade.parentNode.replaceChild(healthUpgradeClone, healthUpgrade);
        healthUpgradeClone.addEventListener('click', upgradeHealth);
        console.log('Обновлен обработчик для кнопки улучшения здоровья');
    } else {
        console.log('Кнопка улучшения здоровья не найдена');
    }
    
    if (attackUpgrade) {
        // Копируем функцию для удаления всех лишних обработчиков
        const attackUpgradeClone = attackUpgrade.cloneNode(true);
        attackUpgrade.parentNode.replaceChild(attackUpgradeClone, attackUpgrade);
        attackUpgradeClone.addEventListener('click', upgradeAttack);
        console.log('Обновлен обработчик для кнопки улучшения атаки');
    } else {
        console.log('Кнопка улучшения атаки не найдена');
    }
}

// Модифицируем функцию upgradePieceLevel, чтобы корректно обрабатывать улучшения
function upgradePieceLevel(pieceId) {
    // Если pieceId имеет формат "row-col"
    if (pieceId && pieceId.includes('-')) {
        const [row, col] = pieceId.split('-').map(Number);
        
        // Обновляем отображение уровня на доске
        updatePieceLevelDisplay(row, col);
        
        // Если выбрана эта пешка, обновляем информацию о ней
        if (selectedPiece && 
            selectedPiece.parentElement.dataset.row === row.toString() &&
            selectedPiece.parentElement.dataset.col === col.toString()) {
            updatePieceInfo(selectedPiece);
        }
    }
    
    // Обновляем обработчики для кнопок улучшения
    updateUpgradeHandlers();
}

// Функция для отображения информации о вражеской пешке
function showEnemyPieceInfo(piece) {
    // Сначала очищаем предыдущую информацию, если она была
    clearPieceInfo();
    
    const pieceInfo = document.getElementById('piece-info');
    const row = parseInt(piece.parentElement.dataset.row);
    const col = parseInt(piece.parentElement.dataset.col);
    const pieceId = `${row}-${col}`;
    const stats = piecesStats[pieceId];
    
    if (!stats) return;
    
    // Добавляем класс вражеской пешки
    pieceInfo.classList.add('enemy-info');
    
    // Обновляем иконку
    const pieceInfoIcon = pieceInfo.querySelector('.piece-info-icon');
    pieceInfoIcon.className = `piece-info-icon ${stats.color} enemy`;
    
    // Проверяем, достигнут ли максимальный уровень прокачки (4)
    if (stats.level >= 4) {
        // Устанавливаем иконку рыцаря
        pieceInfoIcon.innerHTML = '⚔️';
        pieceInfoIcon.style.fontSize = '24px';
        pieceInfoIcon.style.textAlign = 'center';
        pieceInfoIcon.style.lineHeight = '36px';
    } else if (stats.isKing) {
        pieceInfoIcon.innerHTML = '★';
        pieceInfoIcon.style.color = '#ffd700';
        pieceInfoIcon.style.fontSize = '24px';
        pieceInfoIcon.style.textAlign = 'center';
        pieceInfoIcon.style.lineHeight = '36px';
    } else {
        pieceInfoIcon.innerHTML = '';
    }
    
    // Обновляем заголовок
    const title = pieceInfo.querySelector('.piece-info-title');
    if (stats.level >= 4) {
        title.textContent = `${stats.color === 'white' ? 'Белый' : 'Черный'} рыцарь (противник)`;
    } else {
        title.textContent = `${stats.color === 'white' ? 'Белая' : 'Черная'} ${stats.isKing ? 'дамка' : 'пешка'} (противник)`;
    }

    // Обновляем уровень
    const levelDisplay = pieceInfo.querySelector('.piece-info-level');
    if (stats.level > 0) {
        levelDisplay.textContent = `+${stats.level}`;
        levelDisplay.style.display = 'block';
    } else {
        levelDisplay.style.display = 'none';
    }
    
    // Обновляем статистику
    document.getElementById('health-stat').textContent = `${stats.health}/${stats.maxHealth}`;
    document.getElementById('attack-stat').textContent = stats.attack;
    document.getElementById('moves-stat').textContent = stats.moves;
    document.getElementById('captures-stat').textContent = stats.captures;
    
    // Обновляем статус пешки в зависимости от уровня
    if (stats.level >= 4) {
        document.getElementById('status-stat').textContent = 'Рыцарь';
    } else {
        document.getElementById('status-stat').textContent = stats.isKing ? 'Дамка' : 'Обычная';
    }
    
    // Обновляем полоску здоровья
    const healthBarFill = pieceInfo.querySelector('.health-bar-fill');
    const healthPercentage = (stats.health / stats.maxHealth) * 100;
    healthBarFill.style.width = `${healthPercentage}%`;
    
    // Устанавливаем цвет полоски здоровья в зависимости от процента
    if (healthPercentage > 66) {
        healthBarFill.style.backgroundColor = '#4CAF50'; // Зеленый
    } else if (healthPercentage > 33) {
        healthBarFill.style.backgroundColor = '#FFC107'; // Желтый
    } else {
        healthBarFill.style.backgroundColor = '#F44336'; // Красный
    }
    
    // Обновляем информацию о способностях
    const abilities = document.getElementById('piece-abilities');
    
    // Сначала проверяем, есть ли у пешки уникальная способность
    if (stats.uniqueAbility && uniqueAbilities[stats.uniqueAbility]) {
        const ability = uniqueAbilities[stats.uniqueAbility];
        
        // Создаем иконку для способности
        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-icons-round ability-icon-info';
        iconSpan.textContent = ability.icon;
        
        // Создаем текст способности
        const abilityText = document.createElement('span');
        
        // Для рыцаря добавляем информацию об отсутствии возможности стать дамкой
        if (stats.level >= 4) {
            abilityText.innerHTML = `<strong>${ability.name}:</strong> ${ability.description}<br><br><strong>Особенность:</strong> Рыцарь представляет собой высший ранг и не может стать дамкой.`;
        } else {
            abilityText.innerHTML = `<strong>${ability.name}:</strong> ${ability.description}`;
        }
        
        // Очищаем предыдущее содержимое
        abilities.innerHTML = '';
        
        // Добавляем новые элементы
        abilities.appendChild(iconSpan);
        abilities.appendChild(abilityText);
        
        // Добавляем класс для стилизации
        abilities.classList.add('has-unique-ability');
    } else if (stats.isKing) {
        abilities.textContent = 'Может ходить на любое количество клеток по диагонали';
        abilities.classList.remove('has-unique-ability');
    } else if (stats.level >= 4) {
        // Для рыцаря без уникальной способности
        abilities.innerHTML = 'Может ходить на одну клетку по диагонали вперед<br><br><strong>Особенность:</strong> Рыцарь представляет собой высший ранг и не может стать дамкой.';
        abilities.classList.add('has-unique-ability');
    } else {
        abilities.textContent = 'Может ходить на одну клетку по диагонали вперед';
        abilities.classList.remove('has-unique-ability');
    }
    
    // Сохраняем и скрываем кнопки улучшения для вражеской пешки
    handleUpgradeButtonsDisplay('save');
    
    // Показываем информацию
    pieceInfo.classList.add('visible');
    
    // Подсвечиваем вражескую пешку
    piece.classList.add('enemy-highlighted');
    
    // Показываем пешки, которые могут атаковать эту пешку
    highlightAttackingPieces(row, col);
}

// Функция для подсветки пешек, которые могут атаковать выбранную вражескую пешку
function highlightAttackingPieces(row, col) {
    // Находим все пешки текущего игрока
    const currentPlayerPieces = document.querySelectorAll(`.piece.${currentPlayer}`);
    
    // Перебираем все пешки и проверяем, могут ли они атаковать выбранную пешку
    currentPlayerPieces.forEach(playerPiece => {
        const playerRow = parseInt(playerPiece.parentElement.dataset.row);
        const playerCol = parseInt(playerPiece.parentElement.dataset.col);
        
        // Получаем возможные ходы для пешки
        const moves = getValidMoves(playerRow, playerCol);
        
        // Ищем ход, который позволяет атаковать выбранную пешку
        const attackMove = moves.find(move => 
            (move.captures && move.captures.some(capture => capture.row === row && capture.col === col)) ||
            (move.jumpRow === row && move.jumpCol === col) || 
            (move.row === row && move.col === col)
        );
        
        // Если найден атакующий ход, подсвечиваем пешку
        if (attackMove) {
            playerPiece.classList.add('can-attack');
        }
    });
}

// Функция для очистки информации о пешке
function clearPieceInfo() {
    const pieceInfo = document.getElementById('piece-info');
    pieceInfo.classList.remove('visible');
    pieceInfo.classList.remove('enemy-info');
    
    // Удаляем подсветку вражеской пешки
    document.querySelectorAll('.enemy-highlighted').forEach(piece => {
        piece.classList.remove('enemy-highlighted');
    });
    
    // Удаляем подсветку атакующих пешек
    document.querySelectorAll('.can-attack').forEach(piece => {
        piece.classList.remove('can-attack');
    });
    
    // Восстанавливаем исходное состояние отображения кнопок улучшения
    handleUpgradeButtonsDisplay('restore');
    
    // Обновляем обработчики для кнопок улучшения при закрытии информации о пешке
    updateUpgradeHandlers();
    
    // В этом месте не сбрасываем статистику, чтобы не терять данные при просмотре информации о пешках
    // piecesStats = {};
}

// Функция для нанесения урона пешке
function damagePiece(row, col, damage) {
    const pieceId = `${row}-${col}`;
    const stats = piecesStats[pieceId];
    
    console.log(`Нанесение урона пешке на [${row},${col}], урон: ${damage}, найдена статистика: ${Boolean(stats)}`);
    
    // Если статистики нет, но пешка существует на доске, создаем статистику
    if (!stats) {
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const piece = square && square.querySelector('.piece');
        
        if (piece) {
            console.log(`Статистика не найдена, но пешка существует на доске, создаем статистику`);
            const pieceColor = piece.classList.contains('white') ? 'white' : 'black';
            const isKing = piece.classList.contains('king');
            initPieceStats(row, col, pieceColor, isKing);
            
            // Получаем созданную статистику
            const newStats = piecesStats[pieceId];
            if (newStats) {
                console.log(`Статистика пешки создана: ${JSON.stringify(newStats)}`);
                // Рекурсивно вызываем функцию с уже созданной статистикой
                return damagePiece(row, col, damage);
            }
        }
    }
    
    if (stats) {
        const modifiedDamage = damage;
        stats.health = Math.max(0, stats.health - modifiedDamage);
        
        // Обновляем отображение статистики
        updatePieceStats(row, col);
        
        // Если здоровье достигло 0, удаляем пешку
        if (stats.health <= 0) {
            const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            const piece = square.querySelector('.piece');
            console.log(`Здоровье пешки достигло 0, пешка найдена: ${Boolean(piece)}`);
            
            if (piece) {
                // Определяем, был ли урон нанесен ловушкой
                const isTrapDamage = modifiedDamage === 2 && window.rpg.checkAndTriggerTrap.isCalled;
                
                // Если урон нанесен ловушкой, вызываем функцию начисления награды
                if (isTrapDamage) {
                    console.log('Пешка уничтожена ловушкой, вызываем начисление награды');
                    
                    // Удаляем пешку до начисления награды
                    piece.remove();
                    gameState[row][col] = null;
                    delete piecesStats[pieceId];
                    console.log(`Пешка удалена с доски, gameState и piecesStats обновлены`);
                    soundManager.play('capture', 0.8);
                    
                    // Обновляем счетчик пешек
                    updatePiecesCounter();
                    
                    // Вызываем функцию начисления награды за ловушку
                    if (window.rpg && typeof window.rpg.rewardForTrapKill === 'function') {
                        window.rpg.rewardForTrapKill();
                    }
                    
                    return true;
                }
                // Если это обычное уничтожение (не ловушкой), начисляем монеты текущему игроку
                else {
                    // Вычисляем награду: базовая + бонус за уровень + бонус за дамку
                    let reward = 1; // Базовая награда
                    
                    // Бонус за уровень: +1 за каждый уровень
                    reward += stats.level;
                    
                    // Дополнительный бонус за дамку: +2
                    if (stats.isKing) {
                        reward += 2;
                    }
                    
                    // Добавляем монеты текущему игроку (атакующему)
                    window.rpg.addCoins(currentPlayer, reward);
                    console.log(`Игрок ${currentPlayer} получает ${reward} монет за уничтожение пешки ${piece.classList.contains('white') ? 'белых' : 'черных'}`);
                    
                    // Обновляем анимацию с правильным количеством монет
                    showCoinAnimation(square, reward);
                    
                    soundManager.play('coin', 0.8); // Воспроизводим звук монеты при получении монеты
                }
                
                piece.remove();
                gameState[row][col] = null;
                delete piecesStats[pieceId];
                console.log(`Пешка удалена с доски, gameState и piecesStats обновлены`);
                soundManager.play('capture', 0.8); // Заменяем на существующий звук захвата
                
                // Обновляем счетчик пешек
                updatePiecesCounter();
                
                return true; // Возвращаем true, чтобы показать, что пешка была уничтожена
            }
        } else {
            // Обновляем информацию, если пешка всё еще выбрана
            const selectedPieceId = `${row}-${col}`;
            if (selectedPiece && selectedPiece.parentElement.dataset.row === row.toString() && 
                selectedPiece.parentElement.dataset.col === col.toString()) {
                updatePieceInfo(selectedPiece);
            }
            
            return false; // Возвращаем false, чтобы показать, что пешка не была уничтожена
        }
    } else {
        console.log(`Статистика для пешки на [${row},${col}] не найдена и пешка не найдена на доске`);
        return false;
    }
    
    return false;
}

// Экспортируем функцию damagePiece в глобальный объект window, чтобы она была доступна из rpg.js
window.damagePiece = damagePiece;
// Экспортируем piecesStats в глобальный объект window
window.piecesStats = piecesStats;

// Обновляем функцию для превращения в дамку
function promoteToKing(row, col) {
    const pieceId = `${row}-${col}`;
    const stats = piecesStats[pieceId];
    
    if (stats) {
        // Обновляем статус дамки в statistics
        stats.isKing = true;
        stats.attack += 1; // Увеличиваем атаку при получении статуса дамки
        stats.maxHealth += 2; // Увеличиваем максимальное здоровье
        stats.health = stats.maxHealth; // Восстанавливаем здоровье до максимума
        stats.level += 1; // Увеличиваем уровень при получении статуса дамки
        
        // Обновляем статус дамки в gameState
        if (gameState[row][col]) {
            gameState[row][col].isKing = true;
        }
        
        // Обновляем отображение уровня на пешке
        updatePieceLevelDisplay(row, col);
        
        // Обновляем информацию, если пешка выбрана
        const selectedPieceId = `${row}-${col}`;
        if (selectedPiece && selectedPiece.parentElement.dataset.row === row.toString() && 
            selectedPiece.parentElement.dataset.col === col.toString()) {
            updatePieceInfo(selectedPiece);
        }
        
        // Обновляем отображение статистики после повышения до короля
        updatePieceStats(row, col);
    }
}

// Функция для улучшения здоровья
function upgradeHealth() {
    if (!selectedPiece) return;
    
    const row = parseInt(selectedPiece.parentElement.dataset.row);
    const col = parseInt(selectedPiece.parentElement.dataset.col);
    const pieceId = `${row}-${col}`;
    const stats = piecesStats[pieceId];
    
    if (!stats) return;
    
    // Проверяем, не достигнут ли максимальный уровень прокачки (4)
    if (stats.level >= 4) {
        showNotification('Достигнут максимальный уровень прокачки!', 'info');
        return;
    }
    
    const player = stats.color;
    const playerCoins = window.rpg.getCoins(player);
    
    // Проверяем, есть ли у игрока монеты
    if (playerCoins >= 1) {
        // Тратим монету
        window.rpg.spendCoins(player, 1);
        
        // Увеличиваем максимальное здоровье и текущее здоровье
        stats.maxHealth += 1;
        stats.health += 1;
        
        // Увеличиваем уровень пешки при улучшении
        stats.level += 1;
        
        // Увеличиваем счетчик улучшений здоровья
        stats.healthUpgrades += 1;
        
        // Проверяем, достигла ли пешка 4-го уровня для получения уникальной способности
        if (stats.level >= 4 && !stats.uniqueAbility) {
            const abilityKey = determineUniqueAbility(stats);
            if (abilityKey) {
                // Получаем базовую стоимость способности
                const baseCost = 3; // Базовая стоимость уникальной способности
                
                // Применяем скидку, если она есть
                const finalCost = Math.max(0, baseCost - (playerUpgrades[stats.color].uniqueSkillDiscount || 0));
                
                // Проверяем, достаточно ли маны
                if (window.rpg.getMana(stats.color) >= finalCost) {
                    // Тратим ману с учетом того, что это уникальная способность
                    window.rpg.spendMana(stats.color, finalCost, true);
                    
                    stats.uniqueAbility = abilityKey;
                    
                    // Показываем уведомление о получении способности
                    const abilityName = uniqueAbilities[abilityKey].name;
                    const abilityDesc = uniqueAbilities[abilityKey].description;
                    showNotification(`Пешка получила способность "${abilityName}"! ${abilityDesc}`, 'special');
                    
                    // Воспроизводим звук получения способности
                    soundManager.play('powerup', 1.0);
                    
                    // Добавляем значок способности на пешку
                    addAbilityIconToPiece(row, col, abilityKey);
                } else {
                    showNotification('Недостаточно маны для активации уникальной способности!', 'error');
                    return;
                }
            }
            
            // Показываем уведомление о превращении в рыцаря
            showNotification(`Пешка превратилась в рыцаря!`, 'special');
            
            // Добавляем анимацию превращения
            const piece = document.querySelector(`[data-row="${row}"][data-col="${col}"] .piece`);
            if (piece) {
                piece.classList.add('knight-transformation');
                setTimeout(() => {
                    piece.classList.remove('knight-transformation');
                }, 1000);
            }
        }
        
        // Обновляем визуальное отображение уровня на пешке
        updatePieceLevelDisplay(row, col);
        
        // Вызываем функцию обновления уровня пешки
        upgradePieceLevel(pieceId);
        
        // Воспроизводим звук улучшения
        soundManager.play('powerup', 0.5);
        
        // Обновляем отображение информации о пешке
        updatePieceInfo(selectedPiece);
    } else {
        // Недостаточно монет - показываем уведомление
        showNotification('Недостаточно монет!', 'error');
    }
}

// Функция для улучшения атаки
function upgradeAttack() {
    if (!selectedPiece) return;
    
    const row = parseInt(selectedPiece.parentElement.dataset.row);
    const col = parseInt(selectedPiece.parentElement.dataset.col);
    const pieceId = `${row}-${col}`;
    const stats = piecesStats[pieceId];
    
    if (!stats) return;
    
    // Проверяем, не достигнут ли максимальный уровень прокачки (4)
    if (stats.level >= 4) {
        showNotification('Достигнут максимальный уровень прокачки!', 'info');
        return;
    }
    
    const player = stats.color;
    const playerCoins = window.rpg.getCoins(player);
    
    // Проверяем, есть ли у игрока монеты
    if (playerCoins >= 1) {
        // Тратим монету
        window.rpg.spendCoins(player, 1);
        
        // Увеличиваем атаку
        stats.attack += 1;
        stats.attackUpgrades += 1;
        
        // Обновляем отображение статистики
        updatePieceStats(row, col);
        
        // Увеличиваем уровень пешки при улучшении
        stats.level += 1;
        
        // Проверяем, достигла ли пешка 4-го уровня для получения уникальной способности
        if (stats.level >= 4 && !stats.uniqueAbility) {
            const abilityKey = determineUniqueAbility(stats);
            if (abilityKey) {
                stats.uniqueAbility = abilityKey;
                
                // Показываем уведомление о получении способности
                const abilityName = uniqueAbilities[abilityKey].name;
                const abilityDesc = uniqueAbilities[abilityKey].description;
                showNotification(`Пешка получила способность "${abilityName}"! ${abilityDesc}`, 'special');
                
                // Воспроизводим звук получения способности
                soundManager.play('powerup', 1.0);
                
                // Добавляем значок способности на пешку
                addAbilityIconToPiece(row, col, abilityKey);
            }
            
            // Показываем уведомление о превращении в рыцаря
            showNotification(`Пешка превратилась в рыцаря!`, 'special');
            
            // Добавляем анимацию превращения
            const piece = document.querySelector(`[data-row="${row}"][data-col="${col}"] .piece`);
            if (piece) {
                piece.classList.add('knight-transformation');
                setTimeout(() => {
                    piece.classList.remove('knight-transformation');
                }, 1000);
            }
        }
        
        // Обновляем визуальное отображение уровня на пешке
        updatePieceLevelDisplay(row, col);
        
        // Вызываем функцию обновления уровня пешки
        upgradePieceLevel(pieceId);
        
        // Воспроизводим звук улучшения
        soundManager.play('powerup', 0.5);
        
        // Обновляем отображение информации о пешке
        updatePieceInfo(selectedPiece);
    } else {
        // Недостаточно монет - показываем уведомление
        showNotification('Недостаточно монет!', 'error');
    }
}

// Функция для отображения уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Добавляем иконку в зависимости от типа
    const icon = document.createElement('span');
    icon.className = 'material-icons-round';
    
    if (type === 'info') {
        icon.textContent = 'info';
    } else if (type === 'success') {
        icon.textContent = 'check_circle';
    } else if (type === 'error') {
        icon.textContent = 'error';
    } else if (type === 'reward') {
        icon.textContent = 'monetization_on';
    } else if (type === 'warning') {
        icon.textContent = 'warning';
    } else if (type === 'special') {
        icon.textContent = 'stars';
    }
    
    notification.prepend(icon);
    
    // Получаем все существующие уведомления
    const existingNotifications = document.querySelectorAll('.notification');
    
    // Вычисляем позицию для нового уведомления
    let topOffset = 10;
    existingNotifications.forEach(existing => {
        const height = existing.offsetHeight;
        topOffset += height + 5; // 5px - отступ между уведомлениями
    });
    
    // Устанавливаем позицию
    notification.style.top = `${topOffset}px`;
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 2.5 секунды (уменьшили время с 3 до 2.5 секунд)
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
            // Сдвигаем оставшиеся уведомления вверх
            const remainingNotifications = document.querySelectorAll('.notification');
            let newTopOffset = 10;
            remainingNotifications.forEach(remaining => {
                if (remaining !== notification) {
                    remaining.style.top = `${newTopOffset}px`;
                    newTopOffset += remaining.offsetHeight + 5;
                }
            });
        }, 300);
    }, 2500);
}

// Функция для отображения анимации атаки
function showAttackAnimation(attackerSquare, targetSquare, damage) {
    // Создаем элемент анимации
    const attackAnimation = document.createElement('div');
    attackAnimation.className = 'attack-animation';
    
    // Получаем координаты атакующего и цели
    const attackerRect = attackerSquare.getBoundingClientRect();
    const targetRect = targetSquare.getBoundingClientRect();
    
    // Рассчитываем центры клеток
    const attackerCenterX = attackerRect.left + attackerRect.width / 2;
    const attackerCenterY = attackerRect.top + attackerRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    
    // Создаем снаряд анимации
    const projectile = document.createElement('div');
    projectile.className = 'attack-projectile';
    projectile.textContent = `${damage}`;
    
    // Позиционируем снаряд на атакующей пешке
    projectile.style.left = `${attackerCenterX}px`;
    projectile.style.top = `${attackerCenterY}px`;
    
    // Добавляем анимацию и снаряд в DOM
    attackAnimation.appendChild(projectile);
    document.body.appendChild(attackAnimation);
    
    // Анимируем перемещение снаряда от атакующего к цели
    setTimeout(() => {
        projectile.style.left = `${targetCenterX}px`;
        projectile.style.top = `${targetCenterY}px`;
        projectile.style.transition = 'all 0.3s ease-in';
        
        // Добавляем эффект удара на цели
        setTimeout(() => {
            // Создаем эффект удара
            const hitEffect = document.createElement('div');
            hitEffect.className = 'hit-effect';
            hitEffect.style.left = `${targetCenterX}px`;
            hitEffect.style.top = `${targetCenterY}px`;
            attackAnimation.appendChild(hitEffect);
            
            // Заставляем целевую пешку дрожать
            const targetPiece = targetSquare.querySelector('.piece');
            if (targetPiece) {
                targetPiece.classList.add('shake');
                setTimeout(() => {
                    targetPiece.classList.remove('shake');
                }, 500);
            }
            
            // Удаляем всю анимацию через некоторое время
            setTimeout(() => {
                attackAnimation.remove();
            }, 600);
        }, 300);
    }, 50);
    
    // Воспроизводим звук атаки
    soundManager.play('attack', 0.7);
}

// Функция для отображения уровня пешки на доске
function updatePieceLevelDisplay(row, col) {
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (!square) return;
    
    const piece = square.querySelector('.piece');
    if (!piece) return;
    
    const pieceId = `${row}-${col}`;
    const stats = piecesStats[pieceId];
    if (!stats || stats.level <= 0) return;
    
    // Проверяем, существует ли уже элемент уровня
    let levelDisplay = piece.querySelector('.piece-level');
    if (!levelDisplay) {
        // Создаем элемент для отображения уровня
        levelDisplay = document.createElement('div');
        levelDisplay.className = 'piece-level';
        piece.appendChild(levelDisplay);
    }
    
    // Обновляем отображение уровня
    levelDisplay.textContent = `+${stats.level}`;
    
    // Добавляем визуальное отличие для пешек с максимальным уровнем (4)
    if (stats.level >= 4) {
        // Добавляем класс для стилизации максимального уровня
        levelDisplay.classList.add('max-level');
        
        // Если у пешки нет значка рыцаря, добавляем его
        let knightIcon = piece.querySelector('.knight-icon');
        if (!knightIcon) {
            knightIcon = document.createElement('div');
            knightIcon.className = 'knight-icon';
            knightIcon.textContent = '⚔️';
            knightIcon.title = 'Рыцарь';
            piece.appendChild(knightIcon);
        }
    } else {
        // Удаляем класс максимального уровня, если он был
        levelDisplay.classList.remove('max-level');
        
        // Удаляем значок рыцаря, если он был
        const knightIcon = piece.querySelector('.knight-icon');
        if (knightIcon) {
            knightIcon.remove();
        }
    }
}

// Функция для обновления уровня на всех пешках
function updateAllPiecesLevelDisplay() {
    // Обновляем отображение уровня для всех пешек
    for (const pieceId in piecesStats) {
        const [row, col] = pieceId.split('-').map(Number);
        updatePieceLevelDisplay(row, col);
    }
}

// Проверка конца игры после хода
function checkEndGameAfterMove() {
    // Проверяем, есть ли пешки у противника
    let opponentColor = currentPlayer === 'white' ? 'black' : 'white';
    let opponentHasPieces = false;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (gameState[row][col] && gameState[row][col].color === opponentColor) {
                opponentHasPieces = true;
                break;
            }
        }
        if (opponentHasPieces) break;
    }
    
    // Обновляем счетчик пешек
    updatePiecesCounter();
    
    // Если у противника нет пешек, вызываем checkGameOver
    if (!opponentHasPieces) {
        return checkGameOver();
    }
    
    // Очищаем все подсветки и выделения перед сменой хода
    const allPieces = document.querySelectorAll('.piece');
    allPieces.forEach(piece => {
        piece.classList.remove('active-player-piece', 'selected', 'ending-turn', 'can-attack', 'can-be-attacked');
    });
    clearHighlights();
    
    // Плавно завершаем анимацию текущих активных пешек перед сменой хода
    endTurnAnimation();
    
    // Активируем способность "Регенерация" для пешек текущего игрока перед сменой хода
    activateRegenerationAbility();
    
    // Переключаем ход на противника
    currentPlayer = opponentColor;
    currentTurn = currentPlayer;
    updateTurnIndicator();
    startTurnTimer();
    
    // Обновляем активные шашки нового игрока
    updateActivePlayerPieces();
    
    return false; // Игра продолжается
}

// Функция для активации способности Регенерация
function activateRegenerationAbility() {
    // Перебираем все пешки текущего игрока
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState[row][col];
            if (piece && piece.color === currentPlayer) {
                const pieceId = `${row}-${col}`;
                const stats = piecesStats[pieceId];
                
                // Проверяем наличие способности "Регенерация"
                if (stats && stats.uniqueAbility === 'regeneration') {
                    // Применяем эффект регенерации
                    if (uniqueAbilities.regeneration.effect(stats)) {
                        console.log(`Активирована способность "Регенерация" для пешки на [${row},${col}]`);
                        
                        // Показываем анимацию активации способности
                        showAbilityActivation(row, col);
                        
                        // Воспроизводим звук лечения
                        soundManager.play('healing', 0.5);
                        
                        // Обновляем информацию о пешке, если она выбрана
                        if (selectedPiece && 
                            selectedPiece.parentElement.dataset.row === row.toString() && 
                            selectedPiece.parentElement.dataset.col === col.toString()) {
                            updatePieceInfo(selectedPiece);
                        }
                    }
                }
            }
        }
    }
}

// Функция для подсветки шашек активного игрока
function updateActivePlayerPieces() {
    // Сначала убираем класс активной пешки у всех пешек
    const allPieces = document.querySelectorAll('.piece');
    allPieces.forEach(piece => {
        piece.classList.remove('active-player-piece', 'ending-turn', 'selected');
    });
    
    // Очищаем все подсветки ходов
    clearHighlights();
    
    // Проверяем наличие принудительного взятия для активного игрока
    const hasForceJumps = checkForceJumps();
    
    // Затем находим все пешки текущего игрока и добавляем им класс активной пешки
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState[row][col];
            if (piece && piece.color === currentPlayer) {
                const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const pieceElement = square ? square.querySelector(`.piece.${currentPlayer}`) : null;
                
                if (pieceElement) {
                    // Проверяем, может ли эта шашка сделать ход
                    const moves = getValidMoves(row, col);
                    
                    // Если есть обязательное взятие, подсвечиваем только те пешки, которые могут взять
                    const hasPieceJump = moves.some(move => move.isJump);
                    
                    if (moves.length > 0 && (!hasForceJumps || hasPieceJump)) {
                        pieceElement.classList.add('active-player-piece');
                        // Добавляем звуковой эффект при анимации (воспроизводится только один раз)
                        soundManager.play('piece_hover', 0.3);
                    }
                }
            }
        }
    }
}

// Функция для обновления счетчика пешек
function updatePiecesCounter() {
    const whitePieces = document.querySelectorAll('.piece.white').length;
    const blackPieces = document.querySelectorAll('.piece.black').length;
    
    const whiteCounter = document.querySelector('.white-counter .counter-value');
    const blackCounter = document.querySelector('.black-counter .counter-value');
    
    if (whiteCounter) whiteCounter.textContent = whitePieces;
    if (blackCounter) blackCounter.textContent = blackPieces;
    
    // Показываем счетчик пешек
    const piecesCounter = document.getElementById('pieces-counter');
    if (piecesCounter) {
        piecesCounter.style.display = 'flex';
        piecesCounter.style.visibility = 'visible';
        piecesCounter.style.opacity = '1';
    }
}

// Функция для добавления значка способности на пешку
function addAbilityIconToPiece(row, col, abilityKey) {
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (!square) return;
    
    const piece = square.querySelector('.piece');
    if (!piece) return;
    
    // Проверяем, существует ли уже значок способности
    let abilityIcon = piece.querySelector('.ability-icon');
    if (abilityIcon) {
        // Если значок уже существует, обновляем его
        abilityIcon.remove();
    }
    
    // Создаем новый значок способности
    abilityIcon = document.createElement('div');
    abilityIcon.className = 'ability-icon';
    
    // Получаем информацию о способности
    const ability = uniqueAbilities[abilityKey];
    
    // Создаем иконку Material Icons
    const icon = document.createElement('span');
    icon.className = 'material-icons-round ability-icon-inner';
    icon.textContent = ability.icon;
    icon.title = `${ability.name}: ${ability.description}`;
    
    // Добавляем иконку к значку способности
    abilityIcon.appendChild(icon);
    
    // Добавляем анимацию появления
    abilityIcon.classList.add('ability-icon-appear');
    
    // Добавляем значок способности к пешке
    piece.appendChild(abilityIcon);
    
    // Удаляем класс анимации через некоторое время
    setTimeout(() => {
        abilityIcon.classList.remove('ability-icon-appear');
    }, 1000);
}

// Функция для обновления значка способности при перемещении пешки
function updateAbilityIcon(oldRow, oldCol, newRow, newCol) {
    const pieceId = `${oldRow}-${oldCol}`;
    const newPieceId = `${newRow}-${newCol}`;
    const stats = piecesStats[pieceId];
    
    if (stats && stats.uniqueAbility) {
        // После обновления ID в movePiece, добавляем значок на новую позицию
        addAbilityIconToPiece(newRow, newCol, stats.uniqueAbility);
    }
}

// Добавим анимацию активации способности
function showAbilityActivation(row, col) {
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (!square) return;
    
    const piece = square.querySelector('.piece');
    if (!piece) return;
    
    const abilityIcon = piece.querySelector('.ability-icon');
    if (!abilityIcon) return;
    
    // Добавляем класс активации
    abilityIcon.classList.add('ability-activated');
    
    // Удаляем класс активации через некоторое время
    setTimeout(() => {
        abilityIcon.classList.remove('ability-activated');
    }, 1000);
}

// Функция для вознаграждения игроков монетами в ключевые моменты игры (начало, раунд 6, раунд 11)
function rewardCoinsForRounds(roundNumber) {
    // Награждаем обоих игроков в начале игры, в начале 6-го и 11-го раундов
    if (roundNumber === 1 || roundNumber === 6 || roundNumber === 11) {
        // Награждаем обоих игроков 1 монетой
        addCoins('white', 1);
        addCoins('black', 1);
        
        // Показываем уведомление о получении монет
        if (typeof showNotification === 'function') {
            showNotification('Каждый игрок получает +1 монету!', 'reward');
        }
        
        // Показываем анимацию монет для обоих игроков
        const whiteUI = document.querySelector('.white-ui');
        const blackUI = document.querySelector('.black-ui');
        
        if (whiteUI && typeof showCoinAnimation === 'function') {
            showCoinAnimation(whiteUI, 1);
        }
        
        if (blackUI && typeof showCoinAnimation === 'function') {
            showCoinAnimation(blackUI, 1);
        }
        
        // Обновляем обработчики улучшения характеристик, чтобы они работали после получения монет
        updateUpgradeHandlers();
        
        console.log(`Раунд ${roundNumber}: Оба игрока получили +1 монету`);
    }
}

// Вспомогательная функция для работы с состоянием отображения кнопок улучшения
function handleUpgradeButtonsDisplay(action) {
    const healthUpgrade = document.getElementById('health-upgrade');
    const attackUpgrade = document.getElementById('attack-upgrade');
    
    if (action === 'save') {
        // Сохраняем текущее состояние display
        if (healthUpgrade && !healthUpgrade.hasAttribute('data-original-display')) {
            healthUpgrade.setAttribute('data-original-display', healthUpgrade.style.display || 'inline-block');
            healthUpgrade.style.display = 'none';
        } else if (healthUpgrade) {
            healthUpgrade.style.display = 'none';
        }
        
        if (attackUpgrade && !attackUpgrade.hasAttribute('data-original-display')) {
            attackUpgrade.setAttribute('data-original-display', attackUpgrade.style.display || 'inline-block');
            attackUpgrade.style.display = 'none';
        } else if (attackUpgrade) {
            attackUpgrade.style.display = 'none';
        }
        
        console.log('Состояние кнопок улучшения сохранено и скрыто');
    } else if (action === 'restore') {
        // Восстанавливаем исходное состояние display
        if (healthUpgrade && healthUpgrade.hasAttribute('data-original-display')) {
            healthUpgrade.style.display = healthUpgrade.getAttribute('data-original-display');
            console.log(`Кнопка здоровья восстановлена, display: ${healthUpgrade.style.display}`);
        }
        
        if (attackUpgrade && attackUpgrade.hasAttribute('data-original-display')) {
            attackUpgrade.style.display = attackUpgrade.getAttribute('data-original-display');
            console.log(`Кнопка атаки восстановлена, display: ${attackUpgrade.style.display}`);
        }
        
        console.log('Состояние кнопок улучшения восстановлено');
    } else if (action === 'update') {
        // Обновляем состояние кнопок улучшения
        healthUpgrade.style.display = 'inline-block';
        attackUpgrade.style.display = 'inline-block';
        console.log('Состояние кнопок улучшения обновлено');
    }
}

// Функция для управления отображением счетчика пешек
function forceShowPiecesCounter() {
    const piecesCounter = document.getElementById('pieces-counter');
    const mainMenu = document.getElementById('main-menu');
    const board = document.getElementById('board');
    
    if (!piecesCounter) {
        console.error('Элемент счетчика пешек не найден в DOM!');
        return;
    }

    // Проверяем, находимся ли мы в игре (доска отображается, а меню скрыто)
    const isInGame = window.getComputedStyle(board).display !== 'none' && 
                    window.getComputedStyle(mainMenu).display === 'none';
    
    // Устанавливаем стили в зависимости от состояния игры
    if (isInGame) {
        piecesCounter.style.display = 'flex';
        piecesCounter.style.visibility = 'visible';
        piecesCounter.style.opacity = '1';
    } else {
        piecesCounter.style.display = 'none';
        piecesCounter.style.visibility = 'hidden';
        piecesCounter.style.opacity = '0';
    }
}

// Функция для плавного завершения анимации активных пешек при окончании хода
function endTurnAnimation() {
    // Находим все пешки текущего игрока с анимацией
    const activePieces = document.querySelectorAll(`.piece.${currentPlayer}.active-player-piece`);
    
    // Добавляем класс для плавного завершения анимации
    activePieces.forEach(piece => {
        piece.classList.add('ending-turn');
    });
    
    // Через 0.8 секунды убираем класс активной пешки (время соответствует transition в CSS)
    setTimeout(() => {
        activePieces.forEach(piece => {
            piece.classList.remove('active-player-piece', 'ending-turn');
        });
    }, 800);
}

function updatePieceStats(row, col) {
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (!square) return;

    const piece = square.querySelector('.piece');
    if (!piece) return;

    const pieceId = `${row}-${col}`;
    const stats = piecesStats[pieceId];
    if (!stats) return;

    let statsDisplay = piece.querySelector('.piece-stats');
    if (!statsDisplay) {
        statsDisplay = document.createElement('div');
        statsDisplay.className = 'piece-stats';
        piece.appendChild(statsDisplay);
    }

    statsDisplay.innerHTML = `<span class="health">${stats.health}</span>/${stats.attack}`;
}

// Функция для отображения мечей на пешках, которые можно атаковать
function showAttackableTargets(moves) {
    // Сначала очищаем предыдущие метки атакуемых пешек
    clearAttackableTargets();
    
    // Перебираем все ходы и помечаем пешки, которые можно атаковать
    moves.forEach(move => {
        if (move.isAttackOnly) {
            // Для прямой атаки
            const targetSquare = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
            const targetPiece = targetSquare?.querySelector('.piece');
            if (targetPiece) {
                targetPiece.classList.add('can-be-attacked');
            }
        } else if (move.captures && move.captures.length > 0) {
            // Для мультизахвата - показываем мечи над каждой пешкой в цепочке захвата
            move.captures.forEach(capture => {
                const targetSquare = document.querySelector(`[data-row="${capture.row}"][data-col="${capture.col}"]`);
                const targetPiece = targetSquare?.querySelector('.piece');
                if (targetPiece) {
                    targetPiece.classList.add('can-be-attacked');
                }
            });
        }
    });
}

// Функция для очистки меток атакуемых пешек
function clearAttackableTargets() {
    document.querySelectorAll('.can-be-attacked').forEach(piece => {
        piece.classList.remove('can-be-attacked');
    });
}

// Флаг для отслеживания показа окна улучшений
let upgradeWindowShown = false;

// Функция определения текущей стадии игры
function getCurrentGameStage() {
    if (gameTurns <= GAME_STAGES.EARLY.end) return 'EARLY';
    if (gameTurns <= GAME_STAGES.MID.end) return 'MID';
    return 'LATE';
}

// Функция проверки необходимости показа окна улучшений
function shouldShowUpgradeWindow() {
    // Проверяем, что игра не в меню
    const mainMenu = document.getElementById('main-menu');
    if (!mainMenu || window.getComputedStyle(mainMenu).display !== 'none') {
        return false;
    }

    const currentStage = getCurrentGameStage();
    const player = currentPlayer;

    // Проверяем, получил ли игрок улучшение для текущей стадии
    const stageUpgradeFlag = {
        EARLY: 'hasEarlyStageUpgrade',
        MID: 'hasMidStageUpgrade',
        LATE: 'hasLateStageUpgrade'
    }[currentStage];

    return !playerUpgrades[player][stageUpgradeFlag];
}

// Функция создания окна выбора улучшений
function showUpgradeWindow() {
    const currentStage = getCurrentGameStage();
    const upgrades = STAGE_UPGRADES[currentStage];
    
    // Проверяем, не получил ли игрок уже улучшение для текущей стадии
    const stageUpgradeFlag = {
        EARLY: 'hasEarlyStageUpgrade',
        MID: 'hasMidStageUpgrade',
        LATE: 'hasLateStageUpgrade'
    }[currentStage];
    
    if (playerUpgrades[currentPlayer][stageUpgradeFlag]) {
        return;
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'upgrade-overlay';
    overlay.innerHTML = `
        <div class="upgrade-window">
            <h2>${currentPlayer === 'white' ? 'Белые' : 'Черные'} - Выберите улучшение (${GAME_STAGES[currentStage].name})</h2>
            <div class="upgrade-options">
                ${upgrades.map((upgrade, index) => `
                    <div class="upgrade-option" data-upgrade-id="${upgrade.id}">
                        <h3>${upgrade.name}</h3>
                        <p>${upgrade.description || ''}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Добавляем обработчики событий для каждой опции
    const options = overlay.querySelectorAll('.upgrade-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            const upgradeId = option.dataset.upgradeId;
            const selectedUpgrade = upgrades.find(u => u.id === upgradeId);
            
            if (selectedUpgrade) {
                // Применяем эффект улучшения
                selectedUpgrade.effect(currentPlayer);
                
                // Отмечаем, что игрок получил улучшение для текущей стадии
                playerUpgrades[currentPlayer][stageUpgradeFlag] = true;
                
                // Показываем уведомление
                showNotification(`Улучшение "${selectedUpgrade.name}" получено!`, 'success');
                
                // Воспроизводим звук
                if (window.soundManager) {
                    soundManager.play('powerup', 0.8);
                }
                
                // Удаляем окно
                overlay.remove();
                
                // Обновляем UI
                if (window.rpg) {
                    window.rpg.updateUI();
                }
            }
        });
        
        // Добавляем эффект при наведении
        option.style.cursor = 'pointer';
        option.addEventListener('mouseover', () => {
            option.style.transform = 'scale(1.05)';
            option.style.transition = 'transform 0.2s ease';
        });
        
        option.addEventListener('mouseout', () => {
            option.style.transform = 'scale(1)';
        });
    });
}

// Функция обновления отображения ресурсов
function updateResourceDisplay() {
    const playerStats = playerUpgrades[currentPlayer];
    
    // Обновляем отображение маны и золота
    const resourceDisplay = document.querySelector('.resource-display') || createResourceDisplay();
    resourceDisplay.innerHTML = `
        <div class="resource mana">Мана: ${playerStats.mana}</div>
        <div class="resource gold">Золото: ${playerStats.gold}</div>
    `;
}

// Функция создания элемента отображения ресурсов
function createResourceDisplay() {
    const display = document.createElement('div');
    display.className = 'resource-display';
    document.body.appendChild(display);
    
    // Добавляем стили
    const style = document.createElement('style');
    style.textContent = `
        .resource-display {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            padding: 10px;
            border-radius: 5px;
            color: white;
            display: flex;
            gap: 15px;
        }
        
        .resource {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .resource.mana {
            color: #00aaff;
        }
        
        .resource.gold {
            color: #ffd700;
        }
    `;
    document.head.appendChild(style);
    
    return display;
}




