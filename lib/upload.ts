import { supabase } from './supabase';

// Officially recommended React Native upload path for Supabase Storage:
// read the local file via fetch() and upload the ArrayBuffer.
async function uploadFile(
  bucket: string,
  path: string,
  localUri: string,
  contentType: string
): Promise<string> {
  const arrayBuffer = await fetch(localUri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Upload a vehicle photo; returns its public URL. */
export function uploadVehiclePhoto(userId: string, localUri: string, index: number) {
  return uploadFile(
    'vehicle-photos',
    `${userId}/${Date.now()}_${index}.jpg`,
    localUri,
    'image/jpeg'
  );
}

/** Upload a short store video (≤60s); returns its public URL. */
export function uploadStoreVideo(userId: string, localUri: string) {
  return uploadFile('videos', `${userId}/${Date.now()}.mp4`, localUri, 'video/mp4');
}

/** Upload a profile picture; returns its public URL. */
export function uploadAvatar(userId: string, localUri: string) {
  return uploadFile('avatars', `${userId}/avatar_${Date.now()}.jpg`, localUri, 'image/jpeg');
}
