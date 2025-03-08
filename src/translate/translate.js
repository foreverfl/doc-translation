import { checkExistingWords } from "@db/checkExistingWords.js";
import { createTable } from "@db/createTable.js";
import { inputWordsWithTraining } from "@db/inputWords.js";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { countTokens } from "@predictCost.js";
import { extractFrequentNouns, filterContent, translateWords } from "@translate/translateTerms.js";
import logger from "@utils/logger.js";
import { applyTranslations, extractContentForTranslation, loadPromptByFileType, parseSGMLLines, readFile, rebuildSGML, removeCodeBlocks } from "@utils/utils.js";
import dotenv from "dotenv";
import fs from "fs";
import ora from "ora";
import path from "path";

dotenv.config();

const openai = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxCompletionTokens: 16_384
});

async function insertWordstoDatabase(inputFilePath, tableName = "translation_terms") {
    // 1. Make a table if it doesn't exist
    await createTable(tableName);

    // 2. Read the file
    let content = readFile(inputFilePath);

    // 3. Exclude code blocks and html tags
    content = filterContent(content);

    // 4. Extract frequently used words
    let extractedWords = extractFrequentNouns(content);

    if (extractedWords.length === 0) {
        logger.info("⚠️ No words to extract. Continuing to the next step.");
        return true;
    }

    // 5. Check if the word is already in the database
    extractedWords = await checkExistingWords(extractedWords);

    // 6. Insert the words to the database
    let translatedWords;
    try {
        translatedWords = await translateWords({ english: extractedWords });
    } catch (error) {
        logger.error("🚨 Error during translation:", error);
        return;
    }

    if (!translatedWords || !translatedWords.english || !translatedWords.korean || !translatedWords.japanese) {
        logger.error("❌ Translation failed: Invalid response format.");
        return;
    }

    // 7. Insert the words to the database
    await inputWordsWithTraining(translatedWords, tableName);

    logger.info("✅ Words inserted to the database.");

    return true;
}

/**
 * Removes Markdown syntax, HTML tags, and special characters from text
 * before analyzing the proportion of haracters.
 *
 * @param {string} text - The text content to clean.
 * @returns {string} - Cleaned text.
 */
function filterContentForAnalysis(text) {
    return text
        .replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments
        .replace(/```[\s\S]*?```/g, "") // Remove code blocks
        .replace(/`([^`]+)`/g, "$1") // Remove inline code formatting
        .replace(/!\[[^\]]*\]\([^\)]+\)/g, "") // Remove image links
        .replace(/\[[^\]]*\]\([^\)]+\)/g, "") // Remove regular links
        .replace(/[#>*_\-`]/g, "") // Remove Markdown symbols
        .replace(/\|/g, "") // Remove table delimiters
        .replace(/\n{2,}/g, "\n"); // Reduce multiple newlines to a single newline
}

/**
 * Checks if a given text has a high proportion of Korean or Japanese characters.
 *
 * @param {string} text - The text content to analyze.
 * @param {number} threshold - The percentage of characters required to skip translation.
 * @returns {boolean} - Returns true if the Korean or Japanese proportion is higher than the threshold.
 */
function shouldSkipTranslation(text, threshold = 10) {
    const cleanText = filterContentForAnalysis(text);

    const totalChars = cleanText.length;

    if (totalChars === 0) {
        logger.info("⚠️ Empty text, skipping translation.");
        return true;
    }

    const koreanChars = (cleanText.match(/[가-힣]/g) || []).length;
    const japaneseChars = (cleanText.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu) || []).length;

    const koreanPercentage = (koreanChars / totalChars) * 100;
    const japanesePercentage = (japaneseChars / totalChars) * 100;

    logger.info(`📊 Total Clean Characters: ${totalChars}`);
    logger.info(`🔹 Korean: ${koreanChars} chars (${koreanPercentage.toFixed(2)}%)`);
    logger.info(`🔹 Japanese: ${japaneseChars} chars (${japanesePercentage.toFixed(2)}%)`);
    logger.info(`⚖️ Threshold: ${threshold}%`);

    if (koreanPercentage >= threshold) {
        logger.info(`⚠️ Skipping translation: Korean content is too high (${koreanPercentage.toFixed(2)}%)`);
        return true;
    } else if (japanesePercentage >= threshold) {
        logger.info(`⚠️ Skipping translation: Japanese content is too high (${japanesePercentage.toFixed(2)}%)`);
        return true;
    }

    logger.info("✅ Proceeding with translation.");
    return false;
}

/**
 * Logs a formatted entry to the console.
 *
 * @param {Object} entry - The entry object to log.
 * @param {string} entry.type - The type of the entry. Can be "contents", "tag", "example", "title", or other.
 * @param {number} entry.seq - The sequence number of the entry.
 * @param {string} entry.indent - The indentation string for the entry.
 * @param {string} entry.data - The data content of the entry.
 */
function logEntry(entry) {
    let entryType;
    if (entry.type === "contents") {
        entryType = "C";
    } else if (entry.type === "tag") {
        entryType = "T";
    } else if (entry.type === "example") {
        entryType = "E";
    } else if (entry.type === "title") {
        entryType = "H";
    } else {
        entryType = "?";
    }

    logger.info(`${entry.seq.toString().padStart(4, '0')} (${entryType}): ${entry.indent}${entry.data}`);
}

function chunkArray(array, chunkSize) {
    let results = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        results.push(array.slice(i, i + chunkSize));
    }
    return results;
}

/**
 * Translates the content of an SGML file.
 *
 * @param {string} inputFilePath - The path to the input SGML file.
 * @param {string} [mode="test"] - The mode of operation, either "test" or "real".
 *                                - "test": Translated file will be saved in the "translated" directory.
 *                                - "real": Translated file will be saved in the same directory with "_translated" suffix.
 * @returns {Promise<void>} - A promise that resolves when the translation is complete.
 * @throws {Error} - Throws an error if an invalid mode is provided or if any other error occurs during the process.
 */
export async function translateSGMLFile(inputFilePath, mode = "test") {
    try {
        const insertSuccess = await insertWordstoDatabase(inputFilePath);
        if (!insertSuccess) {
            logger.error("❌ insertWordstoDatabase failed. Aborting translation.");
            return;
        }
        const parsedLines = parseSGMLLines(inputFilePath);
        // logger.info("=== before translation ===");
        // parsedLines.forEach(entry => logEntry(entry));

        const textsToTranslate = extractContentForTranslation(parsedLines);

        const combinedText = textsToTranslate.join(" ");
        if (shouldSkipTranslation(combinedText)) {
            logger.info(`⚠️ Skipping translation for ${inputFilePath}. Too much Korean or Japanese content.`);
            return;
        }

        // predict cost
        const tokens = await countTokens(textsToTranslate);
        logger.info(`🔹 Token count: ${tokens}`)
        const pricing = {
            "gpt-4o-mini": { input: 0.15, cached_input: 0.075, output: 0.60 }
        };
        const inputCost = (tokens / 1_000_000) * pricing["gpt-4o-mini"].input;
        const totalCost = inputCost * 2;  // input + output
        logger.info(`🔹 Input cost: $${totalCost.toFixed(5)}`);

        // Split the texts into chunks to avoid exceeding the token limit
        const CHUNK_SIZE = 500;
        const textChunks = chunkArray(textsToTranslate, CHUNK_SIZE);
        let translatedTexts = [];

        for (const chunk of textChunks) {
            logger.info(`🔄 Translating chunk of ${chunk.length} entries...`);
            const translatedChunk = await translateSGMLTextContent(chunk, inputFilePath);
            translatedTexts = translatedTexts.concat(translatedChunk);
        }
        logger.info(`✅ Translation completed! Total: ${translatedTexts.length} entries`);

        const translatedLines = applyTranslations(parsedLines, translatedTexts);
        // logger.info("=== after translation ===");
        // translatedLines.forEach(entry => logEntry(entry));

        let outputFilePath;
        if (mode === "test") {
            const outputDir = "translated";
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
            outputFilePath = path.join(outputDir, path.basename(inputFilePath));
        } else if (mode === "real") {
            const dirName = path.dirname(inputFilePath);
            const baseName = path.basename(inputFilePath, path.extname(inputFilePath));
            const ext = path.extname(inputFilePath);

            // Rename the original file to prevent overwriting
            const originalFilePath = path.join(dirName, `${baseName}_original${ext}`);
            fs.renameSync(inputFilePath, originalFilePath);

            // Substitute the original file with the translated content
            outputFilePath = path.join(dirName, `${baseName}${ext}`);
        } else {
            throw new Error("Invalid mode. Use 'test' or 'real'.");
        }

        rebuildSGML(translatedLines, outputFilePath);

    } catch (error) {
        logger.error("❌ Error occurred:", error);
    }
}

/**
 * Translates the given text content using OpenAI's translation service.
 *
 * @param {string} textContent - The text content to be translated.
 * @param {string} filePath - The file path to determine the prompt template.
 * @returns {Promise<Object>} - A promise that resolves to the translated text content as a JSON object.
 * @throws {Error} - Throws an error if the response from OpenAI is not valid JSON.
 */
export async function translateSGMLTextContent(textContent, filePath) {
    logger.info(`📢 OpenAI translation request is started: `);
    const spinner = ora('Sending translation request to OpenAI...').start();

    const promptTemplateStr = loadPromptByFileType(filePath);

    const prompt = new PromptTemplate({
        template: promptTemplateStr,
        inputVariables: ["textContent"],
    });

    const formattedPrompt = await prompt.format({
        textContent: JSON.stringify(textContent, null, 2)
    });

    const startTime = Date.now();
    const response = await openai.invoke(formattedPrompt);
    const endTime = Date.now();

    spinner.succeed(`✅ OpenAI Response Time: ${(endTime - startTime) / 1000} sec`);

    let translatedText = response.content.trim();
    translatedText = removeCodeBlocks(translatedText);

    // logger.info("🔹 Raw OpenAI Response:\n", translatedText);

    try {
        const parsedText = JSON.parse(translatedText);
        return parsedText;
    } catch (error) {
        logger.error("🚨 JSON Parsing failed. Response might not be valid JSON.");
        logger.info(translatedText);
        throw error;
    }
}

export async function translateMarkdownFile(inputFilePath, mode = "test") {
    try {
        const insertSuccess = await insertWordstoDatabase(inputFilePath);
        if (!insertSuccess) {
            logger.error("❌ insertWordstoDatabase failed. Aborting translation.");
            return;
        }

        const markdownContent = fs.readFileSync(inputFilePath, "utf-8");

        if (shouldSkipTranslation(markdownContent)) {
            logger.info("⚠️ Skipping translation.");
            return;
        }

        // predict cost
        const tokens = await countTokens(markdownContent);
        logger.info(`🔹 Token count: ${tokens}`)
        const pricing = {
            "gpt-4o-mini": { input: 0.15, cached_input: 0.075, output: 0.60 }
        };
        const inputCost = (tokens / 1_000_000) * pricing["gpt-4o-mini"].input;
        const totalCost = inputCost * 2;  // input + output
        logger.info(`🔹 Input cost: $${totalCost.toFixed(5)}`);

        let translatedTexts = await translateMarkdownTextContent(markdownContent, inputFilePath);

        let outputFilePath;
        if (mode === "test") {
            const outputDir = "translated";
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
            outputFilePath = path.join(outputDir, path.basename(inputFilePath));
        } else if (mode === "real") {
            const dirName = path.dirname(inputFilePath);
            const baseName = path.basename(inputFilePath, path.extname(inputFilePath));
            const ext = path.extname(inputFilePath);

            // Rename the original file to prevent overwriting
            const originalFilePath = path.join(dirName, `${baseName}_original${ext}`);
            fs.renameSync(inputFilePath, originalFilePath);

            // Substitute the original file with the translated content
            outputFilePath = path.join(dirName, `${baseName}${ext}`);
        } else {
            throw new Error("Invalid mode. Use 'test' or 'real'.");
        }

        fs.writeFileSync(outputFilePath, translatedTexts, "utf-8");
        logger.info(`✅ Translated Markdown saved: ${outputFilePath}`);

    } catch (error) {
        logger.error("❌ Error occurred:", error);
    }
}

export async function translateMarkdownTextContent(textContent, filePath) {

    textContent = preprocessMarkdownHeaders(textContent);

    logger.info(`📢 OpenAI translation request is started: `);
    const spinner = ora('Sending translation request to OpenAI...').start();

    const promptTemplateStr = loadPromptByFileType(filePath);

    const prompt = new PromptTemplate({
        template: promptTemplateStr,
        inputVariables: ["textContent"],
    });

    const formattedPrompt = await prompt.format({
        textContent: textContent.trim()
    });

    const startTime = Date.now();
    const response = await openai.invoke(formattedPrompt);
    const endTime = Date.now();

    spinner.succeed(`✅ OpenAI Response Time: ${(endTime - startTime) / 1000} sec`);

    let translatedText = response.content.trim();
    translatedText = removeCodeBlocks(translatedText);

    // logger.info("🔹 Raw OpenAI Response:\n", translatedText);

    return translatedText;
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

/**
 * Translates all the documents in the specified folder.
 *
 * @param {string} folderPath - The path to the folder containing files to translate.
 * @param {string} [mode="test"] - The mode of operation: 'test' (save in 'translated' folder) or 'real' (save in the original folder).
 * @param {Array<string>} [allowedExtensions] - List of file extensions to be translated.
 * @returns {Promise<void>} - A promise that resolves when the translation is complete.
 */
export async function translateFolder(folderPath, mode = "test", allowedExtensions = [".sgml", ".md", ".markdown", ".adoc", ".asciidoc", ".mdx"]) {
    logger.info(`🚀 Translating folder: ${folderPath} (Mode: ${mode})`);

    async function processDirectory(directory) {
        const files = fs.readdirSync(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);
            const stat = fs.lstatSync(filePath);

            if (stat.isDirectory()) {
                logger.info(`📂 Entering folder: ${filePath}`);
                await processDirectory(filePath);  // Recurse into subdirectory
            } else {
                const fileExt = path.extname(file).toLowerCase();

                if (!allowedExtensions.includes(fileExt)) {
                    logger.info(`⚠️ Skipping unsupported file: ${filePath}`);
                    continue;
                }

                logger.info(`📄 Translating file: ${filePath}`);

                if (fileExt === ".sgml") {
                    await translateSGMLFile(filePath, mode);
                } else if ([".md", ".markdown", ".adoc", ".asciidoc", ".mdx"].includes(fileExt)) {
                    await translateMarkdownFile(filePath, mode);
                } else {
                    logger.info(`❌ Unhandled file type: ${fileExt}, skipping...`);
                }
            }
        }
    }

    const startTime = Date.now();
    await processDirectory(folderPath);
    const endTime = Date.now();
    const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);

    logger.info(`✅ Folder translation completed: ${new Date(endTime).toISOString()}`);
    logger.info(`⏳ Total elapsed time: ${elapsedTime} seconds`);
}
