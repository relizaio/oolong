import { Controller, Get } from '@nestjs/common';

interface TeaDiscoveryResponse {
  endpoints: Array<{
    versions: string[];
    url: string;
  }>;
  schemaVersion: number;
}

@Controller('.well-known')
export class WellKnownController {
  @Get('tea')
  getTeaDiscovery(): TeaDiscoveryResponse {
    // Get API version from environment, remove 'v' prefix if present
    const apiVersion = process.env.API_VERSION || 'v0.2.0-beta.2';
    const version = apiVersion.startsWith('v') ? apiVersion.substring(1) : apiVersion;
    
    // Get server host from environment
    const serverHost = process.env.SERVER_HOST || 'https://demo.rearmhq.com/tea';
    
    return {
      endpoints: [
        {
          versions: [version],
          url: serverHost
        }
      ],
      schemaVersion: 1
    };
  }
}
