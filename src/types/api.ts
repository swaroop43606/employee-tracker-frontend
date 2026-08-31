export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Array<{ loc?: string[]; msg?: string; type?: string; message?: string }>;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: PaginatedData<T>;
  message?: string;
  errors?: Array<{ loc?: string[]; msg?: string; type?: string; message?: string }>;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
