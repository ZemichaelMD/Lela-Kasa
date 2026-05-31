import { IsInt, IsOptional, IsString, IsEnum } from 'class-validator';

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
  emptyBoxesDelta?: number;

  @IsOptional()
  @IsInt()
  emptyBottlesDelta?: number;

  @IsEnum(InventoryReason)
  declare reason: InventoryReason;

  @IsOptional()
  @IsString()
  notes?: string;
}
