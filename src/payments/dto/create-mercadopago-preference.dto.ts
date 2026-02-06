import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMercadoPagoPreferenceDto {
  @ApiProperty({
    description: 'ID de la orden a pagar',
    example: 'cmgtpt82u0001fws0lji1pook',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
