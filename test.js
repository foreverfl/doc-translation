import { makeTable } from "./src/db/makeTable.js";
import { closeDB } from "./src/db/connect.js";

(async () => {
    const tableName = "translation_terms";
    console.log(`🛠 Creating table: ${tableName}`);
    
    await makeTable(tableName);

    console.log("✅ Test completed.");

    await closeDB();
})();
