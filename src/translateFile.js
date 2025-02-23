import fs from "fs";
import path from "path";
import { translateSGMLFile } from "./translate/translate.js"; 

const inputPath = process.argv[2];

if (!inputPath) {
    console.error("❌ Please specify a file to translate.");
    process.exit(1);
}

if (!fs.existsSync(inputPath) || !fs.lstatSync(inputPath).isFile()) {
    console.error("❌ The specified file does not exist or is not a valid file.");
    process.exit(1);
}

if (path.extname(inputPath).toLowerCase() !== ".sgml") {
    console.error("❌ Only .sgml files are supported.");
    process.exit(1);
}

console.log(`📄 Translating SGML file: ${inputPath}`);
translateSGMLFile(inputPath, "real");