import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { PaymentMethod } from "../../database";

export class AddPaymentDto {
  @IsInt() @Min(1) declare amountCents: number;
  @IsOptional() @IsEnum(PaymentMethod) declare method?: PaymentMethod;
  @IsString() declare paymentAccountId: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() paidAt?: string;
}
