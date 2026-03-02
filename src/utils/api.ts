export const API_BASE_URL = '/api';

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const getHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  get: async <T>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'GET',
      headers: { ...getHeaders(), ...options.headers },
    });
    if (!response.ok) throw new ApiError(response.statusText, response.status);
    return response.json();
  },

  post: async <T>(endpoint: string, body: any, options: RequestOptions = {}): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'POST',
      headers: { ...getHeaders(), ...options.headers },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new ApiError(response.statusText, response.status);
    return response.json();
  },

  put: async <T>(endpoint: string, body: any, options: RequestOptions = {}): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'PUT',
      headers: { ...getHeaders(), ...options.headers },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new ApiError(response.statusText, response.status);
    return response.json();
  },

  delete: async <T>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      method: 'DELETE',
      headers: { ...getHeaders(), ...options.headers },
    });
    if (!response.ok) throw new ApiError(response.statusText, response.status);
    return response.json();
  },
};
