/**
 * CORS Configuration for Cura Urinalysis Portal API Server.
 * Supports standard local development ports and environment-configured origins.
 */

export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

export const getAllowedOrigins = (envOrigins = process.env.CORS_ORIGINS) => {
  const extra = envOrigins
    ? envOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : [];
  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]));
};

export const createCorsOptions = (envOrigins = process.env.CORS_ORIGINS) => {
  const allowed = getAllowedOrigins(envOrigins);

  return {
    origin: (origin, callback) => {
      // Allow headless non-browser tools (curl, postman, server-to-server) or approved origins
      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
};
