import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";
import path from "path";
import { logger } from "../utils/logger.js";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function uploadTrainingFile(filePath) {
    try {
        logger.info(`📤 Uploading training file: ${filePath}...`);
        const response = await openai.files.create({
            file: fs.createReadStream(filePath),
            purpose: "fine-tune",
        });

        logger.info(`✅ Training file uploaded successfully! File ID: ${response.id}`);
        return response.id;
    } catch (error) {
        logger.error("❌ Error uploading file:", error);
        process.exit(1);
    }
}

async function createFineTunedModel(modelName = "gpt-4o-mini-2024-07-18", trainingFileId) {
    try {
        logger.info(`🚀 Creating a fine-tuned model using "${modelName}"...`);

        const response = await openai.fineTuning.jobs.create({
            model: modelName,
            training_file: trainingFileId,
            method: {
                type: "supervised",
                supervised: {
                    hyperparameters: {
                        batch_size: "auto",
                        learning_rate_multiplier: "auto",
                        n_epochs: "auto",
                    },
                },
            },
        });

        const modelId = response.id;
        logger.info(`✅ Fine-tuning model created! Model ID: ${modelId}`);
        logger.info(`🔍 Monitor progress using: openai api fine_tunes.list`);

        saveModelIdToEnv(modelId);
    } catch (error) {
        logger.error("❌ Error creating fine-tuned model:", error);
        process.exit(1);
    }
}

function saveModelIdToEnv(modelId) {
    const envPath = path.resolve(".env");
    let envContent = "";

    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf8");
    }

    const modelKeys = envContent.match(/MODEL_ID_(\d{3})=/g) || [];
    const nextIndex = modelKeys.length > 0
        ? Math.max(...modelKeys.map(k => parseInt(k.match(/\d{3}/)[0]))) + 1
        : 1;

    const newKey = `MODEL_ID_${String(nextIndex).padStart(3, "0")}`;

    const newEnvContent = envContent.includes(newKey)
        ? envContent.replace(new RegExp(`^${newKey}=.*$`, "m"), `${newKey}=${modelId}`)
        : `${envContent}\n${newKey}=${modelId}`;

    fs.writeFileSync(envPath, newEnvContent.trim() + "\n", "utf8");

    logger.info(`📌 Model ID saved in .env as ${newKey}=${modelId}`);
}

const modelName = process.argv[2] || "gpt-4o-mini-2024-07-18";
const trainingFilePath = "prompts/start-data.jsonl";

uploadTrainingFile(trainingFilePath)
    .then((trainingFileId) => createFineTunedModel(modelName, trainingFileId))
    .catch(logger.error);