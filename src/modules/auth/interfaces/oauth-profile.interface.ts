/**
 * OAuth Profile Interface
 * Unified interface for OAuth provider profiles (Google, Apple, etc.)
 */
export interface IOAuthProfile {
    provider: 'google' | 'apple';
    providerId: string;
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    avatar?: string;
}

/**
 * OAuth User Data Interface
 * Data structure for creating/updating users from OAuth
 */
export interface IOAuthUserData {
    googleId?: string;
    appleId?: string;
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    avatar?: string;
    authProvider: 'google' | 'apple';
}
