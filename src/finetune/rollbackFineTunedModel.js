import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function rollbackFineTunedModel() {
    try {
        const list = await openai.fineTuning.jobs.list();

        if (!list.data || list.data.length === 0) {
            console.log("⚠️ No fine-tuned models found.");
            return;
        }

        console.log("✅ Checking fine-tuned models...");
        let previousSucceededModel = null;

        for (const fineTune of list.data) {
            console.log(`🆔 ID: ${fineTune.id} | Status: ${fineTune.status} | Created: ${new Date(fineTune.created_at * 1000).toISOString()}`);
            
            if (fineTune.status === "succeeded") {
                previousSucceededModel = fineTune.id;
                break; 
            }
        }

        if (!previousSucceededModel) {
            console.log("❌ No successful fine-tuned models available for rollback.");
            return;
        }

        console.log(`🔄 Rolling back to previous successful model: ${previousSucceededModel}`);

        // .env 파일을 업데이트 (기존 MODEL_ID 변경)
        const envPath = ".env";
        let envContent = fs.readFileSync(envPath, "utf-8");

        // 기존 MODEL_ID 값을 새로운 모델 ID로 변경
        envContent = envContent.replace(/MODEL_ID=.*/g, `MODEL_ID=${previousSucceededModel}`);
        fs.writeFileSync(envPath, envContent);

        console.log(`✅ Successfully rolled back to model: ${previousSucceededModel}`);

    } catch (error) {
        console.error("❌ Error during rollback:", error);
    }
}

rollbackFineTunedModel();