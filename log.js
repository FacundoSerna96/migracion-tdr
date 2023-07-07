const fs = require('fs');
const path = require('path');

//arma el nombre del log con la fecha actual
const getLogFileName = () => {
    const currentDate = new Date().toISOString().slice(0, 10); // Formato YYYY-MM-DD
    return `logs_${currentDate}.txt`;
}

// Función para escribir en el archivo de log
const writeToLog = (message) => {
    const logFileName = getLogFileName();
    const logFilePath = path.join(__dirname, logFileName);
    //const logEntry = `[${new Date().toISOString()}] ${message}\n`;
    const logEntry = `${message}\n`;
    fs.appendFile(logFilePath, logEntry, err => {
        if (err) {
        console.error('Error al escribir en el archivo de log: ', err);
        }
    });
}


module.exports = writeToLog;