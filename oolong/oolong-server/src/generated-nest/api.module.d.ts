import { DynamicModule } from '@nestjs/common';
import { ApiImplementations } from './api-implementations';
export declare class ApiModule {
    static forRoot(apiImplementations: ApiImplementations): DynamicModule;
}
