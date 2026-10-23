import { createApp } from './tea/create-app';
import { API_PREFIX } from './tea/representation';

async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`TEA API listening on ${port} at /${API_PREFIX}`);
}
void bootstrap();
