import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListChatsDto {
  @ApiProperty({
    description: 'Cursor de paginación (ID del último chat)',
    example: 'cm2abc123def456ghi789',
    required: false,
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    description: 'Número máximo de chats a retornar',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
