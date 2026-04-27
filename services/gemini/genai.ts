import { GoogleGenAI } from "@google/genai";
import { recordTokenUsage } from "./config";

/**
 * Gets a configured instance of GoogleGenAI that uses the local proxy. 
 * Prevents client-side exposure of the API key while preserving the SDK experience.
 */
export const getProxyConfiguredGenAI = (useCase?: 'plan' | 'chat' | 'image' | 'learning' | 'default'): GoogleGenAI => {
  // Use a placeholder key to pass client validation, the real key is 
  // injected by the Netlify function (gemini-proxy.mts).
  const ai = new GoogleGenAI({
    apiKey: 'PROXY_KEY_MANAGED_BY_SERVER',
    httpOptions: {
      baseUrl: window.location.origin + '/api/gemini',
      // Pass the use-case to the proxy so it can select the correct key
      headers: useCase ? { 'x-gemini-use-case': useCase } : {}
    }
  });

  // Intercept generateContent calls to record token usage
  const originalGenerateContent = ai.models.generateContent.bind(ai.models);
  ai.models.generateContent = async (options: any) => {
    const response = await originalGenerateContent(options);
    recordTokenUsage(response);
    return response;
  };
  
  // Intercept generateContentStream calls to record token usage
  const originalGenerateContentStream = ai.models.generateContentStream.bind(ai.models);
  ai.models.generateContentStream = async (options: any) => {
    const stream = await originalGenerateContentStream(options);
    
    async function* wrappedStream() {
      for await (const chunk of stream) {
        if (chunk.usageMetadata) {
          recordTokenUsage(chunk);
        }
        yield chunk;
      }
    }
    
    return wrappedStream() as any;
  };

  return ai;
};
