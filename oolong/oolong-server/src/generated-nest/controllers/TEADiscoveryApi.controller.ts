import { Body, Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEADiscoveryApi } from '../api';
import { DiscoveryInfo,  } from '../models';

@Controller()
export class TEADiscoveryApiController {
  constructor(private readonly tEADiscoveryApi: TEADiscoveryApi) {}

  @Get('/discovery')
  discoveryByTei(@Query('tei') tei: string, @Req() request: Request): Array<DiscoveryInfo> | Promise<Array<DiscoveryInfo>> | Observable<Array<DiscoveryInfo>> {
    return this.tEADiscoveryApi.discoveryByTei(tei, request);
  }

} 