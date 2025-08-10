import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Logger,
} from '@nestjs/common';
import { AbstractCrudService } from '../services/crud.service';
import { CreateCrudDto as AbstractCreateDto } from '../dto/create-crud.dto';
import { UpdateCrudDto as AbstractUpdateDto } from '../dto/update-crud.dto';
import { CrudEntity } from '../entities/crud.entity';
import { QueryDto } from '../dto/crud-query.dto';

@Controller('crud')
export class AbstractCrudController<
  Entity extends CrudEntity,
  CreateDto extends AbstractCreateDto = AbstractCreateDto,
  UpdateDto extends {} = AbstractUpdateDto,
> {
  protected readonly logger = new Logger();

  constructor(
    protected readonly crudService: AbstractCrudService<
      Entity,
      CreateDto,
      UpdateDto
    >,
  ) {}

  @Post()
  create(@Body() createCrudDto: CreateDto, user?: any) {
    return this.crudService.create(createCrudDto, user);
  }

  @Get()
  findAll(@Query() query: any & QueryDto) {
    return this.crudService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.crudService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCrudDto: UpdateDto,
    user?: any,
  ) {
    return this.crudService.update(id, updateCrudDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.crudService.remove(id);
  }
}
