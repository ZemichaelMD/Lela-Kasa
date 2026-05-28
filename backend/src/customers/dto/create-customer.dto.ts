import { IsEmail, IsString, IsOptional, IsNotEmpty, IsBoolean, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  declare name: string;

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
}
