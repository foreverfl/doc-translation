import fs from "fs";
import path from "path";
import { closeDB } from "./db/connect.js";
import { translateMarkdownFile, translateSGMLFile } from "./translate/translate.js";
import { logger } from "./utils/logger.js";

const inputPath = process.argv[2];

if (!inputPath) {
    logger.error("❌ Please specify a file to translate.");
    process.exit(1);
}

if (!fs.existsSync(inputPath) || !fs.lstatSync(inputPath).isFile()) {
    logger.error("❌ The specified file does not exist or is not a valid file.");
    process.exit(1);
}

const ext = path.extname(inputPath).toLowerCase();

if (ext !== ".sgml" && ext !== ".md") {
    logger.error("❌ Only .sgml and .md files are supported.");
    process.exit(1);
}

logger.info(`📄 Translating SGML file: ${inputPath}`);

async function main() {
    try {
        if (ext === ".sgml") {
            await translateSGMLFile(inputPath, "real");
        } else if (ext === ".md") {
            await translateMarkdownFile(inputPath, "real");
        }
        logger.info("✅ Translation completed successfully.");
    } catch (error) {
        logger.error("❌ Error during translation:", error);
    } finally {
        await closeDB();
        logger.info("🔌 DB connection closed.");
        process.exit(0);
    }
}

main();