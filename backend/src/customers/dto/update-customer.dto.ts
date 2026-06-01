import {
  IsEmail,
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  priceTierId?: string;

  @IsOptional()
  @IsBoolean()
  priceTierLocked?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  pin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9-]{1,20}$/, {
    message: 'code must be alphanumeric with optional hyphens (max 20 chars)',
  })
  code?: string;
}
