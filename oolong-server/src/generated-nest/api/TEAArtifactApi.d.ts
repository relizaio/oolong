import { Observable } from 'rxjs';
import { Artifact } from '../models';
export declare abstract class TEAArtifactApi {
    abstract getArtifact(uuid: string, request: Request): Artifact | Promise<Artifact> | Observable<Artifact>;
}
