import fs from "fs";
import path from "path";
import { translateSGMLFile, translateMarkdownFile } from "./translate/translate.js";
import { closeDB } from "./db/connect.js";

const inputPath = process.argv[2];

if (!inputPath) {
    console.error("❌ Please specify a file to translate.");
    process.exit(1);
}

if (!fs.existsSync(inputPath) || !fs.lstatSync(inputPath).isFile()) {
    console.error("❌ The specified file does not exist or is not a valid file.");
    process.exit(1);
}

const ext = path.extname(inputPath).toLowerCase();

if (ext !== ".sgml" && ext !== ".md") {
    console.error("❌ Only .sgml and .md files are supported.");
    process.exit(1);
}

console.log(`📄 Translating SGML file: ${inputPath}`);

async function main() {
    try {
        if (ext === ".sgml") {
            await translateSGMLFile(inputPath, "real");
        } else if (ext === ".md") {
            await translateMarkdownFile(inputPath, "real");
        }
        console.log("✅ Translation completed successfully.");
    } catch (error) {
        console.error("❌ Error during translation:", error);
    } finally {
        await closeDB();
        console.log("🔌 DB connection closed.");
        process.exit(0);
    }
}

main();