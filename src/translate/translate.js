import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import fs from "fs";
import ora from "ora";
import path from "path";
import { checkExistingWords } from "../db/checkExistingWords.js";
import { createTable } from "../db/createTable.js";
import { inputWordsWithTraining } from "../db/inputWords.js";
import { countTokens } from "../predictCost.js";
import { applyTranslations, extractContentForTranslation, loadPromptByFileType, parseSGMLLines, readFile, rebuildSGML, removeCodeBlocks } from "../utils/utils.js";
import { extractFrequentNouns, filterContent, translateWords } from "./translateTerms.js";

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
        console.log("⚠️ No words to extract. Continuing to the next step.");
        return true;
    }

    // 5. Check if the word is already in the database
    extractedWords = await checkExistingWords(extractedWords);

    // 6. Insert the words to the database
    let translatedWords;
    try {
        translatedWords = await translateWords({ english: extractedWords });
    } catch (error) {
        console.error("🚨 Error during translation:", error);
        return;
    }

    if (!translatedWords || !translatedWords.english || !translatedWords.korean || !translatedWords.japanese) {
        console.error("❌ Translation failed: Invalid response format.");
        return;
    }

    // 7. Insert the words to the database
    await inputWordsWithTraining(translatedWords, tableName);

    console.log("✅ Words inserted to the database.");

    return true;
}

/**
 * Translates the given text content using OpenAI's translation service.
 *
 * @param {string} textContent - The text content to be translated.
 * @param {string} filePath - The file path to determine the prompt template.
 * @returns {Promise<Object>} - A promise that resolves to the translated text content as a JSON object.
 * @throws {Error} - Throws an error if the response from OpenAI is not valid JSON.
 */
export async function translateTextContent(textContent, filePath) {
    console.log(`📢 OpenAI translation request is started: `);
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

    // console.log("🔹 Raw OpenAI Response:\n", translatedText);

    try {
        const parsedText = JSON.parse(translatedText);
        return parsedText;
    } catch (error) {
        console.error("🚨 JSON Parsing failed. Response might not be valid JSON.");
        console.log(translatedText);
        throw error;
    }
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

    console.log(`${entry.seq.toString().padStart(4, '0')} (${entryType}): ${entry.indent}${entry.data}`);
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
            console.error("❌ insertWordstoDatabase failed. Aborting translation.");
            process.exit(1);
        }

        const parsedLines = parseSGMLLines(inputFilePath);
        // console.log("=== before translation ===");
        // parsedLines.forEach(entry => logEntry(entry));

        const textsToTranslate = extractContentForTranslation(parsedLines);

        // predict cost
        const tokens = await countTokens(textsToTranslate);
        console.log(`🔹 Token count: ${tokens}`)
        const pricing = {
            "gpt-4o-mini": { input: 0.15, cached_input: 0.075, output: 0.60 }
        };
        const inputCost = (tokens / 1_000_000) * pricing["gpt-4o-mini"].input;
        const totalCost = inputCost * 2;  // input + output
        console.log(`🔹 Input cost: $${totalCost.toFixed(5)}`);

        // Split the texts into chunks to avoid exceeding the token limit
        const CHUNK_SIZE = 500;
        const textChunks = chunkArray(textsToTranslate, CHUNK_SIZE);
        let translatedTexts = [];

        for (const chunk of textChunks) {
            console.log(`🔄 Translating chunk of ${chunk.length} entries...`);
            const translatedChunk = await translateTextContent(chunk, inputFilePath);
            translatedTexts = translatedTexts.concat(translatedChunk);
        }
        console.log(`✅ Translation completed! Total: ${translatedTexts.length} entries`);

        const translatedLines = applyTranslations(parsedLines, translatedTexts);
        // console.log("=== after translation ===");
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
        console.error("❌ Error occurred:", error);
    }
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
    console.log(`🚀 Translating folder: ${folderPath} (Mode: ${mode})`);

    async function processDirectory(directory) {
        const files = fs.readdirSync(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);
            const stat = fs.lstatSync(filePath);

            if (stat.isDirectory()) {
                console.log(`📂 Entering folder: ${filePath}`);
                await processDirectory(filePath);  // Recurse into subdirectory
            } else {
                const fileExt = path.extname(file).toLowerCase();
                if (allowedExtensions.includes(fileExt)) {
                    console.log(`📄 Translating file: ${filePath}`);
                    await translateSGMLFile(filePath, mode);  // Use the updated translateSGMLFile function
                } else {
                    console.log(`⚠️ Skipping unsupported file: ${filePath}`);
                }
            }
        }
    }

    const startTime = Date.now();
    await processDirectory(folderPath);
    const endTime = Date.now();
    const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ Folder translation completed: ${new Date(endTime).toISOString()}`);
    console.log(`⏳ Total elapsed time: ${elapsedTime} seconds`);
}
