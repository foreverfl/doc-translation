import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

export function loadPromptByFileType(filePath) {
    const extToPrompt = {
        ".sgml": "prompts/sgml.txt",
        ".md": "prompts/markdown.txt",
        ".markdown": "prompts/markdown.txt",
        ".adoc": "prompts/asciidoc.txt",
        ".asciidoc": "prompts/asciidoc.txt",
        ".mdx": "prompts/markdown-docusaurus.txt",
    };

    const fileExt = path.extname(filePath).toLowerCase();
    const promptFile = extToPrompt[fileExt] || "prompts/default.txt";

    console.log(`📄 Detected file type: ${fileExt || "unknown"}, using prompt: ${promptFile}`);

    try {
        return fs.readFileSync(promptFile, "utf-8");
    } catch (error) {
        console.error(`❌ Failed to load the prompt file: ${promptFile}`);
        process.exit(1);
    }
}

export function readFile(inputFilePath) {
    if (!fs.existsSync(inputFilePath)) {
        console.error("❌ The specified file does not exist.");
        process.exit(1);
    }
    return fs.readFileSync(inputFilePath, "utf-8");
}

/**
 * 파일을 저장합니다.
 *
 * @param {string} outputFilePath - 저장할 파일의 경로
 * @param {string} content - 파일에 저장할 내용
 */
export function saveFile(outputFilePath, content) {
    fs.writeFileSync(outputFilePath, content, "utf-8");
    console.log(`✅ Translation completed: ${outputFilePath}`);
}

export function removeCodeBlocks(text) {
    return text.replace(/```(?:[\w]*)?(?:\n|\r\n|)([\s\S]*?)(?:\n|\r\n)?```/g, "$1").trim();
}


export function parseSGMLLines(filePath) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const lines = fileContent.split("\n"); // 한 줄씩 분리

    let parsedLines = lines.map((line, index) => {
        let leadingSpaces = line.match(/^(\s*)/)[0];
        return {
            seq: index, 
            type: line.trim().startsWith("<") && line.trim().endsWith(">") ? "tag" : "contents",
            data: line,
            indent: leadingSpaces,
        };
    });
    return parsedLines;
}

export function extractContentForTranslation(parsedLines) {
    return parsedLines
        .filter(entry => entry.type === "contents") 
        .map(entry => ({
            seq: String(entry.seq + 1).padStart(4, '0'), 
            text: entry.data.trim()
        }));
}

export function applyTranslations(beforeLines, translatedLines) {
    const translatedMap = new Map();
    
    translatedLines.forEach(({ seq, text }) => {
        translatedMap.set(String(Number(seq)).padStart(4, '0'), text); 
    });

    return beforeLines.map(entry => {
        if (entry.type === "contents") {
            const seqStr = String(entry.seq + 1).padStart(4, '0');  // seq 값을 +1 해주어 일치하도록 수정
            const translatedText = translatedMap.has(seqStr) ? translatedMap.get(seqStr) : entry.data;

            console.log(`🔍 Mapping seq=${seqStr}: Original="${entry.data}" → Translated="${translatedText}"`);

            return { ...entry, data: `${entry.indent}${translatedText}` };
        }
        return entry; 
    });
}


export function rebuildSGML(parsedLines, outputPath) {
    console.log("🚀 Rebuilding SGML with translated data...");
    
    const reconstructedSGML = parsedLines.map(entry => {
        if (entry.type === "contents" && !entry.data.trim()) {
            console.warn(`⚠️ Empty content at seq=${entry.seq.toString().padStart(4, '0')}`);
        }
        return entry.data;
    }).join("\n");

    fs.writeFileSync(outputPath, reconstructedSGML, "utf-8");
    console.log(`✅ 번역된 SGML이 저장되었습니다: ${outputPath}`);
}