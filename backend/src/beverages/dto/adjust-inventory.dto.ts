import { IsInt, IsOptional, IsString, IsEnum, Min } from 'class-validator';

export enum InventoryReason {
  PURCHASE = 'PURCHASE',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
}

export class AdjustInventoryDto {
  @IsOptional()
  @IsInt()
  fullBottlesDelta?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  declare emptyBoxesDelta?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  declare emptyBottlesDelta?: number;

  @IsEnum(InventoryReason)
  declare reason: InventoryReason;

  @IsOptional()
  @IsString()
  notes?: string;
}
