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
exports.TEAProductReleaseApiController = void 0;
const common_1 = require("@nestjs/common");
const api_1 = require("../api");
const models_1 = require("../models");
let TEAProductReleaseApiController = class TEAProductReleaseApiController {
    tEAProductReleaseApi;
    constructor(tEAProductReleaseApi) {
        this.tEAProductReleaseApi = tEAProductReleaseApi;
    }
    getCollectionForProductRelease(uuid, collectionVersion, request) {
        return this.tEAProductReleaseApi.getCollectionForProductRelease(uuid, collectionVersion, request);
    }
    getCollectionsByProductReleaseId(uuid, request) {
        return this.tEAProductReleaseApi.getCollectionsByProductReleaseId(uuid, request);
    }
    getLatestCollectionForProductRelease(uuid, request) {
        return this.tEAProductReleaseApi.getLatestCollectionForProductRelease(uuid, request);
    }
    getReleasesByProductId(uuid, pageOffset, pageSize, request) {
        return this.tEAProductReleaseApi.getReleasesByProductId(uuid, pageOffset, pageSize, request);
    }
    getTeaProductReleaseByUuid(uuid, request) {
        return this.tEAProductReleaseApi.getTeaProductReleaseByUuid(uuid, request);
    }
    queryTeaProductReleases(pageOffset, pageSize, idType, idValue, request) {
        return this.tEAProductReleaseApi.queryTeaProductReleases(pageOffset, pageSize, idType, idValue, request);
    }
};
exports.TEAProductReleaseApiController = TEAProductReleaseApiController;
__decorate([
    (0, common_1.Get)('/productRelease/:uuid/collection/:collectionVersion'),
    __param(0, (0, common_1.Param)('uuid')),
    __param(1, (0, common_1.Param)('collectionVersion')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Request]),
    __metadata("design:returntype", Object)
], TEAProductReleaseApiController.prototype, "getCollectionForProductRelease", null);
__decorate([
    (0, common_1.Get)('/productRelease/:uuid/collections'),
    __param(0, (0, common_1.Param)('uuid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Request]),
    __metadata("design:returntype", Object)
], TEAProductReleaseApiController.prototype, "getCollectionsByProductReleaseId", null);
__decorate([
    (0, common_1.Get)('/productRelease/:uuid/collection/latest'),
    __param(0, (0, common_1.Param)('uuid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Request]),
    __metadata("design:returntype", Object)
], TEAProductReleaseApiController.prototype, "getLatestCollectionForProductRelease", null);
__decorate([
    (0, common_1.Get)('/product/:uuid/releases'),
    __param(0, (0, common_1.Param)('uuid')),
    __param(1, (0, common_1.Query)('pageOffset')),
    __param(2, (0, common_1.Query)('pageSize')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Request]),
    __metadata("design:returntype", Object)
], TEAProductReleaseApiController.prototype, "getReleasesByProductId", null);
__decorate([
    (0, common_1.Get)('/productRelease/:uuid'),
    __param(0, (0, common_1.Param)('uuid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Request]),
    __metadata("design:returntype", Object)
], TEAProductReleaseApiController.prototype, "getTeaProductReleaseByUuid", null);
__decorate([
    (0, common_1.Get)('/productReleases'),
    __param(0, (0, common_1.Query)('pageOffset')),
    __param(1, (0, common_1.Query)('pageSize')),
    __param(2, (0, common_1.Query)('idType')),
    __param(3, (0, common_1.Query)('idValue')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, Request]),
    __metadata("design:returntype", Object)
], TEAProductReleaseApiController.prototype, "queryTeaProductReleases", null);
exports.TEAProductReleaseApiController = TEAProductReleaseApiController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [api_1.TEAProductReleaseApi])
], TEAProductReleaseApiController);
//# sourceMappingURL=TEAProductReleaseApi.controller.js.map