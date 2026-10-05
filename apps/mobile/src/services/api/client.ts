/** Centralized HTTP client for the Worko mobile app. */
import {Platform} from 'react-native';

const isAndroidEmulator =
  Platform.OS === 'android' &&
  /sdk_gphone|emulator/i.test(Platform.constants?.Model ?? '');

// Physical Android devices use adb reverse; Android Studio emulators reach
// the host machine through 10.0.2.2.
export const API_BASE_URL = isAndroidEmulator
  ? 'http://10.0.2.2:3000/api/v1'
  : 'http://127.0.0.1:3000/api/v1';

export function apiRequest(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return fetch(`${API_BASE_URL}${normalizedPath}`, init);
}


export type UploadProgress = (percent: number) => void;

export function uploadRequirementPhotos(
  uris: string[],
  accessToken: string,
  onProgress?: UploadProgress,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    if (!uris.length) {
      onProgress?.(100);
      resolve([]);
      return;
    }

    const form = new FormData();
    uris.forEach((uri, index) => {
      const cleanUri = uri.split('?')[0];
      const extension = cleanUri.includes('.') ? cleanUri.substring(cleanUri.lastIndexOf('.') + 1).toLowerCase() : 'jpg';
      const type = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
      form.append('photos', {
        uri,
        type,
        name: `requirement-${Date.now()}-${index}.${extension}`,
      } as unknown as Blob);
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/requirements/photos`);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Photo upload failed. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new Error('Photo upload timed out. Please try again.'));
    xhr.timeout = 60_000;
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText || '{}');
        if (xhr.status < 200 || xhr.status >= 300) {
          throw new Error(payload.message || 'Photo upload failed.');
        }
        const photos = payload?.data?.photos;
        if (!Array.isArray(photos)) throw new Error('The server returned an invalid photo response.');
        onProgress?.(100);
        resolve(photos.map((photo: { url: string }) => photo.url));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Photo upload failed.'));
      }
    };
    xhr.send(form);
  });
}

export function apiAssetUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const origin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  return `${origin}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}
