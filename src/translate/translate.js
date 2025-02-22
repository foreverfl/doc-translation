import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { convertJSONToSGML, loadSGML, removeCodeBlocks, saveSGMLFile } from "../utils/utils.js";


dotenv.config();

const openai = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0.2,
});

function extractTextNodes(node) {
    if (typeof node === "string") return node;
    if (typeof node !== "object") return node;

    let extracted = {};
    for (let key in node) {
        if (typeof node[key] === "string") {
            extracted[key] = node[key];
        } else if (typeof node[key] === "object") {
            extracted[key] = extractTextNodes(node[key]);
        }
    }
    return extracted;
}

async function translateTextContent(textContent) {
    console.log(`📢 [LOG] OpenAI Translation Request - Length: ${textContent.length} characters`);

    const prompt = new PromptTemplate({
        template: `
        You are a professional technical translator. 
        Translate the following text into Korean while preserving the exact structure.
        Keep all tags, attributes, and formatting unchanged. 
        
        # Input Text:
        {text_input}
      `,
        inputVariables: ["text_input"],
    });

    const formattedPrompt = await prompt.format({ text_input: textContent });

    const startTime = Date.now();
    const response = await openai.invoke(formattedPrompt);
    const endTime = Date.now();
    console.log(`✅ [LOG] OpenAI Response Time: ${(endTime - startTime) / 1000} sec`);
    // console.log(`🔍 [LOG] OpenAI Response (Raw Content):\n${response.content.substring(0, 500)}...`);

    try {
        let responseContent = response.content.trim();
        let cleanedContent = removeCodeBlocks(responseContent);
        let translatedText = JSON.parse(cleanedContent);
        console.log("✅ [LOG] Parsed JSON:", JSON.stringify(translatedText, null, 2));        
        return translatedText;
    } catch (error) {
        console.error("🚨 [ERROR] JSON Parsing failed. OpenAI response might not be valid JSON.");
        console.error("🔍 OpenAI Response (Full):", response.content);
        throw error;
    }
}

function insertTranslatedText(originalNode, translatedNode) {
    if (typeof originalNode === "string") return translatedNode;
    if (typeof originalNode !== "object") return originalNode;

    let updatedNode = {};
    for (let key in originalNode) {
        if (typeof originalNode[key] === "string") {
            updatedNode[key] = translatedNode[key] || originalNode[key];
        } else if (typeof originalNode[key] === "object") {
            updatedNode[key] = insertTranslatedText(originalNode[key], translatedNode[key]);
        }
    }
    return updatedNode;
}

function sanitizeXMLKeys(obj, path = "") {
    if (typeof obj !== "object" || obj === null) return obj;

    if (Array.isArray(obj)) {
        return obj.map((item, index) => sanitizeXMLKeys(item, `${path}[${index}]`));
    }

    const newObj = {};
    for (let key in obj) {
        let sanitizedKey = key
            .replace(/[^a-zA-Z0-9_]/g, "_") // 🚀 특수문자 제거, 공백 → `_`
            .replace(/^(\d)/, "_$1"); // 🚀 숫자로 시작하면 `_` 추가

        if (sanitizedKey !== key) {
            console.warn(`⚠️ [INVALID XML KEY] "${key}" → "${sanitizedKey}" at ${path}`);
        }

        newObj[sanitizedKey] = sanitizeXMLKeys(obj[key], `${path}.${sanitizedKey}`);
    }

    return newObj;
}


/**
 * Translates an SGML/XML file while preserving its structure.
 * It first extracts key terms, translates them, and stores them in the database.
 * Then, it translates the entire document while keeping the original SGML structure.
 *
 * @param {string} inputFilePath - Path to the input SGML/XML file.
 * @param {string} tableName - Database table name for storing translated terms.
 * @param {string} model_id - The OpenAI model ID to use for translation.
 */
export async function translateSGMLFile(inputFilePath, tableName = "translation_terms", model_id = "gpt-4o-mini") {
    try {
        console.log(`🚀 Translation started: ${new Date().toISOString()}`);
        console.log(`📄 Translating file: ${inputFilePath}`);

        // 1. Read the SGML file
        const originalData = await loadSGML(inputFilePath);

        // 2. Exclude code blocks and html tags
        const extractedText = extractTextNodes(originalData);

        // // 3. Extract frequently occurring nouns from the file
        // let extractedNouns = extractFrequentNouns(JSON.stringify(extractedText));

        // // 4. Check if words exist in DB, including untrained words
        // extractedNouns = await checkExistingWords(extractedNouns, { includeUntrained: true });

        // // 5. Translate words and input them into the database
        // let words;
        // try {
        //     words = await translateWords({ english: extractedNouns });
        // } catch (error) {
        //     console.error("🚨 Error during translation:", error);
        //     return;
        // }

        // if (!words || !words.english || !words.korean || !words.japanese) {
        //     console.error("❌ Translation failed: Invalid response format.");
        //     return;
        // }

        // await inputWordsWithoutTraining(words, tableName);

        // 6. Translate the entire document using OpenAI while preserving the structure
        let translatedText = await translateTextContent(JSON.stringify(extractedText));
        console.log("translatedText: ", translatedText);

        // 7. Insert translated text back into the original SGML/XML structure
        const translatedData = insertTranslatedText(originalData, translatedText);

        // 8. XML/SGML 변환 전에 키를 검사하고 정리
        console.log("🔍 [LOG] Checking XML Keys Before Conversion...");
        const sanitizedData = sanitizeXMLKeys(translatedData);

        // 9. Convert the updated JSON back to SGML/XML format and save the file
        const fileName = path.basename(inputFilePath, path.extname(inputFilePath)); // 파일명 추출 (확장자 제외)
        const outputSGML = convertJSONToSGML(sanitizedData, fileName);
        const outputFilePath = path.join("translated", path.basename(inputFilePath));
        saveSGMLFile(outputFilePath, outputSGML);

        console.log(`✅ Translation completed: ${new Date().toISOString()}`);
        console.log(`📂 Output file (cleaned): ${outputFilePath}`);

    } catch (error) {
        console.error("❌ Error occurred:", error);
    }
}

export async function translateFolder(folderPath, withFineTuned = false, allowedExtensions = [".sgml", ".md", ".markdown", ".adoc", ".asciidoc", ".mdx"]) {
    console.log(`🚀 Translating folder: ${folderPath} (Using Fine-Tuned Model: ${withFineTuned ? "YES" : "NO"})`);

    async function processDirectory(directory) {
        const files = fs.readdirSync(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);
            const stat = fs.lstatSync(filePath);

            if (stat.isDirectory()) {
                console.log(`📂 Entering folder: ${filePath}`);
                await processDirectory(filePath);
            } else {
                const fileExt = path.extname(file).toLowerCase();
                if (allowedExtensions.includes(fileExt)) {
                    console.log(`📄 Translating file: ${filePath}`);
                    if (withFineTuned) {
                        await translateFile(filePath);
                    } else {
                        await translateFileWithDefaultModel(filePath);
                    }
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