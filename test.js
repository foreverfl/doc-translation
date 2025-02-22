import fs from 'fs';
import path from 'path';
import { convertJSONToSGML } from './src/utils/utils.js'; 

// 테스트 JSON 데이터 불러오기 (위에서 제공한 JSON 데이터)
const jsonData = JSON.parse(fs.readFileSync('test_data/pgfreespacemap.json', 'utf-8'));

// SGML 파일명 설정 (jsonData에 `sect1.id`가 있으면 사용)
const fileName = jsonData?.sect1?.$?.id || "output";

// JSON → SGML 변환
const sgmlOutput = convertJSONToSGML(jsonData, fileName);

// 결과 SGML 파일 저장 (translated/pgfreespacemap.sgml)
const outputPath = path.join("translated", `${fileName}.sgml`);
fs.writeFileSync(outputPath, sgmlOutput, "utf-8");

console.log(`✅ SGML 파일 변환 완료: ${outputPath}`);