import { supabase } from './supabaseClient';

export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export async function uploadImageToStorage(file: File, folder: string): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
}
