class SoundManager {
    constructor() {
        this.sounds = new Map();
        this.isMuted = false;
        this.backgroundMusic = null;
        this.bgMusicVolume = 0.15; // Уменьшаем громкость фоновой музыки до 15%
        console.log('SoundManager создан');
    }

    // Загрузка звука
    loadSound(name, path) {
        try {
            const audio = new Audio(path);
            audio.addEventListener('canplaythrough', () => {
                console.log(`Звук ${name} загружен`);
            });
            audio.addEventListener('error', (e) => {
                console.error(`Ошибка загрузки звука ${name}:`, e);
            });
            this.sounds.set(name, audio);
        } catch (error) {
            console.error(`Ошибка при создании звука ${name}:`, error);
        }
    }

    // Воспроизведение звука
    play(name, volume = 1.0) {
        if (this.isMuted) {
            console.log(`Звук ${name} заглушен`);
            return;
        }
        
        const sound = this.sounds.get(name);
        if (sound) {
            try {
                sound.volume = volume;
                sound.currentTime = 0;
                const playPromise = sound.play();
                if (playPromise) {
                    playPromise
                        .then(() => console.log(`Звук ${name} воспроизводится`))
                        .catch(error => console.error(`Ошибка воспроизведения звука ${name}:`, error));
                }
            } catch (error) {
                console.error(`Ошибка при воспроизведении звука ${name}:`, error);
            }
        } else {
            console.warn(`Звук ${name} не найден`);
        }
    }

    // Включение/выключение звука
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.backgroundMusic) {
            this.backgroundMusic.muted = this.isMuted;
        }
        return this.isMuted;
    }

    // Установка громкости для конкретного звука
    setVolume(name, volume) {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.volume = Math.max(0, Math.min(1, volume));
        }
    }

    // Запуск фоновой музыки
    playBackgroundMusic() {
        try {
            if (!this.backgroundMusic) {
                this.backgroundMusic = new Audio('sounds/background.mp3');
                this.backgroundMusic.loop = true;
                this.backgroundMusic.volume = this.bgMusicVolume;
                
                this.backgroundMusic.addEventListener('canplaythrough', () => {
                    console.log('Фоновая музыка загружена');
                });
                
                this.backgroundMusic.addEventListener('error', (e) => {
                    console.error('Ошибка загрузки фоновой музыки:', e);
                });
            }
            
            this.backgroundMusic.muted = this.isMuted;
            const playPromise = this.backgroundMusic.play();
            if (playPromise) {
                playPromise
                    .then(() => console.log('Фоновая музыка воспроизводится'))
                    .catch(error => console.error('Ошибка воспроизведения фоновой музыки:', error));
            }
        } catch (error) {
            console.error('Ошибка при инициализации фоновой музыки:', error);
        }
    }

    // Остановка фоновой музыки
    stopBackgroundMusic() {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
        }
    }

    // Установка громкости фоновой музыки
    setBackgroundMusicVolume(volume) {
        this.bgMusicVolume = Math.max(0, Math.min(1, volume));
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = this.bgMusicVolume;
        }
    }

    // Предзагрузка всех игровых звуков
    preloadGameSounds() {
        console.log('Начало загрузки звуков');
        
        const soundFiles = {
            // Основные звуки
            'move': 'sounds/move.mp3',
            'capture': 'sounds/capture.mp3',
            'powerup': 'sounds/powerup.mp3',
            'coin': 'sounds/coin.mp3',
            'trap': 'sounds/trap.mp3',
            'piece_select': 'sounds/piece_select.mp3',
            'powerup_click': 'sounds/powerup_click.mp3',
            'can_capture': 'sounds/can_capture.mp3',
            
            // Новые звуки
            'king_move': 'sounds/king_move.mp3',      // Движение дамки
            'game_start': 'sounds/game_start.mp3',    // Начало игры
            'game_win': 'sounds/game_win.mp3',        // Победа
            'game_lose': 'sounds/game_lose.mp3',      // Поражение
            'timer_low': 'sounds/timer_low.mp3',      // Мало времени
            'timer_end': 'sounds/timer_end.mp3',      // Время вышло
            'invalid_move': 'sounds/invalid_move.mp3', // Неверный ход
            'highlight': 'sounds/highlight.mp3',       // Подсветка возможных ходов
            'turn_start': 'sounds/turn_start.mp3',     // Начало хода
            'pause': 'sounds/pause.mp3',              // Пауза игры
            'resume': 'sounds/resume.mp3',            // Возобновление игры
            'attack': 'sounds/attack.mp3',            // Звук атаки пешки
            'piece_hover': 'sounds/highlight.mp3',     // Звук левитации пешки
            'stun': 'sounds/stun.mp3',                // Звук оглушения
            
            // Звуки для уникальных способностей
            'healing': 'sounds/healing.mp3',           // Регенерация
            'rage': 'sounds/rage.mp3',                // Ярость
            'deathStrike': 'sounds/deathStrike.mp3',   // Смертельный удар
            'shield': 'sounds/shield.mp3',             // Неуязвимость
            'bloodThirst': 'sounds/bloodThirst.mp3'    // Жажда крови
        };

        // Загружаем все звуки
        Object.entries(soundFiles).forEach(([name, path]) => {
            console.log(`Загрузка звука: ${name} из ${path}`);
            this.loadSound(name, path);
        });

        // Устанавливаем громкость для каждого звука
        const volumes = {
            'move': 0.8,
            'capture': 0.8,
            'powerup': 0.8,
            'coin': 0.8,
            'trap': 0.8,
            'piece_select': 0.8,
            'powerup_click': 0.8,
            'can_capture': 0.8,
            
            // Громкость для новых звуков
            'king_move': 0.8,
            'game_start': 0.9,
            'game_win': 1.0,
            'game_lose': 1.0,
            'timer_low': 0.7,
            'timer_end': 0.8,
            'invalid_move': 0.6,
            'highlight': 0.4,
            'turn_start': 0.7,
            'pause': 0.7,
            'resume': 0.7,
            'attack': 0.9,
            'piece_hover': 0.2,
            'stun': 0.8,                              // Громкость звука оглушения
            
            // Громкость для звуков способностей
            'healing': 0.8,
            'rage': 0.9,
            'deathStrike': 1.0,
            'shield': 0.8,
            'bloodThirst': 0.8
        };

        Object.entries(volumes).forEach(([name, volume]) => {
            this.setVolume(name, volume);
        });
        
        // Запускаем фоновую музыку
        console.log('Запуск фоновой музыки');
        this.playBackgroundMusic();
    }
}

// Создаем глобальный экземпляр менеджера звуков
const soundManager = new SoundManager(); 