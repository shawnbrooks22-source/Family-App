// __tests__/photoProof.test.js
import { uploadTaskPhoto, getSignedPhotoUrl, deleteTaskPhoto } from '../src/services/photoProofService';

// Mock fetch for blob conversion
global.fetch = jest.fn();

function makeMockSupabase({ uploadError = null, signedUrl = 'https://signed.example.com/photo.jpg', signError = null, removeError = null } = {}) {
  return {
    storage: {
      from: () => ({
        upload:           jest.fn().mockResolvedValue({ error: uploadError }),
        createSignedUrl:  jest.fn().mockResolvedValue({ data: { signedUrl }, error: signError }),
        remove:           jest.fn().mockResolvedValue({ error: removeError }),
      }),
    },
  };
}

describe('uploadTaskPhoto', () => {
  beforeEach(() => {
    global.fetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['fake'], { type: 'image/jpeg' })),
    });
  });
  afterEach(() => jest.clearAllMocks());

  test('returns storage path on success', async () => {
    const sb = makeMockSupabase();
    const result = await uploadTaskPhoto(sb, { familyId: 'fam1', taskId: 'task1', localUri: 'file://photo.jpg' });
    expect(result).toBe('fam1/task1.jpg');
  });

  test('returns null when supabase is null', async () => {
    const result = await uploadTaskPhoto(null, { familyId: 'f', taskId: 't', localUri: 'file://x.jpg' });
    expect(result).toBeNull();
  });

  test('returns null on upload error', async () => {
    const sb = makeMockSupabase({ uploadError: new Error('upload failed') });
    const result = await uploadTaskPhoto(sb, { familyId: 'f', taskId: 't', localUri: 'file://x.jpg' });
    expect(result).toBeNull();
  });

  test('returns null when familyId is missing', async () => {
    const sb = makeMockSupabase();
    const result = await uploadTaskPhoto(sb, { familyId: null, taskId: 'task1', localUri: 'file://photo.jpg' });
    expect(result).toBeNull();
  });

  test('returns null when localUri is missing', async () => {
    const sb = makeMockSupabase();
    const result = await uploadTaskPhoto(sb, { familyId: 'fam1', taskId: 'task1', localUri: null });
    expect(result).toBeNull();
  });

  test('preserves non-jpg extension from URI', async () => {
    const sb = makeMockSupabase();
    const result = await uploadTaskPhoto(sb, { familyId: 'fam1', taskId: 'task1', localUri: 'file://photo.png' });
    expect(result).toBe('fam1/task1.png');
  });

  test('returns null when fetch throws', async () => {
    global.fetch.mockRejectedValue(new Error('network error'));
    const sb = makeMockSupabase();
    const result = await uploadTaskPhoto(sb, { familyId: 'fam1', taskId: 'task1', localUri: 'file://photo.jpg' });
    expect(result).toBeNull();
  });
});

describe('getSignedPhotoUrl', () => {
  test('returns signed URL for storage path', async () => {
    const sb = makeMockSupabase();
    const url = await getSignedPhotoUrl(sb, 'fam1/task1.jpg');
    expect(url).toBe('https://signed.example.com/photo.jpg');
  });

  test('passes through legacy https:// URLs unchanged', async () => {
    const sb = makeMockSupabase();
    const url = await getSignedPhotoUrl(sb, 'https://example.com/old-public-url.jpg');
    expect(url).toBe('https://example.com/old-public-url.jpg');
  });

  test('passes through file:// local URIs unchanged', async () => {
    const url = await getSignedPhotoUrl(null, 'file:///local/photo.jpg');
    expect(url).toBe('file:///local/photo.jpg');
  });

  test('returns null on signing error', async () => {
    const sb = makeMockSupabase({ signedUrl: null, signError: new Error('signing failed') });
    const url = await getSignedPhotoUrl(sb, 'fam1/task1.jpg');
    expect(url).toBeNull();
  });

  test('returns null for null path', async () => {
    const url = await getSignedPhotoUrl(null, null);
    expect(url).toBeNull();
  });

  test('returns null for undefined path', async () => {
    const url = await getSignedPhotoUrl(null, undefined);
    expect(url).toBeNull();
  });

  test('does not call supabase for https:// legacy URLs', async () => {
    const fromSpy = jest.fn();
    const sb = { storage: { from: fromSpy } };
    await getSignedPhotoUrl(sb, 'https://example.com/photo.jpg');
    expect(fromSpy).not.toHaveBeenCalled();
  });
});

describe('deleteTaskPhoto', () => {
  test('calls remove for storage paths', async () => {
    const fromSpy = jest.fn().mockReturnValue({ remove: jest.fn().mockResolvedValue({}) });
    const sb = { storage: { from: fromSpy } };
    await deleteTaskPhoto(sb, 'fam1/task1.jpg');
    expect(fromSpy).toHaveBeenCalledWith('task-photos');
  });

  test('does not call supabase for legacy https:// URLs', async () => {
    const fromSpy = jest.fn();
    const sb = { storage: { from: fromSpy } };
    await deleteTaskPhoto(sb, 'https://example.com/photo.jpg');
    expect(fromSpy).not.toHaveBeenCalled();
  });

  test('does not call supabase for file:// URIs', async () => {
    const fromSpy = jest.fn();
    const sb = { storage: { from: fromSpy } };
    await deleteTaskPhoto(sb, 'file:///local/photo.jpg');
    expect(fromSpy).not.toHaveBeenCalled();
  });

  test('does nothing when supabase is null', async () => {
    // Should not throw
    await expect(deleteTaskPhoto(null, 'fam1/task1.jpg')).resolves.toBeUndefined();
  });

  test('does nothing when path is null', async () => {
    const fromSpy = jest.fn();
    const sb = { storage: { from: fromSpy } };
    await deleteTaskPhoto(sb, null);
    expect(fromSpy).not.toHaveBeenCalled();
  });
});
