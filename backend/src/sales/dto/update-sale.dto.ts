import { Type } from "class-transformer";
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
} from "class-validator";
import { PaymentMethod } from "../../database";

export class ContainerKasaDto {
  @IsString() declare beverageId: string;
  @IsInt() @Min(1) declare count: number;
}

export class ReturnedContainerDto {
  @IsString() declare beverageId: string;
  @IsInt() @Min(0) declare boxes: number;
  @IsInt() @Min(0) declare bottles: number;
}

export class UpdateSaleLineDto {
  @IsString() declare beverageId: string;
  @IsInt() @Min(0) declare boxes: number;
  @IsInt() @Min(0) declare bottles: number;
}

export class UpdateSalePaymentDto {
  @IsInt() @Min(1) declare amountCents: number;
  @IsOptional() @IsEnum(PaymentMethod) declare method?: PaymentMethod;
  @IsString() declare paymentAccountId: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() paidAt?: string;
}

export class UpdateSaleDto {
  @IsDateString() declare saleDate: string;
  @IsString() declare customerId: string;
  @IsOptional() @IsString() priceTierId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSaleLineDto)
  declare lines: UpdateSaleLineDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSalePaymentDto)
  payments?: UpdateSalePaymentDto[];
  @IsOptional() @IsBoolean() draft?: boolean;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContainerKasaDto)
  containerKasas?: ContainerKasaDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnedContainerDto)
  returnedContainers?: ReturnedContainerDto[];
}
