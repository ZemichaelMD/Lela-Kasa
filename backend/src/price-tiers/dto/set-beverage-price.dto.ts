import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class SetBeveragePriceDto {
  @IsString()
  @IsNotEmpty()
  declare beverageId: string;

  @IsInt()
  @Min(0)
  declare pricePerBoxCents: number;

  @IsInt()
  @Min(0)
  declare pricePerBottleCents: number;
}
