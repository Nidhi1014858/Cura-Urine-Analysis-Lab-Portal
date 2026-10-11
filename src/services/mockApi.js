import { localApi } from './localApi';
import { api } from './api';

export const mockApi = import.meta.env.VITE_USE_MOCK === 'true' ? localApi : api;
