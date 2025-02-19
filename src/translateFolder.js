import { translateFolder } from "./translate/translate.js";

const folderPath = process.argv[2]; 
const withFineTuned = process.argv.includes("--finetuned"); 

if (!folderPath) {
    console.error("❌ Please provide a folder path. Usage: npm run translate-folder <folder_path> [--finetuned]");
    process.exit(1);
}

translateFolder(folderPath, withFineTuned)
    .then(() => console.log("✅ Translation process finished!"))
    .catch((error) => console.error("❌ Error:", error));