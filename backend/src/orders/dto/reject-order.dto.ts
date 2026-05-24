import { IsOptional, IsString } from 'class-validator';

export class RejectOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
