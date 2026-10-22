import { Module } from '@nestjs/common';
import { ContentSnapshotRegistry } from './tea/content-snapshot';
import { TeaController } from './tea/tea.controller';
import { TeaService } from './tea/tea.service';
import { HealthController } from './tea/health.controller';
import { WellKnownController } from './tea/well-known.controller';

@Module({
  controllers: [TeaController, WellKnownController, HealthController],
  providers: [ContentSnapshotRegistry, TeaService],
})
export class AppModule {}
