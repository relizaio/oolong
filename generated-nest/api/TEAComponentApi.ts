import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Component, Release,  } from '../models';


@Injectable()
export abstract class TEAComponentApi {

  abstract getReleasesByComponentId(uuid: string,  request: Request): Array<Release> | Promise<Array<Release>> | Observable<Array<Release>>;


  abstract getTeaComponentById(uuid: string,  request: Request): Component | Promise<Component> | Observable<Component>;

} 