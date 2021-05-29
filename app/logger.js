const winston = require('winston');
const fs = require('fs');

fs.mkdir('./logs', (err) => { /* no-op */ })

const logger = winston.createLogger({
    level: 'error',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'app.log' }),
    ],
})

module.exports.logger = logger