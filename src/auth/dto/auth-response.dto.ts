import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT Access Token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Información del usuario autenticado',
  })
  user: {
    id: string;
    email: string;
    role: Role;
    profile?: {
      displayName: string | null;
      bio: string | null;
      avatarUrl: string | null;
    };
  };
}
