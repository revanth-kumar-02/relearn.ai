import dotenv from 'dotenv';
dotenv.config();

(global as any).localStorage = {
  store: {} as Record<string, string>,
  getItem(k: string) { return this.store[k] || null; },
  setItem(k: string, v: string) { this.store[k] = v; },
  removeItem(k: string) { delete this.store[k]; }
};

import { fetchEducationalVideos } from '../src/services/api/youtubeService';

async function testMultipleTopics() {
  const cases = [
    { topic: 'Rust ownership, borrowing, and lifetimes', subject: 'Rust Programming' },
    { topic: 'Flutter state management with Provider', subject: 'Flutter & Dart' },
    { topic: 'Python list comprehensions and generators', subject: 'Python Complete Guide' }
  ];

  for (const c of cases) {
    console.log(`\n========================================`);
    console.log(`Testing topic: "${c.topic}" (${c.subject})`);
    const videos = await fetchEducationalVideos(c.topic, c.subject);
    console.log(`Found ${videos.length} videos:`);
    videos.slice(0, 3).forEach((v, i) => {
      console.log(`  ${i + 1}. [${v.videoId}] ${v.title} (${v.channelTitle})`);
      console.log(`     Reason: ${v.reason} | Score: ${v.relevanceScore}`);
    });
  }
}

testMultipleTopics().catch(console.error);
