export const CONFIG = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'szchat_production_jwt_secret_key_2026',
  NODE_ENV: process.env.NODE_ENV || 'development',
  MAX_UPLOAD_SIZE: '50mb',
};
