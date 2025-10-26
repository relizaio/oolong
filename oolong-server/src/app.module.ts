import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiModule, ApiImplementations } from './generated-nest';
import { TEAArtifactService } from './handlers/TEAArtifactService';
import { TEAComponentService } from './handlers/TEAComponentService';
import { TEAComponentReleaseService } from './handlers/TEAComponentReleaseService';
import { TEADiscoveryService } from './handlers/TEADiscoveryService';
import { TEAProductService } from './handlers/TEAProductService';
import { TEAProductReleaseService } from './handlers/TEAProductReleaseService';
import { WellKnownController } from './controllers/well-known.controller';

const apiImplementations: ApiImplementations = {
  tEAArtifactApi: TEAArtifactService,
  tEAComponentApi: TEAComponentService,
  tEAComponentReleaseApi: TEAComponentReleaseService,
  tEADiscoveryApi: TEADiscoveryService,
  tEAProductApi: TEAProductService,
  tEAProductReleaseApi: TEAProductReleaseService,
};

@Module({
  imports: [
    ApiModule.forRoot(apiImplementations),
  ],
  controllers: [AppController, WellKnownController],
  providers: [AppService],
})
export class AppModule {}
