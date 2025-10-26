import { Injectable, NotFoundException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAComponentApi } from '../generated-nest/api';
import { Component, Release } from '../generated-nest/models';
import { ContentLoader } from '../utils/content-loader';

@Injectable()
export class TEAComponentService implements TEAComponentApi {
  private contentLoader: ContentLoader;

  constructor() {
    this.contentLoader = new ContentLoader();
  }

  getReleasesByComponentId(uuid: string, request: Request): Array<Release> | Promise<Array<Release>> | Observable<Array<Release>> {
    return this.contentLoader.loadComponentReleasesByComponentUuid(uuid);
  }

  getTeaComponentById(uuid: string, request: Request): Component | Promise<Component> | Observable<Component> {
    const component = this.contentLoader.loadComponentByUuid(uuid);
    
    if (!component) {
      throw new NotFoundException(`Component with UUID ${uuid} not found`);
    }
    
    return component;
  }
}
