import dotenv from 'dotenv';
import { parseResumeFromPDF } from '../src/lib/ai/gemini.js';

dotenv.config();

// Override the API key temporarily to test the newly discovered key
process.env.GOOGLE_API_KEY = "AIzaSyA_yJciA_aD_oblIo8_7E8Q1GMcr_s6nJ4";

async function test() {
  console.log("Testing with GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY);
  const dummyBuffer = Buffer.from("dummy pdf content");
  
  try {
    const result = await parseResumeFromPDF(dummyBuffer, 'application/pdf');
    console.log("Result:", result);
  } catch (err) {
    console.error("Error caught in test:", err);
  }
}

test();
