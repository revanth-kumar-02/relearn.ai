import dotenv from 'dotenv';
dotenv.config();

async function runDiagnostic() {
  console.log('=== PHASE 2 & 3: YOUTUBE API DIAGNOSTIC ===');
  
  const envKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY || '';
  console.log('Environment variable check:');
  console.log('YOUTUBE_API_KEY set:', !!process.env.YOUTUBE_API_KEY);
  console.log('VITE_YOUTUBE_API_KEY set:', !!process.env.VITE_YOUTUBE_API_KEY);
  console.log('Key length:', envKey.length);
  console.log('Key prefix:', envKey.substring(0, 8) + '...');

  const queries = [
    'Rust programming tutorial for beginners',
    'Rust installation and development environment setup',
    'Rust Cargo project tutorial',
    'Rust ownership and borrowing explained',
    'Rust structs and enums tutorial',
    'Rust error handling tutorial',
  ];

  console.log('\n--- Testing Official YouTube Data API Search Endpoint ---');
  for (const q of queries) {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('q', q);
    url.searchParams.set('maxResults', '10');
    url.searchParams.set('videoEmbeddable', 'true');
    url.searchParams.set('safeSearch', 'moderate');
    url.searchParams.set('key', envKey);

    try {
      const res = await fetch(url.toString());
      const data: any = await res.json();
      console.log(`\nQuery: "${q}"`);
      console.log('HTTP Status:', res.status);
      if (!res.ok) {
        console.log('API Error Code:', data.error?.code);
        console.log('API Error Message:', data.error?.message);
        console.log('API Reason:', data.error?.errors?.[0]?.reason);
        console.log('Status Detail:', data.error?.status);
      } else {
        console.log('Item count:', data.items?.length || 0);
        const first = data.items?.[0];
        if (first) {
          console.log('First video ID:', first.id?.videoId);
          console.log('First Title:', first.snippet?.title);
          console.log('First Channel:', first.snippet?.channelTitle);
          console.log('First Thumbnail:', !!first.snippet?.thumbnails?.medium?.url);
        }
      }
    } catch (e: any) {
      console.error('Fetch error:', e.message);
    }
  }
}

runDiagnostic().catch(console.error);
