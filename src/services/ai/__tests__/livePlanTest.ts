/**
 * ─────────────────────────────────────────────────────────────────
 *  Real Live End-to-End Test for Learning Plan Generation
 * ─────────────────────────────────────────────────────────────────
 *
 *  Executes ONE real learning plan generation via generateLearningPlan()
 *  using Groq (primary) or OpenRouter (fallback) with GPT-OSS 120B.
 */

import { generateLearningPlan } from '../planGeneratorService';
import { getAIRuntimeConfig } from '../pipeline/config/runtimeConfig';

async function runLivePlanTest() {
  console.log('==================================================');
  console.log('   REAL LIVE LEARNING PLAN GENERATION TEST        ');
  console.log('==================================================\n');

  const config = getAIRuntimeConfig();
  console.log('Runtime Configuration:');
  console.log(`  - Active Provider: ${config.provider}`);
  console.log(`  - Groq Base URL: ${config.groqBaseUrl}`);
  console.log(`  - Target Model for Task 'learning_plan': ${config.groqDefaultModel}\n`);

  console.log('Invoking generateLearningPlan for "flutter" (70-day plan)...');
  const startTime = performance.now();

  try {
    const resultJson = await generateLearningPlan(
      'flutter',
      70,
      'Beginner',
      undefined,
      'English'
    );

    const durationMs = Math.round(performance.now() - startTime);
    const parsed = JSON.parse(resultJson);

    console.log('\n[SUCCESS] Plan Generated and Validated:');
    console.log(`  - Plan Title: "${parsed.title}"`);
    console.log(`  - Description: "${parsed.description}"`);
    console.log(`  - Total Days: ${parsed.days.length}`);
    console.log(`  - Total Latency: ${durationMs}ms\n`);

    console.log('Generated Curriculum:');
    parsed.days.forEach((day: any) => {
      console.log(`  Day ${day.day}: ${day.topic}`);
      console.log(`    Guidance: ${day.guidance}`);
    });

    console.log('\n==================================================');
    console.log('   REAL LEARNING PLAN TEST COMPLETED CLEANLY      ');
    console.log('==================================================\n');
  } catch (err) {
    console.error('Live Plan Generation Failed:', err);
    process.exit(1);
  }
}

runLivePlanTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
