import { AI_MODELS } from "./config";
import { createFallbackSVG } from "../utils/createFallbackImage";
import { getProxyConfiguredGenAI } from "./genai";
import { sanitizeInput } from "../utils/sanitize";

/**
 * ─── SECTION 1: NANO BANANA INTEGRATION ────────────────────────────
 */

const NANO_BANANA_TIMEOUT_MS = 15000;
import { getCachedImage, cacheImage, clearOldCache } from "../../utils/db";

const setCache = async (topic: string, url: string) => {
  await cacheImage(topic, url);
  await clearOldCache(100); // Allow much larger cache (100 items instead of 20)
};

const generateNanoBananaPrompt = (topic: string): string => {
  return `Super-premium, hyper-realistic 3D digital art for "${topic}" in the signature "Nano Banana" design system. 
Style: Bold 3D chunky silhouette, glossy injection-molded plastic finish, extreme soft-radius rounded corners, volumetric isometric view. 
Composition: Centered hero-asset, minimalist pop-art layout. 
Lighting: Studio lighting with rim-light, realistic subsurface scattering, ray-traced reflections. 
Materials: Matte-finish polymer bodies with high-gloss liquid-chrome accents. Vibrant neon gradients on dark obsidian.
Background: Uniform studio dark gradient.
Strict Restrictions: NO text, NO labels, NO humans, NO photography, NO noise.
Quality: 8k resolution, award-winning 3D design.`;
};

const generateWithNanoBanana = async (topic: string, signal?: AbortSignal): Promise<string | null> => {
  const ai = getProxyConfiguredGenAI('image');
  const prompt = generateNanoBananaPrompt(sanitizeInput(topic));

  try {
    console.log(`[CoverGen] [Tier 1] Calling Nano Banana for: ${topic}...`);

    const result = await Promise.race([
      (async () => {
        const responsePromise = ai.models.generateContent({
          model: AI_MODELS.PRIMARY, // S5: Use centralized model ID
          contents: prompt,
          config: {
            responseModalities: ['TEXT'],
          }
        });

        const response = await (signal ? Promise.race([
          responsePromise,
          new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(new Error("AbortError")), { once: true });
          })
        ]) : responsePromise) as any;

        const candidate = response.candidates?.[0];
        const parts = (candidate?.content?.parts as any[]);
        const part = parts?.find(p => p.inlineData?.data);

        if (part?.inlineData?.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        return null;
      })(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Nano Banana API timeout')), NANO_BANANA_TIMEOUT_MS)
      )
    ]);

    if (result) {
      console.log('[CoverGen] ✅ Nano Banana success!');
      return result;
    }
  } catch (error: any) {
    if (error.message === "AbortError") throw error;
    console.warn(`[CoverGen] ⚠️ Nano Banana failed: ${error.message}`);
  }

  return null;
};

const generateWithOpenAI = async (topic: string, signal?: AbortSignal): Promise<string | null> => {
  try {
    console.log(`[CoverGen] [Tier 2] Calling OpenAI DALL-E 3 for: ${topic}...`);

    const response = await fetch('/api/openai/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: signal,
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `A beautiful, modern 3D isometric illustration of "${topic}" for a learning platform. High quality, soft lighting, vibrant colors, premium design aesthetic.`,
        n: 1,
        size: "1024x1024",
      })
    });

    if (!response.ok) throw new Error(`OpenAI Proxy error: ${response.status}`);

    const data = await response.json();
    const url = data.data?.[0]?.url;

    if (url) {
      console.log('[CoverGen] ✅ OpenAI success!');
      return url;
    }
  } catch (error: any) {
    if (error.name === "AbortError") throw error;
    console.warn(`[CoverGen] ⚠️ OpenAI failed: ${error.message}`);
  }

  return null;
};

const generateWithDynamicFallback = (topic: string): string => {
  console.log(`[CoverGen] [Tier 3] Providing Dynamic Fallback URL for: ${topic}...`);
  const seed = Math.floor(Math.random() * 1000000);
  return `https://pollinations.ai/p/${encodeURIComponent(topic + " 3d high-gloss chunky isometric digital art, soft rounded corners, premium textures, studio lighting, abstract concept, vibrant colors, obsidian background")}?width=1280&height=720&seed=${seed}&model=flux&nologo=true`;
};

export const generatePlanCoverImage = async (topic: string, signal?: AbortSignal): Promise<string> => {
  const sanitizedTopic = sanitizeInput(topic);
  const cacheKey = sanitizedTopic.toLowerCase().trim();

  const cached = await getCachedImage(cacheKey);
  if (cached) {
    console.log(`[CoverGen] ⚡ Serving from IndexedDB: ${sanitizedTopic}`);
    return cached;
  }

  let result: string | null = null;

  try {
    // Tier 1: Nano Banana
    result = await generateWithNanoBanana(sanitizedTopic, signal);

    if (!result) {
      // Tier 2: OpenAI
      result = await generateWithOpenAI(sanitizedTopic, signal);
    }

    if (!result) {
      // Tier 3: Dynamic Fallback
      result = generateWithDynamicFallback(sanitizedTopic);
    }
  } catch (e: any) {
    if (e.message === "AbortError" || e.name === "AbortError") {
      console.log("[CoverGen] Request aborted.");
      throw e;
    }
    result = generateWithDynamicFallback(sanitizedTopic);
  }

  if (!result || result.includes('undefined')) {
    console.warn('[CoverGen] 🛑 All remote tiers failed. Using local gradient safety net.');
    result = createFallbackSVG(sanitizedTopic);
  }

  await setCache(sanitizedTopic, result);
  return result;
};

export const getCoverGenerationInfo = () => ({
  engine: "Nano Banana Hybrid",
  capabilities: ["Aborting", "Caching", "3D Generation", "Dynamic Fallback", "Gradient Safety"],
  isOperational: true
});
