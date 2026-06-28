// App-level configuration read from the build-time environment.

// The shared 6-digit code that unlocks the board. With the client-side gate,
// this value is embedded in the built site (set it in `.env` locally and in
// your host's environment variables for production). This is intentional, low-
// confidentiality access control — see the README "Security note".
export const ACCESS_CODE = (import.meta.env.VITE_APP_ACCESS_CODE ?? '').trim();

export const isAccessCodeConfigured = /^\d{6}$/.test(ACCESS_CODE);

// localStorage key remembering that this device passed the gate.
export const UNLOCK_KEY = 'bk-ao-unlocked';
