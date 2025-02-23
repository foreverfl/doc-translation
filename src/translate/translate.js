import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { applyTranslations, extractContentForTranslation, loadPromptByFileType, parseSGMLLines, rebuildSGML, removeCodeBlocks } from "../utils/utils.js";


dotenv.config();

const openai = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0.2,
});


async function translateTextContent(textContent, filePath) {
    console.log(`📢 OpenAI translation request is started: `);

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

    console.log(`✅ OpenAI Response Time: ${(endTime - startTime) / 1000} sec\n`);

    let translatedText = response.content.trim();
    translatedText = removeCodeBlocks(translatedText);
    console.log("=== GPT Response ===")
    console.log("🔹 Raw OpenAI Response:\n", translatedText);

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
        const parsedLines = parseSGMLLines(inputFilePath);
        console.log("=== before translation ===");
        // parsedLines.forEach((entry) => {
        //     let entryType;
        //     if (entry.type === "contents") {
        //         entryType = "C"; 
        //     } else if (entry.type === "tag") {
        //         entryType = "T";
        //     } else if (entry.type === "example") {
        //         entryType = "E";
        //     } else {
        //         entryType = "?"; 
        //     }
        
        //     console.log(`${entry.seq.toString().padStart(4, '0')} (${entryType}): ${entry.indent}${entry.data}`);
        // });
        const textsToTranslate = extractContentForTranslation(parsedLines);
        const translatedTexts = await translateTextContent(textsToTranslate, inputFilePath);
        const translatedLines = applyTranslations(parsedLines, translatedTexts);
        // console.log("=== after translation ===");
        // translatedLines.forEach((entry) => {
        //     let entryType;
        //     if (entry.type === "contents") {
        //         entryType = "C"; 
        //     } else if (entry.type === "tag") {
        //         entryType = "T";
        //     } else if (entry.type === "example") {
        //         entryType = "E";
        //     } else {
        //         entryType = "?"; 
        //     }
        
        //     console.log(`${entry.seq.toString().padStart(4, '0')} (${entryType}): ${entry.indent}${entry.data}`);
        // });
        let outputFilePath;
        if (mode === "test") {
            const outputDir = "translated";
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
            outputFilePath = path.join(outputDir, path.basename(inputFilePath));
        } else if (mode === "real") {
            const dirName = path.dirname(inputFilePath);
            const baseName = path.basename(inputFilePath, path.extname(inputFilePath));
            const ext = path.extname(inputFilePath);
            outputFilePath = path.join(dirName, `${baseName}_translated${ext}`);
        } else {
            throw new Error("Invalid mode. Use 'test' or 'real'.");
        }

        rebuildSGML(translatedLines, outputFilePath);

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