/**
 * Centralized API & Runtime Error Handling Utilities
 * Safely extracts human-readable error messages without unsafe type assertions.
 */
import axios from 'axios';

export const getErrorMessage = (error: unknown, defaultMessage = 'An unexpected error occurred.'): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data) {
      if (typeof data.detail === 'string') {
        return data.detail;
      }
      if (Array.isArray(data.detail) && data.detail.length > 0 && data.detail[0]?.msg) {
        return data.detail[0].msg;
      }
      if (typeof data.message === 'string') {
        return data.message;
      }
    }
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
};
