import { Body, Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAProductReleaseApi } from '../api';
import { Collection, IdentifierType, PaginatedProductReleaseResponse, ProductRelease,  } from '../models';

@Controller()
export class TEAProductReleaseApiController {
  constructor(private readonly tEAProductReleaseApi: TEAProductReleaseApi) {}

  @Get('/productRelease/:uuid/collection/:collectionVersion')
  getCollectionForProductRelease(@Param('uuid') uuid: string, @Param('collectionVersion') collectionVersion: number, @Req() request: Request): Collection | Promise<Collection> | Observable<Collection> {
    return this.tEAProductReleaseApi.getCollectionForProductRelease(uuid, collectionVersion, request);
  }

  @Get('/productRelease/:uuid/collections')
  getCollectionsByProductReleaseId(@Param('uuid') uuid: string, @Req() request: Request): Array<Collection> | Promise<Array<Collection>> | Observable<Array<Collection>> {
    return this.tEAProductReleaseApi.getCollectionsByProductReleaseId(uuid, request);
  }

  @Get('/productRelease/:uuid/collection/latest')
  getLatestCollectionForProductRelease(@Param('uuid') uuid: string, @Req() request: Request): Collection | Promise<Collection> | Observable<Collection> {
    return this.tEAProductReleaseApi.getLatestCollectionForProductRelease(uuid, request);
  }

  @Get('/product/:uuid/releases')
  getReleasesByProductId(@Param('uuid') uuid: string, @Query('pageOffset') pageOffset: number, @Query('pageSize') pageSize: number, @Req() request: Request): PaginatedProductReleaseResponse | Promise<PaginatedProductReleaseResponse> | Observable<PaginatedProductReleaseResponse> {
    return this.tEAProductReleaseApi.getReleasesByProductId(uuid, pageOffset, pageSize, request);
  }

  @Get('/productRelease/:uuid')
  getTeaProductReleaseByUuid(@Param('uuid') uuid: string, @Req() request: Request): ProductRelease | Promise<ProductRelease> | Observable<ProductRelease> {
    return this.tEAProductReleaseApi.getTeaProductReleaseByUuid(uuid, request);
  }

  @Get('/productReleases')
  queryTeaProductReleases(@Query('pageOffset') pageOffset: number, @Query('pageSize') pageSize: number, @Query('idType') idType: IdentifierType, @Query('idValue') idValue: string, @Req() request: Request): PaginatedProductReleaseResponse | Promise<PaginatedProductReleaseResponse> | Observable<PaginatedProductReleaseResponse> {
    return this.tEAProductReleaseApi.queryTeaProductReleases(pageOffset, pageSize, idType, idValue, request);
  }

} 