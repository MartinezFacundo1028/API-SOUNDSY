import { Controller, Get, Param, Query } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ListServicesDto } from './dto/list-services.dto';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Services')
@Controller({ path: 'services', version: '1' })
export class ServicesController {
  constructor(private service: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List services (filters optional)' })
  @ApiOkResponse({
    description: 'List of services with optional filters and cursor pagination',
  })
  list(@Query() query: ListServicesDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service by id' })
  @ApiOkResponse({ description: 'Service detail' })
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }
}
