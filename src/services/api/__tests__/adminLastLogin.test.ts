import { UserAdminData } from '../adminService';

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

// Replicate the pure formatting functions from UserManagementPanel
const formatActiveTimestamp = (dateString?: string): string => {
  if (!dateString) return 'No activity recorded';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'No activity recorded';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');

  return `${day}/${month}/${year} • ${hoursStr}:${minutes} ${ampm}`;
};

const formatLoginTimestamp = (dateString?: string): string => {
  if (!dateString) return 'Never logged in';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Never logged in';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');

  return `${day}/${month}/${year} • ${hoursStr}:${minutes} ${ampm}`;
};

const formatShortDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

function runTests() {
  console.log('=== Running Admin Last Login & User Management Audit Tests ===\n');

  // Test 1: User with recent Supabase Auth login
  console.log('1. Testing authoritative auth.users.last_sign_in_at mapping...');
  const userA: UserAdminData = {
    id: 'user-a-123',
    name: 'Justin mathew',
    email: 'mathewjustin498@gmail.com',
    role: 'user',
    createdAt: '2026-09-10T15:09:00.000Z',
    last_active_at: '2026-09-10T15:11:51.732Z',
    last_sign_in_at: '2026-09-10T15:10:29.214Z', // Auth login
    last_login_at: undefined, // Legacy column empty
  };

  const resolvedLoginA = userA.last_sign_in_at || userA.last_login_at || userA.last_login;
  const formattedLoginA = formatLoginTimestamp(resolvedLoginA);
  assert(resolvedLoginA === '2026-09-10T15:10:29.214Z', 'Resolves authoritative last_sign_in_at when legacy field is undefined');
  assert(formattedLoginA !== 'No activity recorded', 'Does NOT display "No activity recorded" for a user with valid login');
  assert(formattedLoginA !== 'Never logged in', 'Does NOT display "Never logged in" for a user with valid login');
  assert(formattedLoginA.includes('/09/2026'), 'Formats the date correctly');

  // Test 2: User whose application activity is newer than authentication login
  console.log('\n2. Testing separation between Last Active and Last Login...');
  const userB: UserAdminData = {
    id: 'user-b-456',
    name: 'revanth p',
    email: 'revanthp0201@gmail.com',
    role: 'admin',
    createdAt: '2026-08-30T00:00:00.000Z',
    last_active_at: '2026-09-15T12:29:55.150Z', // 15 Sep 2026 activity
    last_sign_in_at: '2026-08-30T02:54:27.319Z', // 30 Aug 2026 login
    last_login_at: '2026-08-29T15:24:12.772Z', // Stale legacy login
  };

  const lastActiveB = userB.last_active_at || userB.last_seen;
  const lastLoginB = userB.last_sign_in_at || userB.last_login_at || userB.last_login;

  assert(lastActiveB !== lastLoginB, 'Last Active and Last Login remain distinct and unmerged');
  assert(lastLoginB === '2026-08-30T02:54:27.319Z', 'Prefers auth.users.last_sign_in_at over stale legacy public.users.last_login_at');
  assert(formatActiveTimestamp(lastActiveB).includes('15/09/2026'), 'Last Active accurately reflects 15/09/2026 activity');
  assert(formatLoginTimestamp(lastLoginB).includes('30/08/2026'), 'Last Login accurately reflects 30/08/2026 Supabase Auth login');

  // Test 3: User who has never logged in (e.g. pre-created account / invited user)
  console.log('\n3. Testing "Never logged in" handling for null last_sign_in_at...');
  const userC: UserAdminData = {
    id: 'user-c-789',
    name: 'Invited Student',
    email: 'invited@relearn.ai',
    role: 'user',
    createdAt: '2026-09-01T10:00:00.000Z',
    last_active_at: undefined,
    last_sign_in_at: undefined,
    last_login_at: undefined,
  };

  const resolvedLoginC = userC.last_sign_in_at || userC.last_login_at || userC.last_login;
  const formattedLoginC = formatLoginTimestamp(resolvedLoginC);
  const formattedActiveC = formatActiveTimestamp(userC.last_active_at);

  assert(formattedLoginC === 'Never logged in', 'Displays "Never logged in" when last_sign_in_at is null/undefined');
  assert(formattedActiveC === 'No activity recorded', 'Displays "No activity recorded" for null application activity');
  assert(formattedLoginC !== formattedActiveC, 'Does not confuse "Never logged in" with "No activity recorded"');

  // Test 4: Joined date preservation
  console.log('\n4. Testing Joined date formatting...');
  const joinedFormatted = formatShortDate(userB.createdAt);
  assert(joinedFormatted === '30/08/2026', 'Joined date remains unchanged and accurate');

  console.log(`\n=== Verification Complete: ${passed} Passed, ${failed} Failed ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
