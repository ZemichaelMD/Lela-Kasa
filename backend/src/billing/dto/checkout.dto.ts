import { IsIn, IsOptional, IsString } from 'class-validator';

export class ChapaCheckoutDto {
  @IsString()
  planId!: string;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingCycle?: 'monthly' | 'yearly';
}
