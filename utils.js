//loadRubric
import AdmZip from "adm-zip";
// import fs from "fs";
// import yaml from "yaml";// utils.js

import fs from "fs";
import path from "path";

export const saveExpectedFiles = async(htmlFilePath, cssFilePath) => {
  const expectedDir = "./expected";
  fs.mkdirSync(expectedDir, { recursive: true });

  if (htmlFilePath) {
    fs.renameSync(htmlFilePath, path.join(expectedDir, "index.html"));
  }
  if (cssFilePath) {
    fs.renameSync(cssFilePath, path.join(expectedDir, "style.css"));
  }
};

// export const loadRubric = (filePath) => {
//    const file = fs.readFileSync(filePath, "utf-8");
//    const data = yaml.parse(file);
   // console.log("Data from utils is:", data);
//    return data.rubric;
// };


//extracting Zip file
export const extractZip = async(zipPath, targetDir) => {
   const zip = new AdmZip(zipPath);
   // let zipEntries = zip.getEntries();
   //Extracting everything
   zip.extractAllTo(targetDir, true);
};