import { Controller, Get, Param } from '@nestjs/common';
import { GenresService } from './genres.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Genres')
@Controller({ path: 'genres', version: '1' })
export class GenresController {
  constructor(private service: GenresService) {}
  @Get()
  @ApiOperation({ summary: 'List all genres' })
  @ApiResponse({ status: 200, description: 'List of all genres' })
  async list() {
    return await this.service.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a genre by id' })
  @ApiResponse({ status: 200, description: 'Genre detail' })
  async getOne(@Param('id') id: string) {
    return await this.service.getOne(id);
  }

  @Get('popular')
  @ApiOperation({ summary: 'List popular genres' })
  @ApiResponse({ status: 200, description: 'List of popular genres' })
  async popular() {
    return await this.service.popular();
  }
}
