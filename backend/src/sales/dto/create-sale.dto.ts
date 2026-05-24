import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@/database';

export class SaleLineDto {
  @IsString() declare beverageId: string;
  @IsInt() @Min(0) declare boxes: number;
  @IsInt() @Min(0) declare bottles: number;
}

export class SalePaymentDto {
  @IsInt() @Min(1) declare amountCents: number;
  @IsEnum(PaymentMethod) declare method: PaymentMethod;
  @IsString() declare paymentAccountId: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() paidAt?: string;
}

export class CreateSaleDto {
  @IsDateString() declare saleDate: string;
  @IsString() declare customerId: string;
  @IsOptional() @IsString() priceTierId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => SaleLineDto) declare lines: SaleLineDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentDto)
  payments?: SalePaymentDto[];
  @IsInt() @Min(0) declare boxesReturnedOnSale: number;
  @IsInt() @Min(0) declare bottlesReturnedOnSale: number;
  @IsOptional() @IsBoolean() draft?: boolean;
}
