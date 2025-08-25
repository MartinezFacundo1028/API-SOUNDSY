import { Controller, Get } from '@nestjs/common';
import { GenresService } from './genres.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Genres')
@Controller({ path: 'genres', version: '1' })
export class GenresController {
  constructor(private service: GenresService) {}
  @Get()
  @ApiOperation({ summary: 'List all genres' })
  @ApiResponse({ status: 200, description: 'List of all genres' })
  list() {
    return this.service.list();
  }
  @Get('popular')
  @ApiOperation({ summary: 'List popular genres' })
  @ApiResponse({ status: 200, description: 'List of popular genres' })
  popular() {
    return this.service.popular();
  }
}
