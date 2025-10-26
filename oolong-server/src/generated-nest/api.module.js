"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ApiModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiModule = void 0;
const common_1 = require("@nestjs/common");
const api_1 = require("./api");
const controllers_1 = require("./controllers");
const api_2 = require("./api");
const controllers_2 = require("./controllers");
const api_3 = require("./api");
const controllers_3 = require("./controllers");
const api_4 = require("./api");
const controllers_4 = require("./controllers");
const api_5 = require("./api");
const controllers_5 = require("./controllers");
const api_6 = require("./api");
const controllers_6 = require("./controllers");
let ApiModule = ApiModule_1 = class ApiModule {
    static forRoot(apiImplementations) {
        const providers = [
            {
                provide: api_1.TEAArtifactApi,
                useClass: apiImplementations.tEAArtifactApi
            },
            {
                provide: api_2.TEAComponentApi,
                useClass: apiImplementations.tEAComponentApi
            },
            {
                provide: api_3.TEAComponentReleaseApi,
                useClass: apiImplementations.tEAComponentReleaseApi
            },
            {
                provide: api_4.TEADiscoveryApi,
                useClass: apiImplementations.tEADiscoveryApi
            },
            {
                provide: api_5.TEAProductApi,
                useClass: apiImplementations.tEAProductApi
            },
            {
                provide: api_6.TEAProductReleaseApi,
                useClass: apiImplementations.tEAProductReleaseApi
            },
        ];
        return {
            module: ApiModule_1,
            controllers: [
                controllers_1.TEAArtifactApiController,
                controllers_2.TEAComponentApiController,
                controllers_3.TEAComponentReleaseApiController,
                controllers_4.TEADiscoveryApiController,
                controllers_5.TEAProductApiController,
                controllers_6.TEAProductReleaseApiController,
            ],
            providers: [...providers],
            exports: [...providers]
        };
    }
};
exports.ApiModule = ApiModule;
exports.ApiModule = ApiModule = ApiModule_1 = __decorate([
    (0, common_1.Module)({})
], ApiModule);
//# sourceMappingURL=api.module.js.map