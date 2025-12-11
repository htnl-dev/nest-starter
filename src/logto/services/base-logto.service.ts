import {
  Injectable,
  Logger,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  createManagementApi,
  type CreateManagementApiOptions,
} from '@logto/api/management';
import {
  LogtoListResponse,
  LogtoQueryParams,
  LogtoApiError,
} from '../types/logto.types';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../../common/dto/paginated-response.dto';
import type { LogtoConfig } from '../interfaces/logto-config.interface';
import type { IBaseLogtoService } from '../interfaces/base-logto.types';

interface LogtoApiResponse<T> {
  data?: T;
  error?: LogtoApiError;
  response: Response;
}

type LogtoApiMethod = <T>(
  path: string,
  options?: {
    params?: { path?: Record<string, string>; query?: Record<string, unknown> };
    body?: unknown;
  },
) => Promise<LogtoApiResponse<T>>;

@Injectable()
export abstract class BaseLogtoService<T, CreateDto, UpdateDto>
  implements IBaseLogtoService<T, CreateDto, UpdateDto>
{
  protected readonly logger = new Logger(this.constructor.name);
  protected apiClient:
    | ReturnType<typeof createManagementApi>['apiClient']
    | null = null;

  constructor(@Inject('LOGTO_CONFIG') protected config: LogtoConfig) {
    if (!this.config.enabled) {
      this.logger.warn(
        'Logto is not configured. Set LOGTO_ENDPOINT, LOGTO_APP_ID, LOGTO_APP_SECRET, and LOGTO_API_RESOURCE_ID to enable.',
      );
      return;
    }

    const managementApiOptions: CreateManagementApiOptions = {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
    };

    if (this.config.endpoint) {
      managementApiOptions.baseUrl = this.config.endpoint;
      managementApiOptions.apiIndicator = `${this.config.endpoint}/api`;
    }

    const { apiClient } = createManagementApi(
      this.config.tenantId,
      managementApiOptions,
    );
    this.apiClient = apiClient;
  }

  get isEnabled(): boolean {
    return this.config.enabled && this.apiClient !== null;
  }

  protected assertEnabled(): void {
    if (!this.config.enabled || !this.apiClient) {
      throw new InternalServerErrorException(
        'Logto is not configured. Set LOGTO_ENDPOINT, LOGTO_APP_ID, LOGTO_APP_SECRET, and LOGTO_API_RESOURCE_ID environment variables.',
      );
    }
  }

  abstract findAll(params?: LogtoQueryParams): Promise<PaginatedResponseDto<T>>;
  abstract findOne(id: string): Promise<T>;
  abstract create(dto: CreateDto): Promise<T>;
  abstract update(id: string, dto: UpdateDto): Promise<T>;
  abstract remove(id: string): Promise<void>;

  protected buildQueryParams(
    params?: LogtoQueryParams,
  ): Record<string, unknown> {
    if (!params) return {};

    const queryParams: Record<string, unknown> = {};

    if (params.page !== undefined) queryParams.page = params.page;
    if (params.page_size !== undefined)
      queryParams.page_size = params.page_size;
    if (params.search !== undefined && params.search !== '')
      queryParams.q = params.search;

    return queryParams;
  }

  protected transformToPaginatedResponse<TData>(
    logtoResponse: LogtoListResponse<TData>,
    page: number = 1,
    pageSize: number = 20,
  ): PaginatedResponseDto<TData> {
    const total = logtoResponse.totalCount ?? logtoResponse.data.length;
    const totalPages = Math.ceil(total / pageSize);

    const pagination: PaginationMetaDto = {
      total,
      page,
      limit: pageSize,
      totalPages,
    };

    return {
      data: logtoResponse.data,
      pagination,
    };
  }

  protected async get<TResponse>(
    path: string,
    options?: {
      params?: {
        path?: Record<string, string>;
        query?: Record<string, unknown>;
      };
    },
  ): Promise<TResponse> {
    this.assertEnabled();
    try {
      const apiGet = this.apiClient!.GET as LogtoApiMethod;
      const response = await apiGet<TResponse>(path, options);

      if (!response.data) {
        this.logger.error(`GET ${path} failed`, response.error);
        throw new InternalServerErrorException(
          response.error?.message ?? 'Unknown error',
          `GET ${path} failed`,
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error(`GET ${path} failed`, error);
      throw error;
    }
  }

  protected async post<TResponse>(
    path: string,
    options?: {
      params?: { path?: Record<string, string> };
      body?: unknown;
    },
  ): Promise<TResponse> {
    this.assertEnabled();
    try {
      const apiPost = this.apiClient!.POST as LogtoApiMethod;
      const response = await apiPost<TResponse>(path, options);

      if (!response.data) {
        this.logger.error(`POST ${path} failed`, response.error);
        throw new InternalServerErrorException(
          response.error?.message ?? 'Unknown error',
          `POST ${path} failed`,
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error(`POST ${path} failed`, error);
      throw error;
    }
  }

  protected async put<TResponse>(
    path: string,
    options?: {
      params?: { path?: Record<string, string> };
      body?: unknown;
    },
  ): Promise<TResponse> {
    this.assertEnabled();
    try {
      const apiPut = this.apiClient!.PUT as LogtoApiMethod;
      const response = await apiPut<TResponse>(path, options);

      if (!response.response.ok) {
        this.logger.error(`PUT ${path} failed`, response.error);
        throw new InternalServerErrorException(
          response.error?.message ?? 'Unknown error',
          `PUT ${path} failed`,
        );
      }

      return response.data as TResponse;
    } catch (error) {
      this.logger.error(`PUT ${path} failed`, error);
      throw error;
    }
  }

  protected async patch<TResponse>(
    path: string,
    options?: {
      params?: { path?: Record<string, string> };
      body?: unknown;
    },
  ): Promise<TResponse> {
    this.assertEnabled();
    try {
      const apiPatch = this.apiClient!.PATCH as LogtoApiMethod;
      const response = await apiPatch<TResponse>(path, options);

      if (!response.response.ok) {
        this.logger.error(`PATCH ${path} failed`, response.error);
        throw new InternalServerErrorException(
          response.error?.message ?? 'Unknown error',
          `PATCH ${path} failed`,
        );
      }

      return response.data as TResponse;
    } catch (error) {
      this.logger.error(`PATCH ${path} failed`, error);
      throw error;
    }
  }

  protected async delete(
    path: string,
    options?: {
      params?: { path?: Record<string, string> };
    },
  ): Promise<void> {
    this.assertEnabled();
    try {
      const apiDelete = this.apiClient!.DELETE as LogtoApiMethod;
      const response = await apiDelete<void>(path, options);

      if (response.error) {
        this.logger.error(`DELETE ${path} failed`, response.error);
        throw new InternalServerErrorException(
          response.error.message ?? 'Unknown error',
          `DELETE ${path} failed`,
        );
      }
    } catch (error) {
      this.logger.error(`DELETE ${path} failed`, error);
      throw error;
    }
  }
}
