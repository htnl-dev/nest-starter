import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenValidator } from '../utils/token-validation.util';
import type {
  TokenValidationOptions,
  RequestWithAuth,
} from '../types/logto.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SCOPES_KEY } from '../decorators/scopes.decorator';
import type { LogtoConfig } from '../interfaces/logto-config.interface';
import { PATH_METADATA } from '@nestjs/common/constants';
import { LogtoUsersService } from '../services/users.service';

@Injectable()
export class LogtoAuthGuard implements CanActivate {
  private readonly logger = new Logger(LogtoAuthGuard.name);
  private tokenValidator: TokenValidator;

  constructor(
    @Inject('LOGTO_CONFIG') private readonly config: LogtoConfig,
    private readonly reflector: Reflector,
    private readonly logtoUsersService: LogtoUsersService,
  ) {
    const validationOptions: TokenValidationOptions = {
      issuer: `${this.config.endpoint}/oidc`,
      audience: this.config.apiResourceId,
    };
    this.tokenValidator = new TokenValidator(validationOptions);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const authHeader = request.headers['authorization'] as string | undefined;

    const token = TokenValidator.extractTokenFromHeader(authHeader);

    if (!token) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }

    try {
      const payload = await this.tokenValidator.validate(token);
      request.auth = payload;

      const userId = payload.sub;

      const requiredScopes = this.getRequiredScopes(context);

      if (requiredScopes && requiredScopes.length > 0) {
        const userPermissions = await this.logtoUsersService.getScopes(userId);
        const userScopeNames = userPermissions.map((scope) => scope.name);

        const hasPermissions = this.hasRequiredPermissions(
          userScopeNames,
          requiredScopes,
        );

        if (!hasPermissions) {
          this.logger.warn(
            `User ${userId} lacks required permissions: ${requiredScopes.join(', ')}`,
          );
          throw new UnauthorizedException(
            `Insufficient permissions. Required: ${requiredScopes.join(', ')}`,
          );
        }
      }

      return true;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Token validation error', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private hasRequiredPermissions(
    userPermissions: string[],
    requiredScopes: string[],
  ): boolean {
    if (requiredScopes.length === 0) {
      return true;
    }

    return requiredScopes.every((required) =>
      userPermissions.includes(required),
    );
  }

  private getRequiredScopes(context: ExecutionContext): string[] {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredScopes || requiredScopes.length === 0) {
      return [];
    }

    const metadata = Reflect.getMetadata(PATH_METADATA, context.getClass()) as
      | string
      | undefined;
    let controllerPath: string = metadata ?? '';
    controllerPath = controllerPath.split('/').pop()!;
    return requiredScopes.map((scope) =>
      scope.replace('{controllerName}', controllerPath),
    );
  }
}
