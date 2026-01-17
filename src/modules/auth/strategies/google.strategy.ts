import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { config } from 'src/common/config';
import { IOAuthProfile } from '../interfaces/oauth-profile.interface';

/**
 * Google OAuth Strategy
 * Handles Google OAuth 2.0 authentication flow
 * 
 * Flow:
 * 1. User clicks "Sign in with Google"
 * 2. Redirected to Google login
 * 3. Google redirects back with authorization code
 * 4. This strategy validates and extracts user profile
 * 5. Returns standardized OAuth profile
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor() {
        // Check if Google OAuth is configured
        const clientID = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8000/api/auth/google/callback';

        if (!clientID || !clientSecret) {
            console.warn('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
            // Return early - strategy won't be functional but won't crash the app
            super({
                clientID: 'dummy',
                clientSecret: 'dummy',
                callbackURL: callbackURL,
                scope: ['email', 'profile'],
            });
            return;
        }

        super({
            clientID,
            clientSecret,
            callbackURL,
            scope: ['email', 'profile'],
        });
    }

    /**
     * Validate and transform Google profile to our standard format
     * This method is called automatically by Passport after successful authentication
     */
    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
    ): Promise<any> {
        try {
            const { id, name, emails, photos } = profile;

            // Transform Google profile to our standard OAuth profile format
            const oauthProfile: IOAuthProfile = {
                provider: 'google',
                providerId: id,
                email: emails?.[0]?.value || '',
                emailVerified: emails?.[0]?.verified || false,
                firstName: name?.givenName || '',
                lastName: name?.familyName || '',
                avatar: photos?.[0]?.value,
            };

            // Passport will attach this to req.user
            done(null, oauthProfile);
        } catch (error) {
            done(error, false);
        }
    }
}
