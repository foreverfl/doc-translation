const inputPath = process.argv[2];

if (!inputPath) {
    console.error("❌ Please specify a file or folder to translate. Usage: node translate.js <file_or_folder_path>");
    process.exit(1);
}

if (fs.existsSync(inputPath)) {
    if (fs.lstatSync(inputPath).isDirectory()) {
        translateFolder(inputPath);
    } else {
        translateFile(inputPath);
    }
} else {
    console.error("❌ The specified file or folder does not exist.");
    process.exit(1);
}