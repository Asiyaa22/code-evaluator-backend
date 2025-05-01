import { clearFolder } from "./clearFolder.js";
import { extractZip } from "./utils.js";
import { saveExpectedFiles } from "./utils.js";
import { evaluateAllSubmissions } from "./evaluate.js";
import fs from "fs";

// This function can be called from Express API
export const runEvaluation = async ({
  zipPath,
  expectedHtmlPath,
  expectedCssPath,
  rubricJson
}) => {
  try {
    console.log("🚀 Starting evaluation...");

    // Step 1: Clear previous data
    clearFolder("./submissions");
    clearFolder("./outputs");
    fs.mkdirSync("./expected", { recursive: true });

    // Step 2: Save expected files
    saveExpectedFiles(expectedHtmlPath, expectedCssPath);
    console.log("✅ Expected files saved.");

    // Step 3: Extract ZIP
    await extractZip(zipPath, "./submissions");
    console.log("📦 Student submissions extracted.");

    // Step 4: Parse rubric
    if (!rubricJson) {
      throw new Error("Rubric JSON is required.");
    }

    let rubric;
    try {
      rubric = JSON.parse(rubricJson);
    } catch (err) {
      throw new Error("Invalid rubric JSON.");
    }

    // Step 5: Run evaluation
    await evaluateAllSubmissions("./submissions", rubric);
    console.log("✅ Evaluation complete.");

    return {
      success: true,
      csvPath: "./outputs/results.csv"
    };
  } catch (err) {
    console.error("❌ Evaluation failed:", err.message);
    throw err;
  }
};
