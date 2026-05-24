import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  MaxLength,
} from 'class-validator';

export enum PaymentAccountKind {
  CASH_PERSON = 'CASH_PERSON',
  BANK = 'BANK',
  MOBILE_MONEY = 'MOBILE_MONEY',
  OTHER = 'OTHER',
}

export class CreatePaymentAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  declare name: string;

  @IsEnum(PaymentAccountKind)
  declare kind: PaymentAccountKind;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  holderName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
