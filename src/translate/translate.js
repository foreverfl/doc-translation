import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { applyTranslations, extractContentForTranslation, parseSGMLLines, rebuildSGML, removeCodeBlocks } from "../utils/utils.js";


dotenv.config();

const openai = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0.2,
});


async function translateTextContent(textContent) {
    console.log(`📢 OpenAI translation request is started: `);

    const prompt = new PromptTemplate({
        template: `
            You are a professional technical translator specializing in structured documents like SGML/XML.
            Your task is to translate the following English text into Korean **while strictly preserving the SGML structure**.
    
            ## Instructions:
            - **DO NOT modify SGML tags or attributes.**
            - **ONLY translate the text between tags.**
            - **DO NOT change or remove the line numbers. Keep every line in its original order.**
            - **If a line is empty, KEEP IT EMPTY in the output. Do not remove or merge lines.**
            - **If a line is empty, return it as an empty string (""). Do not omit empty lines.**
            - **Return a JSON array where each object contains 'seq' and 'text'.**
            - **Ensure technical terms remain consistent.**
    
            ## Input:
            The following is a JSON array of text lines that need to be translated.  
            Each object contains a 'lineNumber' and 'text'.  
    
            \`\`\`json
            {textContent}
            \`\`\`
    
            ## Output Format:
            You MUST return only a valid JSON array in the following format:  
            \`\`\`json
            [
              {{ "seq": "0006", "text": "번역된 텍스트" }},
              {{ "seq": "0008", "text": "" }},
              {{ "seq": "0009", "text": "<tag>번역</tag>" }}
            ]
            \`\`\`
        `,
        inputVariables: ["textContent"]
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

export async function translateSGMLFile(inputFilePath) {
    try {
        const parsedLines = parseSGMLLines(inputFilePath);
        // console.log("=== before translation ===");
        // parsedLines.forEach((entry) => {
        //     const entryType = entry.type === "contents" ? "C" : "T"; // C = Contents, T = Tag
        //     console.log(`${entry.seq.toString().padStart(4, '0')} (${entryType}): ${entry.indent}${entry.data}`);
        // });
        const textsToTranslate = extractContentForTranslation(parsedLines);
        const translatedTexts = await translateTextContent(textsToTranslate);
        const translatedLines = applyTranslations(parsedLines, translatedTexts);

        // console.log("=== after translation ===");
        // translatedLines.forEach((entry) => {
        //     const entryType = entry.type === "contents" ? "C" : "T";
        //     console.log(`${entry.seq.toString().padStart(4, '0')} (${entryType}): ${entry.indent}${entry.data}`);
        // });

        const outputDir = "translated";
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const outputFilePath = path.join(outputDir, path.basename(inputFilePath));
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