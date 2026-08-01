// src/utils/logger.js
import fs from "fs";
import path from "path";
import zlib from "zlib";

const logDir = path.resolve("logs"); // top-level logs folder (project root /logs)
const RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS || 30); // default: keep 30 days

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

/**
 * Compress yesterday’s log (for any prefix)
 */
const compressOldLogs = () => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const dateStr = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD

  const files = fs.readdirSync(logDir).filter(f => f.endsWith(`-${dateStr}.log`));

  files.forEach(f => {
    const logFile = path.join(logDir, f);
    const zipFile = logFile.replace(".log", ".gz");

    if (!fs.existsSync(zipFile)) {
      const input = fs.createReadStream(logFile);
      const gzip = zlib.createGzip();
      const out = fs.createWriteStream(zipFile);
      input.pipe(gzip).pipe(out).on("finish", () => {
        fs.unlinkSync(logFile);
        console.log(`🗜️ Compressed ${f} → ${path.basename(zipFile)}`);
      });
    }
  });
};

/**
 * Delete old .gz logs after N days
 */
const cleanupOldZips = () => {
  const now = Date.now();
  const files = fs.readdirSync(logDir).filter(f => f.endsWith(".gz"));

  files.forEach(f => {
    const match = f.match(/(\d{4}-\d{2}-\d{2})/);
    if (!match) return;
    const fileDate = new Date(match[1]).getTime();
    const ageDays = (now - fileDate) / (1000 * 60 * 60 * 24);

    if (ageDays > RETENTION_DAYS) {
      fs.unlinkSync(path.join(logDir, f));
      console.log(`🗑️ Deleted old log: ${f}`);
    }
  });
};

// Run on startup + daily rotation
compressOldLogs();
cleanupOldZips();
setInterval(() => {
  compressOldLogs();
  cleanupOldZips();
}, 24 * 60 * 60 * 1000); // every 24h

/**
 * Write to a daily log file with a dynamic prefix.
 * Example:
 *    logToFile("Something happened", "trans")
 * → writes to /logs/trans-YYYY-MM-DD.log
 */
// export const logToFile = (message, prefix = "general") => {
//   try {
//     const date = new Date().toISOString().split("T")[0];
//     const logFile = path.join(logDir, `${prefix}-${date}.log`);
//     const timestamp = new Date().toISOString();
//     const line = `[${timestamp}] ${message}\n`;

//     fs.appendFile(logFile, line, (err) => {
//       if (err) console.error("❌ Error writing log:", err);
//     });
//   } catch (err) {
//     console.error("Logger failed:", err);
//   }
// };

export const logToFile = (message, prefix = "general") => {
  try {
    const now = new Date();

    const istDate = now.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata"
    }); // YYYY-MM-DD

    const istTime = now.toLocaleString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour12: false
    });

    const logFile = path.join(logDir, `${prefix}-${istDate}.log`);
    const line = `[${istTime} IST] ${message}\n`;

    fs.appendFile(logFile, line, (err) => {
      if (err) console.error("❌ Error writing log:", err);
    });
  } catch (err) {
    console.error("Logger failed:", err);
  }
};
