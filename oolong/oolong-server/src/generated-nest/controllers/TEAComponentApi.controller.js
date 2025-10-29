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
exports.TEAComponentApiController = void 0;
const common_1 = require("@nestjs/common");
const api_1 = require("../api");
let TEAComponentApiController = class TEAComponentApiController {
    tEAComponentApi;
    constructor(tEAComponentApi) {
        this.tEAComponentApi = tEAComponentApi;
    }
    getReleasesByComponentId(uuid, request) {
        return this.tEAComponentApi.getReleasesByComponentId(uuid, request);
    }
    getTeaComponentById(uuid, request) {
        return this.tEAComponentApi.getTeaComponentById(uuid, request);
    }
};
exports.TEAComponentApiController = TEAComponentApiController;
__decorate([
    (0, common_1.Get)('/component/:uuid/releases'),
    __param(0, (0, common_1.Param)('uuid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Request]),
    __metadata("design:returntype", Object)
], TEAComponentApiController.prototype, "getReleasesByComponentId", null);
__decorate([
    (0, common_1.Get)('/component/:uuid'),
    __param(0, (0, common_1.Param)('uuid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Request]),
    __metadata("design:returntype", Object)
], TEAComponentApiController.prototype, "getTeaComponentById", null);
exports.TEAComponentApiController = TEAComponentApiController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [api_1.TEAComponentApi])
], TEAComponentApiController);
//# sourceMappingURL=TEAComponentApi.controller.js.map