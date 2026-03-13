import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto, ProfileResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';

@ApiTags('Profiles')
@Controller({ path: 'profile', version: '1' })
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener perfil público de un usuario (sin auth)',
    description:
      'Obtiene los datos públicos del perfil de cualquier usuario/músico por su userId. No requiere autenticación.',
  })
  @ApiResponse({ status: 200, description: 'Perfil público', type: ProfileResponseDto })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  async getPublicProfile(@Param('id') id: string): Promise<ProfileResponseDto> {
    return await this.profilesService.getPublicProfile(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener perfil del usuario autenticado',
    description: 'Obtiene el perfil completo del usuario autenticado, incluyendo géneros e instrumentos',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil no encontrado',
  })
  async getProfile(
    @CurrentUser() user: CurrentUserType,
  ): Promise<ProfileResponseDto> {
    return await this.profilesService.getProfile(user.id);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar perfil del usuario autenticado',
    description: 'Actualiza el perfil del usuario. Solo se actualizan los campos enviados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil no encontrado',
  })
  async updateProfile(
    @CurrentUser() user: CurrentUserType,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return await this.profilesService.updateProfile(user.id, updateProfileDto);
  }
}