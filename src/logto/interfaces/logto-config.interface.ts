export interface LogtoConfig {
  enabled: boolean;
  endpoint: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  apiResourceId: string;
  organizationId: string;
  webhookSecret?: string;
}
