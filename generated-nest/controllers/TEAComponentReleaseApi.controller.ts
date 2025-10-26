import { Body, Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAComponentReleaseApi } from '../api';
import { Collection, ComponentReleaseWithCollection,  } from '../models';

@Controller()
export class TEAComponentReleaseApiController {
  constructor(private readonly tEAComponentReleaseApi: TEAComponentReleaseApi) {}

  @Get('/componentRelease/:uuid/collection/:collectionVersion')
  getCollection(@Param('uuid') uuid: string, @Param('collectionVersion') collectionVersion: number, @Req() request: Request): Collection | Promise<Collection> | Observable<Collection> {
    return this.tEAComponentReleaseApi.getCollection(uuid, collectionVersion, request);
  }

  @Get('/componentRelease/:uuid/collections')
  getCollectionsByReleaseId(@Param('uuid') uuid: string, @Req() request: Request): Array<Collection> | Promise<Array<Collection>> | Observable<Array<Collection>> {
    return this.tEAComponentReleaseApi.getCollectionsByReleaseId(uuid, request);
  }

  @Get('/componentRelease/:uuid')
  getComponentReleaseById(@Param('uuid') uuid: string, @Req() request: Request): ComponentReleaseWithCollection | Promise<ComponentReleaseWithCollection> | Observable<ComponentReleaseWithCollection> {
    return this.tEAComponentReleaseApi.getComponentReleaseById(uuid, request);
  }

  @Get('/componentRelease/:uuid/collection/latest')
  getLatestCollection(@Param('uuid') uuid: string, @Req() request: Request): Collection | Promise<Collection> | Observable<Collection> {
    return this.tEAComponentReleaseApi.getLatestCollection(uuid, request);
  }

} 