import { Body, Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAComponentApi } from '../api';
import { Component, Release,  } from '../models';

@Controller()
export class TEAComponentApiController {
  constructor(private readonly tEAComponentApi: TEAComponentApi) {}

  @Get('/component/:uuid/releases')
  getReleasesByComponentId(@Param('uuid') uuid: string, @Req() request: Request): Array<Release> | Promise<Array<Release>> | Observable<Array<Release>> {
    return this.tEAComponentApi.getReleasesByComponentId(uuid, request);
  }

  @Get('/component/:uuid')
  getTeaComponentById(@Param('uuid') uuid: string, @Req() request: Request): Component | Promise<Component> | Observable<Component> {
    return this.tEAComponentApi.getTeaComponentById(uuid, request);
  }

} 