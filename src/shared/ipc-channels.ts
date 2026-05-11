export const IPC = {
  auth: {
    login: 'auth:login',
    logout: 'auth:logout',
    currentUser: 'auth:current-user',
    changePassword: 'auth:change-password',
  },
} as const
