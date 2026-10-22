import { Module } from '@nestjs/common';
import { ContentSnapshotRegistry } from './tea/content-snapshot';
import { TeaController } from './tea/tea.controller';
import { TeaService } from './tea/tea.service';
import { WellKnownController } from './tea/well-known.controller';

@Module({
  controllers: [TeaController, WellKnownController],
  providers: [ContentSnapshotRegistry, TeaService],
})
export class AppModule {}
