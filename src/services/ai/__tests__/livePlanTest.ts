/**
 * ─────────────────────────────────────────────────────────────────
 *  Real Live End-to-End Test for Learning Plan Generation
 * ─────────────────────────────────────────────────────────────────
 *
 *  Executes ONE real learning plan generation via generateLearningPlan()
 *  using AI_PROVIDER=huggingface and Qwen/Qwen3-Next-80B-A3B-Instruct.
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
  console.log(`  - HF Base URL: ${config.hfBaseUrl}`);
  console.log(`  - Target Model for Task 'learning_plan': ${config.modelMappings.hfQwenModelName}\n`);

  console.log('Invoking generateLearningPlan for "Modern Web Security with OWASP Top 10" (3-day plan)...');
  const startTime = performance.now();

  try {
    const resultJson = await generateLearningPlan(
      'Modern Web Security with OWASP Top 10',
      3,
      'Intermediate',
      undefined,
      'English',
      'Student has 1 year of JavaScript experience and wants to secure REST APIs.'
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
