import { IsString, IsOptional, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { PriceTierKind } from './create-price-tier.dto';

export class UpdatePriceTierDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(PriceTierKind)
  kind?: PriceTierKind;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
