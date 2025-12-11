export interface LogtoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface LogtoUser {
  id: string;
  username?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  name?: string;
  avatar?: string;
  customData?: Record<string, unknown>;
  identities?: Record<string, unknown>;
  lastSignInAt?: number;
  createdAt: number;
  applicationId?: string;
  isSuspended?: boolean;
  profile?: LogtoUserProfile;
}

export interface LogtoUserProfile {
  familyName?: string;
  givenName?: string;
  middleName?: string;
  nickname?: string;
  preferredUsername?: string;
  profile?: string;
  website?: string;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  address?: LogtoAddress;
}

export interface LogtoAddress {
  formatted?: string;
  streetAddress?: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

export interface LogtoRole {
  id: string;
  name: string;
  description?: string;
  type: 'User' | 'MachineToMachine';
  isDefault?: boolean;
  scopeIds?: string[];
  createdAt: number;
}

export interface LogtoRoleWithScopes extends LogtoRole {
  scopes?: LogtoScope[];
}

export interface LogtoScope {
  id: string;
  resourceId: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface LogtoLog {
  id: string;
  key: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface LogtoListResponse<T> {
  data: T[];
  totalCount?: number;
}

export interface LogtoApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface LogtoQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  exclude_organization_roles?: boolean;
  exclude_role_id?: string;
  exclude_user_id?: string;
  include_organization_roles?: boolean;
  include_resource_scopes?: boolean;
  include_total_count?: boolean;
}

export interface TokenValidationOptions {
  issuer: string;
  audience: string;
}

export interface ValidatedTokenPayload {
  sub: string;
  scope?: string;
  client_id?: string;
  aud: string | string[];
  iat?: number;
  exp?: number;
  iss?: string;
}

export interface RequestWithAuth extends Request {
  auth?: ValidatedTokenPayload;
  user?: CurrentUser;
  permissions?: string[];
}

export interface CurrentUser {
  _id: string;
  username: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export interface LogtoOrganizationInvitation {
  id: string;
  inviterId: string;
  invitee: string;
  acceptedUserId?: string;
  organizationId: string;
  status: 'Pending' | 'Accepted' | 'Expired' | 'Revoked';
  createdAt: number;
  updatedAt?: number;
  expiresAt?: number;
  organizationRoles?: string[];
  messagePayload?: string;
}
