// dto de create service

import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsPositive,
  IsOptional,
  IsArray,
  ArrayMinSize,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @ApiProperty({
    description: 'Título del servicio',
    example: 'Mezcla profesional de rock',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Descripción detallada del servicio',
    example:
      'Ofrezco servicios de mezcla profesional para bandas de rock. Incluye ecualización, compresión y masterización básica.',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiProperty({
    description: 'Precio base en centavos (ej: 5000 = $50.00)',
    example: 5000,
    minimum: 100,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(100) // mínimo $1.00
  basePrice: number;

  @ApiProperty({
    description: 'Moneda del precio',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiProperty({
    description: 'Días de entrega estimados',
    example: 7,
    minimum: 1,
    maximum: 365,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(365)
  deliveryDays: number;

  @ApiProperty({
    description: 'Tags/etiquetas del servicio',
    example: ['mezcla', 'rock', 'profesional', 'masterización'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(0)
  tags?: string[];

  @ApiProperty({
    description: 'Nombres de los géneros musicales',
    example: ['Rock', 'Jazz', 'Blues'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  genres?: string[];
}
