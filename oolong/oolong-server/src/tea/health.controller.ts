import { Controller, Get } from '@nestjs/common';

/** Process liveness only; does not depend on content snapshots. */
@Controller()
export class HealthController {
  @Get('healthz')
  healthz() {
    return { status: 'ok' };
  }
}
