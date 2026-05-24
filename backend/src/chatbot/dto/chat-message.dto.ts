import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @MaxLength(500)
  declare message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
