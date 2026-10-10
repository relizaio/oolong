import { Module } from '@nestjs/common';
import { ContentStore, contentRoot } from './tea/content-store';
import { TeaController } from './tea/tea.controller';
import { TeaService } from './tea/tea.service';
import { WellKnownController } from './tea/well-known.controller';

@Module({
  controllers: [TeaController, WellKnownController],
  providers: [
    {
      provide: ContentStore,
      useFactory: () => new ContentStore(contentRoot()),
    },
    TeaService,
  ],
})
export class AppModule {}
