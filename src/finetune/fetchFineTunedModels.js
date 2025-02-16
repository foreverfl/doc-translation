import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function fetchFineTunedModels() {
    try {
        const list = await openai.fineTuning.jobs.list();

        if (!list.data || list.data.length === 0) {
            console.log("⚠️ No fine-tuned models found.");
            return;
        }

        console.log("✅ Fetched fine-tuned models:");
        for (const fineTune of list.data) {
            console.log(`🆔 ID: ${fineTune.id} | Status: ${fineTune.status} | Created: ${new Date(fineTune.created_at * 1000).toISOString()}`);
        }
    } catch (error) {
        console.error("❌ Error fetching fine-tuned models:", error);
    }
}

fetchFineTunedModels();
