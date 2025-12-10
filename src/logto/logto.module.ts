import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LogtoUsersService } from './services/users.service';
import { RolesService } from './services/roles.service';
import { PermissionsService } from './services/permissions.service';
import { LogtoAuthGuard } from './guards/logto-auth.guard';
import type { LogtoConfig } from './interfaces/logto-config.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'LOGTO_CONFIG',
      useFactory: (configService: ConfigService): LogtoConfig => {
        const config = {
          endpoint: configService.get<string>('LOGTO_ENDPOINT', ''),
          tenantId: configService.get<string>('LOGTO_TENANT_ID', 'default'),
          clientId: configService.get<string>('LOGTO_APP_ID', ''),
          clientSecret: configService.get<string>('LOGTO_APP_SECRET', ''),
          apiResourceId: configService.getOrThrow<string>(
            'LOGTO_API_RESOURCE_ID',
          ),
          organizationId: configService.get<string>(
            'LOGTO_ORGANIZATION_ID',
            '',
          ),
        };
        return config;
      },
      inject: [ConfigService],
    },
    LogtoUsersService,
    RolesService,
    PermissionsService,
    LogtoAuthGuard,
  ],
  exports: [
    'LOGTO_CONFIG',
    LogtoUsersService,
    RolesService,
    PermissionsService,
    LogtoAuthGuard,
  ],
})
export class LogtoModule {}
