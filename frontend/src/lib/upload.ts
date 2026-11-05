import { api } from './api';

type Folder = 'Members' | 'Events' | 'Projects' | 'Sponsors' | 'Others';

interface IKAuth {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
}

const MAX_TEAM_PROJECT_IMAGE_BYTES = 1024 * 1024;

async function compressImage(file: File): Promise<File> {
  if (file.size <= MAX_TEAM_PROJECT_IMAGE_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const maxDimension = 2400;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    // Otherwise toBlob still produced a valid all-black JPEG that uploaded
    // "successfully" as the member's photo.
    bitmap.close();
    throw new Error('Image processing is not supported in this browser.');
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.82;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size <= MAX_TEAM_PROJECT_IMAGE_BYTES) {
      const name = file.name.replace(/\.[^.]+$/, '') || 'image';
      return new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
    }
    quality *= 0.75;
  }

  throw new Error('This image could not be reduced below 1 MB.');
}

/**
 * Upload a File directly to ImageKit from the browser.
 * Gets auth params from our backend, then POSTs the file directly to ImageKit.
 * Returns the public CDN URL.
 */
export async function uploadImage(file: File, folder: Folder): Promise<string> {
  const uploadFile = folder === 'Projects' || folder === 'Members' || folder === 'Events'
    ? await compressImage(file)
    : file;

  // 1. Get signed auth params from backend
  const auth = await api<IKAuth>('/upload/auth');

  // 2. Build multipart form for ImageKit upload API
  const form = new FormData();
  form.append('file', uploadFile);
  form.append('fileName', uploadFile.name);
  form.append('folder', `/${folder}`);
  form.append('useUniqueFileName', 'true');
  form.append('token', auth.token);
  form.append('expire', String(auth.expire));
  form.append('signature', auth.signature);
  form.append('publicKey', auth.publicKey);

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Upload failed.');
  }

  const result = await response.json() as { url: string };
  return result.url;
}

export async function uploadProfileImage(file: File): Promise<string> {
  const image = await compressImage(file);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP image.');
  }
  if (image.size > MAX_TEAM_PROJECT_IMAGE_BYTES) {
    throw new Error('This image could not be reduced below 1 MB.');
  }

  const result = await api<{ photoUrl: string }>('/profile/photo', {
    method: 'POST',
    body: image,
    headers: { 'Content-Type': image.type },
  });
  return result.photoUrl;
}
