import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-apple';
import { IOAuthProfile } from '../interfaces/oauth-profile.interface';
import * as fs from 'fs';

/**
 * Apple OAuth Strategy
 * Handles Apple Sign In authentication flow
 * 
 * Flow:
 * 1. User clicks "Sign in with Apple"
 * 2. Redirected to Apple login
 * 3. Apple redirects back with authorization code
 * 4. This strategy validates and extracts user profile
 * 5. Returns standardized OAuth profile
 * 
 * Note: Apple only provides name and email on first sign-in
 * Subsequent sign-ins only provide the Apple ID
 */
@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
    constructor() {
        // Read Apple private key from file
        const privateKey = fs.existsSync(process.env.APPLE_PRIVATE_KEY_PATH || '')
            ? fs.readFileSync(process.env.APPLE_PRIVATE_KEY_PATH || '', 'utf8')
            : '';

        super({
            clientID: process.env.APPLE_CLIENT_ID,
            teamID: process.env.APPLE_TEAM_ID,
            keyID: process.env.APPLE_KEY_ID,
            privateKeyString: privateKey,
            callbackURL: process.env.APPLE_CALLBACK_URL,
            scope: ['name', 'email'],
            passReqToCallback: false,
        });
    }

    /**
     * Validate and transform Apple profile to our standard format
     * This method is called automatically by Passport after successful authentication
     * 
     * Important: Apple only sends name and email on FIRST sign-in
     * On subsequent logins, only the Apple ID (sub) is provided
     */
    async validate(
        accessToken: string,
        refreshToken: string,
        idToken: any,
        profile: Profile,
        done: VerifyCallback,
    ): Promise<any> {
        try {
            // Apple's profile structure is different from Google
            // The user data comes from the idToken (JWT)
            const { sub, email, email_verified } = idToken;

            // Name might be in profile.name or might be undefined on subsequent logins
            const firstName = profile?.name?.firstName || '';
            const lastName = profile?.name?.lastName || '';

            // Transform Apple profile to our standard OAuth profile format
            const oauthProfile: IOAuthProfile = {
                provider: 'apple',
                providerId: sub, // Apple's unique user identifier
                email: email || '',
                emailVerified: email_verified === 'true' || email_verified === true,
                firstName,
                lastName,
                avatar: undefined, // Apple doesn't provide profile pictures
            };

            // Passport will attach this to req.user
            done(null, oauthProfile);
        } catch (error) {
            done(error, false);
        }
    }
}
