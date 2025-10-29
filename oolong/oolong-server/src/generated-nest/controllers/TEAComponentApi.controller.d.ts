import { Observable } from 'rxjs';
import { TEAComponentApi } from '../api';
import { Component, Release } from '../models';
export declare class TEAComponentApiController {
    private readonly tEAComponentApi;
    constructor(tEAComponentApi: TEAComponentApi);
    getReleasesByComponentId(uuid: string, request: Request): Array<Release> | Promise<Array<Release>> | Observable<Array<Release>>;
    getTeaComponentById(uuid: string, request: Request): Component | Promise<Component> | Observable<Component>;
}
