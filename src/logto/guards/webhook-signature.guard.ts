import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import type { Request } from 'express';
import type { LogtoConfig } from '../interfaces/logto-config.interface';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(@Inject('LOGTO_CONFIG') private readonly config: LogtoConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithRawBody>();

    if (!this.config.webhookSecret) {
      this.logger.warn(
        'Webhook secret not configured - skipping signature verification',
      );
      return true;
    }

    const signature = request.headers['logto-signature-sha-256'] as string;

    if (!signature) {
      this.logger.warn('Missing logto-signature-sha-256 header');
      throw new UnauthorizedException('Missing webhook signature');
    }

    const rawBody = request.rawBody;

    if (!rawBody) {
      this.logger.error('Raw body not available for signature verification');
      throw new UnauthorizedException('Unable to verify webhook signature');
    }

    const expectedSignature = this.computeSignature(
      this.config.webhookSecret,
      rawBody,
    );

    if (signature !== expectedSignature) {
      this.logger.warn('Invalid webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }

  private computeSignature(secret: string, body: Buffer): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(body);
    return hmac.digest('hex');
  }
}
