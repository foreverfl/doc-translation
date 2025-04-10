import { readFile } from 'fs/promises';

(async () => {
    // stopwords-en.json 파일 읽고 파싱
    const data = await readFile('./stopwords-en.json', 'utf-8');
    const stopwords = JSON.parse(data);
    const STOPWORDS = new Set(stopwords.en);

    const content = "This is a test sentence with some common words like the and is and also some unique terms like React and JavaScript.";
    const words = content.toLowerCase().match(/\b\w+\b/g);
    const wordFreq = {};

    for (const word of words) {
        if (STOPWORDS.has(word)) continue;
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    }

    console.log("📌 Frequent words:");
    for (const [word, count] of Object.entries(wordFreq)) {
        if (count >= 1) {
            console.log(`${word}: ${count}`);
        }
    }
})();
