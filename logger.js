const winston = require('winston');

const logger = winston.createLogger({
    level: 'error',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({ filename: `log_${new Date().toLocaleString()}.log` }),
        new winston.transports.Console({ format: winston.format.simple() })
    ],
    })

module.exports = {
    logger
}