import { WebExtensionCreateTxFailed, WebExtensionTxFailed, WebExtensionTxUnspecifiedError, WebExtensionUserDenied, } from '@nestwallet/web-extension-interface';
import { Extension } from '@terra-money/feather.js';
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
                return new WebExtensionUserDenied();
            // @see https://github.com/terra-project/station/blob/main/src/extension/Confirm.tsx#L137
            case 2:
                if (error.data) {
                    const { txhash } = error.data;
                    return new WebExtensionTxFailed(txhash, getErrorMessage(error), null);
                }
                else {
                    return new WebExtensionTxFailed(undefined, getErrorMessage(error), null);
                }
            // @see https://github.com/terra-project/station/blob/main/src/extension/Confirm.tsx#L153
            case 3:
                return new WebExtensionCreateTxFailed(getErrorMessage(error));
            default:
                return new WebExtensionTxUnspecifiedError(getErrorMessage(error));
        }
    }
    else {
        return new WebExtensionTxUnspecifiedError(getErrorMessage(error));
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
export function createFixedExtension(identifier) {
    if (pool.has(identifier)) {
        return pool.get(identifier);
    }
    const extension = new Extension(identifier);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlRml4ZWRFeHRlbnNpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvQHRlcnJhLW1vbmV5L3dhbGxldC1jb250cm9sbGVyL21vZHVsZXMvbGVnYWN5LWV4dGVuc2lvbi9jcmVhdGVGaXhlZEV4dGVuc2lvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQ0wsMEJBQTBCLEVBQzFCLG9CQUFvQixFQUNwQiw4QkFBOEIsRUFDOUIsc0JBQXNCLEdBQ3ZCLE1BQU0sc0NBQXNDLENBQUM7QUFDOUMsT0FBTyxFQUFvQixTQUFTLEVBQWtCLE1BQU0seUJBQXlCLENBQUM7QUFzQ3RGLFNBQVMsZUFBZSxDQUFDLEtBQVU7SUFDakMsSUFBSTtRQUNGLElBQUksT0FBTyxLQUFLLENBQUMsT0FBTyxLQUFLLFFBQVEsRUFBRTtZQUNyQyxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUM7U0FDdEI7YUFBTTtZQUNMLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUM5QjtLQUNGO0lBQUMsV0FBTTtRQUNOLE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ3RCO0FBQ0gsQ0FBQztBQUVELFNBQVMsZUFBZSxDQUFDLEtBQVU7SUFDakMsSUFBSSxLQUFLLElBQUksTUFBTSxJQUFJLEtBQUssRUFBRTtRQUM1QixRQUFRLEtBQUssQ0FBQyxJQUFJLEVBQUU7WUFDbEIseUZBQXlGO1lBQ3pGLEtBQUssQ0FBQztnQkFDSixPQUFPLElBQUksc0JBQXNCLEVBQUUsQ0FBQztZQUN0Qyx5RkFBeUY7WUFDekYsS0FBSyxDQUFDO2dCQUNKLElBQUksS0FBSyxDQUFDLElBQUksRUFBRTtvQkFDZCxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztvQkFDOUIsT0FBTyxJQUFJLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLEVB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QzVCLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNuQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxTQUFTLFVBQVU7UUFDakIsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDekIsYUFBYSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3RCLGFBQWEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN0QixhQUFhLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdEIsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELFNBQVMscUJBQXFCO1FBQzVCLE9BQU8sc0JBQXNCLENBQUM7SUFDaEMsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFtQjtRQUM3QixJQUFJO1FBQ0osSUFBSTtRQUNKLFNBQVM7UUFDVCxPQUFPO1FBQ1AsSUFBSTtRQUNKLFVBQVU7UUFDVixxQkFBcUI7S0FDdEIsQ0FBQztJQUVGLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBRTdCLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXR3b3JrSW5mbyB9IGZyb20gJ0B0ZXJyYS1tb25leS93YWxsZXQtdHlwZXMnO1xuaW1wb3J0IHtcbiAgV2ViRXh0ZW5zaW9uQ3JlYXRlVHhGYWlsZWQsXG4gIFdlYkV4dGVuc2lvblR4RmFpbGVkLFxuICBXZWJFeHRlbnNpb25UeFVuc3BlY2lmaWVkRXJyb3IsXG4gIFdlYkV4dGVuc2lvblVzZXJEZW5pZWQsXG59IGZyb20gJ0B0ZXJyYS1tb25leS93ZWItZXh0ZW5zaW9uLWludGVyZmFjZSc7XG5pbXBvcnQgeyBFeHRlbnNpb25PcHRpb25zLCBFeHRlbnNpb24sIFR4LCBBY2NBZGRyZXNzIH0gZnJvbSAnQHRlcnJhLW1vbmV5L2ZlYXRoZXIuanMnO1xuXG50eXBlIENvbm5lY3RSZXNwb25zZSA9IHsgYWRkcmVzc2VzPzogUmVjb3JkPHN0cmluZywgQWNjQWRkcmVzcz4gfTtcbnR5cGUgUG9zdFJlc3BvbnNlID0ge1xuICBwYXlsb2FkOiB7XG4gICAgcmVzdWx0OiB7XG4gICAgICBoZWlnaHQ6IG51bWJlcjtcbiAgICAgIHJhd19sb2c6IHN0cmluZztcbiAgICAgIHR4aGFzaDogc3RyaW5nO1xuICAgIH07XG4gIH07XG59O1xudHlwZSBTaWduUmVzcG9uc2UgPSB7XG4gIHBheWxvYWQ6IHtcbiAgICByZXN1bHQ6IFR4LkRhdGE7XG4gIH07XG59O1xudHlwZSBTaWduQnl0ZXNSZXNwb25zZSA9IHtcbiAgcGF5bG9hZDoge1xuICAgIHJlc3VsdDoge1xuICAgICAgcHVibGljX2tleTogc3RyaW5nO1xuICAgICAgcmVjaWQ6IG51bWJlcjtcbiAgICAgIHNpZ25hdHVyZTogc3RyaW5nO1xuICAgIH07XG4gIH07XG59O1xudHlwZSBJbmZvUmVzcG9uc2UgPSBOZXR3b3JrSW5mbztcblxuZXhwb3J0IGludGVyZmFjZSBGaXhlZEV4dGVuc2lvbiB7XG4gIHBvc3Q6IChkYXRhOiBFeHRlbnNpb25PcHRpb25zKSA9PiBQcm9taXNlPFBvc3RSZXNwb25zZT47XG4gIHNpZ246IChkYXRhOiBFeHRlbnNpb25PcHRpb25zKSA9PiBQcm9taXNlPFNpZ25SZXNwb25zZT47XG4gIHNpZ25CeXRlczogKGJ5dGVzOiBCdWZmZXIpID0+IFByb21pc2U8U2lnbkJ5dGVzUmVzcG9uc2U+O1xuICBpbmZvOiAoKSA9PiBQcm9taXNlPEluZm9SZXNwb25zZT47XG4gIGNvbm5lY3Q6ICgpID0+IFByb21pc2U8Q29ubmVjdFJlc3BvbnNlPjtcbiAgaW5UcmFuc2FjdGlvblByb2dyZXNzOiAoKSA9PiBib29sZWFuO1xuICBkaXNjb25uZWN0OiAoKSA9PiB2b2lkO1xufVxuXG5mdW5jdGlvbiBnZXRFcnJvck1lc3NhZ2UoZXJyb3I6IGFueSk6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgaWYgKHR5cGVvZiBlcnJvci5tZXNzYWdlID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGVycm9yLm1lc3NhZ2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShlcnJvcik7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gU3RyaW5nKGVycm9yKTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0b0V4cGxpY2l0RXJyb3IoZXJyb3I6IGFueSkge1xuICBpZiAoZXJyb3IgJiYgJ2NvZGUnIGluIGVycm9yKSB7XG4gICAgc3dpdGNoIChlcnJvci5jb2RlKSB7XG4gICAgICAvLyBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS90ZXJyYS1wcm9qZWN0L3N0YXRpb24vYmxvYi9tYWluL3NyYy9leHRlbnNpb24vQ29uZmlybS50c3gjTDE4MlxuICAgICAgY2FzZSAxOlxuICAgICAgICByZXR1cm4gbmV3IFdlYkV4dGVuc2lvblVzZXJEZW5pZWQoKTtcbiAgICAgIC8vIEBzZWUgaHR0cHM6Ly9naXRodWIuY29tL3RlcnJhLXByb2plY3Qvc3RhdGlvbi9ibG9iL21haW4vc3JjL2V4dGVuc2lvbi9Db25maXJtLnRzeCNMMTM3XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGlmIChlcnJvci5kYXRhKSB7XG4gICAgICAgICAgY29uc3QgeyB0eGhhc2ggfSA9IGVycm9yLmRhdGE7XG4gICAgICAgICAgcmV0dXJuIG5ldyBXZWJFeHRlbnNpb25UeEZhaWxlZCh0eGhhc2gsIGdldEVycm9yTWVzc2FnZShlcnJvciksIG51bGwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBuZXcgV2ViRXh0ZW5zaW9uVHhGYWlsZWQoXG4gICAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgICBnZXRFcnJvck1lc3NhZ2UoZXJyb3IpLFxuICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAvLyBAc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS90ZXJyYS1wcm9qZWN0L3N0YXRpb24vYmxvYi9tYWluL3NyYy9leHRlbnNpb24vQ29uZmlybS50c3gjTDE1M1xuICAgICAgY2FzZSAzOlxuICAgICAgICByZXR1cm4gbmV3IFdlYkV4dGVuc2lvbkNyZWF0ZVR4RmFpbGVkKGdldEVycm9yTWVzc2FnZShlcnJvcikpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIG5ldyBXZWJFeHRlbnNpb25UeFVuc3BlY2lmaWVkRXJyb3IoZ2V0RXJyb3JNZXNzYWdlKGVycm9yKSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgV2ViRXh0ZW5zaW9uVHhVbnNwZWNpZmllZEVycm9yKGdldEVycm9yTWVzc2FnZShlcnJvcikpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzVmFsaWRSZXN1bHQoeyBlcnJvciwgLi4ucGF5bG9hZCB9OiBhbnkpOiBib29sZWFuIHtcbiAgaWYgKHR5cGVvZiBwYXlsb2FkLnN1Y2Nlc3MgIT09ICdib29sZWFuJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIGlmIChcbiAgICB0eXBlb2YgcGF5bG9hZC5yZXN1bHQgPT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIGVycm9yID09PSAndW5kZWZpbmVkJ1xuICApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmNvbnN0IHBvb2wgPSBuZXcgTWFwPHN0cmluZywgRml4ZWRFeHRlbnNpb24+KCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVGaXhlZEV4dGVuc2lvbihpZGVudGlmaWVyOiBzdHJpbmcpOiBGaXhlZEV4dGVuc2lvbiB7XG4gIGlmIChwb29sLmhhcyhpZGVudGlmaWVyKSkge1xuICAgIHJldHVybiBwb29sLmdldChpZGVudGlmaWVyKSE7XG4gIH1cblxuICBjb25zdCBleHRlbnNpb24gPSBuZXcgRXh0ZW5zaW9uKGlkZW50aWZpZXIpO1xuXG4gIGxldCBfaW5UcmFuc2FjdGlvblByb2dyZXNzID0gZmFsc2U7XG5cbiAgY29uc3QgcG9zdFJlc29sdmVycyA9IG5ldyBNYXA8XG4gICAgbnVtYmVyLFxuICAgIFsoZGF0YTogYW55KSA9PiB2b2lkLCAoZXJyb3I6IGFueSkgPT4gdm9pZF1cbiAgPigpO1xuXG4gIGNvbnN0IHNpZ25SZXNvbHZlcnMgPSBuZXcgTWFwPFxuICAgIG51bWJlcixcbiAgICBbKGRhdGE6IGFueSkgPT4gdm9pZCwgKGVycm9yOiBhbnkpID0+IHZvaWRdXG4gID4oKTtcblxuICBjb25zdCBzaWduQnl0ZXNSZXNvbHZlcnMgPSBuZXcgTWFwPFxuICAgIG51bWJlcixcbiAgICBbKGRhdGE6IGFueSkgPT4gdm9pZCwgKGVycm9yOiBhbnkpID0+IHZvaWRdXG4gID4oKTtcblxuICBjb25zdCBpbmZvUmVzb2x2ZXJzID0gbmV3IFNldDxbKGRhdGE6IGFueSkgPT4gdm9pZCwgKGVycm9yOiBhbnkpID0+IHZvaWRdPigpO1xuXG4gIGNvbnN0IGNvbm5lY3RSZXNvbHZlcnMgPSBuZXcgU2V0PFxuICAgIFsoZGF0YTogYW55KSA9PiB2b2lkLCAoZXJyb3I6IGFueSkgPT4gdm9pZF1cbiAgPigpO1xuXG4gIGV4dGVuc2lvbi5vbignb25Qb3N0JywgKHJlc3VsdCkgPT4ge1xuICAgIGlmICghcmVzdWx0IHx8ICFpc1ZhbGlkUmVzdWx0KHJlc3VsdCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCB7IGVycm9yLCAuLi5wYXlsb2FkIH0gPSByZXN1bHQ7XG5cbiAgICBpZiAoIXBvc3RSZXNvbHZlcnMuaGFzKHBheWxvYWQuaWQpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgW3Jlc29sdmUsIHJlamVjdF0gPSBwb3N0UmVzb2x2ZXJzLmdldChwYXlsb2FkLmlkKSE7XG5cbiAgICBpZiAoIXBheWxvYWQuc3VjY2Vzcykge1xuICAgICAgcmVqZWN0KHRvRXhwbGljaXRFcnJvcihlcnJvcikpO1xuICAgIH0gZWxzZSBpZiAocmVzb2x2ZSkge1xuICAgICAgcmVzb2x2ZSh7IG5hbWU6ICdvblBvc3QnLCBwYXlsb2FkIH0pO1xuICAgIH1cblxuICAgIHBvc3RSZXNvbHZlcnMuZGVsZXRlKHBheWxvYWQuaWQpO1xuXG4gICAgaWYgKHBvc3RSZXNvbHZlcnMuc2l6ZSA9PT0gMCkge1xuICAgICAgX2luVHJhbnNhY3Rpb25Qcm9ncmVzcyA9IGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgZXh0ZW5zaW9uLm9uKCdvblNpZ24nLCAocmVzdWx0KSA9PiB7XG4gICAgaWYgKCFyZXN1bHQgfHwgIWlzVmFsaWRSZXN1bHQocmVzdWx0KSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHsgZXJyb3IsIC4uLnBheWxvYWQgfSA9IHJlc3VsdDtcblxuICAgIGlmIChzaWduUmVzb2x2ZXJzLmhhcyhwYXlsb2FkLmlkKSkge1xuICAgICAgY29uc3QgW3Jlc29sdmUsIHJlamVjdF0gPSBzaWduUmVzb2x2ZXJzLmdldChwYXlsb2FkLmlkKSE7XG5cbiAgICAgIGlmICghcGF5bG9hZC5zdWNjZXNzKSB7XG4gICAgICAgIHJlamVjdCh0b0V4cGxpY2l0RXJyb3IoZXJyb3IpKTtcbiAgICAgIH0gZWxzZSBpZiAocmVzb2x2ZSkge1xuICAgICAgICByZXNvbHZlKHsgbmFtZTogJ29uU2lnbicsIHBheWxvYWQgfSk7XG4gICAgICB9XG5cbiAgICAgIHNpZ25SZXNvbHZlcnMuZGVsZXRlKHBheWxvYWQuaWQpO1xuXG4gICAgICBpZiAoc2lnblJlc29sdmVycy5zaXplID09PSAwKSB7XG4gICAgICAgIF9pblRyYW5zYWN0aW9uUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHNpZ25CeXRlc1Jlc29sdmVycy5oYXMocGF5bG9hZC5pZCkpIHtcbiAgICAgIGNvbnN0IFtyZXNvbHZlLCByZWplY3RdID0gc2lnbkJ5dGVzUmVzb2x2ZXJzLmdldChwYXlsb2FkLmlkKSE7XG5cbiAgICAgIGlmICghcGF5bG9hZC5zdWNjZXNzKSB7XG4gICAgICAgIHJlamVjdCh0b0V4cGxpY2l0RXJyb3IoZXJyb3IpKTtcbiAgICAgIH0gZWxzZSBpZiAocmVzb2x2ZSkge1xuICAgICAgICByZXNvbHZlKHsgbmFtZTogJ29uU2lnbkJ5dGVzJywgcGF5bG9hZCB9KTtcbiAgICAgIH1cblxuICAgICAgc2lnbkJ5dGVzUmVzb2x2ZXJzLmRlbGV0ZShwYXlsb2FkLmlkKTtcblxuICAgICAgaWYgKHNpZ25CeXRlc1Jlc29sdmVycy5zaXplID09PSAwKSB7XG4gICAgICAgIF9pblRyYW5zYWN0aW9uUHJvZ3Jlc3MgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIGV4dGVuc2lvbi5vbignb25JbnRlcmNoYWluSW5mbycsIChyZXN1bHQpID0+IHtcbiAgICBpZiAoIXJlc3VsdCkgcmV0dXJuO1xuICAgIGNvbnN0IHsgZXJyb3IsIC4uLnBheWxvYWQgfSA9IHJlc3VsdDtcblxuICAgIGZvciAoY29uc3QgW3Jlc29sdmUsIHJlamVjdF0gb2YgaW5mb1Jlc29sdmVycykge1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKHBheWxvYWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGluZm9SZXNvbHZlcnMuY2xlYXIoKTtcbiAgfSk7XG5cbiAgZXh0ZW5zaW9uLm9uKCdvbkNvbm5lY3QnLCAocmVzdWx0KSA9PiB7XG4gICAgaWYgKCFyZXN1bHQpIHJldHVybjtcbiAgICBjb25zdCB7IGVycm9yLCAuLi5wYXlsb2FkIH0gPSByZXN1bHQ7XG5cbiAgICBmb3IgKGNvbnN0IFtyZXNvbHZlLCByZWplY3RdIG9mIGNvbm5lY3RSZXNvbHZlcnMpIHtcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShwYXlsb2FkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25uZWN0UmVzb2x2ZXJzLmNsZWFyKCk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHBvc3QoZGF0YTogb2JqZWN0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFBvc3RSZXNwb25zZT4oKC4uLnJlc29sdmVyKSA9PiB7XG4gICAgICBfaW5UcmFuc2FjdGlvblByb2dyZXNzID0gdHJ1ZTtcblxuICAgICAgY29uc3QgaWQgPSBleHRlbnNpb24ucG9zdCh7XG4gICAgICAgIC4uLihkYXRhIGFzIGFueSksXG4gICAgICAgIHB1cmdlUXVldWU6IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgcG9zdFJlc29sdmVycy5zZXQoaWQsIHJlc29sdmVyKTtcblxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGlmIChwb3N0UmVzb2x2ZXJzLmhhcyhpZCkpIHtcbiAgICAgICAgICBwb3N0UmVzb2x2ZXJzLmRlbGV0ZShpZCk7XG5cbiAgICAgICAgICBpZiAocG9zdFJlc29sdmVycy5zaXplID09PSAwKSB7XG4gICAgICAgICAgICBfaW5UcmFuc2FjdGlvblByb2dyZXNzID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCAxMDAwICogMTIwKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNpZ24oZGF0YTogb2JqZWN0KSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFNpZ25SZXNwb25zZT4oKC4uLnJlc29sdmVyKSA9PiB7XG4gICAgICBfaW5UcmFuc2FjdGlvblByb2dyZXNzID0gdHJ1ZTtcblxuICAgICAgY29uc3QgaWQgPSBleHRlbnNpb24uc2lnbih7XG4gICAgICAgIC4uLihkYXRhIGFzIGFueSksXG4gICAgICAgIHB1cmdlUXVldWU6IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgc2lnblJlc29sdmVycy5zZXQoaWQsIHJlc29sdmVyKTtcblxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGlmIChzaWduUmVzb2x2ZXJzLmhhcyhpZCkpIHtcbiAgICAgICAgICBzaWduUmVzb2x2ZXJzLmRlbGV0ZShpZCk7XG5cbiAgICAgICAgICBpZiAoc2lnblJlc29sdmVycy5zaXplID09PSAwKSB7XG4gICAgICAgICAgICBfaW5UcmFuc2FjdGlvblByb2dyZXNzID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCAxMDAwICogMTIwKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNpZ25CeXRlcyhieXRlczogQnVmZmVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFNpZ25CeXRlc1Jlc3BvbnNlPigoLi4ucmVzb2x2ZXIpID0+IHtcbiAgICAgIF9pblRyYW5zYWN0aW9uUHJvZ3Jlc3MgPSB0cnVlO1xuXG4gICAgICBjb25zdCBpZCA9IGV4dGVuc2lvbi5zaWduQnl0ZXMoe1xuICAgICAgICBieXRlcyxcbiAgICAgICAgcHVyZ2VRdWV1ZTogdHJ1ZSxcbiAgICAgIH0pO1xuXG4gICAgICBzaWduQnl0ZXNSZXNvbHZlcnMuc2V0KGlkLCByZXNvbHZlcik7XG5cbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBpZiAoc2lnbkJ5dGVzUmVzb2x2ZXJzLmhhcyhpZCkpIHtcbiAgICAgICAgICBzaWduQnl0ZXNSZXNvbHZlcnMuZGVsZXRlKGlkKTtcblxuICAgICAgICAgIGlmIChzaWduQnl0ZXNSZXNvbHZlcnMuc2l6ZSA9PT0gMCkge1xuICAgICAgICAgICAgX2luVHJhbnNhY3Rpb25Qcm9ncmVzcyA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgMTAwMCAqIDEyMCk7XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBjb25uZWN0KCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTxDb25uZWN0UmVzcG9uc2U+KCguLi5yZXNvbHZlcikgPT4ge1xuICAgICAgY29ubmVjdFJlc29sdmVycy5hZGQocmVzb2x2ZXIpO1xuICAgICAgZXh0ZW5zaW9uLmNvbm5lY3QoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGluZm8oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPEluZm9SZXNwb25zZT4oKC4uLnJlc29sdmVyKSA9PiB7XG4gICAgICBpbmZvUmVzb2x2ZXJzLmFkZChyZXNvbHZlcik7XG4gICAgICBleHRlbnNpb24uaW5mbygpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZGlzY29ubmVjdCgpIHtcbiAgICBjb25uZWN0UmVzb2x2ZXJzLmNsZWFyKCk7XG4gICAgaW5mb1Jlc29sdmVycy5jbGVhcigpO1xuICAgIHBvc3RSZXNvbHZlcnMuY2xlYXIoKTtcbiAgICBzaWduUmVzb2x2ZXJzLmNsZWFyKCk7XG4gICAgc2lnbkJ5dGVzUmVzb2x2ZXJzLmNsZWFyKCk7XG4gIH1cblxuICBmdW5jdGlvbiBpblRyYW5zYWN0aW9uUHJvZ3Jlc3MoKSB7XG4gICAgcmV0dXJuIF9pblRyYW5zYWN0aW9uUHJvZ3Jlc3M7XG4gIH1cblxuICBjb25zdCByZXN1bHQ6IEZpeGVkRXh0ZW5zaW9uID0ge1xuICAgIHBvc3QsXG4gICAgc2lnbixcbiAgICBzaWduQnl0ZXMsXG4gICAgY29ubmVjdCxcbiAgICBpbmZvLFxuICAgIGRpc2Nvbm5lY3QsXG4gICAgaW5UcmFuc2FjdGlvblByb2dyZXNzLFxuICB9O1xuXG4gIHBvb2wuc2V0KGlkZW50aWZpZXIsIHJlc3VsdCk7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiJdfQ==