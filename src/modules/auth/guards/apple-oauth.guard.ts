import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Apple OAuth Guard
 * Protects routes that initiate Apple Sign In flow
 * 
 * Usage:
 * @UseGuards(AppleOAuthGuard)
 * @Get('auth/apple')
 * async appleAuth() { }
 */
@Injectable()
export class AppleOAuthGuard extends AuthGuard('apple') { }
