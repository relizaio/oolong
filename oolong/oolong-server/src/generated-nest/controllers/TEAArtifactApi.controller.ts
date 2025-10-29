import { Body, Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAArtifactApi } from '../api';
import { Artifact,  } from '../models';

@Controller()
export class TEAArtifactApiController {
  constructor(private readonly tEAArtifactApi: TEAArtifactApi) {}

  @Get('/artifact/:uuid')
  getArtifact(@Param('uuid') uuid: string, @Req() request: Request): Artifact | Promise<Artifact> | Observable<Artifact> {
    return this.tEAArtifactApi.getArtifact(uuid, request);
  }

} 