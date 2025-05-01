import fs from "fs";
import path from "path";

export const clearFolder = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    console.log(`Folder ${folderPath} doesn't exist. Creating...`);
    fs.mkdirSync(folderPath, { recursive: true });
    return;
  }
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
  }
  console.log(`✅ Cleared folder: ${folderPath}`);
};
