import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Google OAuth Guard
 * Protects routes that initiate Google OAuth flow
 * 
 * Usage:
 * @UseGuards(GoogleOAuthGuard)
 * @Get('auth/google')
 * async googleAuth() { }
 */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') { }
