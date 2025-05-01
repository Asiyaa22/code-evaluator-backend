import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import env from "dotenv";
import { runEvaluation } from "./index.js";

env.config();

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(express.urlencoded({ extended: true}));

// Serve the results.csv file
app.use("/outputs", express.static(path.join(process.cwd(), "outputs")));

// Main route for GPT/API to call
app.post("/evaluate", upload.fields([
  { name: "zip_file", maxCount: 1 },
  { name: "expected_html", maxCount: 1 },
  { name: "expected_css", maxCount: 1 }
]), async (req, res) => {
  try {
    const zipFile = req.files["zip_file"]?.[0];
    const expectedHtml = req.files["expected_html"]?.[0];
    const expectedCss = req.files["expected_css"]?.[0];
    const rubricJson = req.body.rubric;

    console.log("FILES RECEIVED:", req.files);
    console.log("BODY RECEIVED:", req.body);


    // Validate required inputs
    if (!zipFile || !expectedHtml || !expectedCss) {
      return res.status(400).json({
        error: "Missing file(s). Please upload ZIP, expected HTML, and expected CSS."
      });
    }

    if (!rubricJson) {
      return res.status(400).json({
        error: "Missing grading criteria. Please provide rubric as JSON."
      });
    }

    // Run the full evaluation pipeline
    const result = await runEvaluation({
      zipPath: zipFile.path,
      expectedHtmlPath: expectedHtml.path,
      expectedCssPath: expectedCss.path,
      rubricJson: rubricJson
    });

    // Respond with the CSV file URL
    return res.json({
      summary: "✅ Evaluation complete.",
      csv_url: `${req.protocol}://${req.get("host")}/outputs/results.csv`,
      flagged_students: [] // Add later if you want to track flags
    });

  } catch (err) {
    console.error("❌ Evaluation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 AI Evaluator backend running on http://localhost:${PORT}`);
});
