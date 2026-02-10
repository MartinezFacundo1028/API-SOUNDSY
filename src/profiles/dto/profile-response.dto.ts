import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ example: 'cmgfge54s000dfw3wydzob0xf' })
  id: string;

  @ApiProperty({ example: 'cmgfge54s000dfw3wydzob0xf' })
  userId: string;

  @ApiProperty({ example: 'Demo Musician' })
  displayName: string;

  @ApiProperty({ example: 'Productor musical especializado en mezcla', required: false })
  bio?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  avatarUrl?: string;

  @ApiProperty({ example: ['guitarra', 'piano', 'batería'] })
  instruments: string[];

  @ApiProperty({
    example: {
      spotify: 'https://spotify.com/artist/demo',
      soundcloud: 'https://soundcloud.com/demo',
    },
    required: false,
  })
  links?: Record<string, string>;

  @ApiProperty({
    type: [String],
    example: ['Rock', 'Pop'],
    description: 'Géneros musicales del perfil',
  })
  genres: { name: string }[];

  @ApiProperty({ example: 4.5, description: 'Rating promedio como músico (0-5)' })
  averageRatingAsMusician: number;

  @ApiProperty({ example: 12, description: 'Total de reseñas como músico' })
  totalReviewsAsMusician: number;
}