import { closeDB } from "@db/connect.js";
import { translateFolder } from "@translate/translate.js";
import logger from "@utils/logger.js";

const folderPath = process.argv[2];

if (!folderPath) {
    logger.error("❌ Please provide a folder path. Usage: npm run translate-folder <folder_path> [--finetuned]");
    process.exit(1);
}

async function runTranslation() {
    try {
        await translateFolder(folderPath, "real");
        logger.info("✅ Translation process finished!");    
    } catch (error) {
        logger.error("❌ Error:", error);
    } finally {
        await closeDB();
        logger.info("✅ PostgreSQL connection closed.");
        process.exit(0);
    }
}

runTranslation();
