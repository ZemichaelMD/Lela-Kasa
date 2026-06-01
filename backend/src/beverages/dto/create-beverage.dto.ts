import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsUrl,
  Matches,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateBeverageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  declare name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sizeMl?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  bottlesPerBox?: number;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9-]{1,20}$/, {
    message: 'code must be alphanumeric with optional hyphens (max 20 chars)',
  })
  code?: string;
}
