"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFixedExtension = void 0;
const web_extension_interface_1 = require("@terra-money/web-extension-interface");
const feather_js_1 = require("@terra-money/feather.js");
function getErrorMessage(error) {
    try {
        if (typeof error.message === 'string') {
            return error.message;
        }
        else {
            return JSON.stringify(error);
        }
    }
    catch (_a) {
        return String(error);
    }
}
function toExplicitError(error) {
    if (error && 'code' in error) {
        switch (error.code) {
            // @see https://github.com/terra-project/station/blob/main/src/extension/Confirm.tsx#L182
            case 1:
                return new web_extension_interface_1.WebExtensionUserDenied();
            // @see https://github.com/terra-project/station/blob/main/src/extension/Confirm.tsx#L137
            case 2:
                if (error.data) {
                    const { txhash } = error.data;
                    return new web_extension_interface_1.WebExtensionTxFailed(txhash, getErrorMessage(error), null);
                }
                else {
                    return new web_extension_interface_1.WebExtensionTxFailed(undefined, getErrorMessage(error), null);
                }
            // @see https://github.com/terra-project/station/blob/main/src/extension/Confirm.tsx#L153
            case 3:
                return new web_extension_interface_1.WebExtensionCreateTxFailed(getErrorMessage(error));
            default:
                return new web_extension_interface_1.WebExtensionTxUnspecifiedError(getErrorMessage(error));
        }
    }
    else {
        return new web_extension_interface_1.WebExtensionTxUnspecifiedError(getErrorMessage(error));
    }
}
function isValidResult({ error, ...payload }) {
    if (typeof payload.success !== 'boolean') {
        return false;
    }
    else if (typeof payload.result === 'undefined' &&
        typeof error === 'undefined') {
        return false;
    }
    return true;
}
const pool = new Map();
function createFixedExtension(identifier) {
    if (pool.has(identifier)) {
        return pool.get(identifier);
    }
    const extension = new feather_js_1.Extension(identifier);
    let _inTransactionProgress = false;
    const postResolvers = new Map();
    const signResolvers = new Map();
    const signBytesResolvers = new Map();
    const infoResolvers = new Set();
    const connectResolvers = new Set();
    extension.on('onPost', (result) => {
        if (!result || !isValidResult(result)) {
            return;
        }
        const { error, ...payload } = result;
        if (!postResolvers.has(payload.id)) {
            return;
        }
        const [resolve, reject] = postResolvers.get(payload.id);
        if (!payload.success) {
            reject(toExplicitError(error));
        }
        else if (resolve) {
            resolve({ name: 'onPost', payload });
        }
        postResolvers.delete(payload.id);
        if (postResolvers.size === 0) {
            _inTransactionProgress = false;
        }
    });
    extension.on('onSign', (result) => {
        if (!result || !isValidResult(result)) {
            return;
        }
        const { error, ...payload } = result;
        if (signResolvers.has(payload.id)) {
            const [resolve, reject] = signResolvers.get(payload.id);
            if (!payload.success) {
                reject(toExplicitError(error));
            }
            else if (resolve) {
                resolve({ name: 'onSign', payload });
            }
            signResolvers.delete(payload.id);
            if (signResolvers.size === 0) {
                _inTransactionProgress = false;
            }
        }
        else if (signBytesResolvers.has(payload.id)) {
            const [resolve, reject] = signBytesResolvers.get(payload.id);
            if (!payload.success) {
                reject(toExplicitError(error));
            }
            else if (resolve) {
                resolve({ name: 'onSignBytes', payload });
            }
            signBytesResolvers.delete(payload.id);
            if (signBytesResolvers.size === 0) {
                _inTransactionProgress = false;
            }
        }
    });
    extension.on('onInterchainInfo', (result) => {
        if (!result)
            return;
        const { error, ...payload } = result;
        for (const [resolve, reject] of infoResolvers) {
            if (error) {
                reject(error);
            }
            else {
                resolve(payload);
            }
        }
        infoResolvers.clear();
    });
    extension.on('onConnect', (result) => {
        if (!result)
            return;
        const { error, ...payload } = result;
        for (const [resolve, reject] of connectResolvers) {
            if (error) {
                reject(error);
            }
            else {
                resolve(payload);
            }
        }
        connectResolvers.clear();
    });
    function post(data) {
        return new Promise((...resolver) => {
            _inTransactionProgress = true;
            const id = extension.post({
                ...data,
                purgeQueue: true,
            });
            postResolvers.set(id, resolver);
            setTimeout(() => {
                if (postResolvers.has(id)) {
                    postResolvers.delete(id);
                    if (postResolvers.size === 0) {
                        _inTransactionProgress = false;
                    }
                }
            }, 1000 * 120);
        });
    }
    function sign(data) {
        return new Promise((...resolver) => {
            _inTransactionProgress = true;
            const id = extension.sign({
                ...data,
                purgeQueue: true,
            });
            signResolvers.set(id, resolver);
            setTimeout(() => {
                if (signResolvers.has(id)) {
                    signResolvers.delete(id);
                    if (signResolvers.size === 0) {
                        _inTransactionProgress = false;
                    }
                }
            }, 1000 * 120);
        });
    }
    function signBytes(bytes) {
        return new Promise((...resolver) => {
            _inTransactionProgress = true;
            const id = extension.signBytes({
                bytes,
                purgeQueue: true,
            });
            signBytesResolvers.set(id, resolver);
            setTimeout(() => {
                if (signBytesResolvers.has(id)) {
                    signBytesResolvers.delete(id);
                    if (signBytesResolvers.size === 0) {
                        _inTransactionProgress = false;
                    }
                }
            }, 1000 * 120);
        });
    }
    function connect() {
        return new Promise((...resolver) => {
            connectResolvers.add(resolver);
            extension.connect();
        });
    }
    function info() {
        return new Promise((...resolver) => {
            infoResolvers.add(resolver);
            extension.info();
        });
    }
    function disconnect() {
        connectResolvers.clear();
        infoResolvers.clear();
        postResolvers.clear();
        signResolvers.clear();
        signBytesResolvers.clear();
    }
    function inTransactionProgress() {
        return _inTransactionProgress;
    }
    const result = {
        post,
        sign,
        signBytes,
        connect,
        info,
        disconnect,
        inTransactionProgress,
    };
    pool.set(identifier, result);
    return result;
}
exports.createFixedExtension = createFixedExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlRml4ZWRFeHRlbnNpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvQHRlcnJhLW1vbmV5L3dhbGxldC1jb250cm9sbGVyL21vZHVsZXMvbGVnYWN5LWV4dGVuc2lvbi9jcmVhdGVGaXhlZEV4dGVuc2lvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxrRkFLOEM7QUFDOUMsd0RBQXNGO0FBc0N0RixTQUFTLGVBQWUsQ0FBQyxLQUFVO0lBQ2pDLElBQUk7UUFDRixJQUFJLE9BQU8sS0FBSyxDQUFDLE9BQU8sS0FBSyxRQUFRLEVBQUU7WUFDckMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDO1NBQ3RCO2FBQU07WUFDTCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDOUI7S0FDRjtJQUFDLFdBQU07UUFDTixPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztLQUN0QjtBQUNILENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxLQUFVO0lBQ2pDLElBQUksS0FBSyxJQUFJLE1BQU0sSUFBSSxLQUFLLEVBQUU7UUFDNUIsUUFBUSxLQUFLLENBQUMsSUFBSSxFQUFFO1lBQ2xCLHlGQUF5RjtZQUN6RixLQUFLLENBQUM7Z0JBQ0osT0FBTyxJQUFJLGdEQUFzQixFQUFFLENBQUM7WUFDdEMseUZBQXlGO1lBQ3pGLEtBQUssQ0FBQztnQkFDSixJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUU7b0JBQ2QsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7b0JBQzlCLE9BQU8sSUFBSSw4Q0FBb0IsQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUN2RTtxQkFBTTtvQkFDTCxPQUFPLElBQUksOENBQW9CLENBQzdCLFNBQVMsRUFDVCxlQUFlLENBQUMsS0FBSyxDQUFDLEVBQ3RCLElBQUksQ0FDTCxDQUFDO2lCQUNIO1lBQ0gseUZBQXlGO1lBQ3pGLEtBQUssQ0FBQztnQkFDSixPQUFPLElBQUksb0RBQTBCLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDaEU7Z0JBQ0UsT0FBTyxJQUFJLHdEQUE4QixDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQ3JFO0tBQ0Y7U0FBTTtRQUNMLE9BQU8sSUFBSSx3REFBOEIsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztLQUNuRTtBQUNILENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLE9BQU8sRUFBTztJQUMvQyxJQUFJLE9BQU8sT0FBTyxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUU7UUFDeEMsT0FBTyxLQUFLLENBQUM7S0FDZDtTQUFNLElBQ0wsT0FBTyxPQUFPLENBQUMsTUFBTSxLQUFLLFdBQVc7UUFDckMsT0FBTyxLQUFLLEtBQUssV0FBVyxFQUM1QjtRQUNBLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQztBQUUvQyxTQUFnQixvQkFBb0IsQ0FBQyxVQUFrQjtJQUNyRCxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDeEIsT0FBTyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBRSxDQUFDO0tBQzlCO0lBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBRTVDLElBQUksc0JBQXNCLEdBQUcsS0FBSyxDQUFDO0lBRW5DLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUcxQixDQUFDO0lBRUosTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLEVBRzFCLENBQUM7SUFFSixNQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxFQUcvQixDQUFDO0lBRUosTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLEVBQStDLENBQUM7SUFFN0UsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFFN0IsQ0FBQztJQUVKLFNBQVMsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDaEMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNyQyxPQUFPO1NBQ1I7UUFFRCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsT0FBTyxFQUFFLEdBQUcsTUFBTSxDQUFDO1FBRXJDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNsQyxPQUFPO1NBQ1I7UUFFRCxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBRSxDQUFDO1FBRXpELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQ3BCLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUNoQzthQUFNLElBQUksT0FBTyxFQUFFO1lBQ2xCLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztTQUN0QztRQUVELGFBQWEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRWpDLElBQUksYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUU7WUFDNUIsc0JBQXNCLEdBQUcsS0FBSyxDQUFDO1NBQ2hDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxTQUFTLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ2hDLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDckMsT0FBTztTQUNSO1FBRUQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLE9BQU8sRUFBRSxHQUFHLE1BQU0sQ0FBQztRQUVyQyxJQUFJLGFBQWEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ2pDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFFLENBQUM7WUFFekQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7Z0JBQ3BCLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUNoQztpQkFBTSxJQUFJLE9BQU8sRUFBRTtnQkFDbEIsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO2FBQ3RDO1lBRUQsYUFBYSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFakMsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTtnQkFDNUIsc0JBQXNCLEdBQUcsS0FBSyxDQUFDO2FBQ2hDO1NBQ0Y7YUFBTSxJQUFJLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDN0MsTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBRSxDQUFDO1lBRTlELElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO2dCQUNwQixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDaEM7aUJBQU0sSUFBSSxPQUFPLEVBQUU7Z0JBQ2xCLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQzthQUMzQztZQUVELGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFdEMsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO2dCQUNqQyxzQkFBc0IsR0FBRyxLQUFLLENBQUM7YUFDaEM7U0FDRjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBRUgsU0FBUyxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQzFDLElBQUksQ0FBQyxNQUFNO1lBQUUsT0FBTztRQUNwQixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsT0FBTyxFQUFFLEdBQUcsTUFBTSxDQUFDO1FBRXJDLEtBQUssTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxhQUFhLEVBQUU7WUFDN0MsSUFBSSxLQUFLLEVBQUU7Z0JBQ1QsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ2Y7aUJBQU07Z0JBQ0wsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ2xCO1NBQ0Y7UUFFRCxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxTQUFTLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO1FBQ25DLElBQUksQ0FBQyxNQUFNO1lBQUUsT0FBTztRQUNwQixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsT0FBTyxFQUFFLEdBQUcsTUFBTSxDQUFDO1FBRXJDLEtBQUssTUFBTSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxnQkFBZ0IsRUFBRTtZQUNoRCxJQUFJLEtBQUssRUFBRTtnQkFDVCxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDZjtpQkFBTTtnQkFDTCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDbEI7U0FDRjtRQUVELGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzNCLENBQUMsQ0FBQyxDQUFDO0lBRUgsU0FBUyxJQUFJLENBQUMsSUFBWTtRQUN4QixPQUFPLElBQUksT0FBTyxDQUFlLENBQUMsR0FBRyxRQUFRLEVBQUUsRUFBRTtZQUMvQyxzQkFBc0IsR0FBRyxJQUFJLENBQUM7WUFFOUIsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQztnQkFDeEIsR0FBSSxJQUFZO2dCQUNoQixVQUFVLEVBQUUsSUFBSTthQUNqQixDQUFDLENBQUM7WUFFSCxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUVoQyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNkLElBQUksYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDekIsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFFekIsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTt3QkFDNUIsc0JBQXNCLEdBQUcsS0FBSyxDQUFDO3FCQUNoQztpQkFDRjtZQUNILENBQUMsRUFBRSxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDakIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBUyxJQUFJLENBQUMsSUFBWTtRQUN4QixPQUFPLElBQUksT0FBTyxDQUFlLENBQUMsR0FBRyxRQUFRLEVBQUUsRUFBRTtZQUMvQyxzQkFBc0IsR0FBRyxJQUFJLENBQUM7WUFFOUIsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQztnQkFDeEIsR0FBSSxJQUFZO2dCQUNoQixVQUFVLEVBQUUsSUFBSTthQUNqQixDQUFDLENBQUM7WUFFSCxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUVoQyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNkLElBQUksYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDekIsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFFekIsSUFBSSxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTt3QkFDNUIsc0JBQXNCLEdBQUcsS0FBSyxDQUFDO3FCQUNoQztpQkFDRjtZQUNILENBQUMsRUFBRSxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDakIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBUyxTQUFTLENBQUMsS0FBYTtRQUM5QixPQUFPLElBQUksT0FBTyxDQUFvQixDQUFDLEdBQUcsUUFBUSxFQUFFLEVBQUU7WUFDcEQsc0JBQXNCLEdBQUcsSUFBSSxDQUFDO1lBRTlCLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUM7Z0JBQzdCLEtBQUs7Z0JBQ0wsVUFBVSxFQUFFLElBQUk7YUFDakIsQ0FBQyxDQUFDO1lBRUgsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUVyQyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNkLElBQUksa0JBQWtCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO29CQUM5QixrQkFBa0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBRTlCLElBQUksa0JBQWtCLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTt3QkFDakMsc0JBQXNCLEdBQUcsS0FBSyxDQUFDO3FCQUNoQztpQkFDRjtZQUNILENBQUMsRUFBRSxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDakIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBUyxPQUFPO1FBQ2QsT0FBTyxJQUFJLE9BQU8sQ0FBa0IsQ0FBQyxHQUFHLFFBQVEsRUFBRSxFQUFFO1lBQ2xELGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMvQixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBUyxJQUFJO1FBQ1gsT0FBTyxJQUFJLE9BQU8sQ0FBZSxDQUFDLEdBQUcsUUFBUSxFQUFFLEVBQUU7WUFDL0MsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM1QixTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsU0FBUyxVQUFVO1FBQ2pCLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3pCLGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN0QixhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdEIsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3RCLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzdCLENBQUM7SUFFRCxTQUFTLHFCQUFxQjtRQUM1QixPQUFPLHNCQUFzQixDQUFDO0lBQ2hDLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBbUI7UUFDN0IsSUFBSTtRQUNKLElBQUk7UUFDSixTQUFTO1FBQ1QsT0FBTztRQUNQLElBQUk7UUFDSixVQUFVO1FBQ1YscUJBQXFCO0tBQ3RCLENBQUM7SUFFRixJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUU3QixPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBeE9ELG9EQXdPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5ldHdvcmtJbmZvIH0gZnJvbSAnQHRlcnJhLW1vbmV5L3dhbGxldC10eXBlcyc7XG5pbXBvcnQge1xuICBXZWJFeHRlbnNpb25DcmVhdGVUeEZhaWxlZCxcbiAgV2ViRXh0ZW5zaW9uVHhGYWlsZWQsXG4gIFdlYkV4dGVuc2lvblR4VW5zcGVjaWZpZWRFcnJvcixcbiAgV2ViRXh0ZW5zaW9uVXNlckRlbmllZCxcbn0gZnJvbSAnQHRlcnJhLW1vbmV5L3dlYi1leHRlbnNpb24taW50ZXJmYWNlJztcbmltcG9ydCB7IEV4dGVuc2lvbk9wdGlvbnMsIEV4dGVuc2lvbiwgVHgsIEFjY0FkZHJlc3MgfSBmcm9tICdAdGVycmEtbW9uZXkvZmVhdGhlci5qcyc7XG5cbnR5cGUgQ29ubmVjdFJlc3BvbnNlID0geyBhZGRyZXNzZXM/OiBSZWNvcmQ8c3RyaW5nLCBBY2NBZGRyZXNzPiB9O1xudHlwZSBQb3N0UmVzcG9uc2UgPSB7XG4gIHBheWxvYWQ6IHtcbiAgICByZXN1bHQ6IHtcbiAgICAgIGhlaWdodDogbnVtYmVyO1xuICAgICAgcmF3X2xvZzogc3RyaW5nO1xuICAgICAgdHhoYXNoOiBzdHJpbmc7XG4gICAgfTtcbiAgfTtcbn07XG50eXBlIFNpZ25SZXNwb25zZSA9IHtcbiAgcGF5bG9hZDoge1xuICAgIHJlc3VsdDogVHguRGF0YTtcbiAgfTtcbn07XG50eXBlIFNpZ25CeXRlc1Jlc3BvbnNlID0ge1xuICBwYXlsb2FkOiB7XG4gICAgcmVzdWx0OiB7XG4gICAgICBwdWJsaWNfa2V5OiBzdHJpbmc7XG4gICAgICByZWNpZDogbnVtYmVyO1xuICAgICAgc2lnbmF0dXJlOiBzdHJpbmc7XG4gICAgfTtcbiAgfTtcbn07XG50eXBlIEluZm9SZXNwb25zZSA9IE5ldHdvcmtJbmZvO1xuXG5leHBvcnQgaW50ZXJmYWNlIEZpeGVkRXh0ZW5zaW9uIHtcbiAgcG9zdDogKGRhdGE6IEV4dGVuc2lvbk9wdGlvbnMpID0+IFByb21pc2U8UG9zdFJlc3BvbnNlPjtcbiAgc2lnbjogKGRhdGE6IEV4dGVuc2lvbk9wdGlvbnMpID0+IFByb21pc2U8U2lnblJlc3BvbnNlPjtcbiAgc2lnbkJ5dGVzOiAoYnl0ZXM6IEJ1ZmZlcikgPT4gUHJvbWlzZTxTaWduQnl0ZXNSZXNwb25zZT47XG4gIGluZm86ICgpID0+IFByb21pc2U8SW5mb1Jlc3BvbnNlPjtcbiAgY29ubmVjdDogKCkgPT4gUHJvbWlzZTxDb25uZWN0UmVzcG9uc2U+O1xuICBpblRyYW5zYWN0aW9uUHJvZ3Jlc3M6ICgpID0+IGJvb2xlYW47XG4gIGRpc2Nvbm5lY3Q6ICgpID0+IHZvaWQ7XG59XG5cbmZ1bmN0aW9uIGdldEVycm9yTWVzc2FnZShlcnJvcjogYW55KTogc3RyaW5nIHtcbiAgdHJ5IHtcbiAgICBpZiAodHlwZW9mIGVycm9yLm1lc3NhZ2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gZXJyb3IubWVzc2FnZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGVycm9yKTtcbiAgICB9XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBTdHJpbmcoZXJyb3IpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRvRXhwbGljaXRFcnJvcihlcnJvcjogYW55KSB7XG4gIGlmIChlcnJvciAmJiAnY29kZScgaW4gZXJyb3IpIHtcbiAgICBzd2l0Y2ggKGVycm9yLmNvZGUpIHtcbiAgICAgIC8vIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3RlcnJhLXByb2plY3Qvc3RhdGlvbi9ibG9iL21haW4vc3JjL2V4dGVuc2lvbi9Db25maXJtLnRzeCNMMTgyXG4gICAgICBjYXNlIDE6XG4gICAgICAgIHJldHVybiBuZXcgV2ViRXh0ZW5zaW9uVXNlckRlbmllZCgpO1xuICAgICAgLy8gQHNlZSBodHRwczovL2dpdGh1Yi5jb20vdGVycmEtcHJvamVjdC9zdGF0aW9uL2Jsb2IvbWFpbi9zcmMvZXh0ZW5zaW9uL0NvbmZpcm0udHN4I0wxMzdcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaWYgKGVycm9yLmRhdGEpIHtcbiAgICAgICAgICBjb25zdCB7IHR4aGFzaCB9ID0gZXJyb3IuZGF0YTtcbiAgICAgICAgICByZXR1cm4gbmV3IFdlYkV4dGVuc2lvblR4RmFpbGVkKHR4aGFzaCwgZ2V0RXJyb3JNZXNzYWdlKGVycm9yKSwgbnVsbCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBXZWJFeHRlbnNpb25UeEZhaWxlZChcbiAgICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGdldEVycm9yTWVzc2FnZShlcnJvciksXG4gICAgICAgICAgICBudWxsLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIC8vIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3RlcnJhLXByb2plY3Qvc3RhdGlvbi9ibG9iL21haW4vc3JjL2V4dGVuc2lvbi9Db25maXJtLnRzeCNMMTUzXG4gICAgICBjYXNlIDM6XG4gICAgICAgIHJldHVybiBuZXcgV2ViRXh0ZW5zaW9uQ3JlYXRlVHhGYWlsZWQoZ2V0RXJyb3JNZXNzYWdlKGVycm9yKSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gbmV3IFdlYkV4dGVuc2lvblR4VW5zcGVjaWZpZWRFcnJvcihnZXRFcnJvck1lc3NhZ2UoZXJyb3IpKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBXZWJFeHRlbnNpb25UeFVuc3BlY2lmaWVkRXJyb3IoZ2V0RXJyb3JNZXNzYWdlKGVycm9yKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNWYWxpZFJlc3VsdCh7IGVycm9yLCAuLi5wYXlsb2FkIH06IGFueSk6IGJvb2xlYW4ge1xuICBpZiAodHlwZW9mIHBheWxvYWQuc3VjY2VzcyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2UgaWYgKFxuICAgIHR5cGVvZiBwYXlsb2FkLnJlc3VsdCA9PT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB0eXBlb2YgZXJyb3IgPT09ICd1bmRlZmluZWQnXG4gICkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuY29uc3QgcG9vbCA9IG5ldyBNYXA8c3RyaW5nLCBGaXhlZEV4dGVuc2lvbj4oKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUZpeGVkRXh0ZW5zaW9uKGlkZW50aWZpZXI6IHN0cmluZyk6IEZpeGVkRXh0ZW5zaW9uIHtcbiAgaWYgKHBvb2wuaGFzKGlkZW50aWZpZXIpKSB7XG4gICAgcmV0dXJuIHBvb2wuZ2V0KGlkZW50aWZpZXIpITtcbiAgfVxuXG4gIGNvbnN0IGV4dGVuc2lvbiA9IG5ldyBFeHRlbnNpb24oaWRlbnRpZmllcik7XG5cbiAgbGV0IF9pblRyYW5zYWN0aW9uUHJvZ3Jlc3MgPSBmYWxzZTtcblxuICBjb25zdCBwb3N0UmVzb2x2ZXJzID0gbmV3IE1hcDxcbiAgICBudW1iZXIsXG4gICAgWyhkYXRhOiBhbnkpID0+IHZvaWQsIChlcnJvcjogYW55KSA9PiB2b2lkXVxuICA+KCk7XG5cbiAgY29uc3Qgc2lnblJlc29sdmVycyA9IG5ldyBNYXA8XG4gICAgbnVtYmVyLFxuICAgIFsoZGF0YTogYW55KSA9PiB2b2lkLCAoZXJyb3I6IGFueSkgPT4gdm9pZF1cbiAgPigpO1xuXG4gIGNvbnN0IHNpZ25CeXRlc1Jlc29sdmVycyA9IG5ldyBNYXA8XG4gICAgbnVtYmVyLFxuICAgIFsoZGF0YTogYW55KSA9PiB2b2lkLCAoZXJyb3I6IGFueSkgPT4gdm9pZF1cbiAgPigpO1xuXG4gIGNvbnN0IGluZm9SZXNvbHZlcnMgPSBuZXcgU2V0PFsoZGF0YTogYW55KSA9PiB2b2lkLCAoZXJyb3I6IGFueSkgPT4gdm9pZF0+KCk7XG5cbiAgY29uc3QgY29ubmVjdFJlc29sdmVycyA9IG5ldyBTZXQ8XG4gICAgWyhkYXRhOiBhbnkpID0+IHZvaWQsIChlcnJvcjogYW55KSA9PiB2b2lkXVxuICA+KCk7XG5cbiAgZXh0ZW5zaW9uLm9uKCdvblBvc3QnLCAocmVzdWx0KSA9PiB7XG4gICAgaWYgKCFyZXN1bHQgfHwgIWlzVmFsaWRSZXN1bHQocmVzdWx0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZXJyb3IsIC4uLnBheWxvYWQgfSA9IHJlc3VsdDtcblxuICAgIGlmICghcG9zdFJlc29sdmVycy5oYXMocGF5bG9hZC5pZCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBbcmVzb2x2ZSwgcmVqZWN0XSA9IHBvc3RSZXNvbHZlcnMuZ2V0KHBheWxvYWQuaWQpITtcblxuICAgIGlmICghcGF5bG9hZC5zdWNjZXNzKSB7XG4gICAgICByZWplY3QodG9FeHBsaWNpdEVycm9yKGVycm9yKSk7XG4gICAgfSBlbHNlIGlmIChyZXNvbHZlKSB7XG4gICAgICByZXNvbHZlKHsgbmFtZTogJ29uUG9zdCcsIHBheWxvYWQgfSk7XG4gICAgfVxuXG4gICAgcG9zdFJlc29sdmVycy5kZWxldGUocGF5bG9hZC5pZCk7XG5cbiAgICBpZiAocG9zdFJlc29sdmVycy5zaXplID09PSAwKSB7XG4gICAgICBfaW5UcmFuc2FjdGlvblByb2dyZXNzID0gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuICBleHRlbnNpb24ub24oJ29uU2lnbicsIChyZXN1bHQpID0+IHtcbiAgICBpZiAoIXJlc3VsdCB8fCAhaXNWYWxpZFJlc3VsdChyZXN1bHQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgeyBlcnJvciwgLi4ucGF5bG9hZCB9ID0gcmVzdWx0O1xuXG4gICAgaWYgKHNpZ25SZXNvbHZlcnMuaGFzKHBheWxvYWQuaWQpKSB7XG4gICAgICBjb25zdCBbcmVzb2x2ZSwgcmVqZWN0XSA9IHNpZ25SZXNvbHZlcnMuZ2V0KHBheWxvYWQuaWQpITtcblxuICAgICAgaWYgKCFwYXlsb2FkLnN1Y2Nlc3MpIHtcbiAgICAgICAgcmVqZWN0KHRvRXhwbGljaXRFcnJvcihlcnJvcikpO1xuICAgICAgfSBlbHNlIGlmIChyZXNvbHZlKSB7XG4gICAgICAgIHJlc29sdmUoeyBuYW1lOiAnb25TaWduJywgcGF5bG9hZCB9KTtcbiAgICAgIH1cblxuICAgICAgc2lnblJlc29sdmVycy5kZWxldGUocGF5bG9hZC5pZCk7XG5cbiAgICAgIGlmIChzaWduUmVzb2x2ZXJzLnNpemUgPT09IDApIHtcbiAgICAgICAgX2luVHJhbnNhY3Rpb25Qcm9ncmVzcyA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoc2lnbkJ5dGVzUmVzb2x2ZXJzLmhhcyhwYXlsb2FkLmlkKSkge1xuICAgICAgY29uc3QgW3Jlc29sdmUsIHJlamVjdF0gPSBzaWduQnl0ZXNSZXNvbHZlcnMuZ2V0KHBheWxvYWQuaWQpITtcblxuICAgICAgaWYgKCFwYXlsb2FkLnN1Y2Nlc3MpIHtcbiAgICAgICAgcmVqZWN0KHRvRXhwbGljaXRFcnJvcihlcnJvcikpO1xuICAgICAgfSBlbHNlIGlmIChyZXNvbHZlKSB7XG4gICAgICAgIHJlc29sdmUoeyBuYW1lOiAnb25TaWduQnl0ZXMnLCBwYXlsb2FkIH0pO1xuICAgICAgfVxuXG4gICAgICBzaWduQnl0ZXNSZXNvbHZlcnMuZGVsZXRlKHBheWxvYWQuaWQpO1xuXG4gICAgICBpZiAoc2lnbkJ5dGVzUmVzb2x2ZXJzLnNpemUgPT09IDApIHtcbiAgICAgICAgX2luVHJhbnNhY3Rpb25Qcm9ncmVzcyA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgZXh0ZW5zaW9uLm9uKCdvbkludGVyY2hhaW5JbmZvJywgKHJlc3VsdCkgPT4ge1xuICAgIGlmICghcmVzdWx0KSByZXR1cm47XG4gICAgY29uc3QgeyBlcnJvciwgLi4ucGF5bG9hZCB9ID0gcmVzdWx0O1xuXG4gICAgZm9yIChjb25zdCBbcmVzb2x2ZSwgcmVqZWN0XSBvZiBpbmZvUmVzb2x2ZXJzKSB7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmUocGF5bG9hZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaW5mb1Jlc29sdmVycy5jbGVhcigpO1xuICB9KTtcblxuICBleHRlbnNpb24ub24oJ29uQ29ubmVjdCcsIChyZXN1bHQpID0+IHtcbiAgICBpZiAoIXJlc3VsdCkgcmV0dXJuO1xuICAgIGNvbnN0IHsgZXJyb3IsIC4uLnBheWxvYWQgfSA9IHJlc3VsdDtcblxuICAgIGZvciAoY29uc3QgW3Jlc29sdmUsIHJlamVjdF0gb2YgY29ubmVjdFJlc29sdmVycykge1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKHBheWxvYWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbm5lY3RSZXNvbHZlcnMuY2xlYXIoKTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gcG9zdChkYXRhOiBvYmplY3QpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8UG9zdFJlc3BvbnNlPigoLi4ucmVzb2x2ZXIpID0+IHtcbiAgICAgIF9pblRyYW5zYWN0aW9uUHJvZ3Jlc3MgPSB0cnVlO1xuXG4gICAgICBjb25zdCBpZCA9IGV4dGVuc2lvbi5wb3N0KHtcbiAgICAgICAgLi4uKGRhdGEgYXMgYW55KSxcbiAgICAgICAgcHVyZ2VRdWV1ZTogdHJ1ZSxcbiAgICAgIH0pO1xuXG4gICAgICBwb3N0UmVzb2x2ZXJzLnNldChpZCwgcmVzb2x2ZXIpO1xuXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaWYgKHBvc3RSZXNvbHZlcnMuaGFzKGlkKSkge1xuICAgICAgICAgIHBvc3RSZXNvbHZlcnMuZGVsZXRlKGlkKTtcblxuICAgICAgICAgIGlmIChwb3N0UmVzb2x2ZXJzLnNpemUgPT09IDApIHtcbiAgICAgICAgICAgIF9pblRyYW5zYWN0aW9uUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIDEwMDAgKiAxMjApO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2lnbihkYXRhOiBvYmplY3QpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8U2lnblJlc3BvbnNlPigoLi4ucmVzb2x2ZXIpID0+IHtcbiAgICAgIF9pblRyYW5zYWN0aW9uUHJvZ3Jlc3MgPSB0cnVlO1xuXG4gICAgICBjb25zdCBpZCA9IGV4dGVuc2lvbi5zaWduKHtcbiAgICAgICAgLi4uKGRhdGEgYXMgYW55KSxcbiAgICAgICAgcHVyZ2VRdWV1ZTogdHJ1ZSxcbiAgICAgIH0pO1xuXG4gICAgICBzaWduUmVzb2x2ZXJzLnNldChpZCwgcmVzb2x2ZXIpO1xuXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaWYgKHNpZ25SZXNvbHZlcnMuaGFzKGlkKSkge1xuICAgICAgICAgIHNpZ25SZXNvbHZlcnMuZGVsZXRlKGlkKTtcblxuICAgICAgICAgIGlmIChzaWduUmVzb2x2ZXJzLnNpemUgPT09IDApIHtcbiAgICAgICAgICAgIF9pblRyYW5zYWN0aW9uUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIDEwMDAgKiAxMjApO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2lnbkJ5dGVzKGJ5dGVzOiBCdWZmZXIpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8U2lnbkJ5dGVzUmVzcG9uc2U+KCguLi5yZXNvbHZlcikgPT4ge1xuICAgICAgX2luVHJhbnNhY3Rpb25Qcm9ncmVzcyA9IHRydWU7XG5cbiAgICAgIGNvbnN0IGlkID0gZXh0ZW5zaW9uLnNpZ25CeXRlcyh7XG4gICAgICAgIGJ5dGVzLFxuICAgICAgICBwdXJnZVF1ZXVlOiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIHNpZ25CeXRlc1Jlc29sdmVycy5zZXQoaWQsIHJlc29sdmVyKTtcblxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGlmIChzaWduQnl0ZXNSZXNvbHZlcnMuaGFzKGlkKSkge1xuICAgICAgICAgIHNpZ25CeXRlc1Jlc29sdmVycy5kZWxldGUoaWQpO1xuXG4gICAgICAgICAgaWYgKHNpZ25CeXRlc1Jlc29sdmVycy5zaXplID09PSAwKSB7XG4gICAgICAgICAgICBfaW5UcmFuc2FjdGlvblByb2dyZXNzID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCAxMDAwICogMTIwKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbm5lY3QoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPENvbm5lY3RSZXNwb25zZT4oKC4uLnJlc29sdmVyKSA9PiB7XG4gICAgICBjb25uZWN0UmVzb2x2ZXJzLmFkZChyZXNvbHZlcik7XG4gICAgICBleHRlbnNpb24uY29ubmVjdCgpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5mbygpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8SW5mb1Jlc3BvbnNlPigoLi4ucmVzb2x2ZXIpID0+IHtcbiAgICAgIGluZm9SZXNvbHZlcnMuYWRkKHJlc29sdmVyKTtcbiAgICAgIGV4dGVuc2lvbi5pbmZvKCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBkaXNjb25uZWN0KCkge1xuICAgIGNvbm5lY3RSZXNvbHZlcnMuY2xlYXIoKTtcbiAgICBpbmZvUmVzb2x2ZXJzLmNsZWFyKCk7XG4gICAgcG9zdFJlc29sdmVycy5jbGVhcigpO1xuICAgIHNpZ25SZXNvbHZlcnMuY2xlYXIoKTtcbiAgICBzaWduQnl0ZXNSZXNvbHZlcnMuY2xlYXIoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGluVHJhbnNhY3Rpb25Qcm9ncmVzcygpIHtcbiAgICByZXR1cm4gX2luVHJhbnNhY3Rpb25Qcm9ncmVzcztcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdDogRml4ZWRFeHRlbnNpb24gPSB7XG4gICAgcG9zdCxcbiAgICBzaWduLFxuICAgIHNpZ25CeXRlcyxcbiAgICBjb25uZWN0LFxuICAgIGluZm8sXG4gICAgZGlzY29ubmVjdCxcbiAgICBpblRyYW5zYWN0aW9uUHJvZ3Jlc3MsXG4gIH07XG5cbiAgcG9vbC5zZXQoaWRlbnRpZmllciwgcmVzdWx0KTtcblxuICByZXR1cm4gcmVzdWx0O1xufVxuIl19