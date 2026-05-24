import { IsBoolean, IsString } from 'class-validator';

export class ChatConfirmDto {
  @IsString()
  declare sessionId: string;

  @IsBoolean()
  declare confirm: boolean;
}
