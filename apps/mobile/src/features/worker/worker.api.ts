import {api} from '../../services/api';

import type {
  CreateWorkerProfilePayload,
  UpdateWorkerProfilePayload,
  WorkerCategory,
  WorkerProfile,
  WorkerSkill,
} from './worker.type';

type WorkerResponse = {
  worker: WorkerProfile;
};

export async function getMyWorkerProfile(): Promise<WorkerProfile> {
  const response =
    await api.get<WorkerResponse>('/workers/me');

  return response.data.worker;
}

export async function createWorkerProfile(
  payload: CreateWorkerProfilePayload,
): Promise<WorkerProfile> {
  const response =
    await api.post<WorkerResponse>(
      '/workers/me',
      payload,
    );

  return response.data.worker;
}

export async function updateWorkerProfile(
  payload: UpdateWorkerProfilePayload,
): Promise<WorkerProfile> {
  const response =
    await api.patch<WorkerResponse>(
      '/workers/me',
      payload,
    );

  return response.data.worker;
}

/* -------------------------------------------------------------------------- */
/* PROFILE PHOTO                                                              */
/* -------------------------------------------------------------------------- */

export async function uploadWorkerProfilePhoto(
  file: {
    uri: string;
    name: string;
    type: string;
  },
): Promise<string> {
  const formData = new FormData();

  formData.append('file', {
    uri: file.uri,
    name: file.name || 'profile-photo.jpg',
    type: file.type || 'image/jpeg',
  } as any);

  const response = await api.post<{
    message: string;
    profilePhotoKey: string;
  }>(
    '/workers/me/profile-photo',
    formData,
  );

  return response.data.profilePhotoKey;
}

/* -------------------------------------------------------------------------- */
/* CATEGORIES                                                                 */
/* -------------------------------------------------------------------------- */

export async function getCategories(): Promise<
  WorkerCategory[]
> {
  const response =
    await api.get<WorkerCategory[]>(
      '/categories',
    );

  return response.data;
}

/* -------------------------------------------------------------------------- */
/* SKILLS                                                                     */
/* -------------------------------------------------------------------------- */

export async function getSkills(
  categoryId: string,
): Promise<WorkerSkill[]> {
  const response =
    await api.get<WorkerSkill[]>(
      `/categories/${categoryId}/skills`,
    );

  return response.data;
}

/* -------------------------------------------------------------------------- */
/* WORKER CATEGORIES                                                          */
/* -------------------------------------------------------------------------- */

export async function updateWorkerCategories(
  categoryIds: string[],
): Promise<unknown> {
  const response = await api.patch(
    '/workers/me/categories',
    {
      categoryIds,
    },
  );

  return response.data;
}

/* -------------------------------------------------------------------------- */
/* WORKER SKILLS                                                              */
/* -------------------------------------------------------------------------- */

export async function updateWorkerSkills(
  skillIds: string[],
): Promise<unknown> {
  const response = await api.patch(
    '/workers/me/skills',
    {
      skillIds,
    },
  );

  return response.data;
}

/* -------------------------------------------------------------------------- */
/* WORKER LOCATION                                                            */
/* -------------------------------------------------------------------------- */

export async function updateWorkerLocation(
  latitude: number,
  longitude: number,
  accuracyMeters?: number,
): Promise<unknown> {
  const response = await api.patch(
    '/workers/me/location',
    {
      latitude,
      longitude,
      ...(accuracyMeters !== undefined
        ? {accuracyMeters}
        : {}),
    },
  );

  return response.data;
}

/* -------------------------------------------------------------------------- */
/* SUBMIT WORKER PROFILE                                                      */
/* -------------------------------------------------------------------------- */

export async function submitWorkerProfile(): Promise<WorkerProfile> {
  const response = await api.post<{
    message: string;
    worker: WorkerProfile;
  }>('/workers/me/submit');

  return response.data.worker;
}

/* -------------------------------------------------------------------------- */
/* AADHAAR                                                                     */
/* -------------------------------------------------------------------------- */

export async function uploadWorkerAadhaar(
  file: {
    uri: string;
    name: string;
    type: string;
  },
): Promise<string> {
  const formData = new FormData();

  formData.append('file', {
    uri: file.uri,
    name: file.name || 'aadhaar-document',
    type:
      file.type ||
      'application/octet-stream',
  } as any);

  const response = await api.post<{
    message: string;
    documentKey: string;
  }>(
    '/workers/me/kyc/aadhaar',
    formData,
  );

  return response.data.documentKey;
}

/* -------------------------------------------------------------------------- */
/* POLICE VERIFICATION                                                        */
/* -------------------------------------------------------------------------- */

export async function uploadWorkerPoliceVerification(
  file: {
    uri: string;
    name: string;
    type: string;
  },
): Promise<string> {
  const formData = new FormData();

  formData.append('file', {
    uri: file.uri,
    name:
      file.name ||
      'police-verification-document',
    type:
      file.type ||
      'application/octet-stream',
  } as any);

  const response = await api.post<{
    message: string;
    documentKey: string;
  }>(
    '/workers/me/kyc/police-verification',
    formData,
  );

  return response.data.documentKey;
}

/* -------------------------------------------------------------------------- */
/* SUBMIT KYC                                                                 */
/* -------------------------------------------------------------------------- */

export async function submitWorkerKyc(
  aadhaarDocumentKey: string,
  policeVerificationDocumentKey?: string,
): Promise<WorkerProfile> {
  const response = await api.post<{
    message: string;
    worker: WorkerProfile;
  }>('/workers/me/kyc', {
    aadhaarDocumentKey,

    ...(policeVerificationDocumentKey
      ? {
          policeVerificationDocumentKey,
        }
      : {}),
  });

  return response.data.worker;
}