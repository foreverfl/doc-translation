import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { getAvailableModels } from "./utils/openaiUtils.js";

dotenv.config();

const MAX_FILE_SIZE = 10 * 1024 * 1024; 
const IGNORED_FOLDERS = ["node_modules", ".git", "dist", "build"]; 

const MODEL_PRICING = {
    "gpt-4o": { input: 2.50, cached_input: 1.25, output: 10.00 },
    "gpt-4o-realtime-preview": { input: 5.00, cached_input: 2.50, output: 20.00 },
    "gpt-4o-mini": { input: 0.15, cached_input: 0.075, output: 0.60 },
    "gpt-4o-mini-realtime-preview": { input: 0.60, cached_input: 0.30, output: 2.40 },
    "o1": { input: 15.00, cached_input: 7.50, output: 60.00 },
    "o3-mini": { input: 1.10, cached_input: 0.55, output: 4.40 },
    "o1-mini": { input: 1.10, cached_input: 0.55, output: 4.40 }
};

let totalTokens = 0;
let startTime = Date.now();
let analyzing = true; 

async function loadTiktoken() {
    const tiktoken = await import('tiktoken');
    return tiktoken.get_encoding("cl100k_base");
}

async function countTokens(text) {
    try {
        const enc = await loadTiktoken();
        return enc.encode(text).length;
    } catch (error) {
        console.error("❌ Tokenization failed. Skipping file...", error);
        return 0;
    }
}

async function processFile(filePath) {
    if (!analyzing) return Promise.reject(new Error("Process interrupted."));
    const stats = fs.statSync(filePath);

    if (stats.size > MAX_FILE_SIZE) {
        console.warn(`⚠️ Skipping large file: ${filePath} (Size: ${stats.size} bytes)`);
        return 0;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    return await countTokens(content);
}

async function analyzeFolder(folderPath, model = "gpt-4o-mini", allowedExtensions = [".sgml", ".md", ".markdown", ".adoc", ".asciidoc", ".mdx"]) {
    console.log(`🚀 Analyzing folder: ${folderPath} | Model: ${model}`);

    async function processDirectory(directory) {
        if (!analyzing) throw new Error("Process interrupted.");
        const files = fs.readdirSync(directory);

        for (const file of files) {
            if (!analyzing) throw new Error("Process interrupted.");
            const filePath = path.join(directory, file);
            const stat = fs.lstatSync(filePath);

            if (IGNORED_FOLDERS.some(ignored => filePath.includes(`/${ignored}`))) {
                continue; 
            }

            if (stat.isDirectory()) {
                console.log(`📂 Entering folder: ${filePath}`);
                await processDirectory(filePath);
            } else {
                const fileExt = path.extname(file).toLowerCase();
                if (allowedExtensions.includes(fileExt)) {
                    try {
                        const tokenCount = await processFile(filePath);
                        totalTokens += tokenCount;
                        console.log(`📄 File: ${filePath} | Tokens: ${tokenCount}`);
                    } catch (error) {
                        if (error.message === "Process interrupted.") return;
                    }
                }
            }
        }
    }

    try {
        await processDirectory(folderPath);
    } catch (error) {
        if (error === "Process interrupted.") return; 
    }
}

function printCurrentResult(model) {
    const costEstimate = estimateCost(totalTokens, model);
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n\n⚠️ Process interrupted. Showing current results:");
    console.log(`📊 Total Tokens (so far): ${totalTokens}`);
    console.log(`💰 Estimated Cost for ${model} (so far): $${costEstimate.totalCost.toFixed(2)}`);
    console.log(`⏳ Elapsed time: ${elapsedTime} seconds`);
}


function estimateCost(tokens, model) {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING["gpt-4o-mini"];
    return {
        inputCost: (tokens / 1_000_000) * pricing.input,
        outputCost: (tokens / 1_000_000) * pricing.output,
        totalCost: (tokens / 1_000_000) * (pricing.input + pricing.output)
    };
}

async function predictCost() {
    const folderPath = process.argv[2];
    const model = process.argv[3] || "gpt-4o-mini";

    if (!folderPath) {
        console.error("❌ Please specify the folder to analyze. Usage: node predictCost.js <folder_path> [model]");
        process.exit(1);
    }

    const availableModels = await getAvailableModels();
    if (!availableModels.includes(model)) {
        console.error(`❌ Invalid model: ${model}. Available models: ${availableModels.join(", ")}`);
        process.exit(1);
    }

    process.on("SIGINT", () => {
        analyzing = false;
        console.log("\n🛑 Stopping analysis...");
        printCurrentResult(model);
        setTimeout(() => process.exit(0), 500); 
    });

    try {
        await analyzeFolder(folderPath, model);
    } catch (error) {
        if (error.message !== "Process interrupted.") throw error; 
    }


    printCurrentResult(model);
    process.exit(0);
}

predictCost();
