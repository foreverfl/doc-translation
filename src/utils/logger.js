import fs from "fs-extra";
import path from "path";
import winston from "winston";

const LOG_DIR = "logs";
fs.ensureDirSync(LOG_DIR);

const logger = winston.createLogger({
  level: "info", 
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(), 
    new winston.transports.File({ filename: path.join(LOG_DIR, "app.log") })
  ],
});

export default logger;
