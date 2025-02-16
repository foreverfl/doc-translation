import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";
import path from "path";
import { extractFrequentNouns } from "./finetune/applyFineTuning.js";
import { loadPromptByFileType, readFile, saveFile } from "./utils/utils.js";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function translateFile(inputFilePath) {
    try {
        const content = readFile(inputFilePath);
        const startTime = Date.now();
        console.log(`🚀 Translation started: ${new Date(startTime).toISOString()}`);
        console.log(`📄 Translating file: ${inputFilePath}`);

        const extractNouns = extractFrequentNouns(content);
        console.log(`🔍 Extracting frequent nouns: ${extractNouns}`);

        const prompt = loadPromptByFileType(inputFilePath);

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "developer",
                    content: prompt,
                },
                {
                    role: "user",
                    content: content,
                },
            ],
            temperature: 0.2,
            max_tokens: 16000,
        });

        let translatedText = response.choices[0].message.content.trim();

        const outputFilePath = path.join(
            path.dirname(inputFilePath),
            `${path.basename(inputFilePath, path.extname(inputFilePath))}_translated${path.extname(inputFilePath)}`
        );

        saveFile(outputFilePath, translatedText);

        const endTime = Date.now();
        const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`✅ Translation completed: ${new Date(endTime).toISOString()}`);
        console.log(`⏳ Elapsed time: ${elapsedTime} seconds`);
        console.log(`📂 Output file: ${outputFilePath}`);
    } catch (error) {
        console.error("❌ Error occurred:", error);
    }
}

async function translateFolder(folderPath, allowedExtensions = [".sgml", ".md", ".markdown", ".adoc", ".asciidoc", ".mdx"]) {

    console.log(`🚀 Translating folder: ${folderPath}`);

    async function processDirectory(directory) {
        const files = fs.readdirSync(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);
            const stat = fs.lstatSync(filePath);

            if (stat.isDirectory()) {
                console.log(`📂 Entering folder: ${filePath}`);
                await processDirectory(filePath); // 🔄 재귀 호출
            } else {
                const fileExt = path.extname(file).toLowerCase();
                if (allowedExtensions.includes(fileExt)) {
                    await translateFile(filePath);
                }
            }
        }
    }

    await processDirectory(folderPath);
    const endTime = Date.now();
    const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ Folder translation completed: ${new Date(endTime).toISOString()}`);
    console.log(`⏳ Total elapsed time: ${elapsedTime} seconds`);
}

const inputPath = process.argv[2];

if (!inputPath) {
    console.error("❌ Please specify a file or folder to translate. Usage: node translate.js <file_or_folder_path>");
    process.exit(1);
}

if (fs.existsSync(inputPath)) {
    if (fs.lstatSync(inputPath).isDirectory()) {
        translateFolder(inputPath);
    } else {
        translateFile(inputPath);
    }
} else {
    console.error("❌ The specified file or folder does not exist.");
    process.exit(1);
}