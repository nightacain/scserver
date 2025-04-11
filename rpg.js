// Состояние игроков
const playerState = {
    white: {
        coins: 3,
        mana: 1, // Начальное значение маны
        powerupsUsed: {
            destroyPiece: false
        },
        powerupCooldowns: {},
        traps: [], // Массив для хранения активных ловушек
        stunnedPieces: [], // Массив для хранения оглушенных пешек
        hasTrapPowerup: false, // Флаг доступности ловушки
        hasStunPowerup: false,
        hasStepBackPowerup: false,
        hasDestroyPowerup: false, // Новый флаг для способности уничтожения
        availablePowerups: []
    },
    black: {
        coins: 3,
        mana: 1, // Начальное значение маны
        powerupsUsed: {
            destroyPiece: false
        },
        powerupCooldowns: {},
        traps: [], // Массив для хранения активных ловушек
        stunnedPieces: [], // Массив для хранения оглушенных пешек
        hasTrapPowerup: false, // Флаг доступности ловушки
        hasStunPowerup: false,
        hasStepBackPowerup: false,
        hasDestroyPowerup: false, // Новый флаг для способности уничтожения
        availablePowerups: []
    }
};

// Конфигурация усилений
const powerups = {
    destroyPiece: {
        manaCost: 4,
        name: 'Уничтожение',
        description: 'Уничтожить одну пешку противника по вашему выбору (4 маны)',
        icon: 'delete_forever',
        rarity: 'legendary',
        usesPerMatch: 1,
        cooldown: 0,
        isAvailable: (player) => {
            return playerState[player].hasDestroyPowerup && 
                   playerState[player].mana >= 4 && 
                   !playerState[player].powerupsUsed.destroyPiece;
        }
    },
    trap: {
        manaCost: 3,
        name: 'Ловушка',
        description: 'Установить ловушку на любую клетку (3 маны)',
        icon: 'electric_bolt',
        rarity: 'basic',
        usesPerMatch: Infinity,
        cooldown: 0,
        isAvailable: (player) => {
            return playerState[player].hasTrapPowerup && 
                   playerState[player].mana >= 3;
        }
    },
    stun: {
        manaCost: 2,
        name: 'Оглушение',
        description: 'Оглушить пешку противника на один ход (2 маны)',
        icon: 'flash_on',
        rarity: 'rare',
        usesPerMatch: Infinity,
        cooldown: 3,
        isAvailable: (player) => {
            return playerState[player].hasStunPowerup && 
                   playerState[player].mana >= 2 && 
                   (!playerState[player].powerupCooldowns?.stun || 
                    playerState[player].powerupCooldowns.stun <= 0);
        }
    },
    stepBack: {
        manaCost: 3,
        name: 'Шаг назад',
        description: 'Вернуть одну свою и одну пешку противника на предыдущую позицию (3 маны)',
        icon: 'undo',
        rarity: 'rare',
        usesPerMatch: Infinity,
        cooldown: 2,
        isAvailable: (player) => {
            return playerState[player].hasStepBackPowerup && 
                   playerState[player].mana >= 3 && 
                   (!playerState[player].powerupCooldowns?.stepBack || 
                    playerState[player].powerupCooldowns.stepBack <= 0) &&
                   moveHistory.length > 0;
        }
    }
};

// Глобальные переменные для управления состоянием усилений
let isPowerupActive = false;
let activePowerup = null;

// Добавляем переменные для отслеживания выбранных пешек для шага назад
let stepBackState = {
    selectedPieces: [],
    lastMoves: []
};

// Добавляем счетчик раундов
let currentRound = 1;

// Добавление монет игроку
function addCoins(player, amount) {
    playerState[player].coins += amount;
    soundManager.play('coin');
    updateUI();
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
        
        // Обновляем обработчики улучшения после получения монет
        if (typeof updateUpgradeHandlers === 'function') {
            updateUpgradeHandlers();
        }
        
        console.log(`Раунд ${roundNumber}: Оба игрока получили +1 монету`);
    }
}

// Получение количества монет игрока
function getCoins(player) {
    return playerState[player].coins;
}

// Списание монет у игрока
function spendCoins(player, amount) {
    if (playerState[player].coins >= amount) {
        playerState[player].coins -= amount;
        updateUI();
        return true;
    }
    return false;
}

// Получение количества маны игрока
function getMana(player) {
    return playerState[player].mana;
}

// Добавление маны игроку
function addMana(player, amount) {
    playerState[player].mana += amount;
    updateUI();
}

// Списание маны у игрока
function spendMana(player, amount, isUniqueSkill = false) {
    // Применяем скидку для уникальных навыков, если она есть
    let finalAmount = amount;
    if (isUniqueSkill && playerUpgrades[player].uniqueSkillDiscount > 0) {
        finalAmount = Math.max(0, amount - playerUpgrades[player].uniqueSkillDiscount);
    }
    
    if (playerState[player].mana >= finalAmount) {
        playerState[player].mana -= finalAmount;
        updateUI();
        return true;
    }
    return false;
}

// Проверка возможности использования усиления
function canUsePowerup(player, powerupType) {
    return powerups[powerupType].isAvailable(player);
}

// Использование усиления
function usePowerup(player, powerupType) {
    if (!canUsePowerup(player, powerupType)) {
        return false;
    }
    
    const powerup = powerups[powerupType];
    
    // Списываем ману
    playerState[player].mana -= powerup.manaCost;
    
    // Обрабатываем легендарные способности
    if (powerup.rarity === 'legendary') {
        playerState[player].powerupsUsed[powerupType] = true;
    }
    
    // Устанавливаем перезарядку для редких способностей
    if (powerup.rarity === 'rare') {
        setPowerupCooldown(player, powerupType);
    }
    
    soundManager.play('powerup', 0.7);
    updateUI();
    return true;
}

// Обновляем функцию updateUI для отображения только доступных powerups
function updateUI() {
    ['white', 'black'].forEach(player => {
        const playerUI = document.getElementById(`${player}-ui`);
        if (!playerUI) return;

        // Обновляем монеты
        const coinsElement = playerUI.querySelector('.coins');
        const coinsText = coinsElement.querySelector('.coins-text');
        coinsText.textContent = playerState[player].coins;

        // Обновляем ману
        const manaElement = playerUI.querySelector('.mana');
        const manaText = manaElement.querySelector('.mana-text');
        manaText.textContent = playerState[player].mana;

        // Очищаем и обновляем powerups
        const powerupsContainer = playerUI.querySelector('.powerups');
        if (powerupsContainer) {
            powerupsContainer.innerHTML = '';

            // Отображаем только те powerups, которые есть в списке доступных
            Object.entries(powerups).forEach(([type, powerup]) => {
                // Проверяем, доступен ли данный powerup для игрока
                if (!playerState[player].availablePowerups.includes(type)) {
                    return; // Пропускаем powerup, если его нет в списке доступных
                }

                // Дополнительно проверяем специальные условия для ловушки и оглушения
                if ((type === 'trap' && !playerState[player].hasTrapPowerup) ||
                    (type === 'stun' && !playerState[player].hasStunPowerup)) {
                    return; // Пропускаем, если специальные способности не разблокированы
                }

                const button = document.createElement('button');
                button.className = `powerup-button ${!canUsePowerup(player, type) ? 'disabled' : ''}`;
                button.title = powerup.description;
                button.dataset.rarity = powerup.rarity;
                
                // Проверяем перезарядку
                const cooldown = playerState[player].powerupCooldowns?.[type] || 0;
                if (cooldown > 0) {
                    button.classList.add('on-cooldown');
                    button.dataset.cooldown = cooldown;
                }
                
                const iconSpan = document.createElement('span');
                iconSpan.className = 'material-icons-round';
                iconSpan.textContent = powerup.icon;
                
                const costContainer = document.createElement('div');
                costContainer.className = 'powerup-cost-container';
                
                const manaCostSpan = document.createElement('span');
                manaCostSpan.className = 'powerup-cost';
                manaCostSpan.textContent = powerup.manaCost;
                
                const manaIcon = document.createElement('span');
                manaIcon.className = 'material-icons-round';
                manaIcon.textContent = 'local_fire_department';
                manaIcon.style.fontSize = '12px';
                
                button.appendChild(iconSpan);
                costContainer.appendChild(manaCostSpan);
                costContainer.appendChild(manaIcon);
                button.appendChild(costContainer);
                
                // Добавляем обработчик клика
                button.addEventListener('click', () => {
                    if (player === currentPlayer) {
                        window.rpg.handlePowerupClick(player, type);
                    }
                });
                
                powerupsContainer.appendChild(button);
            });
        }

        // Обновляем индикатор хода
        const turnIndicator = playerUI.querySelector('.turn-indicator');
        if (turnIndicator) {
            turnIndicator.style.display = player === currentPlayer ? 'block' : 'none';
        }
    });
}

// Инициализация RPG UI
function initializeRPGUI() {
    // Удаляем существующие UI, если они есть
    const existingUI = document.querySelectorAll('.player-ui');
    existingUI.forEach(ui => ui.remove());

    // Создаем UI для каждого игрока
    ['white', 'black'].forEach(player => {
        const playerUI = document.createElement('div');
        playerUI.id = `${player}-ui`;
        playerUI.className = `player-ui ${player}-ui`;
        playerUI.style.display = 'none'; // Скрываем изначально
        
        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';
        
        const playerName = document.createElement('div');
        playerName.className = 'player-name';
        playerName.textContent = player === 'white' ? 'Белые' : 'Черные';
        
        const turnIndicator = document.createElement('div');
        turnIndicator.className = 'turn-indicator';
        const turnIcon = document.createElement('span');
        turnIcon.className = 'material-icons-round';
        turnIcon.textContent = 'play_arrow';
        turnIndicator.appendChild(turnIcon);
        turnIndicator.appendChild(document.createTextNode(' Ваш ход'));
        
        const coins = document.createElement('div');
        coins.className = 'coins';
        const coinIcon = document.createElement('span');
        coinIcon.className = 'material-icons-round coin-icon';
        coinIcon.textContent = 'monetization_on';
        const coinsText = document.createElement('span');
        coinsText.className = 'coins-text';
        coinsText.textContent = '3';
        coins.appendChild(coinIcon);
        coins.appendChild(coinsText);

        const mana = document.createElement('div');
        mana.className = 'mana';
        const manaIcon = document.createElement('span');
        manaIcon.className = 'material-icons-round mana-icon';
        manaIcon.textContent = 'local_fire_department';
        const manaText = document.createElement('span');
        manaText.className = 'mana-text';
        manaText.textContent = '1';
        mana.appendChild(manaIcon);
        mana.appendChild(manaText);
        
        const powerup = document.createElement('div');
        powerup.className = 'powerups';
        
        playerInfo.appendChild(playerName);
        playerInfo.appendChild(turnIndicator);
        playerInfo.appendChild(coins);
        playerInfo.appendChild(mana);
        
        playerUI.appendChild(playerInfo);
        playerUI.appendChild(powerup);
        
        document.body.appendChild(playerUI);
    });
    
    // Обновляем UI
    updateUI();
}

// Функция для показа UI
function showRPGUI() {
    const whiteUI = document.querySelector('.white-ui');
    const blackUI = document.querySelector('.black-ui');
    if (whiteUI) whiteUI.style.display = 'flex';
    if (blackUI) blackUI.style.display = 'flex';
}

// Обработка клика по кнопке усиления
function handlePowerupClick(player, powerupType) {
    if (player !== currentPlayer) {
        return;
    }
    
    // Если способность уже активна, отменяем её
    if (isPowerupActive && activePowerup === powerupType) {
        // Если это stepBack и уже выбрана первая пешка, очищаем только выбор первой пешки
        if (powerupType === 'stepBack' && stepBackState.selectedPieces.length === 1) {
            // Очищаем выбор первой пешки
            stepBackState.selectedPieces[0].classList.remove('powerup-selected');
            stepBackState = {
                selectedPieces: [],
                lastMoves: []
            };
            // Заново показываем доступные свои пешки
            const currentTurnMoves = moveHistory.filter(move => 
                (move.turnNumber === gameTurns || move.turnNumber === gameTurns - 1) &&
                move.pieceColor === currentPlayer
            );
            currentTurnMoves.forEach(move => {
                const piece = document.querySelector(`.piece.${move.pieceColor}[data-row="${move.toRow}"][data-col="${move.toCol}"]`);
                if (piece) {
                    piece.classList.add('powerup-target');
                }
            });
            showNotification('Выберите свою пешку для отмены хода', 'info');
            return;
        }
        clearPowerupState();
        return;
    }
    
    if (!canUsePowerup(player, powerupType)) {
        return;
    }
    
    soundManager.play('powerup_click', 0.8);
    
    isPowerupActive = true;
    activePowerup = powerupType;
    document.getElementById('board').classList.add('powerup-active');
    
    if (powerupType === 'destroyPiece' || powerupType === 'stun') {
        // Подсветка пешек противника
        const opponentPieces = document.querySelectorAll(`.piece.${player === 'white' ? 'black' : 'white'}`);
        opponentPieces.forEach(piece => {
            piece.classList.add('powerup-target');
        });
    } else if (powerupType === 'trap') {
        // Подсветка всех пустых клеток для установки ловушки
        document.querySelectorAll('.square').forEach(square => {
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            if (!gameState[row][col] && !square.querySelector('.trap')) {
                square.classList.add('trap-target');
            }
        });
    } else if (powerupType === 'stepBack') {
        // Подсветка всех пешек, которые ходили в этом ходу
        const currentTurnMoves = moveHistory.filter(move => 
            move.turnNumber === gameTurns || move.turnNumber === gameTurns - 1
        );
        
        if (currentTurnMoves.length > 0) {
            // Если еще не выбрана первая пешка, подсвечиваем все свои пешки, которые ходили
            if (stepBackState.selectedPieces.length === 0) {
                currentTurnMoves.forEach(move => {
                    if (move.pieceColor === currentPlayer) {
                        // Ищем пешку на текущей позиции
                        const square = document.querySelector(`[data-row="${move.toRow}"][data-col="${move.toCol}"]`);
                        if (square) {
                            const piece = square.querySelector(`.piece.${move.pieceColor}`);
                            if (piece) {
                                piece.classList.add('powerup-target');
                            }
                        }
                    }
                });
                showNotification('Выберите свою пешку для отмены хода', 'info');
            } 
            // Если выбрана первая пешка, подсвечиваем пешки противника
            else if (stepBackState.selectedPieces.length === 1) {
                currentTurnMoves.forEach(move => {
                    if (move.pieceColor !== currentPlayer) {
                        // Ищем пешку на текущей позиции
                        const square = document.querySelector(`[data-row="${move.toRow}"][data-col="${move.toCol}"]`);
                        if (square) {
                            const piece = square.querySelector(`.piece.${move.pieceColor}`);
                            if (piece) {
                                piece.classList.add('powerup-target');
                            }
                        }
                    }
                });
                showNotification('Теперь выберите пешку противника', 'info');
            }
        } else {
            showNotification('Нет доступных ходов для отмены', 'warning');
            clearPowerupState();
        }
    }
}

// Обработка цели усиления
function handlePowerupTarget(element) {
    if (!isPowerupActive || !activePowerup) {
        return false;
    }

    let powerupSuccess = false;

    switch (activePowerup) {
        case 'destroyPiece':
            powerupSuccess = handleDestroyPieceTarget(element);
            break;
        case 'trap':
            if (element.classList.contains('square')) {
                powerupSuccess = handleTrapTarget(element);
            }
            break;
        case 'stun':
            powerupSuccess = handleStunTarget(element);
            break;
        case 'stepBack':
            powerupSuccess = handleStepBackTarget(element);
            break;
        default:
            console.warn('Неизвестный тип усиления:', activePowerup);
            break;
    }

    if (powerupSuccess) {
        clearPowerupState();
        return true;
    }

    return false;
}

// Обработка уничтожения пешки
function handleDestroyPieceTarget(piece) {
    if (!piece.classList.contains('piece')) {
        return false;
    }
    
    const pieceColor = piece.classList.contains('white') ? 'white' : 'black';
    if (pieceColor === currentPlayer) {
        return false;
    }
    
    if (usePowerup(currentPlayer, 'destroyPiece')) {
        const square = piece.parentElement;
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        
        // Получаем статистику пешки для награды
        const pieceId = `${row}-${col}`;
        const stats = window.piecesStats ? window.piecesStats[pieceId] : null;
        
        let goldReward = 2;
        if (stats) {
            goldReward += stats.level || 0;
            if (stats.isKing) {
                goldReward += 2;
            }
        }
        
        addCoins(currentPlayer, goldReward);
        gameState[row][col] = null;
        piece.remove();
        
        soundManager.play('capture', 0.8);
        if (typeof showCoinAnimation === 'function') {
            showCoinAnimation(square, goldReward);
        }
        
        if (window.piecesStats && window.piecesStats[pieceId]) {
            delete window.piecesStats[pieceId];
        }
        
        return true;
    }
    
    return false;
}

// Обработка установки ловушки
function handleTrapTarget(square) {
    if (!square.classList.contains('trap-target')) {
        return false;
    }
    
    if (usePowerup(currentPlayer, 'trap')) {
        const trap = document.createElement('div');
        trap.className = `trap ${currentPlayer}`;
        square.appendChild(trap);
        
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        playerState[currentPlayer].traps.push({ row, col });
        
        soundManager.play('trap', 0.8);
        return true;
    }
    
    return false;
}

// Обработка оглушения пешки
function handleStunTarget(piece) {
    if (!piece.classList.contains('piece')) {
        return false;
    }
    
    const pieceColor = piece.classList.contains('white') ? 'white' : 'black';
    if (pieceColor === currentPlayer) {
        return false;
    }
    
    if (usePowerup(currentPlayer, 'stun')) {
        const square = piece.parentElement;
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        
        const opponent = currentPlayer === 'white' ? 'black' : 'white';
        playerState[opponent].stunnedPieces.push({ row, col });
        
        piece.classList.add('stunned');
        
        // Создаем эффект оглушения
        const stunEffect = document.createElement('div');
        stunEffect.className = 'stun-effect';
        piece.appendChild(stunEffect);
        
        // Добавляем звуковой эффект
        soundManager.play('stun', 0.8);
        
        // Показываем уведомление
        showNotification(`Пешка противника оглушена на один ход!`, 'warning');
        
        return true;
    }
    
    return false;
}

// Функция обработки цели для шага назад
function handleStepBackTarget(element) {
    if (!element.classList.contains('piece') || !element.classList.contains('powerup-target')) {
        return false;
    }

    const piece = element;
    const square = piece.parentElement;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const pieceColor = piece.classList.contains('white') ? 'white' : 'black';

    // Проверяем, что выбрана правильная пешка (своя или противника)
    if (stepBackState.selectedPieces.length === 0) {
        // Первая пешка должна быть своей
        if (pieceColor !== currentPlayer) {
            showNotification('Сначала выберите свою пешку', 'warning');
            return false;
        }
    } else if (stepBackState.selectedPieces.length === 1) {
        // Вторая пешка должна быть противника
        if (pieceColor === currentPlayer) {
            showNotification('Теперь выберите пешку противника', 'warning');
            return false;
        }
    } else {
        return false;
    }

    // Находим последний ход для выбранной пешки
    const lastMove = moveHistory.slice().reverse().find(move => 
        move.pieceColor === pieceColor && 
        move.toRow === row && 
        move.toCol === col &&
        (move.turnNumber === gameTurns || move.turnNumber === gameTurns - 1)
    );

    if (!lastMove) {
        showNotification('Эта пешка не совершала ход в этом или предыдущем ходу', 'warning');
        return false;
    }

    // Проверяем, что клетка назначения свободна
    const targetSquare = document.querySelector(`[data-row="${lastMove.fromRow}"][data-col="${lastMove.fromCol}"]`);
    if (!targetSquare || targetSquare.querySelector('.piece')) {
        showNotification('Невозможно вернуть пешку на предыдущую позицию - клетка занята', 'warning');
        return false;
    }

    // Добавляем пешку и её последний ход в состояние
    stepBackState.selectedPieces.push(piece);
    stepBackState.lastMoves.push(lastMove);

    // Подсвечиваем выбранную пешку
    piece.classList.add('powerup-selected');
    piece.classList.remove('powerup-target');

    // Если это первая пешка, обновляем подсветку для пешек противника
    if (stepBackState.selectedPieces.length === 1) {
        // Очищаем текущую подсветку
        document.querySelectorAll('.powerup-target').forEach(p => p.classList.remove('powerup-target'));
        
        // Подсвечиваем доступные пешки противника
        const currentTurnMoves = moveHistory.filter(move => 
            (move.turnNumber === gameTurns || move.turnNumber === gameTurns - 1) &&
            move.pieceColor !== currentPlayer
        );
        
        currentTurnMoves.forEach(move => {
            const square = document.querySelector(`[data-row="${move.toRow}"][data-col="${move.toCol}"]`);
            if (square) {
                const piece = square.querySelector(`.piece.${move.pieceColor}`);
                if (piece) {
                    // Проверяем, что клетка назначения свободна
                    const targetSquare = document.querySelector(`[data-row="${move.fromRow}"][data-col="${move.fromCol}"]`);
                    if (targetSquare && !targetSquare.querySelector('.piece')) {
                        piece.classList.add('powerup-target');
                    }
                }
            }
        });
        
        showNotification('Теперь выберите пешку противника', 'info');
    }

    // Если выбраны обе пешки, выполняем шаг назад
    if (stepBackState.selectedPieces.length === 2) {
        if (usePowerup(currentPlayer, 'stepBack')) {
            // Отменяем ходы для обеих пешек
            stepBackState.lastMoves.forEach(moveData => {
                undoMove(moveData);
            });

            // Очищаем подсветку
            stepBackState.selectedPieces.forEach(p => {
                p.classList.remove('powerup-selected');
            });

            // Очищаем состояние
            stepBackState = {
                selectedPieces: [],
                lastMoves: []
            };

            soundManager.play('powerup', 0.8);
            showNotification('Ходы успешно отменены!', 'success');
            return true;
        }
    }

    return false;
}

// Очистка состояния усиления
function clearPowerupState() {
    isPowerupActive = false;
    activePowerup = null;
    
    document.getElementById('board').classList.remove('powerup-active');
    document.querySelectorAll('.powerup-target, .trap-target, .powerup-selected').forEach(element => {
        element.classList.remove('powerup-target', 'trap-target', 'powerup-selected');
    });
    
    // Очищаем состояние stepBack
    stepBackState = {
        selectedPieces: [],
        lastMoves: []
    };
}

// Проверка и активация ловушки
function checkAndTriggerTrap(row, col, targetPlayer) {
    const opponent = targetPlayer === 'white' ? 'black' : 'white';
    const trapIndex = playerState[opponent].traps.findIndex(trap => trap.row === row && trap.col === col);
    
    if (trapIndex !== -1) {
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const trap = square.querySelector('.trap');
        
        if (trap) {
            trap.classList.add('triggered');
            setTimeout(() => trap.remove(), 500);
            playerState[opponent].traps.splice(trapIndex, 1);
            return true;
        }
    }
    
    return false;
}

// Проверка, оглушена ли пешка
function isStunned(row, col, player) {
    const isStunned = playerState[player].stunnedPieces.some(
        piece => piece.row === row && piece.col === col
    );
    
    if (isStunned) {
        showNotification('Эта пешка оглушена и не может двигаться в этот ход!', 'warning');
    }
    
    return isStunned;
}

// Очистка списка оглушенных пешек
function clearStunnedPieces(player) {
    // Находим все оглушенные пешки
    document.querySelectorAll('.piece.stunned').forEach(piece => {
        const pieceColor = piece.classList.contains('white') ? 'white' : 'black';
        // Очищаем оглушение только для пешек текущего игрока
        if (pieceColor === player) {
            // Удаляем класс оглушения
            piece.classList.remove('stunned');
            
            // Находим эффект оглушения
            const stunEffect = piece.querySelector('.stun-effect');
            if (stunEffect) {
                // Добавляем анимацию исчезновения
                stunEffect.classList.add('fade-out');
                // Удаляем элемент после завершения анимации
                setTimeout(() => {
                    stunEffect.remove();
                }, 500);
            }
        }
    });
    
    // Очищаем массив оглушенных пешек только для текущего игрока
    playerState[player].stunnedPieces = [];
}

// Функция для обновления перезарядки способностей
function updatePowerupCooldowns(player) {
    const cooldowns = playerState[player].powerupCooldowns;
    if (!cooldowns) return;

    Object.keys(cooldowns).forEach(powerupType => {
        if (cooldowns[powerupType] > 0) {
            cooldowns[powerupType]--;
        }
    });
}

// Функция для установки перезарядки способности
function setPowerupCooldown(player, powerupType) {
    const powerup = powerups[powerupType];
    if (!powerup || !powerup.cooldown) return;

    if (!playerState[player].powerupCooldowns) {
        playerState[player].powerupCooldowns = {};
    }
    
    playerState[player].powerupCooldowns[powerupType] = powerup.cooldown;
}

function endTurn() {
    // Обновляем перезарядку способностей
    updatePowerupCooldowns(currentPlayer);
    
    // Очищаем оглушенные пешки для текущего игрока
    clearStunnedPieces(currentPlayer);
    
    // Проверяем эффект доминирования
    if (playerUpgrades[currentPlayer].dominanceEffect) {
        const currentPieces = document.querySelectorAll(`.piece.${currentPlayer}`).length;
        const opponent = currentPlayer === 'white' ? 'black' : 'white';
        const enemyPieces = document.querySelectorAll(`.piece.${opponent}`).length;
        
        if (currentPieces > enemyPieces) {
            playerState[opponent].mana = Math.max(0, playerState[opponent].mana - 1);
            showNotification('Эффект доминирования: противник теряет 1 ману!', 'info');
            updateUI();
        }
    }
    
    // Меняем текущего игрока
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    
    // Увеличиваем счетчик раундов при переходе хода к белым
    if (currentPlayer === 'white') {
        currentRound++;
        
        // Уведомляем магазин о смене раунда
        if (window.shop && typeof window.shop.onRoundChange === 'function') {
            window.shop.onRoundChange(currentRound);
        }
    }
}

// Функция для получения текущего раунда
function getCurrentRound() {
    return currentRound;
}

// Функция для получения текущего игрока
function getCurrentPlayer() {
    return currentPlayer;
}

// Экспорт функций
window.rpg = {
    addCoins,
    getMana,
    addMana,
    spendMana,
    updateUI,
    initializeRPGUI,
    showRPGUI,
    isPowerupActive: () => isPowerupActive,
    handlePowerupTarget,
    checkAndTriggerTrap,
    isStunned,
    clearStunnedPieces,
    handlePowerupClick,
    playerState,
    
    // Обновляем функции для звуков
    playPieceSelectSound: () => {
        soundManager.play('piece_select');
    },
    
    playCanCaptureSound: () => {
        soundManager.play('can_capture');
    },
    
    getCoins,
    spendCoins,
    getCurrentRound,
    getCurrentPlayer
}; 