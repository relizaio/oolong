import {
  Controller,
  Get,
  Head,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { TeaException } from './errors';
import { singleQuery } from './pagination';
import { TeaService } from './tea.service';

@Controller()
export class TeaController {
  constructor(private readonly tea: TeaService) {}

  @Get('discovery')
  @Head('discovery')
  discover(@Query() query: Record<string, unknown>) {
    return this.tea.discover(query);
  }

  @Get('products')
  @Head('products')
  products(@Query() query: Record<string, unknown>) {
    return this.tea.listProducts(query);
  }

  @Get('product/:uuid')
  @Head('product/:uuid')
  product(@Param('uuid') uuid: string) {
    return this.tea.getProduct(uuid);
  }

  @Get('product/:uuid/releases')
  @Head('product/:uuid/releases')
  productReleases(
    @Param('uuid') uuid: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.tea.listProductReleases(uuid, query);
  }

  @Get('product/:uuid/cle')
  @Head('product/:uuid/cle')
  productCle(@Param('uuid') uuid: string) {
    return this.tea.cle('product', uuid);
  }

  @Get('productReleases')
  @Head('productReleases')
  queryProductReleases(@Query() query: Record<string, unknown>) {
    return this.tea.listAllProductReleases(query);
  }

  @Get('productRelease/:uuid')
  @Head('productRelease/:uuid')
  productRelease(@Param('uuid') uuid: string) {
    return this.tea.getProductRelease(uuid);
  }

  @Get('productRelease/:uuid/cle')
  @Head('productRelease/:uuid/cle')
  productReleaseCle(@Param('uuid') uuid: string) {
    return this.tea.cle('product-release', uuid);
  }

  @Get('productRelease/:uuid/collections')
  @Head('productRelease/:uuid/collections')
  productCollections(
    @Param('uuid') uuid: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.tea.listCollections('product', uuid, query);
  }

  @Get('productRelease/:uuid/collection/latest')
  @Head('productRelease/:uuid/collection/latest')
  latestProductCollection(@Param('uuid') uuid: string) {
    return this.tea.getLatestCollection('product', uuid);
  }

  @Get('productRelease/:uuid/collection/:collectionVersion')
  @Head('productRelease/:uuid/collection/:collectionVersion')
  productCollection(
    @Param('uuid') uuid: string,
    @Param('collectionVersion') collectionVersion: string,
  ) {
    return this.tea.getCollection('product', uuid, collectionVersion);
  }

  @Get('components')
  @Head('components')
  components(@Query() query: Record<string, unknown>) {
    return this.tea.listComponents(query);
  }

  @Get('component/:uuid')
  @Head('component/:uuid')
  component(@Param('uuid') uuid: string) {
    return this.tea.getComponent(uuid);
  }

  @Get('component/:uuid/releases')
  @Head('component/:uuid/releases')
  componentReleases(
    @Param('uuid') uuid: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.tea.listComponentReleases(uuid, query);
  }

  @Get('component/:uuid/cle')
  @Head('component/:uuid/cle')
  componentCle(@Param('uuid') uuid: string) {
    return this.tea.cle('component', uuid);
  }

  @Get('componentReleases')
  @Head('componentReleases')
  queryComponentReleases(@Query() query: Record<string, unknown>) {
    return this.tea.listAllComponentReleases(query);
  }

  @Get('componentRelease/:uuid')
  @Head('componentRelease/:uuid')
  componentRelease(@Param('uuid') uuid: string) {
    return this.tea.getComponentRelease(uuid);
  }

  @Get('componentRelease/:uuid/cle')
  @Head('componentRelease/:uuid/cle')
  componentReleaseCle(@Param('uuid') uuid: string) {
    return this.tea.cle('component-release', uuid);
  }

  @Get('componentRelease/:uuid/collections')
  @Head('componentRelease/:uuid/collections')
  componentCollections(
    @Param('uuid') uuid: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.tea.listCollections('component', uuid, query);
  }

  @Get('componentRelease/:uuid/collection/latest')
  @Head('componentRelease/:uuid/collection/latest')
  latestComponentCollection(@Param('uuid') uuid: string) {
    return this.tea.getLatestCollection('component', uuid);
  }

  @Get('componentRelease/:uuid/collection/:collectionVersion')
  @Head('componentRelease/:uuid/collection/:collectionVersion')
  componentCollection(
    @Param('uuid') uuid: string,
    @Param('collectionVersion') collectionVersion: string,
  ) {
    return this.tea.getCollection('component', uuid, collectionVersion);
  }

  @Get('artifact/:uuid/latest')
  @Head('artifact/:uuid/latest')
  latestArtifact(@Param('uuid') uuid: string) {
    return this.tea.getArtifact(uuid, 'latest');
  }

  @Get('artifact/:uuid/latest/download')
  @Head('artifact/:uuid/latest/download')
  latestDownload(
    @Req() req: Request,
    @Res() res: Response,
    @Param('uuid') uuid: string,
    @Query() query: Record<string, unknown>,
  ) {
    this.tea.download(
      req,
      res,
      uuid,
      'latest',
      'download',
      singleQuery(query.mediaType, 'mediaType'),
    );
  }

  @Get('artifact/:uuid/latest/signature/download')
  @Head('artifact/:uuid/latest/signature/download')
  latestSignature(
    @Req() req: Request,
    @Res() res: Response,
    @Param('uuid') uuid: string,
    @Query() query: Record<string, unknown>,
  ) {
    this.tea.download(
      req,
      res,
      uuid,
      'latest',
      'signature',
      singleQuery(query.mediaType, 'mediaType'),
    );
  }

  @Get('artifact/:uuid/:artifactVersion')
  @Head('artifact/:uuid/:artifactVersion')
  artifactVersion(
    @Param('uuid') uuid: string,
    @Param('artifactVersion') artifactVersion: string,
  ) {
    return this.tea.getArtifact(uuid, this.version(artifactVersion));
  }

  @Get('artifact/:uuid/:artifactVersion/download')
  @Head('artifact/:uuid/:artifactVersion/download')
  artifactDownload(
    @Req() req: Request,
    @Res() res: Response,
    @Param('uuid') uuid: string,
    @Param('artifactVersion') artifactVersion: string,
    @Query() query: Record<string, unknown>,
  ) {
    this.tea.download(
      req,
      res,
      uuid,
      this.version(artifactVersion),
      'download',
      singleQuery(query.mediaType, 'mediaType'),
    );
  }

  @Get('artifact/:uuid/:artifactVersion/signature/download')
  @Head('artifact/:uuid/:artifactVersion/signature/download')
  artifactSignature(
    @Req() req: Request,
    @Res() res: Response,
    @Param('uuid') uuid: string,
    @Param('artifactVersion') artifactVersion: string,
    @Query() query: Record<string, unknown>,
  ) {
    this.tea.download(
      req,
      res,
      uuid,
      this.version(artifactVersion),
      'signature',
      singleQuery(query.mediaType, 'mediaType'),
    );
  }

  @Post('token')
  token(): never {
    throw new TeaException(404, 'NOT_IMPLEMENTED');
  }

  private version(value: string): number {
    if (!/^(0|[1-9]\d*)$/.test(value)) {
      throw new TeaException(400, 'INVALID_REQUEST', 'invalid version');
    }
    return Number(value);
  }
}
