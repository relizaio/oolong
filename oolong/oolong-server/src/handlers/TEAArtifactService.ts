import { Injectable, NotFoundException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TEAArtifactApi } from '../generated-nest/api';
import { Artifact } from '../generated-nest/models';
import { ContentLoader } from '../utils/content-loader';

@Injectable()
export class TEAArtifactService implements TEAArtifactApi {
  private contentLoader: ContentLoader;

  constructor() {
    this.contentLoader = new ContentLoader();
  }

  getArtifact(uuid: string, request: Request): Artifact | Promise<Artifact> | Observable<Artifact> {
    const artifact = this.contentLoader.loadArtifactByUuid(uuid);
    
    if (!artifact) {
      throw new NotFoundException(`Artifact with UUID ${uuid} not found`);
    }
    
    return artifact;
  }
}
