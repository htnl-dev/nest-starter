import { CreateCrudDto } from './create-crud.dto';

export class CreateSlugAwareCrudDto extends CreateCrudDto {
  slug: string;
}
