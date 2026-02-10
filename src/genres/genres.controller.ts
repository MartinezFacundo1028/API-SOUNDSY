import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GenresService } from './genres.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { CreateGenreDto } from './dto/create-genre.dto';

@ApiTags('Genres')
@Controller({ path: 'genres', version: '1' })
export class GenresController {
  constructor(private service: GenresService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a genre (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Genre created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() dto: CreateGenreDto, @CurrentUser() user: CurrentUserType) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Solo un administrador puede crear géneros');
    }
    return await this.service.create(dto.name);
  }

  @Get()
  @ApiOperation({ summary: 'List all genres' })
  @ApiResponse({ status: 200, description: 'List of all genres' })
  async list() {
    return await this.service.list();
  }

  @Get('popular')
  @ApiOperation({ summary: 'List popular genres' })
  @ApiResponse({ status: 200, description: 'List of popular genres' })
  async popular() {
    return await this.service.popular();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a genre by id' })
  @ApiResponse({ status: 200, description: 'Genre detail' })
  async getOne(@Param('id') id: string) {
    return await this.service.getOne(id);
  }
}
