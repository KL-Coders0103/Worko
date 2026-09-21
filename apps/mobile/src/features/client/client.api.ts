import {api} from '../../services/api';

export type ClientType =
  | 'INDIVIDUAL'
  | 'BUSINESS';

export type ClientProfile = {
  id: string;
  userId: string;
  type: ClientType;
  companyName: string | null;
  gstin: string | null;
  contactPerson: string | null;
  businessAddress: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClientProfileResponse = {
  client: ClientProfile | null;
  user: {
    id: string;
    role: string;
    status: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
  };
};

export type UpdateClientProfilePayload = {
  type: ClientType;
  companyName?: string;
  gstin?: string;
  contactPerson?: string;
  businessAddress?: string;
};

export async function getMyClientProfile(): Promise<ClientProfileResponse> {
  const response =
    await api.get<ClientProfileResponse>(
      '/clients/me',
    );

  return response.data;
}

export async function createClientProfile(): Promise<{
  client: ClientProfile;
}> {
  const response =
    await api.post<{
      client: ClientProfile;
    }>('/clients/me');

  return response.data;
}

export async function updateClientProfile(
  payload: UpdateClientProfilePayload,
): Promise<{
  client: ClientProfile;
}> {
  const response =
    await api.patch<{
      client: ClientProfile;
    }>(
      '/clients/me',
      payload,
    );

  return response.data;
}

export async function updateClientLocation(
  latitude: number,
  longitude: number,
  accuracyMeters?: number,
): Promise<{
  message: string;
  location: {
    id: string;
    userId: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number | null;
  };
}> {
  const response =
    await api.patch<{
      message: string;
      location: {
        id: string;
        userId: string;
        latitude: number;
        longitude: number;
        accuracyMeters: number | null;
      };
    }>(
      '/clients/me/location',
      {
        latitude,
        longitude,
        accuracyMeters,
      },
    );

  return response.data;
}