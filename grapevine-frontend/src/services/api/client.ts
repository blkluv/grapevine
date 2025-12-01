import createClient from 'openapi-fetch';
import type { paths } from '../../types/api';

// Grapevine API Integration
const BACKEND_URL = import.meta.env.VITE_GRAPEVINE_BACKEND_URL || 'http://localhost:3000';

// Create the type-safe API client
const client = createClient<paths>({ baseUrl: BACKEND_URL });

/**
 * Get the configured API client instance
 */
export const getClient = () => client;

/**
 * Get the backend URL
 */
export const getBackendUrl = () => BACKEND_URL;
