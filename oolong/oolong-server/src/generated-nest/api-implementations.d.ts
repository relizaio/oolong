import { Type } from '@nestjs/common';
import { TEAArtifactApi } from './api';
import { TEAComponentApi } from './api';
import { TEAComponentReleaseApi } from './api';
import { TEADiscoveryApi } from './api';
import { TEAProductApi } from './api';
import { TEAProductReleaseApi } from './api';
export type ApiImplementations = {
    tEAArtifactApi: Type<TEAArtifactApi>;
    tEAComponentApi: Type<TEAComponentApi>;
    tEAComponentReleaseApi: Type<TEAComponentReleaseApi>;
    tEADiscoveryApi: Type<TEADiscoveryApi>;
    tEAProductApi: Type<TEAProductApi>;
    tEAProductReleaseApi: Type<TEAProductReleaseApi>;
};
