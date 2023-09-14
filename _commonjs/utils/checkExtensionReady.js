"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkExtensionReady = void 0;
const interval = 500;
async function checkExtensionReady(timeout, isChromeExtensionCompatibleBrowser) {
    return new Promise((resolve) => {
        if (isChromeExtensionCompatibleBrowser) {
            resolve(true);
            return;
        }
        const start = Date.now();
        function check() {
            if (window.isStationExtensionAvailable === true ||
                Array.isArray(window.interchainWallets)) {
                resolve(true);
            }
            else if (Date.now() > start + timeout) {
                resolve(false);
            }
            else {
                setTimeout(check, interval);
            }
        }
        setTimeout(check, interval);
    });
}
exports.checkExtensionReady = checkExtensionReady;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tFeHRlbnNpb25SZWFkeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9AdGVycmEtbW9uZXkvd2FsbGV0LWNvbnRyb2xsZXIvdXRpbHMvY2hlY2tFeHRlbnNpb25SZWFkeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUM7QUFRZCxLQUFLLFVBQVUsbUJBQW1CLENBQ3ZDLE9BQWUsRUFDZixrQ0FBMkM7SUFFM0MsT0FBTyxJQUFJLE9BQU8sQ0FBVSxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ3RDLElBQUksa0NBQWtDLEVBQUU7WUFDdEMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2QsT0FBTztTQUNSO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRXpCLFNBQVMsS0FBSztZQUNaLElBQ0UsTUFBTSxDQUFDLDJCQUEyQixLQUFLLElBQUk7Z0JBQzNDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEVBQ3ZDO2dCQUNBLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUNmO2lCQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssR0FBRyxPQUFPLEVBQUU7Z0JBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNoQjtpQkFBTTtnQkFDTCxVQUFVLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQzdCO1FBQ0gsQ0FBQztRQUVELFVBQVUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDOUIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBM0JELGtEQTJCQyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGludGVydmFsID0gNTAwO1xuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBXaW5kb3cge1xuICAgIGlzU3RhdGlvbkV4dGVuc2lvbkF2YWlsYWJsZTogYm9vbGVhbjtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tFeHRlbnNpb25SZWFkeShcbiAgdGltZW91dDogbnVtYmVyLFxuICBpc0Nocm9tZUV4dGVuc2lvbkNvbXBhdGlibGVCcm93c2VyOiBib29sZWFuLFxuKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPigocmVzb2x2ZSkgPT4ge1xuICAgIGlmIChpc0Nocm9tZUV4dGVuc2lvbkNvbXBhdGlibGVCcm93c2VyKSB7XG4gICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcblxuICAgIGZ1bmN0aW9uIGNoZWNrKCkge1xuICAgICAgaWYgKFxuICAgICAgICB3aW5kb3cuaXNTdGF0aW9uRXh0ZW5zaW9uQXZhaWxhYmxlID09PSB0cnVlIHx8XG4gICAgICAgIEFycmF5LmlzQXJyYXkod2luZG93LmludGVyY2hhaW5XYWxsZXRzKVxuICAgICAgKSB7XG4gICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICB9IGVsc2UgaWYgKERhdGUubm93KCkgPiBzdGFydCArIHRpbWVvdXQpIHtcbiAgICAgICAgcmVzb2x2ZShmYWxzZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRUaW1lb3V0KGNoZWNrLCBpbnRlcnZhbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2V0VGltZW91dChjaGVjaywgaW50ZXJ2YWwpO1xuICB9KTtcbn1cbiJdfQ==