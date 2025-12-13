
// Auth service completely stubbed out as per user request to remove security modules.
// Kept as a simple object to prevent import errors in other files.

import { AuthUser } from '../types';

export const authService = {
  getUser: (): AuthUser => ({
    id: 'guest',
    email: 'guest@zara.ai',
    trustScore: 100,
    deviceFingerprint: 'none',
    lastLogin: Date.now(),
    loginCount: 1,
    createdAt: Date.now()
  }),
  isAuthenticated: () => true,
  logout: () => { window.location.reload(); },
  initiateLogin: async () => ({ requireOtp: false, message: 'Auth Disabled' }),
  verifyOTP: async () => ({ success: true })
};
