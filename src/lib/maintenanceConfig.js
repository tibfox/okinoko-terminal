export const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true'
export const MAINTENANCE_MESSAGE = import.meta.env.VITE_MAINTENANCE_MESSAGE || ''

// Block issue monitoring - only enabled in production builds (not in dev mode)
const isProduction = import.meta.env.PROD
export const BLOCKISSUE_AUTOMATIC_MODE = isProduction && import.meta.env.VITE_BLOCKISSUE_AUTOMATIC_MODE === 'true'
export const BLOCKISSUE_MESSAGE = import.meta.env.VITE_BLOCKISSUE_MESSAGE || ''
export const BLOCKISSUE_FORCE_STALE = import.meta.env.VITE_BLOCKISSUE_FORCE_STALE === 'true'
