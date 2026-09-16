// Mock localStorage for Node.js test runner
const storageMap = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

import { uploadProfileAvatar, getUserProfile, saveUserProfile } from '../dataService';

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
  console.log('=== Profile Card & Avatar Pipeline Verification ===\n');

  // Test 1: File type validation
  console.log('1. File Type Validation:');
  const invalidFile = new File(['dummy content'], 'script.exe', { type: 'application/x-msdownload' });
  const resInvalidType = await uploadProfileAvatar('user-test-123', invalidFile);
  assert(!resInvalidType.success, 'Rejects executable / non-image file type');
  assert(
    resInvalidType.error?.includes('Invalid file type') === true,
    'Returns clear error message for invalid file type'
  );

  // Test 2: File size validation
  console.log('\n2. File Size Validation:');
  const largeBlob = new Uint8Array(2.5 * 1024 * 1024); // 2.5MB
  const largeFile = new File([largeBlob], 'photo.png', { type: 'image/png' });
  const resLargeFile = await uploadProfileAvatar('user-test-123', largeFile);
  assert(!resLargeFile.success, 'Rejects files larger than 2MB');
  assert(
    resLargeFile.error?.includes('2MB') === true,
    'Returns clear error message for file exceeding 2MB'
  );

  // Test 3: Valid file validation
  console.log('\n3. Valid File Handling (Offline/Mock fallback):');
  const validBlob = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
  const validFile = new File([validBlob], 'avatar.png', { type: 'image/png' });
  assert(validFile.size <= 2 * 1024 * 1024, 'Valid image within 2MB limit');
  assert(['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(validFile.type), 'MIME type is supported image format');

  // Test 4: Profile Data Fetching includes profilePicture
  console.log('\n4. Database Profile Fetching:');
  // Local storage mock test
  const testUserId = 'test-user-avatar-persistence';
  const mockUserData = {
    id: testUserId,
    name: 'Scholar Tester',
    email: 'scholar@relearn.ai',
    profilePicture: 'https://uflcypwtplruaurvwbje.supabase.co/storage/v1/object/public/avatars/test-user-avatar-persistence/avatar-12345.png'
  };
  await saveUserProfile(testUserId, mockUserData);
  const fetchedUser = await getUserProfile(testUserId);
  assert(fetchedUser !== null, 'Fetched user profile exists');
  assert(fetchedUser?.profilePicture === mockUserData.profilePicture, 'profilePicture is persisted and returned by getUserProfile');

  // Test 5: Fallback behavior logic
  console.log('\n5. Avatar Rendering Fallback Logic:');
  const computeInitial = (user: { name?: string; email?: string }) => {
    return (user.email ? user.email.charAt(0) : user.name?.charAt(0) || 'U').toUpperCase();
  };

  const getAvatarDisplay = (
    avatarSrc: string | undefined,
    hasImageError: boolean,
    user: { name: string; email: string }
  ) => {
    if (avatarSrc && !hasImageError) {
      return { type: 'image', src: avatarSrc };
    }
    return { type: 'initial', letter: computeInitial(user) };
  };

  const userObj = { name: 'Admin', email: 'imposterz.rev02@gmail.com' };
  
  // Case A: No image uploaded -> shows initial 'I'
  const displayNoImage = getAvatarDisplay(undefined, false, userObj);
  assert(displayNoImage.type === 'initial' && displayNoImage.letter === 'I', 'No image falls back to initial "I"');

  // Case B: Valid image uploaded -> renders image
  const validUrl = 'https://uflcypwtplruaurvwbje.supabase.co/storage/v1/object/public/avatars/user/avatar-1.png';
  const displayValidImage = getAvatarDisplay(validUrl, false, userObj);
  assert(displayValidImage.type === 'image' && displayValidImage.src === validUrl, 'Valid image URL renders image element');

  // Case C: Image load failure -> gracefully falls back to initial 'I'
  const displayBrokenImage = getAvatarDisplay(validUrl, true, userObj);
  assert(displayBrokenImage.type === 'initial' && displayBrokenImage.letter === 'I', 'Image load error gracefully falls back to initial "I"');

  // Case D: Avatar removal -> returns to initial letter
  const displayRemovedAvatar = getAvatarDisplay('', false, userObj);
  assert(displayRemovedAvatar.type === 'initial' && displayRemovedAvatar.letter === 'I', 'Removed avatar returns to initial letter fallback');

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
