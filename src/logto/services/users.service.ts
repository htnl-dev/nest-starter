import { Injectable, NotFoundException } from '@nestjs/common';
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
      const response = await this.apiClient.GET('/api/users', {
        params: { query: queryParams as any },
      });

      if (!response.data) {
        throw new Error('Failed to fetch users');
      }

      const users = (response.data ?? []) as unknown as LogtoUser[];
      const logtoResponse: LogtoListResponse<LogtoUser> = {
        data: users,
        totalCount: response.response.headers.get('Total-Number')
          ? parseInt(response.response.headers.get('Total-Number')!, 10)
          : undefined,
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
      body: createUserDto as any,
    });
  }

  async update(userId: string, updateDto: UpdateUserDto): Promise<LogtoUser> {
    return this.patch<LogtoUser>('/api/users/{userId}', {
      params: { path: { userId } },
      body: updateDto as unknown,
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
  async getOrganizations(userId: string): Promise<any[]> {
    try {
      const response = await (this.apiClient.GET as any)(
        `/api/users/${userId}/organizations`,
      );

      if (!response.data) {
        return [];
      }

      return (response.data ?? []) as unknown as any[];
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
      const response = await (this.apiClient.PATCH as any)(
        `/api/users/${userId}/is-suspended`,
        {
          body: { isSuspended },
        },
      );

      if (!response.data) {
        throw new NotFoundException(
          `Failed to update suspension status for user ${userId}`,
        );
      }

      return response.data as unknown as LogtoUser;
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
      const queryParams = this.buildQueryParams(params);
      queryParams.userId = userId;

      const response = await (this.apiClient.GET as any)('/api/logs', {
        params: { query: queryParams as any },
      });

      if (!response.data) {
        throw new Error(`Failed to fetch logs for user ${userId}`);
      }

      const logs = (response.data ?? []) as unknown as LogtoLog[];
      const totalCount = response.response.headers.get('Total-Number')
        ? parseInt(response.response.headers.get('Total-Number'), 10)
        : undefined;

      const logtoResponse: LogtoListResponse<LogtoLog> = {
        data: logs,
        totalCount,
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
          body: updateUserRolesDto as unknown,
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
