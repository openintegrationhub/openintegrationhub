"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var ApiError = /** @class */ (function (_super) {
    __extends(ApiError, _super);
    function ApiError(status, message) {
        if (status === void 0) { status = 500; }
        if (message === void 0) { message = 'Internal Server Error'; }
        var _this = this;
        if (status < 400 || status > 599) {
            throw new Error('Invalid error code');
        }
        _this = _super.call(this, message) || this;
        _this.contentType = 'text/plain';
        _this.status = status;
        _this.message = message;
        return _this;
    }
    return ApiError;
}(Error));
exports.default = ApiError;
