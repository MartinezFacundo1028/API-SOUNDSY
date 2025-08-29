import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { ListServicesDto } from './dto/list-services.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard, JwtOptionalGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType as CurrentUserTypeImport } from '../auth/decorators/current-user.decorator';

@ApiTags('Services')
@Controller({ path: 'services', version: '1' })
export class ServicesController {
  constructor(private service: ServicesService) {}

  @Get()
  @UseGuards(JwtOptionalGuard)
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

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a service' })
  @ApiOkResponse({ description: 'Service created' })
  create(
    @CurrentUser() user: CurrentUserTypeImport,
    @Body() body: CreateServiceDto,
  ) {
    console.log(user);
    return this.service.create(body, user.id);
  }
}
