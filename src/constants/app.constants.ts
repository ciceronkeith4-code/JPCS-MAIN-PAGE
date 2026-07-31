export const APP_CONFIG = {
  cacheTTL: 30 * 60 * 1000, // 30 minutes
  maxAvatarSize: 2 * 1024 * 1024, // 2MB
  avatarDimension: 512, // 512x512
  retryAttempts: 3,
  toastDuration: 4000,
  features: {
    OCR: true,
    Statistics: true,
    Realtime: true,
    Awards: true,
  },
} as const;
