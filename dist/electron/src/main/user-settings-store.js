"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveUserProfile = saveUserProfile;
exports.getUserProfile = getUserProfile;
exports.saveReservationProfile = saveReservationProfile;
exports.getReservationProfile = getReservationProfile;
const electron_store_1 = __importDefault(require("electron-store"));
const store = new electron_store_1.default({
    name: 'user-settings',
    // 암호화, 검증 옵션은 이후 단계에서 추가
});
function saveUserProfile(profile) {
    store.set('userProfile', profile);
}
function getUserProfile() {
    return store.get('userProfile');
}
function saveReservationProfile(profile) {
    store.set('reservationProfile', profile);
}
function getReservationProfile() {
    return store.get('reservationProfile');
}
