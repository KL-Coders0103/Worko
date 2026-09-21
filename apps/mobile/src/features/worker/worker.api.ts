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
    name: file.name,
    type: file.type,
  } as any);

  const response = await api.post<{
    message: string;
    profilePhotoKey: string;
  }>('/workers/me/profile-photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.profilePhotoKey;
}

export async function getCategories(): Promise<
  WorkerCategory[]
> {
  const response =
    await api.get<WorkerCategory[]>('/categories');

  return response.data;
}

export async function getSkills(
  categoryId: string,
): Promise<WorkerSkill[]> {
  const response =
    await api.get<WorkerSkill[]>(
      `/categories/${categoryId}/skills`,
    );

  return response.data;
}

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

export async function submitWorkerProfile(): Promise<WorkerProfile> {
  const response = await api.post<{
    message: string;
    worker: WorkerProfile;
  }>('/workers/me/submit');

  return response.data.worker;
}

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
    name: file.name,
    type: file.type,
  } as any);

  const response = await api.post<{
    message: string;
    documentKey: string;
  }>('/workers/me/kyc/aadhaar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.documentKey;
}

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
    name: file.name,
    type: file.type,
  } as any);

  const response = await api.post<{
    message: string;
    documentKey: string;
  }>(
    '/workers/me/kyc/police-verification',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data.documentKey;
}

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
      ? {policeVerificationDocumentKey}
      : {}),
  });

  return response.data.worker;
}