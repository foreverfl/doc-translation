import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import xml2js from "xml2js";

dotenv.config();

const parser = new xml2js.Parser({ explicitArray: false });

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

export function saveFile(outputFilePath, content) {
    fs.writeFileSync(outputFilePath, content, "utf-8");
    console.log(`✅ Translation completed: ${outputFilePath}`);
}

export function removeCodeBlocks(text) {
    return text.replace(/```(?:[\w]*)?(?:\n|\r\n|)([\s\S]*?)(?:\n|\r\n)?```/g, "$1").trim();
}

/**
 * SGML/XML 파일을 JSON으로 변환
 * @param {string} filePath - 변환할 SGML/XML 파일 경로
 * @returns {Promise<Object>} - 변환된 JSON 객체
 */
export async function loadSGML(filePath) {
    let fileContent = fs.readFileSync(filePath, "utf-8");

    // 1. () 내부의 내용을 보존하기 위해 플레이스홀더 처리
    fileContent = fileContent.replace(/\(([^)]+)\)/g, (match, p1) => {
        return `__PAREN_OPEN__${p1}__PAREN_CLOSE__`;
    });

    // 2. SGML을 XML로 변환 (xml2js 사용)
    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
    let jsonData = await parser.parseStringPromise(fileContent);

    // 3. 변환 후, 플레이스홀더를 다시 원래의 () 형태로 복원
    function restoreParentheses(obj) {
        if (typeof obj === "string") {
            return obj.replace(/__PAREN_OPEN__/g, "(").replace(/__PAREN_CLOSE__/g, ")");
        } else if (typeof obj === "object" && obj !== null) {
            for (let key in obj) {
                obj[key] = restoreParentheses(obj[key]);
            }
        }
        return obj;
    }
    jsonData = restoreParentheses(jsonData);

    return jsonData;
}

/**
 * JSON 데이터를 SGML/XML 포맷으로 변환
 * @param {Object} jsonData - 변환할 JSON 데이터
 * @returns {string} - SGML/XML 문자열
 */
export function convertJSONToSGML(jsonData, fileName = "output") {
    let sgmlString = `<!-- doc/src/sgml/${fileName}.sgml -->\n\n`; // SGML 주석 추가 (파일 헤더)

    function convertNode(key, value, depth = 0) {
        const indent = " ".repeat(depth); // 들여쓰기
        const newLineTags = new Set(["title", "indexterm", "para", "term", "variablelist", "sect1", "sect2", "sect3"]);
        let result = "";

        // 속성(attribute) 처리 (`$` 또는 `_attributes`)
        if (key === "$" || key === "_attributes") {
            return Object.entries(value)
                .map(([attrKey, attrValue]) => ` ${attrKey}="${attrValue}"`)
                .join("");
        }

        // 문자열 처리 (내용이 있을 경우)
        if (typeof value === "string") {
            return `${indent}<${key}>${value}</${key}>\n`;
        }

        // 배열 처리
        if (Array.isArray(value)) {
            return value.map(item => convertNode(key, item, depth)).join("");
        }

        // `para` 태그 처리
        if (key === "para") {
            Object.values(value).forEach(obj => {
                result += `${indent}<para>\n  `;
                if (typeof obj === "string") {
                    result += obj.trim();
                } else if (typeof obj === "object") {
                    let paraContent = [];
                    if ("_" in obj) {
                        paraContent.push(obj._.trim());
                    }
                    for (let subKey in obj) {
                        if (subKey !== "_") {
                            paraContent.push(convertNode(subKey, obj[subKey], 0).trim());
                        }
                    }
                    result += paraContent.join(" ");
                }
                result += `\n${indent}</para>\n\n`;
            });
            return result;
        }

        // 객체 처리
        if (typeof value === "object" && value !== null) {
            let attributes = value.$ ? convertNode("$", value.$) : "";
            let result = `${indent}<${key}${attributes}>\n`;

            // `_` 키가 존재하면 텍스트 노드로 출력
            if ("_" in value) {
                result += `${indent}  ${value._}\n`;
            }

            // 그 외 키들을 재귀적으로 변환
            for (let subKey in value) {
                if (subKey !== "$" && subKey !== "_") {
                    result += convertNode(subKey, value[subKey], depth + 1);
                }
            }

            result += `${indent}</${key}>\n`;

            // 특정 태그는 개행 추가
            if (newLineTags.has(key)) {
                result += `\n`;
            }

            return result;
        }

        console.warn(`⚠️ [LOG] Unexpected type at key: "${key}" - Value:`, value);
        return "";
    }

    for (let key in jsonData) {
        sgmlString += convertNode(key, jsonData[key], 0);
    }

    return sgmlString;
}


/**
 * SGML/XML 파일을 저장
 * @param {string} filePath - 저장할 파일 경로
 * @param {string} data - 저장할 SGML/XML 문자열
 */
export function saveSGMLFile(filePath, data) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, data, "utf-8");
}