// Конфигурация магазина
const SHOP_CONFIG = {
    autoOpenRound: 2, // Раунд, в котором автоматически открывается магазин
    manualOpenCost: 3, // Стоимость ручного открытия магазина
    timeLimit: 10000, // Время на принятие решения (10 секунд)
};

// Состояние магазина
let shopState = {
    isOpen: false,
    timer: null,
    currentRound: 0
};

// Создаем модальное окно магазина
function createShopModal() {
    const modal = document.createElement('div');
    modal.id = 'shop-modal';
    modal.className = 'shop-modal';
    modal.innerHTML = `
        <div class="shop-content">
            <div class="shop-header">
                <h2>Магазин навыков</h2>
                <button class="shop-close-button">
                    <span class="material-icons-round">close</span>
                </button>
            </div>
            <div class="shop-items"></div>
        </div>
    `;
    
    // Добавляем обработчик для кнопки закрытия
    const closeButton = modal.querySelector('.shop-close-button');
    closeButton.onclick = () => closeShop();
    
    document.body.appendChild(modal);
    return modal;
}

// Создаем кнопку для открытия магазина
function createShopButton() {
    const button = document.createElement('button');
    button.id = 'open-shop-button';
    button.className = 'shop-button';
    button.innerHTML = `
        <span class="material-icons-round">store</span>
    `;
    button.onclick = () => openShop();
    document.body.appendChild(button);
    return button;
}

// Открытие магазина
function openShop() {
    if (shopState.isOpen) return;
    
    shopState.isOpen = true;
    const modal = document.getElementById('shop-modal') || createShopModal();
    modal.classList.add('visible');
    
    // Очищаем предыдущие товары
    const shopItems = modal.querySelector('.shop-items');
    shopItems.innerHTML = '';
    
    // Получаем текущего игрока
    const currentPlayer = window.rpg.getCurrentPlayer();
    
    // Отображаем все доступные powerups для покупки
    const availablePowerups = {
        trap: {
            name: 'Ловушка',
            description: 'Установить ловушку на любую клетку (3 маны)',
            icon: 'electric_bolt',
            rarity: 'basic',
            cost: 3
        },
        stun: {
            name: 'Оглушение',
            description: 'Оглушить пешку противника на один ход (2 маны)',
            icon: 'flash_on',
            rarity: 'rare',
            cost: 5
        },
        stepBack: {
            name: 'Шаг назад',
            description: 'Вернуть одну свою и одну пешку противника на предыдущую позицию (3 маны)',
            icon: 'undo',
            rarity: 'rare',
            cost: 5
        },
        destroyPiece: {
            name: 'Уничтожение',
            description: 'Уничтожить одну пешку противника по вашему выбору (4 маны)',
            icon: 'delete_forever',
            rarity: 'legendary',
            cost: 8
        }
    };
    
    // Отображаем только те powerups, которые еще не куплены
    Object.entries(availablePowerups).forEach(([powerupId, powerup]) => {
        // Проверяем, не куплен ли уже этот powerup
        if (!window.rpg.playerState[currentPlayer].availablePowerups.includes(powerupId)) {
            const itemElement = document.createElement('div');
            itemElement.className = 'shop-item';
            itemElement.dataset.powerupId = powerupId;
            itemElement.dataset.rarity = powerup.rarity;
            
            itemElement.innerHTML = `
                <div class="shop-item-header">
                    <span class="material-icons-round">${powerup.icon}</span>
                    <h3>${powerup.name}</h3>
                </div>
                <p class="shop-item-description">${powerup.description}</p>
                <div class="shop-item-footer">
                    <div class="shop-item-cost">
                        <span class="material-icons-round">monetization_on</span>
                        <span>${powerup.cost}</span>
                    </div>
                    <button class="shop-buy-button" ${window.rpg.playerState[currentPlayer].coins < powerup.cost ? 'disabled' : ''}>
                        Купить
                    </button>
                </div>
            `;
            
            // Добавляем обработчик покупки
            const buyButton = itemElement.querySelector('.shop-buy-button');
            buyButton.onclick = () => purchasePowerup(powerupId, powerup.cost, currentPlayer);
            
            shopItems.appendChild(itemElement);
        }
    });
    
    // Добавляем обновление доступности навыков при открытии магазина
    updateShopButtonsAvailability(currentPlayer);
}

// Создание элемента товара в магазине
function createShopItem(powerupId, powerup, player) {
    const itemElement = document.createElement('div');
    itemElement.className = 'shop-item';
    itemElement.dataset.rarity = powerup.rarity;
    
    const cost = calculatePowerupCost(powerup);
    
    itemElement.innerHTML = `
        <div class="shop-item-header">
            <span class="material-icons-round">${powerup.icon}</span>
            <h3>${powerup.name}</h3>
        </div>
        <p class="shop-item-description">${powerup.description}</p>
        <div class="shop-item-footer">
            <div class="shop-item-cost">
                <span class="material-icons-round">monetization_on</span>
                <span>${cost}</span>
            </div>
            <button class="shop-buy-button" ${window.rpg.playerState[player].coins < cost ? 'disabled' : ''}>
                Купить
            </button>
        </div>
    `;
    
    // Добавляем обработчик покупки
    const buyButton = itemElement.querySelector('.shop-buy-button');
    buyButton.onclick = () => purchasePowerup(powerupId, cost, player);
    
    return itemElement;
}

// Расчет стоимости powerup
function calculatePowerupCost(powerup) {
    switch (powerup.rarity) {
        case 'legendary':
            return 8;
        case 'rare':
            return 5;
        case 'basic':
        default:
            return 3;
    }
}

// Функция для обновления стилей кнопок в зависимости от количества монет
function updateShopButtonsAvailability(player) {
    const currentCoins = window.rpg.playerState[player].coins;
    const shopItems = document.querySelectorAll('.shop-item');
    
    shopItems.forEach(item => {
        const costElement = item.querySelector('.shop-item-cost span:last-child');
        const cost = parseInt(costElement.textContent);
        const buyButton = item.querySelector('.shop-buy-button');
        
        if (currentCoins < cost) {
            item.classList.add('not-enough-coins');
            buyButton.disabled = true;
        } else {
            item.classList.remove('not-enough-coins');
            buyButton.disabled = false;
        }
    });
}

// Покупка powerup
function purchasePowerup(powerupId, cost, player) {
    if (window.rpg.playerState[player].coins < cost) {
        showNotification('Недостаточно золота!', 'error');
        return;
    }
    
    // Списываем золото
    window.rpg.playerState[player].coins -= cost;
    
    // Активируем powerup
    switch (powerupId) {
        case 'destroyPiece':
            window.rpg.playerState[player].hasDestroyPowerup = true;
            break;
        case 'trap':
            window.rpg.playerState[player].hasTrapPowerup = true;
            break;
        case 'stun':
            window.rpg.playerState[player].hasStunPowerup = true;
            break;
        case 'stepBack':
            window.rpg.playerState[player].hasStepBackPowerup = true;
            break;
    }
    
    // Добавляем в список доступных
    if (!window.rpg.playerState[player].availablePowerups.includes(powerupId)) {
        window.rpg.playerState[player].availablePowerups.push(powerupId);
    }
    
    // Обновляем UI
    window.rpg.updateUI();
    
    // Показываем уведомление
    showNotification(`Вы приобрели навык ${window.rpg.powerups[powerupId].name}!`, 'success');
    
    // Воспроизводим звук покупки
    soundManager.play('coin');
    
    // Обновляем отображение магазина
    const shopItems = document.querySelector('.shop-items');
    const itemElement = document.querySelector(`[data-powerup-id="${powerupId}"]`);
    if (itemElement) {
        shopItems.removeChild(itemElement);
    }
    
    // Обновляем доступность оставшихся навыков
    updateShopButtonsAvailability(player);
    
    // Если все powerups куплены, закрываем магазин
    if (shopItems.children.length === 0) {
        closeShop();
    }
}

// Закрытие магазина
function closeShop() {
    if (!shopState.isOpen) return;
    
    shopState.isOpen = false;
    if (shopState.timer) {
        clearInterval(shopState.timer);
        shopState.timer = null;
    }
    
    const modal = document.getElementById('shop-modal');
    if (modal) {
        modal.classList.remove('visible');
    }
}

// Попытка открыть магазин
function tryOpenShop() {
    openShop();
}

// Обработчик смены раунда
function onRoundChange(roundNumber) {
    shopState.currentRound = roundNumber;
}

// Инициализация магазина
function initShop() {
    createShopButton();
    createShopModal();
}

// Добавляем обновление доступности при изменении количества монет
window.rpg.onCoinsChange = function(player) {
    if (document.querySelector('.shop-items')) {
        updateShopButtonsAvailability(player);
    }
};

// Экспортируем необходимые функции
window.shop = {
    init: initShop,
    onRoundChange: onRoundChange,
    tryOpenShop: tryOpenShop,
    closeShop: closeShop
}; 