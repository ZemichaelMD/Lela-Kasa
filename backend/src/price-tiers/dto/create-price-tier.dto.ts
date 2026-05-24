import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, MaxLength } from 'class-validator';

export enum PriceTierKind {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  VIP = 'VIP',
  CUSTOM = 'CUSTOM',
}

export class CreatePriceTierDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  declare name: string;

  @IsOptional()
  @IsEnum(PriceTierKind)
  kind?: PriceTierKind;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
