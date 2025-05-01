import env from "dotenv"
import { GoogleGenerativeAI } from "@google/generative-ai";

env.config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
export const evaluateWithGemini = async(prompt) => {
    // const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});
    // const result = await model.generateContent(prompt);
    // console.log("code is evaluated by gem")
    // const text = response.result.candidates[0].content.parts[0].text;
    // return text;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
        const result = await model.generateContent(prompt);
    
        const text = result.response.candidates[0].content.parts[0].text;
        console.log("code is evaluated by gem");
        return text;
      } catch (err) {
        console.error("❌ Gemini API Error:", err.message);
        return "❌ Gemini API Error";
      }
}