import dotenv from 'dotenv';
dotenv.config();

// Polyfill browser globals for node test environment
(global as any).localStorage = {
  store: {} as Record<string, string>,
  getItem(k: string) { return this.store[k] || null; },
  setItem(k: string, v: string) { this.store[k] = v; },
  removeItem(k: string) { delete this.store[k]; }
};

import { fetchEducationalVideos } from '../src/services/api/youtubeService';

async function testFull() {
  console.log('--- Testing Full Educational Videos Discovery Pipeline ---');

  const topic = 'Rust toolchain management, Cargo projects, and Rust fundamentals';
  const subject = 'Beginner Rust Learning Plan';

  console.log(`Searching videos for Topic: "${topic}" | Subject: "${subject}"`);
  const start = performance.now();
  const videos = await fetchEducationalVideos(topic, subject);
  const duration = (performance.now() - start).toFixed(0);

  console.log(`\nFound ${videos.length} curated videos in ${duration}ms:`);
  videos.forEach((v, idx) => {
    console.log(`\n${idx + 1}. [${v.videoId}] ${v.title}`);
    console.log(`   Channel: ${v.channelTitle} | Views: ${v.viewCount}`);
    console.log(`   Reason: ${v.reason} | Score: ${v.relevanceScore}`);
    console.log(`   Watch URL: https://www.youtube.com/watch?v=${v.videoId}`);
    console.log(`   Thumbnail: ${v.thumbnail}`);
  });

  console.log('\n--- Testing Caching (Second Call) ---');
  const cacheStart = performance.now();
  const cachedVideos = await fetchEducationalVideos(topic, subject);
  const cacheDuration = (performance.now() - cacheStart).toFixed(0);
  console.log(`Cached call returned ${cachedVideos.length} videos in ${cacheDuration}ms (instant from cache!)`);
}

testFull().catch(console.error);
