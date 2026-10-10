import { Controller, Get, Head } from '@nestjs/common';
import { API_SEMVER, serverHost } from './representation';

@Controller('.well-known')
export class WellKnownController {
  @Get('tea')
  @Head('tea')
  tea() {
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
