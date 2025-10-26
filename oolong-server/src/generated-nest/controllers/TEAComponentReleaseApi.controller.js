"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEAComponentReleaseApiController = void 0;
const common_1 = require("@nestjs/common");
const api_1 = require("../api");
let TEAComponentReleaseApiController = class TEAComponentReleaseApiController {
    tEAComponentReleaseApi;
    constructor(tEAComponentReleaseApi) {
        this.tEAComponentReleaseApi = tEAComponentReleaseApi;
    }
    getCollection(uuid, collectionVersion, request) {
        return this.tEAComponentReleaseApi.getCollection(uuid, collectionVersion, request);
    }
    getCollectionsByReleaseId(uuid, request) {
        return this.tEAComponentReleaseApi.getCollectionsByReleaseId(uuid, request);
    }
    getComponentReleaseById(uuid, request) {
        return this.tEAComponentReleaseApi.getComponentReleaseById(uuid, request);
    }
    getLatestCollection(uuid, request) {
        return this.tEAComponentReleaseApi.getLatestCollection(uuid, request);
    }
};
exports.TEAComponentReleaseApiController = TEAComponentReleaseApiController;
__decorate([
    (0, common_1.Get)('/componentRelease/:uuid/collection/:collectionVersion'),
    __param(0, (0, common_1.Param)('uuid')),
    __param(1, (0, common_1.Param)('collectionVersion')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Request]),
    __metadata("design:returntype", Object)
], TEAComponentReleaseApiController.prototype, "getCollection", null);
__decorate([
    (0, common_1.Get)('/componentRelease/:uuid/collections'),
    __param(0, (0, common_1.Param)('uuid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Request]),
    __metadata("design:returntype", Object)
], TEAComponentReleaseApiController.prototype, "getCollectionsByReleaseId", null);
__decorate([
    (0, common_1.Get)('/componentRelease/:uuid'),
    __param(0, (0, common_1.Param)('uuid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Request]),
    __metadata("design:returntype", Object)
], TEAComponentReleaseApiController.prototype, "getComponentReleaseById", null);
__decorate([
    (0, common_1.Get)('/componentRelease/:uuid/collection/latest'),
    __param(0, (0, common_1.Param)('uuid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Request]),
    __metadata("design:returntype", Object)
], TEAComponentReleaseApiController.prototype, "getLatestCollection", null);
exports.TEAComponentReleaseApiController = TEAComponentReleaseApiController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [api_1.TEAComponentReleaseApi])
], TEAComponentReleaseApiController);
//# sourceMappingURL=TEAComponentReleaseApi.controller.js.map