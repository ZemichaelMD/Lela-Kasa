import { IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PermissionUpdateItemDto {
  @IsString()
  slug!: string;

  @IsBoolean()
  granted!: boolean;
}

export class UpdatePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionUpdateItemDto)
  updates!: PermissionUpdateItemDto[];
}
