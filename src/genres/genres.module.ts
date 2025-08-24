import { Module } from '@nestjs/common';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GenresController],
  providers: [GenresService],
})
export class GenresModule {}
