import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { ListServicesDto, CreateServiceDto, UpdateServiceDto } from './dto';
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

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar servicio parcialmente (recomendado)',
    description:
      'Actualiza solo los campos enviados. Los demás se mantienen igual.',
  })
  @ApiOkResponse({ description: 'Servicio actualizado parcialmente' })
  async updatePartial(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserTypeImport,
    @Body() updateDto: UpdateServiceDto,
  ) {
    return this.service.updatePartial(id, updateDto, user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reemplazar servicio completamente',
    description:
      'Reemplaza TODOS los datos del servicio. Campos no enviados se pierden.',
  })
  @ApiOkResponse({ description: 'Servicio reemplazado completamente' })
  async replace(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserTypeImport,
    @Body() createDto: CreateServiceDto,
  ) {
    return this.service.replace(id, createDto, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Eliminar servicio',
    description:
      'Elimina permanentemente un servicio. Solo el dueño puede eliminar su propio servicio.',
  })
  @ApiOkResponse({
    description: 'Servicio eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Servicio eliminado exitosamente' },
        deletedService: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cmeun9kne00031io4a7n05fvv' },
            title: {
              type: 'string',
              example: 'Grabación de guitarra acústica',
            },
          },
        },
      },
    },
  })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserTypeImport,
  ) {
    return await this.service.delete(id, user.id);
  }
}
