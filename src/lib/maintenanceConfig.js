const DEFAULT_MAINTENANCE_MODE = false
const DEFAULT_MAINTENANCE_MESSAGE = 'We are currently performing system maintenance. Please check back shortly.'

export const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true'
export const MAINTENANCE_MESSAGE = import.meta.env.VITE_MAINTENANCE_MESSAGE || DEFAULT_MAINTENANCE_MESSAGE
