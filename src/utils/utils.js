import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

/**
 * Loads a prompt template based on the file extension.
 *
 * @param {string} filePath - The path of the file being translated.
 * @returns {string} - The content of the corresponding prompt template.
 */
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

/**
 * Reads the content of a file at the specified path.
 *
 * @param {string} inputFilePath - The path to the file to be read.
 * @returns {string} The content of the file as a UTF-8 encoded string.
 * @throws Will terminate the process if the file does not exist.
 */
export function readFile(inputFilePath) {
    if (!fs.existsSync(inputFilePath)) {
        console.error("❌ The specified file does not exist.");
        process.exit(1);
    }
    return fs.readFileSync(inputFilePath, "utf-8");
}

/**
 * Saves the provided content to a file at the specified output file path.
 *
 * @param {string} outputFilePath - The path where the file will be saved.
 * @param {string} content - The content to be written to the file.
 */
export function saveFile(outputFilePath, content) {
    fs.writeFileSync(outputFilePath, content, "utf-8");
    console.log(`✅ Translation completed: ${outputFilePath}`);
}

/**
 * Removes code blocks from the given text.
 *
 * This function searches for code blocks enclosed in triple backticks (```) and removes them,
 * returning the text without the code blocks.
 *
 * @param {string} text - The input text containing code blocks.
 * @returns {string} - The text with code blocks removed.
 */
export function removeCodeBlocks(text) {
    return text.replace(/```(?:[\w]*)?(?:\n|\r\n|)([\s\S]*?)(?:\n|\r\n)?```/g, "$1").trim();
}

export function parseSGMLLines(filePath) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.split("\n");

    let inExampleBlock = false; 

    let parsedLines = lines.map((line, index) => {
        let trimmedLine = line.trim();
        let leadingSpaces = line.match(/^(\s*)/)[0];

        let type;
        if (trimmedLine.startsWith("<programlisting>")) {
            inExampleBlock = true;
            type = "tag";
        } else if (trimmedLine.startsWith("</programlisting>")) {
            inExampleBlock = false;
            type = "tag";
        } else if (inExampleBlock) {
            type = "example";
        } else if (trimmedLine.startsWith("<") && trimmedLine.endsWith(">")) {
            type = "tag";
        } else {
            type = "contents";
        }

        return { seq: index, type, data: line, indent: leadingSpaces };
    });

    return parsedLines;
}

/**
 * Extracts content for translation from parsed lines.
 *
 * @param {Array} parsedLines - The array of parsed line objects.
 * @param {string} parsedLines[].type - The type of the entry.
 * @param {number} parsedLines[].seq - The sequence number of the entry.
 * @param {string} parsedLines[].data - The data content of the entry.
 * @returns {Array} An array of objects containing the sequence number and trimmed text.
 */
export function extractContentForTranslation(parsedLines) {
    return parsedLines
        .filter(entry => entry.type === "contents") 
        .map(entry => ({
            seq: String(entry.seq + 1).padStart(4, '0'), 
            text: entry.data.trim()
        }));
}

/**
 * Applies translations to the given lines of text.
 *
 * @param {Array} beforeLines - The original lines of text before translation. Each entry is an object with properties:
 *   - {string} type - The type of the entry, e.g., "contents".
 *   - {number} seq - The sequence number of the entry.
 *   - {string} data - The original text data of the entry.
 *   - {string} indent - The indentation of the entry.
 * @param {Array} translatedLines - The translated lines of text. Each entry is an object with properties:
 *   - {number} seq - The sequence number of the translated entry.
 *   - {string} text - The translated text.
 * @returns {Array} The lines of text with translations applied. Each entry is an object with properties:
 *   - {string} type - The type of the entry, e.g., "contents".
 *   - {number} seq - The sequence number of the entry.
 *   - {string} data - The translated text data of the entry, including its original indentation.
 *   - {string} indent - The indentation of the entry.
 */
export function applyTranslations(beforeLines, translatedLines) {
    const translatedMap = new Map();
    
    translatedLines.forEach(({ seq, text }) => {
        translatedMap.set(String(Number(seq)).padStart(4, '0'), text); 
    });

    return beforeLines.map(entry => {
        if (entry.type === "contents") {
            const seqStr = String(entry.seq + 1).padStart(4, '0');  // Adjusted seq value by adding +1 to ensure consistency
            const translatedText = translatedMap.has(seqStr) ? translatedMap.get(seqStr) : entry.data;
            console.log(`🔍 Mapping seq=${seqStr}: Original="${entry.data}" → Translated="${translatedText}"`);

            return { ...entry, data: `${entry.indent}${translatedText}` };
        }
        return entry; 
    });
}

/**
 * Rebuilds SGML content from parsed lines and writes it to the specified output path.
 *
 * @param {Array<Object>} parsedLines - An array of parsed line objects containing SGML data.
 * @param {number} parsedLines[].seq - The sequence number of the parsed line.
 * @param {string} parsedLines[].type - The type of the parsed line (e.g., "contents").
 * @param {string} parsedLines[].data - The SGML data of the parsed line.

 * @param {string} outputPath - The file path where the reconstructed SGML will be saved.
 *
 * @returns {void}
 */
export function rebuildSGML(parsedLines, outputPath) {
    console.log("🚀 Rebuilding SGML with translated data...");
    const reconstructedSGML = parsedLines.map(entry => entry.data).join("\n");

    fs.writeFileSync(outputPath, reconstructedSGML, "utf-8");
    console.log(`✅ Translated SGML is saved : ${outputPath}`);
}