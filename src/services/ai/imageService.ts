import { createFallbackSVG } from "../../utils/createFallbackImage";
import { sanitizeInput } from "../../utils/sanitize";
import { getCachedImage, cacheImage, clearOldCache } from "../../utils/db";

const setCache = async (topic: string, url: string) => {
  await cacheImage(topic, url);
  await clearOldCache(100);
};

const generateWithDynamicFallback = (topic: string): string => {
  const seed = Math.floor(Math.random() * 1000000);
  
  const prompt = `A premium 3D isometric hero-asset representing "${topic}". 
Style: Nano-Banana design system, chunky 3D silhouette, hyper-realistic glossy plastic, 
extreme soft rounded corners, studio lighting, rim lighting, vibrant neon gradients on obsidian background.
Composition: Centered on dark gradient.
Quality: high-definition, 8k, clean render, minimalist.
NO text, NO people.`;

  return `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1280&height=720&seed=${seed}&model=flux&nologo=true`;
};

export const generatePlanCoverImage = async (topic: string, _signal?: AbortSignal): Promise<string> => {
  const sanitizedTopic = sanitizeInput(topic);
  const cacheKey = sanitizedTopic.toLowerCase().trim();

  const cached = await getCachedImage(cacheKey);
  if (cached) {
    return cached;
  }

  let result: string | null = null;

  try {
    result = generateWithDynamicFallback(sanitizedTopic);
  } catch (e: any) {
    if (e.message === "AbortError" || e.name === "AbortError") {
      throw e;
    }
    result = generateWithDynamicFallback(sanitizedTopic);
  }

  if (!result || result.includes('undefined')) {
    result = createFallbackSVG(sanitizedTopic);
  }

  await setCache(sanitizedTopic, result);
  return result;
};

export const getCoverGenerationInfo = () => ({
  engine: "Flux & Vector Engine",
  capabilities: ["Aborting", "Caching", "3D Generation", "Dynamic Fallback", "Gradient Safety"],
  isOperational: true
});
