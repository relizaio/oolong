const http = require('http');

function get(pathname) {
  return new Promise((resolve, reject) => {
    http
      .get('http://127.0.0.1:3000' + pathname, (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => resolve({ status: response.statusCode, body }));
      })
      .on('error', reject);
  });
}

async function main() {
  const wellKnown = await get('/.well-known/tea');
  if (wellKnown.status !== 200) process.exit(1);
  const document = JSON.parse(wellKnown.body);
  const versions = document.endpoints && document.endpoints[0] && document.endpoints[0].versions;
  if (!Array.isArray(versions) || !versions.includes('1.0.0')) {
    process.exit(1);
  }
  const products = await get('/v1.0.0/products');
  if (products.status !== 200) process.exit(1);
  if (process.env.CONTENT_AWAIT_GIT_REVISION === 'true') {
    const payload = JSON.parse(products.body);
    const results = payload && payload.results;
    if (!Array.isArray(results) || results.length === 0) process.exit(1);
  }
  process.exit(0);
}

main().catch(() => process.exit(1));
