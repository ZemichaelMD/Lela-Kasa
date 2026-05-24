import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RecordContainerReturnDto {
  @IsInt() @Min(0) declare boxes: number;
  @IsInt() @Min(0) declare bottles: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() returnedAt?: string;
}
