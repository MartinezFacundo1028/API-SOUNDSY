import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @ApiPropertyOptional({
    description: 'Título del servicio',
    example: 'Mezcla profesional de rock actualizada',
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del servicio',
    example: 'Descripción actualizada del servicio',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Precio base en centavos (ej: 5000 = $50.00)',
    example: 6000,
    minimum: 100,
  })
  basePrice?: number;

  @ApiPropertyOptional({
    description: 'Moneda del precio',
    example: 'USD',
  })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Días de entrega estimados',
    example: 10,
    minimum: 1,
    maximum: 365,
  })
  deliveryDays?: number;

  @ApiPropertyOptional({
    description: 'Tags/etiquetas del servicio',
    example: ['mezcla', 'rock', 'actualizado'],
    type: [String],
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Nombres de los géneros musicales',
    example: ['Rock', 'Metal', 'Alternative'],
    type: [String],
  })
  genres?: string[];
}
