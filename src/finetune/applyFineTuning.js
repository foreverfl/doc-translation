import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Fine-tune the OpenAI model using newly translated terms.
 * @param {Object} trainedWords - Object containing trained English, Korean, and Japanese words.
 */
export async function applyFineTuning(trainedWords) {
    if (!trainedWords || !trainedWords.english.length) {
        console.log("⚠️ No trained words available for fine-tuning.");
        return;
    }

    console.log("🚀 Preparing dataset for fine-tuning...");

    // 1️⃣ Fine-tuning 데이터셋을 JSONL 형식으로 저장
    const fineTuneData = trainedWords.english.map((word, i) => ({
        prompt: `Translate '${word}' into Korean and Japanese.`,
        completion: `Korean: ${trainedWords.korean[i]}, Japanese: ${trainedWords.japanese[i]}`
    }));

    const fineTuneFilePath = path.join(__dirname, "fine_tune_data.jsonl");
    fs.writeFileSync(fineTuneFilePath, fineTuneData.map(entry => JSON.stringify(entry)).join("\n"));

    try {
        // 2️⃣ OpenAI 서버에 파일 업로드
        const fileUploadResponse = await openai.files.create({
            purpose: "fine-tune",
            file: fs.createReadStream(fineTuneFilePath),
        });

        console.log("✅ Fine-tune dataset uploaded successfully:", fileUploadResponse);

        // 3️⃣ Fine-tuning 시작
        const fineTuneResponse = await openai.fineTunes.create({
            training_file: fileUploadResponse.id,
            model: process.env.MODEL_ID,
        });

        console.log("🚀 Fine-tuning started:", fineTuneResponse);
    } catch (error) {
        console.error("❌ Error during fine-tuning:", error);
    }
}
