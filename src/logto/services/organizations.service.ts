import { Injectable } from '@nestjs/common';
import { BaseLogtoService } from './base-logto.service';
import {
  LogtoUser,
  LogtoListResponse,
  LogtoQueryParams,
  LogtoOrganizationInvitation,
} from '../types/logto.types';
import { PaginatedResponseDto } from '../../crud/dto/paginated-response.dto';
import { InviteUserDto } from '../dtos/invite-user.dto';

export interface LogtoOrganization {
  id: string;
  name: string;
  description?: string;
  customData?: Record<string, unknown>;
  createdAt: number;
}

export class CreateOrganizationDto {
  name: string;
  description?: string;
  customData?: Record<string, unknown>;
}

export class UpdateOrganizationDto {
  name?: string;
  description?: string;
  customData?: Record<string, unknown>;
}

@Injectable()
export class OrganizationsService extends BaseLogtoService<
  LogtoOrganization,
  CreateOrganizationDto,
  UpdateOrganizationDto
> {
  async findAll(
    params?: LogtoQueryParams,
  ): Promise<PaginatedResponseDto<LogtoOrganization>> {
    try {
      const queryParams = this.buildQueryParams(params);
      const organizations = await this.get<LogtoOrganization[]>(
        '/api/organizations',
        {
          params: {
            query: queryParams,
          },
        },
      );

      const logtoResponse: LogtoListResponse<LogtoOrganization> = {
        data: organizations,
      };

      return this.transformToPaginatedResponse(
        logtoResponse,
        params?.page ?? 1,
        params?.page_size ?? 20,
      );
    } catch (error) {
      this.logger.error('Failed to get organizations', error);
      throw error;
    }
  }

  async findOne(organizationId: string): Promise<LogtoOrganization> {
    return this.get<LogtoOrganization>('/api/organizations/{id}', {
      params: { path: { id: organizationId } },
    });
  }

  async create(createDto: CreateOrganizationDto): Promise<LogtoOrganization> {
    return this.post<LogtoOrganization>('/api/organizations', {
      body: createDto,
    });
  }

  async update(
    organizationId: string,
    updateDto: UpdateOrganizationDto,
  ): Promise<LogtoOrganization> {
    return this.patch<LogtoOrganization>('/api/organizations/{id}', {
      params: { path: { id: organizationId } },
      body: updateDto,
    });
  }

  async remove(organizationId: string): Promise<void> {
    return this.delete('/api/organizations/{id}', {
      params: { path: { id: organizationId } },
    });
  }

  /**
   * Get users in the configured organization
   */
  async getUsers(
    params?: LogtoQueryParams,
    organizationId: string = this.config.organizationId,
  ): Promise<PaginatedResponseDto<LogtoUser>> {
    try {
      const queryParams = this.buildQueryParams(params);

      const users = await this.get<LogtoUser[]>(
        '/api/organizations/{id}/users',
        {
          params: {
            path: { id: organizationId },
            query: queryParams,
          },
        },
      );

      const logtoResponse: LogtoListResponse<LogtoUser> = {
        data: users,
      };

      return this.transformToPaginatedResponse(
        logtoResponse,
        params?.page ?? 1,
        params?.page_size ?? 20,
      );
    } catch (error) {
      this.logger.error('Failed to get organization users', error);
      throw error;
    }
  }

  /**
   * Add a user to the organization
   */
  async addUser(
    userId: string,
    organizationId: string = this.config.organizationId,
  ): Promise<void> {
    try {
      await this.post<void>(`/api/organizations/${organizationId}/users`, {
        body: { userIds: [userId] },
      });
    } catch (error) {
      this.logger.error(
        `Failed to add user ${userId} to organization ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove a user from the organization
   */
  async removeUser(
    userId: string,
    organizationId: string = this.config.organizationId,
  ): Promise<void> {
    try {
      await this.delete(`/api/organizations/{id}/users/{userId}`, {
        params: { path: { id: organizationId, userId } },
      });
    } catch (error) {
      this.logger.error(
        `Failed to remove user ${userId} from organization ${organizationId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if a user is in the organization
   */
  async isUserInOrganization(
    userId: string,
    organizationId: string = this.config.organizationId,
  ): Promise<boolean> {
    try {
      const usersInOrganization = await this.getUsers(
        {
          page: 1,
          page_size: 100,
          search: userId,
        },
        organizationId,
      );
      return usersInOrganization.data.some(
        (user: LogtoUser) => user.id === userId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to check organization membership for user ${userId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Invite a user to the organization
   */
  async inviteUser(
    inviteUserDto: InviteUserDto,
    organizationId: string = this.config.organizationId,
  ): Promise<LogtoOrganizationInvitation> {
    try {
      const payload = {
        ...inviteUserDto,
        organizationId,
      };

      return await this.post<LogtoOrganizationInvitation>(
        '/api/organization-invitations',
        {
          body: payload,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to invite user ${inviteUserDto.invitee}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get organization invitations
   */
  async getInvitations(
    params?: LogtoQueryParams,
    organizationId: string = this.config.organizationId,
  ): Promise<PaginatedResponseDto<LogtoOrganizationInvitation>> {
    try {
      const queryParams: Record<string, unknown> = {
        ...this.buildQueryParams(params),
        organizationId,
      };

      const invitations = await this.get<LogtoOrganizationInvitation[]>(
        '/api/organization-invitations',
        {
          params: { query: queryParams },
        },
      );

      const logtoResponse: LogtoListResponse<LogtoOrganizationInvitation> = {
        data: invitations,
      };

      return this.transformToPaginatedResponse(
        logtoResponse,
        params?.page ?? 1,
        params?.page_size ?? 20,
      );
    } catch (error) {
      this.logger.error('Failed to get organization invitations', error);
      throw error;
    }
  }

  /**
   * Revoke an organization invitation
   */
  async revokeInvitation(invitationId: string): Promise<void> {
    try {
      await this.delete('/api/organization-invitations/{id}', {
        params: { path: { id: invitationId } },
      });
    } catch (error) {
      this.logger.error(`Failed to revoke invitation ${invitationId}`, error);
      throw error;
    }
  }
}
