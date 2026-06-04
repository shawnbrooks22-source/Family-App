/**
 * photoProofService — Private task photo storage.
 *
 * Photos are stored in a PRIVATE Supabase Storage bucket.
 * Access is via signed URLs (1-hour TTL), never guessable public URLs.
 *
 * MIGRATION NOTE: existing photo_proof_uri values that are full https://
 * URLs are treated as legacy and returned as-is. New uploads store only
 * the storage PATH in photo_proof_path, and photo_proof_uri is no longer set.
 */

const BUCKET  = 'task-photos';
const TTL_SEC = 3600; // 1 hour

/**
 * Upload a task photo to private storage.
 * @returns {string|null} storage path (e.g. "fam-uuid/task-id.jpg") or null on failure
 */
export async function uploadTaskPhoto(supabase, { familyId, taskId, localUri }) {
  if (!supabase || !familyId || !taskId || !localUri) return null;
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const ext  = (localUri.split('.').pop()?.split('?')[0] || 'jpg').toLowerCase();
    const path = `${familyId}/${taskId}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
    if (error) throw error;
    return path;
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[photoProof] upload failed:', e.message);
    return null;
  }
}

/**
 * Get a signed URL for a stored photo.
 * Handles legacy full-URL values transparently.
 * @param {string|null} pathOrLegacyUrl
 * @returns {Promise<string|null>}
 */
export async function getSignedPhotoUrl(supabase, pathOrLegacyUrl) {
  if (!pathOrLegacyUrl) return null;
  // Legacy: already a full URL (file:// or https://) — return as-is
  if (pathOrLegacyUrl.startsWith('http') || pathOrLegacyUrl.startsWith('file://')) {
    return pathOrLegacyUrl;
  }
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(pathOrLegacyUrl, TTL_SEC);
    if (error) throw error;
    return data?.signedUrl || null;
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[photoProof] signed URL failed:', e.message);
    return null;
  }
}

/**
 * Delete a stored photo. No-op for legacy URLs or missing paths.
 */
export async function deleteTaskPhoto(supabase, pathOrLegacyUrl) {
  if (!supabase || !pathOrLegacyUrl) return;
  if (pathOrLegacyUrl.startsWith('http') || pathOrLegacyUrl.startsWith('file://')) return;
  try {
    await supabase.storage.from(BUCKET).remove([pathOrLegacyUrl]);
  } catch {}
}
