import axios from 'axios';

type BackendErrorResponse = {
  message?: string | string[];
  error?: string;
};

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }

  const status = error.response?.status;

  const data =
    error.response?.data as
      | BackendErrorResponse
      | undefined;

  const backendMessage = data?.message;

  if (Array.isArray(backendMessage)) {
    return backendMessage.join(', ');
  }

  if (
    typeof backendMessage === 'string' &&
    backendMessage.trim()
  ) {
    return backendMessage;
  }

  switch (status) {
    case 400:
      return 'Please check the information you entered.';

    case 401:
      return 'Your authentication details are invalid.';

    case 403:
      return 'You are not allowed to perform this action.';

    case 404:
      return 'The requested resource was not found.';

    case 409:
      return 'This information already exists.';

    case 422:
      return 'Please check the information and try again.';

    case 429:
      return 'Too many requests. Please wait and try again.';

    case 500:
    case 502:
    case 503:
      return 'Worko is temporarily unavailable. Please try again.';

    default:
      return fallback;
  }
}