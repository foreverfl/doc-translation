import { extractFrequentNouns } from "./src/finetune/applyFineTuning.js";

const sampleContent = `
    AI is everywhere. AI is transforming businesses. AI is used in Machine Learning. 
    Machine Learning is an essential part of AI. Many companies rely on Machine Learning for decision making. 
    Data is the backbone of AI. High-quality Data improves Machine Learning models. Without Data, AI cannot function.
    AI is revolutionizing technology. AI-powered applications are growing every day. 
    Machine Learning techniques are becoming more advanced. Machine Learning helps in data analysis. 
    Data-driven approaches rely on high-quality Data.
`;

extractFrequentNouns(sampleContent).then(result => {
    console.log("\n🔍 Frequent Nouns with Translations:");
    console.log(result);
});