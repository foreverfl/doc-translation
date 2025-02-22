export async function translateFile(inputFilePath, tableName = "translation_terms") {
    try {
        // 1. Make a table if it doesn't exist
        await createTable(tableName);

        // 2. Read the file
        let content = readFile(inputFilePath);
        console.log(`🚀 Translation started: ${new Date().toISOString()}`);
        console.log(`📄 Translating file: ${inputFilePath}`);

        // 3. Exclude code blocks and html tags
        content = filterContent(content);

        // 4. Extract frequently occurring nouns from the file
        let extractedNouns = extractFrequentNouns(content);

        // 5. Check if words exist in DB and make a list of words to translate
        extractedNouns = await checkExistingWords(extractedNouns);

        console.log(`🚀 Filtered nouns (new words): ${extractedNouns}`);

        // 6. Translate words
        let translations;
        try {
            translations = await translateWords({ english: extractedNouns });
        } catch (error) {
            console.error("🚨 Error during translation:", error);
            return;
        }

        if (!translations || !translations.english || !translations.korean || !translations.japanese) {
            console.error("❌ Translation failed: Invalid response format.");
            return;
        }

        console.log("✅ Translation successful:", translations.korean);

        if (translations.english.length < 20) {
            console.log(`🔹 Less than 20 translated words (${translations.english.length}). Storing without fine-tuning.`);
            await inputWordsWithoutTraining(translations, tableName);
        } else {
            console.log("🚀 Enough words for fine-tuning! Training model...");
            await inputWordsWithTraining(translations, tableName);
        }

        // 7. Get untrained words from the database
        const untrainedWords = await getUntrainedWordsForFineTuning();
        const combinedWords = {
            english: [...translations.english, ...untrainedWords.english],
            korean: [...translations.korean, ...untrainedWords.korean],
            japanese: [...translations.japanese, ...untrainedWords.japanese],
        };

        // 8. Apply fine-tuning if enough words are available
        if (combinedWords.english.length < 20) {
            console.log(`🔹 Less than 20 total translated words (${combinedWords.english.length}). Storing without fine-tuning.`);
            await inputWordsWithoutTraining(translations, tableName);
        } else {
            console.log("🚀 Enough words for fine-tuning! Training model...");
            await inputWordsWithTraining(translations, tableName);
            try {
                await applyFineTuning(combinedWords);
                console.log("✅ Fine-tuning completed successfully!");
            } catch (error) {
                console.error("🚨 Fine-tuning error:", error);
            }
        }

        // 9. Translate the file content
        const prompt = loadPromptByFileType(inputFilePath);
        const response = await openai.chat.completions.create({
            model: process.env.MODEL_ID,
            messages: [
                { role: "system", content: "You are a professional technical translator." },
                { role: "user", content: prompt },
                { role: "user", content: content }
            ],
            temperature: 0.2,
            max_tokens: 16000,
        });

        let translatedText = response.choices[0].message.content.trim();
        translatedText = removeCodeBlocks(translatedText);

        // 10. Save translated file in 'translated/' directory
        const translatedDir = path.resolve("translated");
        fs.mkdir(translatedDir, { recursive: true });

        const outputFilePath = path.join(
            translatedDir,
            `translated_${path.basename(inputFilePath)}`
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
