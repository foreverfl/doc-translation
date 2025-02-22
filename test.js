import { extractContentForTranslation, parseSGMLLines } from './src/utils/utils.js';

// ✅ 테스트할 SGML 파일 경로 설정
const TEST_SGML_FILE = "test_data/pgfreespacemap.sgml";

// ✅ SGML 파일을 파싱하고 "contents" 데이터만 추출하는 함수
async function testExtractSGMLContent(filePath) {
    try {
        console.log(`📢 Testing SGML file parsing: ${filePath}`);

        // ✅ SGML 파일 파싱
        const parsedLines = parseSGMLLines(TEST_SGML_FILE);
        parsedLines.forEach(entry => {
            const entrySeq = String(entry.seq + 1).padStart(4, '0'); // 0001, 0002 형식 유지
            const entryType = entry.type === "contents" ? "C" : "T"; // C = Contents, T = Tag
            console.log(`${entrySeq} (${entryType}): ${entry.indent}${entry.data}`);
        });

        // ✅ "contents" 타입만 필터링
        const textsToTranslate = extractContentForTranslation(parsedLines);

        // ✅ JSON으로 변환하여 콘솔 출력
        console.log("\n✅ Extracted JSON for Translation:");
        console.log(JSON.stringify(textsToTranslate, null, 2));
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

// ✅ 실행
testExtractSGMLContent(TEST_SGML_FILE);