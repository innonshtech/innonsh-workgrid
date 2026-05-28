import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    const API_KEY = process.env.GOOGLE_API_KEY;
    console.log("Key starting with:", API_KEY ? API_KEY.substring(0, 5) + "..." : "undefined");
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    try {
        console.log("Fetching available models...");
        // Using the REST API directly to list models since the JS SDK's listModels might be less reliable in older packages
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();
        const models = data.models || [];
        
        console.log("Total models available:", models.length);
        const generateModels = models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace('models/', ''));
            
        console.log("Models supporting generateContent: ", generateModels);
    } catch (e) {
        console.error("Failed to list models:", e);
    }
}

run();
