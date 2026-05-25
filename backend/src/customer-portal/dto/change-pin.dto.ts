import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ChangePinDto {
  @IsString()
  @IsNotEmpty()
  declare currentPin: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(10)
  declare newPin: string;
}
