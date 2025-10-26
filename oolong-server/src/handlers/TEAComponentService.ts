import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAComponentApi } from '../../../generated-nest/api';
import { Component, Release } from '../../../generated-nest/models';

@Injectable()
export class TEAComponentService implements TEAComponentApi {
  getReleasesByComponentId(uuid: string, request: Request): Array<Release> | Promise<Array<Release>> | Observable<Array<Release>> {
    throw new Error('Method not implemented.');
  }

  getTeaComponentById(uuid: string, request: Request): Component | Promise<Component> | Observable<Component> {
    throw new Error('Method not implemented.');
  }
}
