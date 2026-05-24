import { IsInt, IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';

export enum AllowedStockMovementReason {
  PURCHASE = 'PURCHASE',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
}

export class AdjustStockDto {
  @IsInt()
  declare bottlesDelta: number;

  @IsEnum(AllowedStockMovementReason)
  declare reason: AllowedStockMovementReason;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  notes?: string;
}
