import { GoogleGenAI } from "@google/genai";

async function testModel() {
  const ai = new GoogleGenAI({
    apiKey: "AIzaSyBy5kDFPWsjNPo5TOLqQxahf5qxLA0JT7w",
  });
  
  const modelName = "gemini-2.0-flash";
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: 'test' }] }]
    });
    console.log(`TEST_RESULT:${modelName}:SUCCESS`);
  } catch (e: any) {
    console.log(`TEST_RESULT:${modelName}:FAILED:${e.message || e.toString()}`);
  }
}

testModel();
