import { AI_MODELS } from "./config";
import { createFallbackSVG } from "../utils/createFallbackImage";
import { getProxyConfiguredGenAI } from "./genai";
import { sanitizeInput } from "../utils/sanitize";
import { getAuthHeaders } from "../utils/auth";

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
Focus: Ensure the visual representation of "${topic}" is extremely clear and accurate.
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
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
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



const generateWithDynamicFallback = (topic: string): string => {
  console.log(`[CoverGen] [Tier 3] Providing Dynamic Fallback (FLUX) for: ${topic}...`);
  const seed = Math.floor(Math.random() * 1000000);
  
  // Refined prompt to match Nano Banana style on Flux
  const prompt = `A premium 3D isometric hero-asset representing "${topic}". 
Style: Nano-Banana design system, chunky 3D silhouette, hyper-realistic glossy plastic, 
extreme soft rounded corners, studio lighting, rim lighting, vibrant neon gradients on obsidian background.
Composition: Centered on dark gradient.
Quality: high-definition, 8k, clean render, minimalist.
NO text, NO people.`;

  return `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=1280&height=720&seed=${seed}&model=flux&nologo=true`;
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
    // Tier 1: Dynamic Fallback (FLUX) - Primary now because it's high quality and free
    result = generateWithDynamicFallback(sanitizedTopic);
    
    // We don't actually need to "await" the above as it's just a URL, 
    // but if we wanted to verify it, we could. For now, it's our primary.

    /* 
    // Optional: Keep Nano Banana as a secondary/premium option if needed
    if (!result) {
      result = await generateWithNanoBanana(sanitizedTopic, signal);
    }
    */
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
