"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationStatus = void 0;
/**
 * 자동화 상태 열거형
 */
var AutomationStatus;
(function (AutomationStatus) {
    AutomationStatus["IDLE"] = "idle";
    AutomationStatus["RUNNING"] = "running";
    AutomationStatus["WAITING"] = "waiting";
    AutomationStatus["STOPPED"] = "stopped";
    AutomationStatus["SUCCESS"] = "success";
    AutomationStatus["ERROR"] = "error";
})(AutomationStatus || (exports.AutomationStatus = AutomationStatus = {}));
