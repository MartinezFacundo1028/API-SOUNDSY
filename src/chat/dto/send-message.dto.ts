import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'Contenido del mensaje',
    example: '¡Hola! Me interesa tu servicio de mezcla.',
    maxLength: 2000,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  body: string;

  @ApiProperty({
    description: 'Archivos adjuntos (URLs, metadatos, etc.)',
    example: {
      files: [{ url: 'https://...', name: 'demo.mp3', type: 'audio/mp3' }],
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  attachments?: Record<string, any>;
}
