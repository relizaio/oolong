import { execFileSync } from 'child_process';
import * as path from 'path';

describe('git publish script (integration)', () => {
  it('runs shell integration tests against git-publish.inc.sh', () => {
    const script = path.join(
      __dirname,
      '../../test/git-publish.integration.sh',
    );
    execFileSync('sh', [script], {
      stdio: 'pipe',
      encoding: 'utf8',
      env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' },
    });
  });
});
