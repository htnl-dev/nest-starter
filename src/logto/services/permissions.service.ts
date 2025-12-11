import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseLogtoService } from './base-logto.service';
import {
  LogtoScope,
  LogtoListResponse,
  LogtoQueryParams,
} from '../types/logto.types';
import { PaginatedResponseDto } from '../../crud/dto/paginated-response.dto';
import { CreatePermissionDto } from '../dtos/create-permission.dto';
import { UpdatePermissionDto } from '../dtos/update-permission.dto';

@Injectable()
export class PermissionsService extends BaseLogtoService<
  LogtoScope,
  CreatePermissionDto,
  UpdatePermissionDto
> {
  async findAll(
    params?: LogtoQueryParams,
  ): Promise<PaginatedResponseDto<LogtoScope>> {
    try {
      const queryParams = this.buildQueryParams(params);
      const scopes = await this.get<LogtoScope[]>('/api/organization-scopes', {
        params: {
          query: queryParams,
        },
      });

      const logtoResponse: LogtoListResponse<LogtoScope> = {
        data: scopes,
      };

      return this.transformToPaginatedResponse(
        logtoResponse,
        params?.page ?? 1,
        params?.page_size ?? 20,
      );
    } catch (error) {
      this.logger.error('Failed to get permissions', error);
      throw error;
    }
  }

  async findOne(scopeId: string): Promise<LogtoScope> {
    try {
      const scopes = await this.get<LogtoScope[]>('/api/organization-scopes');

      const scope = scopes.find((s) => s.id === scopeId);

      if (!scope) {
        throw new NotFoundException(`Permission ${scopeId} not found`);
      }

      return scope;
    } catch (error) {
      this.logger.error(`Failed to get permission ${scopeId}`, error);
      throw error;
    }
  }

  async create(createPermissionDto: CreatePermissionDto): Promise<LogtoScope> {
    return this.post<LogtoScope>('/api/organization-scopes', {
      body: createPermissionDto,
    });
  }

  async update(
    scopeId: string,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<LogtoScope> {
    return this.patch<LogtoScope>('/api/organization-scopes/{scopeId}', {
      params: { path: { scopeId } },
      body: updatePermissionDto,
    });
  }

  async remove(scopeId: string): Promise<void> {
    return this.delete('/api/organization-scopes/{scopeId}', {
      params: { path: { scopeId } },
    });
  }
}
