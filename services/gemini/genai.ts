import { GoogleGenAI } from "@google/genai";

/**
 * Gets a configured instance of GoogleGenAI that uses the local proxy. 
 * Prevents client-side exposure of the API key while preserving the SDK experience.
 */
export const getProxyConfiguredGenAI = (useCase?: 'plan' | 'chat' | 'image' | 'learning' | 'default'): GoogleGenAI => {
  // Use a placeholder key to pass client validation, the real key is 
  // injected by the Netlify function (gemini-proxy.mts).
  return new GoogleGenAI({
    apiKey: 'PROXY_KEY_MANAGED_BY_SERVER',
    httpOptions: {
      baseUrl: window.location.origin + '/api/gemini',
      // Pass the use-case to the proxy so it can select the correct key
      headers: useCase ? { 'x-gemini-use-case': useCase } : {}
    }
  });
};
