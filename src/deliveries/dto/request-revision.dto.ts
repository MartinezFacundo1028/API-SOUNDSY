import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class RequestRevisionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'El feedback debe tener al menos 10 caracteres' })
  feedback: string;
}
