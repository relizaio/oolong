import {
  Controller,
  Get,
  Head,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ContentSnapshotRegistry } from './content-snapshot';
import { API_SEMVER, serverHost } from './representation';

@Controller('.well-known')
export class WellKnownController {
  constructor(private readonly snapshots: ContentSnapshotRegistry) {}

  @Get('tea')
  @Head('tea')
  tea() {
    if (!this.snapshots.isReady()) {
      throw new ServiceUnavailableException('content is not ready');
    }
    return {
      schemaVersion: 1,
      endpoints: [
        {
          url: serverHost(),
          versions: [API_SEMVER],
          priority: 1,
        },
      ],
    };
  }
}
