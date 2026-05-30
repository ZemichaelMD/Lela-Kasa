import { Type } from 'class-transformer';
import { ValidateNested, IsArray, ArrayMinSize } from 'class-validator';
import { SetBeveragePriceDto } from './set-beverage-price.dto';

export class SetBeveragePricesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SetBeveragePriceDto)
  declare prices: SetBeveragePriceDto[];
}
