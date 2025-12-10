import { createRemoteJWKSet, jwtVerify } from 'jose';
import type {
  TokenValidationOptions,
  ValidatedTokenPayload,
} from '../types/logto.types';

export class TokenValidator {
  private jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly options: TokenValidationOptions) {
    const jwksUrl = `${options.issuer}/jwks`;
    this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  }

  async validate(token: string): Promise<ValidatedTokenPayload> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.options.issuer,
      audience: this.options.audience,
    });

    return payload as ValidatedTokenPayload;
  }

  static extractTokenFromHeader(authorizationHeader?: string): string | null {
    if (!authorizationHeader) {
      return null;
    }

    const [type, token] = authorizationHeader.split(' ');

    if (type?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token;
  }

  static hasRequiredScopes(
    tokenScopes: string,
    requiredScopes: string[],
  ): boolean {
    if (requiredScopes.length === 0) {
      return true;
    }

    const scopes = tokenScopes.split(' ');
    return requiredScopes.every((required) => scopes.includes(required));
  }
}
