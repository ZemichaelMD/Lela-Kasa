import { IsInt, Min } from 'class-validator';

export class SwapDto {
  @IsInt()
  @Min(0)
  declare emptyBoxes: number;

  @IsInt()
  @Min(0)
  declare emptyBottles: number;
}
