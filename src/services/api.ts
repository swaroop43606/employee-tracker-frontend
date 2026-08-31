import axiosInstance from './axios';
import type { ApiResponse, PaginatedResponse, PaginationParams } from '../types/api';

export const api = {
  get: <T>(url: string, params?: PaginationParams | object): Promise<ApiResponse<T>> =>
    axiosInstance.get<ApiResponse<T>>(url, { params }).then((r) => r.data),

  getPaginated: <T>(url: string, params?: PaginationParams | object): Promise<PaginatedResponse<T>> =>
    axiosInstance.get<PaginatedResponse<T>>(url, { params }).then((r) => r.data),

  post: <T>(url: string, data?: unknown): Promise<ApiResponse<T>> =>
    axiosInstance.post<ApiResponse<T>>(url, data).then((r) => r.data),

  put: <T>(url: string, data?: unknown): Promise<ApiResponse<T>> =>
    axiosInstance.put<ApiResponse<T>>(url, data).then((r) => r.data),

  patch: <T>(url: string, data?: unknown): Promise<ApiResponse<T>> =>
    axiosInstance.patch<ApiResponse<T>>(url, data).then((r) => r.data),

  delete: <T>(url: string): Promise<ApiResponse<T>> =>
    axiosInstance.delete<ApiResponse<T>>(url).then((r) => r.data),

  upload: <T>(url: string, formData: FormData): Promise<ApiResponse<T>> =>
    axiosInstance
      .post<ApiResponse<T>>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
};
