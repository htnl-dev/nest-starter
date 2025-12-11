import type { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import type { LogtoQueryParams } from '../types/logto.types';

export interface IBaseLogtoService<T, CreateDto, UpdateDto> {
  findAll(params?: LogtoQueryParams): Promise<PaginatedResponseDto<T>>;
  findOne(id: string): Promise<T>;
  create(dto: CreateDto): Promise<T>;
  update(id: string, dto: UpdateDto): Promise<T>;
  remove(id: string): Promise<void>;
}
