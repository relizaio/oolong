import { Observable } from 'rxjs';
import { TEAArtifactApi } from '../api';
import { Artifact } from '../models';
export declare class TEAArtifactApiController {
    private readonly tEAArtifactApi;
    constructor(tEAArtifactApi: TEAArtifactApi);
    getArtifact(uuid: string, request: Request): Artifact | Promise<Artifact> | Observable<Artifact>;
}
