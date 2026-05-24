import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class CreateOrderLineDto {
  @IsString()
  @IsNotEmpty()
  declare beverageId: string;

  @IsInt()
  @Min(0)
  boxes: number = 0;

  @IsInt()
  @Min(0)
  bottles: number = 0;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  declare customerId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  declare lines: CreateOrderLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
