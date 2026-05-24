import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendCustomerSmsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  declare text: string;
}
