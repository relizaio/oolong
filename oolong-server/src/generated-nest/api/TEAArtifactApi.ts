import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Artifact,  } from '../models';


@Injectable()
export abstract class TEAArtifactApi {

  abstract getArtifact(uuid: string,  request: Request): Artifact | Promise<Artifact> | Observable<Artifact>;

} 