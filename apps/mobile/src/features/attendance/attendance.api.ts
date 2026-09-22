import {api} from '../../services/api';

export type AttendanceQrPurpose =
  | 'CHECK_IN'
  | 'CHECK_OUT';

export type AttendanceEvidenceType =
  | 'BEFORE_PHOTO'
  | 'AFTER_PHOTO';

export type AttendanceLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
};

export type AttendanceActionPayload =
  AttendanceLocation & {
    qrToken: string;
  };

export type AttendanceQrResponse = {
  token: string;
  expiresAt: string;
};

export async function createAttendanceQrToken(
  bookingId: string,
  purpose: AttendanceQrPurpose,
): Promise<AttendanceQrResponse> {
  const response = await api.post(
    `/attendance/${bookingId}/qr`,
    {purpose},
  );

  return response.data;
}

export async function uploadAttendanceEvidence(
  bookingId: string,
  uri: string,
  fileName: string,
  mimeType: string,
) {
  const formData = new FormData();

  formData.append(
    'file',
    {
      uri,
      name: fileName,
      type: mimeType,
    } as any,
  );

  const response = await api.post(
    `/attendance/${bookingId}/evidence/upload`,
    formData,
  );

  return response.data;
}

export async function createAttendanceEvidence(
  bookingId: string,
  payload: {
    type: AttendanceEvidenceType;
    fileKey: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    capturedAt: string;
  },
) {
  const response = await api.post(
    `/attendance/${bookingId}/evidence`,
    payload,
  );

  return response.data;
}

export async function checkIn(
  bookingId: string,
  payload: AttendanceActionPayload,
) {
  const response = await api.post(
    `/attendance/${bookingId}/check-in`,
    payload,
  );

  return response.data;
}

export async function checkOut(
  bookingId: string,
  payload: AttendanceActionPayload,
) {
  const response = await api.post(
    `/attendance/${bookingId}/check-out`,
    payload,
  );

  return response.data;
}

export async function getAttendanceEvidence(
  bookingId: string,
) {
  const response = await api.get(
    `/attendance/${bookingId}/evidence`,
  );

  return response.data;
}

