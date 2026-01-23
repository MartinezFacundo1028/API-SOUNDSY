import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsObject, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Nombre de visualización del usuario',
    example: 'Demo Musician',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres' })
  displayName?: string;

  @ApiProperty({
    description: 'Biografía o descripción del usuario',
    example: 'Productor musical especializado en mezcla y masterización',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La biografía no puede exceder 500 caracteres' })
  bio?: string;

  @ApiProperty({
    description: 'URL del avatar del usuario',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({
    description: 'Lista de instrumentos que toca el usuario',
    example: ['guitarra', 'piano', 'batería'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instruments?: string[];

  @ApiProperty({
    description: 'Enlaces a redes sociales y portafolio',
    example: {
      spotify: 'https://spotify.com/artist/demo',
      soundcloud: 'https://soundcloud.com/demo',
      youtube: 'https://youtube.com/@demo',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  links?: Record<string, string>;

  @ApiProperty({
    description: 'Géneros musicales del perfil',
    example: ['Rock', 'Pop', 'Electronic'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[];
}