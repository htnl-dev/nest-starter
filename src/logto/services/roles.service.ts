import { Injectable } from '@nestjs/common';
import { BaseLogtoService } from './base-logto.service';
import {
  LogtoRole,
  LogtoRoleWithScopes,
  LogtoScope,
  LogtoListResponse,
  LogtoQueryParams,
} from '../types/logto.types';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CreateRoleDto } from '../dtos/create-role.dto';
import { UpdateRoleDto } from '../dtos/update-role.dto';

@Injectable()
export class RolesService extends BaseLogtoService<
  LogtoRole,
  CreateRoleDto,
  UpdateRoleDto
> {
  async findAll(
    params?: LogtoQueryParams,
  ): Promise<PaginatedResponseDto<LogtoRole>> {
    try {
      const queryParams = this.buildQueryParams(params);
      const roles = await this.get<LogtoRole[]>('/api/organization-roles', {
        params: {
          query: queryParams,
        },
      });

      const logtoResponse: LogtoListResponse<LogtoRole> = {
        data: roles,
      };

      return this.transformToPaginatedResponse(
        logtoResponse,
        params?.page ?? 1,
        params?.page_size ?? 20,
      );
    } catch (error) {
      this.logger.error('Failed to get roles', error);
      throw error;
    }
  }

  async findOne(roleId: string): Promise<LogtoRoleWithScopes> {
    try {
      const role = await this.get<LogtoRole>('/api/organization-roles/{id}', {
        params: { path: { id: roleId } },
      });

      const scopes = await this.get<LogtoScope[]>(
        '/api/organization-roles/{id}/scopes',
        {
          params: { path: { id: roleId } },
        },
      );

      return {
        ...role,
        scopes,
      };
    } catch (error) {
      this.logger.error(`Failed to get role ${roleId} with scopes`, error);
      throw error;
    }
  }

  async create(createRoleDto: CreateRoleDto): Promise<LogtoRole> {
    return this.post<LogtoRole>('/api/organization-roles', {
      body: createRoleDto,
    });
  }

  async update(
    roleId: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<LogtoRole> {
    try {
      const { organizationScopeIds, ...baseUpdate } = updateRoleDto;

      let updatedRole: LogtoRole;
      if (Object.keys(baseUpdate).length > 0) {
        updatedRole = await this.patch<LogtoRole>(
          '/api/organization-roles/{id}',
          {
            params: { path: { id: roleId } },
            body: baseUpdate,
          },
        );
      } else {
        updatedRole = await this.get<LogtoRole>(
          '/api/organization-roles/{id}',
          {
            params: { path: { id: roleId } },
          },
        );
      }

      if (organizationScopeIds && organizationScopeIds.length > 0) {
        await this.put<void>('/api/organization-roles/{id}/scopes', {
          params: { path: { id: roleId } },
          body: { organizationScopeIds },
        }).catch((error) => {
          this.logger.error(`Failed to update role ${roleId} scopes`, error);
          throw error;
        });
      }

      return updatedRole;
    } catch (error) {
      this.logger.error(`Failed to update role ${roleId}`, error);
      throw error;
    }
  }

  async remove(roleId: string): Promise<void> {
    return this.delete('/api/organization-roles/{id}', {
      params: { path: { id: roleId } },
    });
  }
}
