import { Body, Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAProductApi } from '../api';
import { IdentifierType, PaginatedProductResponse, Product,  } from '../models';

@Controller()
export class TEAProductApiController {
  constructor(private readonly tEAProductApi: TEAProductApi) {}

  @Get('/product/:uuid')
  getTeaProductByUuid(@Param('uuid') uuid: string, @Req() request: Request): Product | Promise<Product> | Observable<Product> {
    return this.tEAProductApi.getTeaProductByUuid(uuid, request);
  }

  @Get('/products')
  queryTeaProducts(@Query('pageOffset') pageOffset: number, @Query('pageSize') pageSize: number, @Query('idType') idType: IdentifierType, @Query('idValue') idValue: string, @Req() request: Request): PaginatedProductResponse | Promise<PaginatedProductResponse> | Observable<PaginatedProductResponse> {
    return this.tEAProductApi.queryTeaProducts(pageOffset, pageSize, idType, idValue, request);
  }

} 