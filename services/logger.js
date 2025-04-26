// services/logger.js

const chalk = require("chalk");
const fs = require("fs");
const path = require("path");

// Opcional: ruta para guardar logs en un archivo en el futuro
const logFilePath = path.join(__dirname, "../logs/app.log");

// Función para guardar log en archivo (si algún día lo quieres activar)
function saveToFile(level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  // fs.appendFileSync(logFilePath, logMessage); // puedes descomentar esto si quieres guardar logs
}

// INFO
function logInfo(message) {
  const text = `[INFO] ${message}`;
  console.log(chalk.cyan(text));
  saveToFile("INFO", message);
}

// SUCCESS
function logSuccess(message) {
  const text = `[SUCCESS] ${message}`;
  console.log(chalk.green(text));
  saveToFile("SUCCESS", message);
}

// WARNING
function logWarning(message) {
  const text = `[WARNING] ${message}`;
  console.warn(chalk.yellow(text));
  saveToFile("WARNING", message);
}

// ERROR
function logError(message) {
  const text = `[ERROR] ${message}`;
  console.error(chalk.red(text));
  saveToFile("ERROR", message);
}

module.exports = {
  logInfo,
  logSuccess,
  logWarning,
  logError,
};
