import { Injectable } from '@nestjs/common';
import { BaseLogtoService } from './base-logto.service';
import {
  LogtoUser,
  LogtoListResponse,
  LogtoQueryParams,
  LogtoLog,
  LogtoRole,
  LogtoScope,
} from '../types/logto.types';
import { PaginatedResponseDto } from '../../crud/dto/paginated-response.dto';
import { LogtoCreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UpdateUserRolesDto } from '../dtos/update-user-roles.dto';
import { LogtoOrganization } from './organizations.service';

@Injectable()
export class LogtoUsersService extends BaseLogtoService<
  LogtoUser,
  LogtoCreateUserDto,
  UpdateUserDto
> {
  async findAll(
    params?: LogtoQueryParams,
  ): Promise<PaginatedResponseDto<LogtoUser>> {
    try {
      const queryParams = this.buildQueryParams(params);
      const users = await this.get<LogtoUser[]>('/api/users', {
        params: { query: queryParams },
      });

      const logtoResponse: LogtoListResponse<LogtoUser> = {
        data: users,
      };

      return this.transformToPaginatedResponse(
        logtoResponse,
        params?.page ?? 1,
        params?.page_size ?? 20,
      );
    } catch (error) {
      this.logger.error('Failed to get users', error);
      throw error;
    }
  }

  async findOne(userId: string): Promise<LogtoUser> {
    return this.get<LogtoUser>('/api/users/{userId}', {
      params: { path: { userId } },
    });
  }

  async create(createUserDto: LogtoCreateUserDto): Promise<LogtoUser> {
    return this.post<LogtoUser>('/api/users', {
      body: createUserDto,
    });
  }

  async update(userId: string, updateDto: UpdateUserDto): Promise<LogtoUser> {
    return this.patch<LogtoUser>('/api/users/{userId}', {
      params: { path: { userId } },
      body: updateDto,
    });
  }

  async remove(userId: string): Promise<void> {
    return this.delete('/api/users/{userId}', {
      params: { path: { userId } },
    });
  }

  /**
   * Get organizations that a user belongs to
   */
  async getOrganizations(userId: string): Promise<LogtoOrganization[]> {
    try {
      return await this.get<LogtoOrganization[]>(
        `/api/users/${userId}/organizations`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to get organizations for user ${userId}`,
        error,
      );
      return [];
    }
  }

  async setSuspensionStatus(
    userId: string,
    isSuspended: boolean,
  ): Promise<LogtoUser> {
    try {
      return await this.patch<LogtoUser>(`/api/users/${userId}/is-suspended`, {
        body: { isSuspended },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update suspension status for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  async getLogs(
    userId: string,
    params?: LogtoQueryParams,
  ): Promise<PaginatedResponseDto<LogtoLog>> {
    try {
      const queryParams: Record<string, unknown> = {
        ...this.buildQueryParams(params),
        userId,
      };

      const logs = await this.get<LogtoLog[]>('/api/logs', {
        params: { query: queryParams },
      });

      const logtoResponse: LogtoListResponse<LogtoLog> = {
        data: logs,
      };

      return this.transformToPaginatedResponse(
        logtoResponse,
        params?.page ?? 1,
        params?.page_size ?? 20,
      );
    } catch (error) {
      this.logger.error(`Failed to get logs for user ${userId}`, error);
      throw error;
    }
  }

  async updateRoles(
    userId: string,
    updateUserRolesDto: UpdateUserRolesDto,
  ): Promise<void> {
    try {
      await this.put(
        '/api/organizations/{organizationId}/users/{userId}/roles',
        {
          params: {
            path: { userId, organizationId: this.config.organizationId },
          },
          body: updateUserRolesDto,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to add roles to user ${userId}`, error);
      throw error;
    }
  }

  async getRoles(userId: string): Promise<LogtoRole[]> {
    try {
      return this.get<LogtoRole[]>(
        '/api/organizations/{organizationId}/users/{userId}/roles',
        {
          params: {
            path: { userId, organizationId: this.config.organizationId },
            query: {
              page: 1,
              page_size: 100,
            },
          },
        },
      );
    } catch (error) {
      this.logger.error(`Failed to get user roles for user ${userId}`, error);
      throw error;
    }
  }

  async getScopes(userId: string): Promise<LogtoScope[]> {
    try {
      return this.get<LogtoScope[]>(
        '/api/organizations/{organizationId}/users/{userId}/scopes',
        {
          params: {
            path: { userId, organizationId: this.config.organizationId },
          },
        },
      );
    } catch (error) {
      this.logger.error(`Failed to get user scopes for user ${userId}`, error);
      throw error;
    }
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    try {
      await this.delete('/api/users/{userId}/roles/{roleId}', {
        params: { path: { userId, roleId } },
      });
    } catch (error) {
      this.logger.error(
        `Failed to remove role ${roleId} from user ${userId}`,
        error,
      );
      throw error;
    }
  }
}
