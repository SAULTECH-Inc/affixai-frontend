import axios, { AxiosError, AxiosInstance } from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    this.client.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.client.interceptors.response.use(
      (r) => r,
      async (error: AxiosError) => {
        const original = error.config as any;
        if (
          error.response?.status === 401 &&
          original &&
          !original._retry &&
          !original.url?.endsWith('/auth/refresh')
        ) {
          original._retry = true;
          const refresh_token = this.getRefreshToken();
          if (refresh_token) {
            try {
              const { data } = await axios.post<AuthTokens>(
                `${API_URL}/auth/refresh`,
                { refresh_token }
              );
              this.setTokens(data);
              original.headers.Authorization = `Bearer ${data.access_token}`;
              return this.client(original);
            } catch (e) {
              this.clearTokens();
              if (typeof window !== 'undefined') window.location.href = '/login';
              return Promise.reject(e);
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getAccessToken() {
    return localStorage.getItem('access_token');
  }
  private getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }
  public setTokens(t: AuthTokens) {
    localStorage.setItem('access_token', t.access_token);
    localStorage.setItem('refresh_token', t.refresh_token);
  }
  public clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
  public get axios() {
    return this.client;
  }
}

export const apiClient = new ApiClient();
export const api = apiClient.axios;
