import { IsInt, IsOptional, IsPositive, IsString, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListServicesDto {
  @IsOptional()
  @IsString()
  musicianId?: string; // dueño del servicio (músico)

  @IsOptional()
  @IsString()
  genre?: string; // nombre del género (ej: "Rock")

  @IsOptional()
  @IsString()
  instrument?: string; // ej: "guitarra" (minúsculas recomendado)

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  cursor?: string; // id del último item de la página anterior
}
