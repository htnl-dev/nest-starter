import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LogtoUsersService } from './services/users.service';
import { RolesService } from './services/roles.service';
import { PermissionsService } from './services/permissions.service';
import { OrganizationsService } from './services/organizations.service';
import { LogtoAuthGuard } from './guards/logto-auth.guard';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import type { LogtoConfig } from './interfaces/logto-config.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'LOGTO_CONFIG',
      useFactory: (configService: ConfigService): LogtoConfig => {
        const endpoint = configService.get<string>('LOGTO_ENDPOINT', '');
        const clientId = configService.get<string>('LOGTO_APP_ID', '');
        const clientSecret = configService.get<string>('LOGTO_APP_SECRET', '');
        const apiResourceId = configService.get<string>(
          'LOGTO_API_RESOURCE_ID',
          '',
        );

        const enabled = !!(
          endpoint &&
          clientId &&
          clientSecret &&
          apiResourceId
        );

        return {
          enabled,
          endpoint,
          tenantId: configService.get<string>('LOGTO_TENANT_ID', 'default'),
          clientId,
          clientSecret,
          apiResourceId,
          organizationId: configService.get<string>(
            'LOGTO_ORGANIZATION_ID',
            '',
          ),
          webhookSecret: configService.get<string>('LOGTO_WEBHOOK_SECRET'),
        };
      },
      inject: [ConfigService],
    },
    LogtoUsersService,
    RolesService,
    PermissionsService,
    OrganizationsService,
    LogtoAuthGuard,
    WebhookSignatureGuard,
  ],
  exports: [
    'LOGTO_CONFIG',
    LogtoUsersService,
    RolesService,
    PermissionsService,
    OrganizationsService,
    LogtoAuthGuard,
    WebhookSignatureGuard,
  ],
})
export class LogtoModule {}
