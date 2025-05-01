import fs, { writeFileSync } from "fs";
import { evaluateWithGemini } from "./gemini.js";

let results = [];
export const evaluateAllSubmissions = async (submissionDir, rubric) => {
  // post-fix
  let studentFolders = fs.readdirSync(submissionDir);

  // Check if there's only one folder inside (i.e., the wrapper)
  //okay so this code handles if the zip folder is nested or not
  //works for whole folder
  if (studentFolders.length === 1) {
    const maybeNested = `${submissionDir}/${studentFolders[0]}`;
    if (fs.statSync(maybeNested).isDirectory()) {
      console.log("🧭 Using nested folder:", maybeNested);
      studentFolders = fs
        .readdirSync(maybeNested)
        .map((name) => `${studentFolders[0]}/${name}`);
    }
  }

  //printing students code folders basic
  console.log("👀 Student folders found:", studentFolders);
  //sunction to find student folder
  //works for individual student folder
  const findStudentCodeFolder = (studentFolderPath) => {
    if (fs.existsSync(`${studentFolderPath}/index.html`)) {
      return studentFolderPath;
    }
    const items = fs.readdirSync(studentFolderPath);
    if (
      items.length === 1 &&
      fs.statSync(`${studentFolderPath}/${items[0]}`).isDirectory()
    ) {
      const nestedPath = `${studentFolderPath}/${items[0]}`;
      if (fs.existsSync(`${nestedPath}/index.html`)) {
        return nestedPath;
      }
    }
    return null; // No code found
  };

  //looping through each student folder
  for (const student of studentFolders) {
    const studentPath = `${submissionDir}/${student}`;
    //now this
    const codeFolder = findStudentCodeFolder(studentPath);
    if (!codeFolder) {
      console.warn(`⚠️ Skipping ${student} — no index.html found`);
      continue;
    }
    //finding if html file is present or not
    const files = fs.readdirSync(codeFolder);

    let htmlFile = files.find((file) => file.toLowerCase() === "index.html");
    if (!htmlFile) {
      htmlFile = files.find((file) => file.toLowerCase().endsWith(".html"));
    }

    let cssFile = files.find((file) => file.toLowerCase() === "style.css");
    if (!cssFile) {
      cssFile = files.find((file) => file.toLowerCase().endsWith(".css"));
    }
    const htmlPath = `${codeFolder}/${htmlFile}`;
    const cssPath = cssFile ? `${codeFolder}/${cssFile}` : null;
    console.log("this is html path", htmlPath);
    console.log("this is css path", cssPath);

    const html = fs.existsSync(htmlPath)
      ? fs.readFileSync(htmlPath, "utf-8")
      : "";

    const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf-8") : "";

    let missingFilesNote = "";
    
    if(!html.trim() && !css.trim()){
      missingFilesNote = "Both HTML and CSS files are missing";
    }else if(!html.trim()){
      missingFilesNote = "HTML file is Missing"; 
    }else if(!css.trim()){
      missingFilesNote = "CSS file is Missing";
    }else {
      missingFilesNote = "Files found.";
    }
    //missing files logic sorted

    //now moving to flag for manual correction
    let needsManualCorrection = "No";

    if(html.length < 15 || css.length < 4){
      needsManualCorrection = "Yes";
    }
    

    console.log("now moving to run evaluateStudent() then will log the result");
    // const result = await evaluateStudent(html, css, rubric, studentName);
    //printing rubric
    console.log("Rubric in evaluate", rubric);
    try {
      const result = await evaluateStudent(html, css, rubric, student);
      console.log(`📄 Result for ${student}:`, result);
      results.push({
        student: student,
        result: result, // this is the full Gemini response text
        missingFilesNote: missingFilesNote,
        needsManualCorrection: needsManualCorrection
      });
    } catch (err) {
      console.error(`❌ Error while evaluating ${student}:`, err.message);
      return "Gemini API error";
    }
    // console.log(`Student result:`, result);
  }

  //creating csv format taake it should not break
  // let csvContent = "Student,Result\n";

  // Creating CSV format with summary this is actaul header
let csvContent = "Student,Marks,Feedback,Missing Files,Needs Manual Correction\n";


// Function to sanitize feedback for CSV
function sanitizeCsv(text) {
  if (!text) return "";
  return text
    .replace(/"/g, '""')    // Escape double quotes
    .replace(/\n/g, ' | ')  // Replace newlines with a pipe for cleaner Excel view
    .replace(/\r/g, '');    // Remove carriage returns if any
}
// Loop through results and format the CSV rows
results.forEach((entry) => {
  // Extract total marks (assuming it's in the format "X/20")
  // const totalMarksMatch = entry.result.match(/Total Marks: (\d+\/20)/);
  //the above code is giving n/a in ouput results so the corrected code is below with proper regex
  // Use the updated regex to capture the total marks
  const totalMarksMatch = entry.result.match(/Total Marks: (\d+)\/(\d+)/);
  const totalMarks = totalMarksMatch ? totalMarksMatch[1] : "N/A";
  
  // Extract feedback summary from the breakdown
  // const feedbackMatch = entry.result.match(/- Structure:.*?([^.]+)\./);
  // const feedback = feedbackMatch ? feedbackMatch[1] : "No feedback available";
  //this code (above wala) will only give first content of feedback not the whole summarry to get detailed feedback this is code
  
  const breakdownMatch = entry.result.match(/Breakdown:(.*)/s);
  const feedback = breakdownMatch ? breakdownMatch[1].trim() : "NO detailed feedback available";

  // Add to CSV
  //this is csv row header basically
  csvContent += `"${entry.student}","${totalMarks}","${sanitizeCsv(feedback)}","${entry.missingFilesNote}","${entry.needsManualCorrection}"\n`;
  // csvContent += `"${entry.student}","${totalMarks}","${feedback.replace(/"/g, "'")}", "${entry.missingFilesNote}", "${entry.needsManualCorrection}"\n`;
});

// Write to file
// fs.writeFileSync("./outputs/results_summary.csv", csvContent);
// console.log("✅ Results saved to outputs/results_summary.csv");

  // results.forEach((entry) => {
  //   const sanitizedResult = entry.result.replace(/"/g, "'").replace(/\n/g, " ");
  //   csvContent += `"${entry.student}","${sanitizedResult}"\n`;    
  // });

  fs.writeFileSync("./outputs/results.csv", csvContent);
  console.log("✅ Results saved to outputs/results.csv");
};

//brain to gemini connector
export const evaluateStudent = async (html, css, rubric, studentName) => {

  //getting total marks 
  const totalMarks = Object.values(rubric).reduce((sum, val) => sum + val, 0);


  const expectedHtml = fs.readFileSync("./expected/index.html", "utf-8");
  const expectedCss = fs.readFileSync("./expected/style.css", "utf-8");
  

  const rubricText = Object.entries(rubric)
    .map(([key, value]) => `- ${key.replaceAll("_", " ")} (${value} marks)`)
    .join("\n");

  let prompt = `
You are an AI Code Evaluator and Corrector for student assignments.

Below is the official **Expected Output** code for this assignment:
(Expected HTML):
${expectedHtml}

(Expected CSS):
${expectedCss}

Below is the **Student's Submission**:
(Student HTML):
${html}

(Student CSS):
${css}

Rubric (Marks out of ${totalMarks}):
${rubricText}

Evaluation Instructions:

STRICT RULES:
1. If the student's HTML is critically broken (missing <!DOCTYPE html>, missing <html> or <body> tags, wrong nesting, unclosed tags), give **zero marks for structure and boilerplate setup**.
2. If student's CSS file is missing or empty, **assign zero marks for all styling-related criteria** immediately.
3. If major sections like navbar, forms, footer, or main content are missing, **deduct heavily (minimum 50% of total marks)**.
4. If less than 30% of expected content is implemented, **cap the total marks to maximum 4 out of ${totalMarks}** regardless of minor efforts.
5. Use no mercy policy for:
   - Missing structure
   - Broken nesting
   - Empty or missing CSS
6. If indentation, readability, and file organization are poor, **apply further deduction**.
7. Minor cosmetic differences (like colors, font families) are **acceptable** if structure and content are correct.
8. Suggest constructive improvements at the end, but do not artificially boost the score to be encouraging.
9. Award marks proportionate to actual quality — focus on *correctness*, *structure*, *content matching*, *semantic usage*, and *basic CSS application*.
10. Be strict but fair — students need to learn accurate coding, not be falsely praised.

Important Additional Notes:
- If a student has made critical mistakes but shown strong attempt in SOME sections (like basic navbar setup or form implementation), reward proportionally within that section only.
- For any submission missing BOTH HTML and CSS significantly, **the final mark should not exceed 2 or 3 out of ${totalMarks}.**


FINAL RESPONSE FORMAT:
Student: ${studentName}
Total Marks: X/${totalMarks}
Breakdown:
 project_setup_and_file_structure: 1
 boilerplate_html_structure: 1
 code_indentation_and_formatting: 1
 box_sizing_border_box: 1
 body_dimensions_and_font_family_set_to_sans-serif: 2
 use_of_common_classes: 1
 correct_pre_and_code_tags: 1
 consistent_spacing_layout_effectively_using_padding_margin: 1
 link_styling_and_navigation: 2
 button_styling_with_inheritance: 1
 nth_child_selector_usage: 2
 pseudo_class_selector_usage: 2
 pseudo_element_selector_usage: 1
 applying_selection_style_correctly: 2
 overall_pseudo_selectors_implementation: 1
`;

//if no css file
if (!css.trim().length === 0) {
  prompt += `
IMPORTANT:
- The student's CSS file is missing or empty. 
- Please deduct marks in styling-related rubric items.
- Assume their webpage will have no styling.
- Penalize accordingly.
`;
}

  try {
    const response = await evaluateWithGemini(prompt);
    console.log(response);
    return response;
  } catch (err) {
    console.error("❌ Gemini API Error:", err.message);
   return `Error evaluating ${studentName}`;
  }
};

//Pro=tip we can use promises instead of for of to make it faster
