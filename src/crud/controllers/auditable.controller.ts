import { AbstractCrudController } from './crud.controller';
import { GenericAuditableDocument } from '../entities/auditable.entity';
import { AuditableService } from '../services/auditable.service';
import { CreateCrudDto as AbstractCreateDto } from '../dto/create-crud.dto';
import { UpdateCrudDto as AbstractUpdateDto } from '../dto/update-crud.dto';
import { Param, Patch, Body } from '@nestjs/common';
import { UpdateAuditableStatusDto } from '../dto/update-auditable-status.dto';
import { ApiResponse, ApiOperation } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';

export abstract class AuditableController<
  Entity extends GenericAuditableDocument,
  CreateDto extends AbstractCreateDto = AbstractCreateDto,
  UpdateDto extends object = AbstractUpdateDto,
> extends AbstractCrudController<Entity, CreateDto, UpdateDto> {
  constructor(
    protected readonly service: AuditableService<Entity, CreateDto, UpdateDto>,
    protected readonly eventEmitter?: EventEmitter2,
  ) {
    super(service, eventEmitter);
  }

  @ApiOperation({ summary: 'Update the status of an entity' })
  @ApiResponse({
    status: 200,
    description: 'The status of the entity has been updated',
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateAuditableStatusDto,
  ) {
    return this.service.updateStatus(id, updateDto);
  }
}
