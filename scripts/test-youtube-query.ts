import dotenv from 'dotenv';
dotenv.config();

import { generateAI } from '../src/services/ai/pipeline';

async function testQueryGen() {
  const cleanTopic = 'Rust toolchain management, Cargo projects, and Rust fundamentals';
  const subject = 'Beginner Rust Learning Plan';
  const videoLanguage = 'English';

  const systemPrompt = `You are a YouTube search query optimizer for educational content.
Given a lesson topic and its broader subject, return a single search query (4-8 words) that will find the best beginner-friendly tutorial or explanation video on YouTube.

Rules:
- Return ONLY the search query string, nothing else. Do not output anything like "Here is the query".
- Never include words like "AI", "Generated", "Day X", or conversational text.
- Include the technology/language if provided.
- Favor terms like "tutorial", "for beginners", "step by step".
- Be specific and concise (4 to 8 words). Do not repeat the language twice.`;

  const prompt = `<topic_input>${cleanTopic}</topic_input>\n<subject_input>${subject}</subject_input>\n<language_input>${videoLanguage}</language_input>`;

  const response = await generateAI({
    task: 'youtube_query',
    prompt,
    systemPrompt,
    options: {
      temperature: 0.1,
      maxTokens: 250,
    },
  });

  console.log('Response Object:', JSON.stringify(response, null, 2));
}

testQueryGen().catch(console.error);
