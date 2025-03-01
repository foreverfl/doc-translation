import { translateFolder } from "./translate/translate.js";
import { closeDB } from "./db/connect.js";

const folderPath = process.argv[2];

if (!folderPath) {
    console.error("❌ Please provide a folder path. Usage: npm run translate-folder <folder_path> [--finetuned]");
    process.exit(1);
}

async function runTranslation() {
    try {
        await translateFolder(folderPath, "real");
        console.log("✅ Translation process finished!");
    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await closeDB();
        console.log("✅ PostgreSQL connection closed.");
        process.exit(0); 
    }
}

runTranslation();
