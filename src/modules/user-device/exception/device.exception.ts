import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Device Limit Exceeded Exception
 * Thrown when user tries to register a new device but has reached their limit
 */
export class DeviceLimitExceededException extends HttpException {
    constructor() {
        super(
            {
                message: 'Device limit exceeded. Please remove an existing device to add a new one.',
                error: 'DEVICE_LIMIT_EXCEEDED',
                statusCode: HttpStatus.FORBIDDEN,
            },
            HttpStatus.FORBIDDEN
        );
    }
}

/**
 * Device Not Found Exception
 * Thrown when trying to access a device that doesn't exist or doesn't belong to the user
 */
export class DeviceNotFoundException extends HttpException {
    constructor() {
        super(
            {
                message: 'Device not found or access denied.',
                error: 'DEVICE_NOT_FOUND',
                statusCode: HttpStatus.NOT_FOUND,
            },
            HttpStatus.NOT_FOUND
        );
    }
}

/**
 * Device Management Disabled Exception
 * Thrown when device management is not enabled for the user
 */
export class DeviceManagementDisabledException extends HttpException {
    constructor() {
        super(
            {
                message: 'Device management is not enabled for this user.',
                error: 'DEVICE_MANAGEMENT_DISABLED',
                statusCode: HttpStatus.FORBIDDEN,
            },
            HttpStatus.FORBIDDEN
        );
    }
}

/**
 * Invalid Device Exception
 * Thrown when device information is invalid or malformed
 */
export class InvalidDeviceException extends HttpException {
    constructor(message: string = 'Invalid device information provided.') {
        super(
            {
                message,
                error: 'INVALID_DEVICE',
                statusCode: HttpStatus.BAD_REQUEST,
            },
            HttpStatus.BAD_REQUEST
        );
    }
}
