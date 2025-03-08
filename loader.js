import { resolve as pathResolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const aliasMap = {
    "@": pathResolve(__dirname, "src"),
    "@db": pathResolve(__dirname, "src/db"),
    "@finetune": pathResolve(__dirname, "src/finetune"),
    "@translate": pathResolve(__dirname, "src/translate"),
    "@utils": pathResolve(__dirname, "src/utils"),
};

export function resolve(specifier, context, nextResolve) {
    for (const [alias, realPath] of Object.entries(aliasMap)) {
        if (specifier.startsWith(alias + "/")) { 
            const resolvedPath = specifier.replace(alias + "/", realPath + "/");
            return nextResolve(pathToFileURL(resolvedPath).href, context);
        }
    }
    return nextResolve(specifier, context);
}