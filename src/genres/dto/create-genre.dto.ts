import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateGenreDto {
  @ApiProperty({ example: 'Rock', description: 'Nombre del género' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
