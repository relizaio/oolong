npx @openapitools/openapi-generator-cli version-manager set 7.16.0
npx @openapitools/openapi-generator-cli generate -i spec/openapi.yaml -g typescript-nestjs-server -o oolong-server/src/generated-nest/

cd oolong-server/src/generated-nest
npm ci --ignore-scripts

cd ../../
npm ci --ignore-scripts

npm run start:dev