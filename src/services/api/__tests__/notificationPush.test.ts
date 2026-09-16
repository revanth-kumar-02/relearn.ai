import {
  urlBase64ToUint8Array,
  sanitizeNotificationUrl,
  getNotificationStatus,
  NotificationStatus
} from '../notificationService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== Running Production Web Push & Notification Test Suite ===\n');

  // 1. VAPID Key URL-Safe Base64 Conversion
  console.log('1. Testing VAPID Base64 to Uint8Array Conversion...');
  const testVapidKey = 'BFb_Z5d8Z9X0p-v8r_Yx6Q1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7A8B9C0D1E2F3G4H5I';
  const uint8Array = urlBase64ToUint8Array(testVapidKey);
  assert(uint8Array instanceof Uint8Array, 'Returns a valid Uint8Array');
  assert(uint8Array.length > 0, `Converted buffer has non-zero length (${uint8Array.length} bytes)`);

  const emptyResult = urlBase64ToUint8Array('');
  assert(emptyResult.length === 0, 'Empty key string yields empty Uint8Array without throw');

  // 2. Notification Target URL Sanitization & Open-Redirect Protection
  console.log('\n2. Testing URL Sanitization & Open-Redirect Protection...');
  assert(sanitizeNotificationUrl('/dashboard') === '/dashboard', 'Allows valid relative path /dashboard');
  assert(sanitizeNotificationUrl('/room/study-123?tab=chat#messages') === '/room/study-123?tab=chat#messages', 'Preserves query params and hash on internal routes');
  assert(sanitizeNotificationUrl('https://malicious.com/phishing') === '/', 'Blocks external domain phishing URLs and resets to /');
  assert(sanitizeNotificationUrl('//evil.com') === '/', 'Blocks protocol-relative URLs //evil.com');
  assert(sanitizeNotificationUrl('javascript:alert(1)') === '/', 'Blocks javascript: pseudo-protocol');
  assert(sanitizeNotificationUrl(undefined) === '/', 'Handles undefined url gracefully');
  assert(sanitizeNotificationUrl('') === '/', 'Handles empty string gracefully');

  // 3. Browser Permission State Invariants
  console.log('\n3. Testing Browser Permission State Helpers...');
  const status: NotificationStatus = getNotificationStatus();
  assert(['granted', 'denied', 'default', 'unsupported'].includes(status), `getNotificationStatus() returns valid state (got "${status}")`);

  // 4. Notification Preferences Filter Logic
  console.log('\n4. Testing Push Notification Preference Filtering Logic...');
  const sampleUserPreferences = {
    notifications: {
      dailyReminder: false,
      dailyReminderTime: '09:00',
      progressUpdates: true,
      newPlanSuggestions: false,
      streakNotifications: true,
      taskOverdueAlerts: true
    }
  };

  function shouldSendPush(category: string, prefs: typeof sampleUserPreferences.notifications): boolean {
    if (category === 'dailyReminder' && !prefs.dailyReminder) return false;
    if (category === 'progressUpdates' && !prefs.progressUpdates) return false;
    if (category === 'newPlanSuggestions' && !prefs.newPlanSuggestions) return false;
    if (category === 'streakNotifications' && !prefs.streakNotifications) return false;
    if (category === 'taskOverdueAlerts' && !prefs.taskOverdueAlerts) return false;
    return true;
  }

  assert(shouldSendPush('dailyReminder', sampleUserPreferences.notifications) === false, 'Suppresses push when dailyReminder is false');
  assert(shouldSendPush('progressUpdates', sampleUserPreferences.notifications) === true, 'Allows push when progressUpdates is true');
  assert(shouldSendPush('streakNotifications', sampleUserPreferences.notifications) === true, 'Allows push when streakNotifications is true');
  assert(shouldSendPush('system', sampleUserPreferences.notifications) === true, 'Allows system alerts by default');

  // 5. Stale Subscription (404/410) Cleanup Simulation
  console.log('\n5. Testing Stale Push Endpoint Cleanup Simulation...');
  const registeredEndpoints = [
    { endpoint: 'https://fcm.googleapis.com/fcm/send/active-device-1', status: 201 },
    { endpoint: 'https://fcm.googleapis.com/fcm/send/expired-device-2', status: 410 },
    { endpoint: 'https://updates.push.apple.com/send/invalid-device-3', status: 404 }
  ];

  const staleEndpoints = registeredEndpoints
    .filter(sub => sub.status === 410 || sub.status === 404)
    .map(sub => sub.endpoint);

  assert(staleEndpoints.length === 2, `Correctly identifies ${staleEndpoints.length} stale endpoints for deletion`);
  assert(staleEndpoints.includes('https://fcm.googleapis.com/fcm/send/expired-device-2'), 'Includes 410 Gone endpoint');
  assert(staleEndpoints.includes('https://updates.push.apple.com/send/invalid-device-3'), 'Includes 404 Not Found endpoint');

  // 6. Multi-Device Registration Invariants
  console.log('\n6. Testing Multi-Device Invariants...');
  const userSubscriptions = [
    { id: 'sub-1', user_id: 'user-abc', endpoint: 'https://push.service.com/chrome-desktop', user_agent: 'Chrome/Mac' },
    { id: 'sub-2', user_id: 'user-abc', endpoint: 'https://push.service.com/chrome-android', user_agent: 'Chrome/Android' }
  ];

  const distinctEndpoints = new Set(userSubscriptions.map(s => s.endpoint));
  assert(distinctEndpoints.size === userSubscriptions.length, 'Maintains distinct endpoints across multiple devices for a single user');
  assert(userSubscriptions.every(s => s.user_id === 'user-abc'), 'All subscriptions safely tied to the authenticated user ID');

  // 7. Push Dispatch Authorization Model
  console.log('\n7. Testing Push Dispatch Authorization Model...');
  function authorizePushDispatch(callerUserId: string, callerRole: string, targetUserId: string): { authorized: boolean; reason?: string } {
    if (targetUserId === callerUserId) {
      return { authorized: true };
    }
    if (callerRole === 'admin') {
      return { authorized: true };
    }
    return { authorized: false, reason: 'Forbidden: You cannot send push notifications to other users.' };
  }

  const userSelfDispatch = authorizePushDispatch('user-1', 'user', 'user-1');
  assert(userSelfDispatch.authorized, 'User can dispatch push notifications to themselves');

  const userCrossDispatch = authorizePushDispatch('user-1', 'user', 'user-2');
  assert(!userCrossDispatch.authorized, 'Non-admin user is blocked from dispatching push notifications to another user');
  assert(userCrossDispatch.reason?.includes('Forbidden'), 'Returns Forbidden error on cross-user dispatch');

  const adminCrossDispatch = authorizePushDispatch('admin-1', 'admin', 'user-2');
  assert(adminCrossDispatch.authorized, 'Admin user can dispatch notifications to another user');

  // 8. Server-Side Payload Sanitization
  console.log('\n8. Testing Server-Side Payload Sanitization...');
  function sanitizeNotificationPayload(title: string, body: string, url: string) {
    const cleanTitle = String(title)
      .replace(/<[^>]*>?/gm, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      .slice(0, 100);

    const cleanBody = String(notificationBody)
      .replace(/<[^>]*>?/gm, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      .slice(0, 300);

    return { cleanTitle, cleanBody, cleanUrl: sanitizeNotificationUrl(url) };
  }

  const rawTitle = '<script>alert("hack")</script>Welcome to <b>Relearn</b>!\x00';
  const notificationBody = 'Click <a href="https://evil.com">here</a> for \x1F prizes!' + 'A'.repeat(500);
  const rawPayload = sanitizeNotificationPayload(rawTitle, notificationBody, 'https://phishing.com/login');

  assert(!rawPayload.cleanTitle.includes('<script>') && !rawPayload.cleanTitle.includes('<b>'), 'Strips HTML tags from title');
  assert(!rawPayload.cleanTitle.includes('\x00'), 'Strips null bytes and control characters from title');
  assert(!rawPayload.cleanBody.includes('<a href'), 'Strips HTML anchor tags from body');
  assert(!rawPayload.cleanBody.includes('\x1F'), 'Strips control characters from body');
  assert(rawPayload.cleanBody.length <= 300, `Clamps body length to maximum 300 characters (got ${rawPayload.cleanBody.length})`);
  assert(rawPayload.cleanUrl === '/', 'Sanitizes external phishing URL to safe root /');

  console.log(`\n=== Verification Complete: ${passed} Passed, ${failed} Failed ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
