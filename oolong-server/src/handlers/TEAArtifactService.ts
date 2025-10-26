import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAArtifactApi } from '../generated-nest/api';
import { Artifact } from '../generated-nest/models';

@Injectable()
export class TEAArtifactService implements TEAArtifactApi {
  getArtifact(uuid: string, request: Request): Artifact | Promise<Artifact> | Observable<Artifact> {
    throw new Error('Method not implemented.');
  }
}
