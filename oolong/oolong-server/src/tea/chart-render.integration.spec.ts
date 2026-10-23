import { execFileSync } from 'child_process';
import * as path from 'path';

describe('helm chart render (integration)', () => {
  it('enforces a compatible image and rolls the Git pod on script changes', () => {
    const script = path.join(
      __dirname,
      '../../../../helm-chart/oolong/scripts/chart-render.integration.sh',
    );
    execFileSync('sh', [script], {
      stdio: 'pipe',
      encoding: 'utf8',
    });
  });
});
