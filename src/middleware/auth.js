const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // Получаем токен из заголовка
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ message: 'Отсутствует токен авторизации' });
        }

        // Проверяем формат токена
        const token = authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : authHeader;

        if (!token) {
            return res.status(401).json({ message: 'Неверный формат токена' });
        }

        try {
            // Верифицируем токен
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (err) {
            console.error('Ошибка верификации токена:', err);
            return res.status(401).json({ message: 'Недействительный токен' });
        }
    } catch (err) {
        console.error('Ошибка в middleware аутентификации:', err);
        res.status(500).json({ message: 'Ошибка сервера при аутентификации' });
    }
}; 