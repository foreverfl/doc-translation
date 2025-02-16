import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

export function loadPromptByFileType(filePath) {
    const extToPrompt = {
        ".sgml": "prompts/sgml.txt",
        ".md": "prompts/markdown.txt",
        ".markdown": "prompts/markdown.txt",
        ".adoc": "prompts/asciidoc.txt",
        ".asciidoc": "prompts/asciidoc.txt",
        ".mdx": "prompts/markdown-docusaurus.txt",
    };

    const fileExt = path.extname(filePath).toLowerCase();
    const promptFile = extToPrompt[fileExt] || "prompts/default.txt";

    console.log(`📄 Detected file type: ${fileExt || "unknown"}, using prompt: ${promptFile}`);

    try {
        return fs.readFileSync(promptFile, "utf-8");
    } catch (error) {
        console.error(`❌ Failed to load the prompt file: ${promptFile}`);
        process.exit(1);
    }
}

export function readFile(inputFilePath) {
    if (!fs.existsSync(inputFilePath)) {
        console.error("❌ The specified file does not exist.");
        process.exit(1);
    }
    return fs.readFileSync(inputFilePath, "utf-8");
}

export function saveFile(outputFilePath, content) {
    fs.writeFileSync(outputFilePath, content, "utf-8");
    console.log(`✅ Translation completed: ${outputFilePath}`);
}
