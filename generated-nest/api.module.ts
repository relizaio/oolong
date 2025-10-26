import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ApiImplementations } from './api-implementations'
import { TEAArtifactApi } from './api';
import { TEAArtifactApiController } from './controllers';
import { TEAComponentApi } from './api';
import { TEAComponentApiController } from './controllers';
import { TEAComponentReleaseApi } from './api';
import { TEAComponentReleaseApiController } from './controllers';
import { TEADiscoveryApi } from './api';
import { TEADiscoveryApiController } from './controllers';
import { TEAProductApi } from './api';
import { TEAProductApiController } from './controllers';
import { TEAProductReleaseApi } from './api';
import { TEAProductReleaseApiController } from './controllers';

@Module({})
export class ApiModule {
  static forRoot(apiImplementations: ApiImplementations): DynamicModule {
      const providers: Provider[] = [
        {
          provide: TEAArtifactApi,
          useClass: apiImplementations.tEAArtifactApi
        },
        {
          provide: TEAComponentApi,
          useClass: apiImplementations.tEAComponentApi
        },
        {
          provide: TEAComponentReleaseApi,
          useClass: apiImplementations.tEAComponentReleaseApi
        },
        {
          provide: TEADiscoveryApi,
          useClass: apiImplementations.tEADiscoveryApi
        },
        {
          provide: TEAProductApi,
          useClass: apiImplementations.tEAProductApi
        },
        {
          provide: TEAProductReleaseApi,
          useClass: apiImplementations.tEAProductReleaseApi
        },
      ];

      return {
        module: ApiModule,
        controllers: [
          TEAArtifactApiController,
          TEAComponentApiController,
          TEAComponentReleaseApiController,
          TEADiscoveryApiController,
          TEAProductApiController,
          TEAProductReleaseApiController,
        ],
        providers: [...providers],
        exports: [...providers]
      }
    }
}