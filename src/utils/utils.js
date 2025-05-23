import logger from "@utils/logger.js";
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
        ".mdx": "prompts/markdown.txt",
        ".adoc": "prompts/asciidoc.txt",
        ".asciidoc": "prompts/asciidoc.txt",
    };

    const fileExt = path.extname(filePath).toLowerCase();
    const promptFile = extToPrompt[fileExt] || "prompts/default.txt";

    logger.info(`📄 Detected file type: ${fileExt || "unknown"}, using prompt: ${promptFile}`);

    try {
        return fs.readFileSync(promptFile, "utf-8");
    } catch (error) {
        logger.error(`❌ Failed to load the prompt file: ${promptFile}`);
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
        logger.error("❌ The specified file does not exist.");
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
    logger.info(`✅ Translation completed: ${outputFilePath}`);
}


export function removeFinalCodeBlock(text) {
    const lines = text.split("\n"); 

    const hasOpeningCodeBlock = lines[0].trim().startsWith("```");
    const hasClosingCodeBlock = lines[lines.length - 1].trim().startsWith("```");

    if (hasOpeningCodeBlock && hasClosingCodeBlock) {
        return lines.slice(1, -1).join("\n").trim(); // 첫 줄과 마지막 줄 제거 후 반환
    }    
    return text; 
}

/**
 * Determines the type of a given line based on its content and context.
 *
 * @param {string} trimmedLine - The line of text to be evaluated, trimmed of leading and trailing whitespace.
 * @param {boolean} inExampleBlock - A flag indicating whether the current line is within an example block.
 * @returns {Object} An object representing the type of the line and the updated example block status.
 * @returns {string} return.type - The type of the line, which can be "example", "title", "tag", or "contents".
 * @returns {boolean} [return.inExampleBlock] - The updated status of the example block, only present if the type is "example".
 */
function getTagType(trimmedLine, inExampleBlock) {
    if (trimmedLine.startsWith("<programlisting>")) {
        return { type: "example", inExampleBlock: true };
    } else if (trimmedLine.startsWith("</programlisting>")) {
        return { type: "example", inExampleBlock: false };
    } else if (trimmedLine.startsWith("<title>") || trimmedLine.startsWith("<primary>")) {
        return { type: "title" };
    } else if (trimmedLine.startsWith("<") && trimmedLine.endsWith(">")) {
        return { type: "tag" };
    } else {
        return { type: "contents" };
    }
}

/**
 * Parses the lines of an SGML file and returns an array of parsed line objects.
 *
 * @param {string} filePath - The path to the SGML file to be parsed.
 * @returns {Array<Object>} An array of objects representing the parsed lines.
 * @returns {number} return[].seq - The sequence number of the line.
 * @returns {string} return[].type - The type of the line based on SGML tags.
 * @returns {string} return[].data - The original line content.
 * @returns {string} return[].indent - The leading spaces of the line.
 */
export function parseSGMLLines(filePath) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.split("\n");

    let inExampleBlock = false;

    let parsedLines = lines.map((line, index) => {
        let trimmedLine = line.trim();
        let leadingSpaces = line.match(/^(\s*)/)[0];

        const { type, inExampleBlock: newInExampleBlock } = getTagType(trimmedLine, inExampleBlock);
        inExampleBlock = newInExampleBlock;

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
        .filter(entry => entry.type === "contents" || entry.type === "title")
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
        if (entry.type === "contents" || entry.type === "title") {
            const seqStr = String(entry.seq + 1).padStart(4, '0');  // Adjusted seq value by adding +1 to ensure consistency
            const translatedText = translatedMap.has(seqStr) ? translatedMap.get(seqStr) : entry.data;
            // logger.info(`🔍 Mapping seq=${seqStr}: Original="${entry.data}" → Translated="${translatedText}"`);
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
    logger.info("🚀 Rebuilding SGML with translated data...");
    const reconstructedSGML = parsedLines.map(entry => entry.data).join("\n");

    fs.writeFileSync(outputPath, reconstructedSGML, "utf-8");
    logger.info(`✅ Translated SGML is saved : ${outputPath}`);
}

/**
 * Splits an array into chunks of a specified size.
 *
 * @param {Array} array - The array to be split into chunks.
 * @param {number} chunkSize - The size of each chunk.
 * @returns {Array[]} An array containing the chunks.
 */
export function chunkArray(array, chunkSize) {
    let results = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        results.push(array.slice(i, i + chunkSize));
    }
    return results;
}


export function chunkMarkdown(markdown, chunkSize) {
    const lines = markdown.split("\n");
    let result = [];

    for (let i = 0; i < lines.length; i += chunkSize) {
        result.push(lines.slice(i, i + chunkSize).join("\n"));
    }

    return result;
}

/**
 * Preprocesses markdown headers by adding unique IDs to them if they don't already have one.
 *
 * This function takes markdown content as input, splits it into lines, and processes each line to
 * identify markdown headers (lines starting with 1 to 6 hash symbols followed by a space and some text).
 * If a header does not already contain an ID (in the format `{#id}`), it generates a unique ID based on
 * the header text and appends it to the header.
 *
 * @param {string} markdownContent - The markdown content to preprocess.
 * @returns {string} - The preprocessed markdown content with IDs added to headers.
 */
export function preprocessMarkdownHeaders(markdownContent) {
    return markdownContent
        .split("\n")
        .map(line => {
            const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
            if (headingMatch) {
                const level = headingMatch[1];
                const title = headingMatch[2].trim();
                if (title.includes("{#")) return line;

                const id = title
                    .replace(/[^\w\s-]/g, "")
                    .trim()
                    .replace(/\s+/g, "-")
                    .toLowerCase();

                return `${level} ${title} {#${id}}`;
            }
            return line;
        })
        .join("\n");
}
