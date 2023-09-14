"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connect = exports.connectIfSessionExists = void 0;
const core_1 = __importDefault(require("@walletconnect/core"));
const cryptoLib = __importStar(require("@walletconnect/iso-crypto"));
const utils_1 = require("@walletconnect/utils");
const rxjs_1 = require("rxjs");
const browser_check_1 = require("../../utils/browser-check");
const errors_1 = require("./errors");
const socket_transport_1 = __importDefault(require("./impl/socket-transport"));
const modal_1 = require("./modal");
const types_1 = require("./types");
const WALLETCONNECT_STORAGE_KEY = 'walletconnect';
function connectIfSessionExists(options = {}) {
    const storedSession = localStorage.getItem(WALLETCONNECT_STORAGE_KEY);
    if (typeof storedSession === 'string') {
        return connect(options, true);
    }
    return null;
}
exports.connectIfSessionExists = connectIfSessionExists;
function connect(options = {}, useCachedSession = false) {
    var _a, _b;
    let connector = null;
    let sessionSubject = new rxjs_1.BehaviorSubject({
        status: types_1.WalletConnectSessionStatus.DISCONNECTED,
    });
    const qrcodeModal = (_b = (_a = options.connectorOpts) === null || _a === void 0 ? void 0 : _a.qrcodeModal) !== null && _b !== void 0 ? _b : new modal_1.TerraWalletconnectQrcodeModal();
    const connectorOpts = {
        bridge: 'https://walletconnect.terra.dev/',
        qrcodeModal,
        ...options.connectorOpts,
    };
    const pushServerOpts = options.pushServerOpts;
    // ---------------------------------------------
    // event listeners
    // ---------------------------------------------
    function initEvents() {
        if (!connector) {
            throw new Error(`WalletConnect is not defined!`);
        }
        connector.on('session_update', async (error, payload) => {
            if (error)
                throw error;
            sessionSubject.next({
                status: types_1.WalletConnectSessionStatus.CONNECTED,
                peerMeta: payload.params[0],
                terraAddress: payload.params[0].accounts[0],
                chainId: payload.params[0].chainId,
            });
            console.log('WALLETCONNECT SESSION UPDATED:', payload.params[0]);
        });
        connector.on('connect', (error, payload) => {
            if (error)
                throw error;
            sessionSubject.next({
                status: types_1.WalletConnectSessionStatus.CONNECTED,
                peerMeta: payload.params[0],
                terraAddress: payload.params[0].accounts[0],
                chainId: payload.params[0].chainId,
            });
        });
        connector.on('disconnect', (error, payload) => {
            if (error)
                throw error;
            sessionSubject.next({
                status: types_1.WalletConnectSessionStatus.DISCONNECTED,
            });
        });
    }
    // ---------------------------------------------
    // initialize
    // ---------------------------------------------
    const cachedSession = localStorage.getItem('walletconnect');
    if (typeof cachedSession === 'string' && useCachedSession) {
        const cachedSessionObject = JSON.parse(cachedSession);
        const clientId = cachedSessionObject.clientId;
        const draftConnector = new core_1.default({
            connectorOpts: {
                ...connectorOpts,
                session: JSON.parse(cachedSession),
            },
            pushServerOpts,
            cryptoLib,
            transport: new socket_transport_1.default({
                protocol: 'wc',
                version: 1,
                url: connectorOpts.bridge,
                subscriptions: [clientId],
            }),
        });
        draftConnector.clientId = clientId;
        connector = draftConnector;
        initEvents();
        sessionSubject.next({
            status: types_1.WalletConnectSessionStatus.CONNECTED,
            peerMeta: draftConnector.peerMeta,
            terraAddress: draftConnector.accounts[0],
            chainId: draftConnector.chainId,
        });
    }
    else {
        const clientId = (0, utils_1.uuid)();
        const draftConnector = new core_1.default({
            connectorOpts,
            pushServerOpts,
            cryptoLib,
            transport: new socket_transport_1.default({
                protocol: 'wc',
                version: 1,
                url: connectorOpts.bridge,
                subscriptions: [clientId],
            }),
        });
        draftConnector.clientId = clientId;
        connector = draftConnector;
        if (!draftConnector.connected) {
            draftConnector.createSession().catch(console.error);
            if (qrcodeModal instanceof modal_1.TerraWalletconnectQrcodeModal) {
                qrcodeModal.setCloseCallback(() => {
                    sessionSubject.next({
                        status: types_1.WalletConnectSessionStatus.DISCONNECTED,
                    });
                });
            }
            initEvents();
            sessionSubject.next({
                status: types_1.WalletConnectSessionStatus.REQUESTED,
            });
        }
    }
    // ---------------------------------------------
    // methods
    // ---------------------------------------------
    function disconnect() {
        if (connector && connector.connected) {
            try {
                connector.killSession();
            }
            catch (_a) { }
        }
        sessionSubject.next({
            status: types_1.WalletConnectSessionStatus.DISCONNECTED,
        });
    }
    function session() {
        return sessionSubject.asObservable();
    }
    function getLatestSession() {
        return sessionSubject.getValue();
    }
    /**
     * post transaction
     *
     * @param tx transaction data
     * @throws { WalletConnectUserDenied }
     * @throws { WalletConnectCreateTxFailed }
     * @throws { WalletConnectTxFailed }
     * @throws { WalletConnectTimeout }
     * @throws { WalletConnectTxUnspecifiedError }
     */
    function post(tx) {
        var _a, _b, _c;
        if (!connector || !connector.connected) {
            throw new Error(`WalletConnect is not connected!`);
        }
        const id = Date.now();
        const serializedTxOptions = {
            msgs: tx.msgs.map((msg) => msg.toJSON()),
            fee: (_a = tx.fee) === null || _a === void 0 ? void 0 : _a.toJSON(),
            memo: tx.memo,
            gas: tx.gas,
            gasPrices: (_b = tx.gasPrices) === null || _b === void 0 ? void 0 : _b.toString(),
            gasAdjustment: (_c = tx.gasAdjustment) === null || _c === void 0 ? void 0 : _c.toString(),
            //account_number: tx.account_number,
            //sequence: tx.sequence,
            feeDenoms: tx.feeDenoms,
            timeoutHeight: tx.timeoutHeight,
        };
        if ((0, browser_check_1.isMobile)()) {
            const payload = btoa(JSON.stringify({
                id,
                handshakeTopic: connector.handshakeTopic,
                method: 'post',
                params: serializedTxOptions,
            }));
            // FIXME changed walletconnect confirm schema
            window.location.href = `terrastation://walletconnect_confirm/?action=walletconnect_confirm&payload=${payload}`;
            //window.location.href = `terrastation://wallet_connect_confirm?id=${id}&handshakeTopic=${
            //  connector.handshakeTopic
            //}&params=${JSON.stringify([serializedTxOptions])}`;
        }
        return connector
            .sendCustomRequest({
            id,
            method: 'post',
            params: [serializedTxOptions],
        })
            .catch((error) => {
            let throwError = error;
            try {
                const { code, txhash, message, raw_message } = JSON.parse(error.message);
                switch (code) {
                    case 1:
                        throwError = new errors_1.WalletConnectUserDenied();
                        break;
                    case 2:
                        throwError = new errors_1.WalletConnectCreateTxFailed(message);
                        break;
                    case 3:
                        throwError = new errors_1.WalletConnectTxFailed(txhash, message, raw_message);
                        break;
                    case 4:
                        throwError = new errors_1.WalletConnectTimeout(message);
                        break;
                    case 99:
                        throwError = new errors_1.WalletConnectTxUnspecifiedError(message);
                        break;
                }
            }
            catch (_a) {
                throwError = new errors_1.WalletConnectTxUnspecifiedError(error.message);
            }
            throw throwError;
        });
    }
    /**
     * signBytes transaction
     *
     * @param bytes: Buffer
     * @throws { WalletConnectUserDenied }
     * @throws { WalletConnectTimeout }
     * @throws { WalletConnectSignBytesUnspecifiedError }
     */
    function signBytes(bytes) {
        if (!connector || !connector.connected) {
            throw new Error(`WalletConnect is not connected!`);
        }
        const id = Date.now();
        if ((0, browser_check_1.isMobile)()) {
            const payload = btoa(JSON.stringify({
                id,
                handshakeTopic: connector.handshakeTopic,
                method: 'signBytes',
                params: bytes,
            }));
            window.location.href = `terrastation://walletconnect_confirm/?action=walletconnect_confirm&payload=${payload}`;
        }
        return connector
            .sendCustomRequest({
            id,
            method: 'signBytes',
            params: [bytes],
        })
            .catch((error) => {
            let throwError = error;
            try {
                const { code, message } = JSON.parse(error.message);
                switch (code) {
                    case 1:
                        throwError = new errors_1.WalletConnectUserDenied();
                        break;
                    case 4:
                        throwError = new errors_1.WalletConnectTimeout(message);
                        break;
                    case 99:
                        throwError = new errors_1.WalletConnectSignBytesUnspecifiedError(message);
                        break;
                }
            }
            catch (_a) {
                throwError = new errors_1.WalletConnectSignBytesUnspecifiedError(error.message);
            }
            throw throwError;
        });
    }
    // ---------------------------------------------
    // return
    // ---------------------------------------------
    return {
        session,
        getLatestSession,
        post,
        signBytes,
        disconnect,
    };
}
exports.connect = connect;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ubmVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9AdGVycmEtbW9uZXkvd2FsbGV0LWNvbnRyb2xsZXIvbW9kdWxlcy93YWxsZXRjb25uZWN0L2Nvbm5lY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSwrREFBNEM7QUFDNUMscUVBQXVEO0FBS3ZELGdEQUE0QztBQUM1QywrQkFBbUQ7QUFDbkQsNkRBQXFEO0FBQ3JELHFDQU9rQjtBQUNsQiwrRUFBc0Q7QUFDdEQsbUNBQXdEO0FBQ3hELG1DQUlpQjtBQW1DakIsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQUM7QUFFbEQsU0FBZ0Isc0JBQXNCLENBQ3BDLFVBQTBDLEVBQUU7SUFFNUMsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBRXRFLElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFO1FBQ3JDLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztLQUMvQjtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQVZELHdEQVVDO0FBRUQsU0FBZ0IsT0FBTyxDQUNyQixVQUEwQyxFQUFFLEVBQzVDLG1CQUE0QixLQUFLOztJQUVqQyxJQUFJLFNBQVMsR0FBcUIsSUFBSSxDQUFDO0lBRXZDLElBQUksY0FBYyxHQUNoQixJQUFJLHNCQUFlLENBQXVCO1FBQ3hDLE1BQU0sRUFBRSxrQ0FBMEIsQ0FBQyxZQUFZO0tBQ2hELENBQUMsQ0FBQztJQUVMLE1BQU0sV0FBVyxHQUNmLE1BQUEsTUFBQSxPQUFPLENBQUMsYUFBYSwwQ0FBRSxXQUFXLG1DQUFJLElBQUkscUNBQTZCLEVBQUUsQ0FBQztJQUU1RSxNQUFNLGFBQWEsR0FBMEI7UUFDM0MsTUFBTSxFQUFFLGtDQUFrQztRQUMxQyxXQUFXO1FBQ1gsR0FBRyxPQUFP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WUFDbkIsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDO1NBQ2hCLENBQUM7YUFDRCxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNmLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztZQUV2QixJQUFJO2dCQUNGLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FDbEMsS0FBSyxDQUFDLE9BQU8sQ0FDZCxDQUFDO2dCQUVGLFFBQVEsSUFBSSxFQUFFO29CQUNaLEtBQUssQ0FBQzt3QkFDSixVQUFVLEdBQUcsSUFBSSxnQ0FBdUIsRUFBRSxDQUFDO3dCQUMzQyxNQUFNO29CQUNSLEtBQUssQ0FBQzt3QkFDSixVQUFVLEdBQUcsSUFBSSw2QkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDL0MsTUFBTTtvQkFDUixLQUFLLEVBQUU7d0JBQ0wsVUFBVSxHQUFHLElBQUksK0NBQXNDLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ2pFLE1BQU07aUJBQ1Q7YUFDRjtZQUFDLFdBQU07Z0JBQ04sVUFBVSxHQUFHLElBQUksK0NBQXNDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3hFO1lBRUQsTUFBTSxVQUFVLENBQUM7UUFDbkIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsZ0RBQWdEO0lBQ2hELFNBQVM7SUFDVCxnREFBZ0Q7SUFDaEQsT0FBTztRQUNMLE9BQU87UUFDUCxnQkFBZ0I7UUFDaEIsSUFBSTtRQUNKLFNBQVM7UUFDVCxVQUFVO0tBQ1gsQ0FBQztBQUNKLENBQUM7QUE1VEQsMEJBNFRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRXh0ZW5zaW9uT3B0aW9ucyB9IGZyb20gJ0B0ZXJyYS1tb25leS9mZWF0aGVyLmpzJztcbmltcG9ydCBDb25uZWN0b3IgZnJvbSAnQHdhbGxldGNvbm5lY3QvY29yZSc7XG5pbXBvcnQgKiBhcyBjcnlwdG9MaWIgZnJvbSAnQHdhbGxldGNvbm5lY3QvaXNvLWNyeXB0byc7XG5pbXBvcnQge1xuICBJUHVzaFNlcnZlck9wdGlvbnMsXG4gIElXYWxsZXRDb25uZWN0T3B0aW9ucyxcbn0gZnJvbSAnQHdhbGxldGNvbm5lY3QvdHlwZXMnO1xuaW1wb3J0IHsgdXVpZCB9IGZyb20gJ0B3YWxsZXRjb25uZWN0L3V0aWxzJztcbmltcG9ydCB7IEJlaGF2aW9yU3ViamVjdCwgT2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgaXNNb2JpbGUgfSBmcm9tICcuLi8uLi91dGlscy9icm93c2VyLWNoZWNrJztcbmltcG9ydCB7XG4gIFdhbGxldENvbm5lY3RDcmVhdGVUeEZhaWxlZCxcbiAgV2FsbGV0Q29ubmVjdFRpbWVvdXQsXG4gIFdhbGxldENvbm5lY3RUeEZhaWxlZCxcbiAgV2FsbGV0Q29ubmVjdFR4VW5zcGVjaWZpZWRFcnJvcixcbiAgV2FsbGV0Q29ubmVjdFVzZXJEZW5pZWQsXG4gIFdhbGxldENvbm5lY3RTaWduQnl0ZXNVbnNwZWNpZmllZEVycm9yXG59IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCBTb2NrZXRUcmFuc3BvcnQgZnJvbSAnLi9pbXBsL3NvY2tldC10cmFuc3BvcnQnO1xuaW1wb3J0IHsgVGVycmFXYWxsZXRjb25uZWN0UXJjb2RlTW9kYWwgfSBmcm9tICcuL21vZGFsJztcbmltcG9ydCB7XG4gIFdhbGxldENvbm5lY3RTZXNzaW9uLFxuICBXYWxsZXRDb25uZWN0U2Vzc2lvblN0YXR1cyxcbiAgV2FsbGV0Q29ubmVjdFR4UmVzdWx0LFxufSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7XG4gIFdlYkV4dGVuc2lvblNpZ25CeXRlc1BheWxvYWQsXG59IGZyb20gJ0B0ZXJyYS1tb25leS93ZWItZXh0ZW5zaW9uLWludGVyZmFjZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2FsbGV0Q29ubmVjdENvbnRyb2xsZXJPcHRpb25zIHtcbiAgLyoqXG4gICAqIENvbmZpZ3VyYXRpb24gcGFyYW1ldGVyIHRoYXQgYG5ldyBXYWxsZXRDb25uZWN0KGNvbm5lY3Rvck9wdHMpYFxuICAgKlxuICAgKiBAZGVmYXVsdFxuICAgKiBgYGBqc1xuICAgKiB7XG4gICAqICAgYnJpZGdlOiAnaHR0cHM6Ly93YWxsZXRjb25uZWN0LnRlcnJhLmRldi8nLFxuICAgKiAgIHFyY29kZU1vZGFsOiBuZXcgVGVycmFXYWxsZXRjb25uZWN0UXJjb2RlTW9kYWwoKSxcbiAgICogfVxuICAgKiBgYGBcbiAgICovXG4gIGNvbm5lY3Rvck9wdHM/OiBJV2FsbGV0Q29ubmVjdE9wdGlvbnM7XG5cbiAgLyoqXG4gICAqIENvbmZpZ3VyYXRpb24gcGFyYW1ldGVyIHRoYXQgYG5ldyBXYWxsZXRDb25uZWN0KF8sIHB1c2hTZXJ2ZXJPcHRzKWBcbiAgICpcbiAgICogQGRlZmF1bHQgdW5kZWZpbmVkXG4gICAqL1xuICBwdXNoU2VydmVyT3B0cz86IElQdXNoU2VydmVyT3B0aW9ucztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXYWxsZXRDb25uZWN0Q29udHJvbGxlciB7XG4gIHNlc3Npb246ICgpID0+IE9ic2VydmFibGU8V2FsbGV0Q29ubmVjdFNlc3Npb24+O1xuICBnZXRMYXRlc3RTZXNzaW9uOiAoKSA9PiBXYWxsZXRDb25uZWN0U2Vzc2lvbjtcbiAgcG9zdDogKHR4OiBFeHRlbnNpb25PcHRpb25zKSA9PiBQcm9taXNlPFdhbGxldENvbm5lY3RUeFJlc3VsdD47XG4gIHNpZ25CeXRlczogKGJ5dGVzOiBCdWZmZXIpID0+IFByb21pc2U8V2ViRXh0ZW5zaW9uU2lnbkJ5dGVzUGF5bG9hZD47XG4gIGRpc2Nvbm5lY3Q6ICgpID0+IHZvaWQ7XG59XG5cbmNvbnN0IFdBTExFVENPTk5FQ1RfU1RPUkFHRV9LRVkgPSAnd2FsbGV0Y29ubmVjdCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb25uZWN0SWZTZXNzaW9uRXhpc3RzKFxuICBvcHRpb25zOiBXYWxsZXRDb25uZWN0Q29udHJvbGxlck9wdGlvbnMgPSB7fSxcbik6IFdhbGxldENvbm5lY3RDb250cm9sbGVyIHwgbnVsbCB7XG4gIGNvbnN0IHN0b3JlZFNlc3Npb24gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShXQUxMRVRDT05ORUNUX1NUT1JBR0VfS0VZKTtcblxuICBpZiAodHlwZW9mIHN0b3JlZFNlc3Npb24gPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGNvbm5lY3Qob3B0aW9ucywgdHJ1ZSk7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbm5lY3QoXG4gIG9wdGlvbnM6IFdhbGxldENvbm5lY3RDb250cm9sbGVyT3B0aW9ucyA9IHt9LFxuICB1c2VDYWNoZWRTZXNzaW9uOiBib29sZWFuID0gZmFsc2UsXG4pOiBXYWxsZXRDb25uZWN0Q29udHJvbGxlciB7XG4gIGxldCBjb25uZWN0b3I6IENvbm5lY3RvciB8IG51bGwgPSBudWxsO1xuXG4gIGxldCBzZXNzaW9uU3ViamVjdDogQmVoYXZpb3JTdWJqZWN0PFdhbGxldENvbm5lY3RTZXNzaW9uPiA9XG4gICAgbmV3IEJlaGF2aW9yU3ViamVjdDxXYWxsZXRDb25uZWN0U2Vzc2lvbj4oe1xuICAgICAgc3RhdHVzOiBXYWxsZXRDb25uZWN0U2Vzc2lvblN0YXR1cy5ESVNDT05ORUNURUQsXG4gICAgfSk7XG5cbiAgY29uc3QgcXJjb2RlTW9kYWwgPVxuICAgIG9wdGlvbnMuY29ubmVjdG9yT3B0cz8ucXJjb2RlTW9kYWwgPz8gbmV3IFRlcnJhV2FsbGV0Y29ubmVjdFFyY29kZU1vZGFsKCk7XG5cbiAgY29uc3QgY29ubmVjdG9yT3B0czogSVdhbGxldENvbm5lY3RPcHRpb25zID0ge1xuICAgIGJyaWRnZTogJ2h0dHBzOi8vd2FsbGV0Y29ubmVjdC50ZXJyYS5kZXYvJyxcbiAgICBxcmNvZGVNb2RhbCxcbiAgICAuLi5vcHRpb25zLmNvbm5lY3Rvck9wdHMsXG4gIH07XG5cbiAgY29uc3QgcHVzaFNlcnZlck9wdHM6IElQdXNoU2VydmVyT3B0aW9ucyB8IHVuZGVmaW5lZCA9IG9wdGlvbnMucHVzaFNlcnZlck9wdHM7XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIGV2ZW50IGxpc3RlbmVyc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZnVuY3Rpb24gaW5pdEV2ZW50cygpIHtcbiAgICBpZiAoIWNvbm5lY3Rvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBXYWxsZXRDb25uZWN0IGlzIG5vdCBkZWZpbmVkIWApO1xuICAgIH1cblxuICAgIGNvbm5lY3Rvci5vbignc2Vzc2lvbl91cGRhdGUnLCBhc3luYyAoZXJyb3IsIHBheWxvYWQpID0+IHtcbiAgICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG5cbiAgICAgIHNlc3Npb25TdWJqZWN0Lm5leHQoe1xuICAgICAgICBzdGF0dXM6IFdhbGxldENvbm5lY3RTZXNzaW9uU3RhdHVzLkNPTk5FQ1RFRCxcbiAgICAgICAgcGVlck1ldGE6IHBheWxvYWQucGFyYW1zWzBdLFxuICAgICAgICB0ZXJyYUFkZHJlc3M6IHBheWxvYWQucGFyYW1zWzBdLmFjY291bnRzWzBdLFxuICAgICAgICBjaGFpbklkOiBwYXlsb2FkLnBhcmFtc1swXS5jaGFpbklkLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdXQUxMRVRDT05ORUNUIFNFU1NJT04gVVBEQVRFRDonLCBwYXlsb2FkLnBhcmFtc1swXSk7XG4gICAgfSk7XG5cbiAgICBjb25uZWN0b3Iub24oJ2Nvbm5lY3QnLCAoZXJyb3IsIHBheWxvYWQpID0+IHtcbiAgICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG5cbiAgICAgIHNlc3Npb25TdWJqZWN0Lm5leHQoe1xuICAgICAgICBzdGF0dXM6IFdhbGxldENvbm5lY3RTZXNzaW9uU3RhdHVzLkNPTk5FQ1RFRCxcbiAgICAgICAgcGVlck1ldGE6IHBheWxvYWQucGFyYW1zWzBdLFxuICAgICAgICB0ZXJyYUFkZHJlc3M6IHBheWxvYWQucGFyYW1zWzBdLmFjY291bnRzWzBdLFxuICAgICAgICBjaGFpbklkOiBwYXlsb2FkLnBhcmFtc1swXS5jaGFpbklkLFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBjb25uZWN0b3Iub24oJ2Rpc2Nvbm5lY3QnLCAoZXJyb3IsIHBheWxvYWQpID0+IHtcbiAgICAgIGlmIChlcnJvcikgdGhyb3cgZXJyb3I7XG5cbiAgICAgIHNlc3Npb25TdWJqZWN0Lm5leHQoe1xuICAgICAgICBzdGF0dXM6IFdhbGxldENvbm5lY3RTZXNzaW9uU3RhdHVzLkRJU0NPTk5FQ1RFRCxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIGluaXRpYWxpemVcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNvbnN0IGNhY2hlZFNlc3Npb24gPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnd2FsbGV0Y29ubmVjdCcpO1xuXG4gIGlmICh0eXBlb2YgY2FjaGVkU2Vzc2lvbiA9PT0gJ3N0cmluZycgJiYgdXNlQ2FjaGVkU2Vzc2lvbikge1xuICAgIGNvbnN0IGNhY2hlZFNlc3Npb25PYmplY3QgPSBKU09OLnBhcnNlKGNhY2hlZFNlc3Npb24pO1xuICAgIGNvbnN0IGNsaWVudElkID0gY2FjaGVkU2Vzc2lvbk9iamVjdC5jbGllbnRJZDtcbiAgICBjb25zdCBkcmFmdENvbm5lY3RvciA9IG5ldyBDb25uZWN0b3Ioe1xuICAgICAgY29ubmVjdG9yT3B0czoge1xuICAgICAgICAuLi5jb25uZWN0b3JPcHRzLFxuICAgICAgICBzZXNzaW9uOiBKU09OLnBhcnNlKGNhY2hlZFNlc3Npb24pLFxuICAgICAgfSxcbiAgICAgIHB1c2hTZXJ2ZXJPcHRzLFxuICAgICAgY3J5cHRvTGliLFxuICAgICAgdHJhbnNwb3J0OiBuZXcgU29ja2V0VHJhbnNwb3J0KHtcbiAgICAgICAgcHJvdG9jb2w6ICd3YycsXG4gICAgICAgIHZlcnNpb246IDEsXG4gICAgICAgIHVybDogY29ubmVjdG9yT3B0cy5icmlkZ2UhLFxuICAgICAgICBzdWJzY3JpcHRpb25zOiBbY2xpZW50SWRdLFxuICAgICAgfSksXG4gICAgfSk7XG4gICAgZHJhZnRDb25uZWN0b3IuY2xpZW50SWQgPSBjbGllbnRJZDtcblxuICAgIGNvbm5lY3RvciA9IGRyYWZ0Q29ubmVjdG9yO1xuXG4gICAgaW5pdEV2ZW50cygpO1xuXG4gICAgc2Vzc2lvblN1YmplY3QubmV4dCh7XG4gICAgICBzdGF0dXM6IFdhbGxldENvbm5lY3RTZXNzaW9uU3RhdHVzLkNPTk5FQ1RFRCxcbiAgICAgIHBlZXJNZXRhOiBkcmFmdENvbm5lY3Rvci5wZWVyTWV0YSEsXG4gICAgICB0ZXJyYUFkZHJlc3M6IGRyYWZ0Q29ubmVjdG9yLmFjY291bnRzWzBdLFxuICAgICAgY2hhaW5JZDogZHJhZnRDb25uZWN0b3IuY2hhaW5JZCxcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBjbGllbnRJZCA9IHV1aWQoKTtcbiAgICBjb25zdCBkcmFmdENvbm5lY3RvciA9IG5ldyBDb25uZWN0b3Ioe1xuICAgICAgY29ubmVjdG9yT3B0cyxcbiAgICAgIHB1c2hTZXJ2ZXJPcHRzLFxuICAgICAgY3J5cHRvTGliLFxuICAgICAgdHJhbnNwb3J0OiBuZXcgU29ja2V0VHJhbnNwb3J0KHtcbiAgICAgICAgcHJvdG9jb2w6ICd3YycsXG4gICAgICAgIHZlcnNpb246IDEsXG4gICAgICAgIHVybDogY29ubmVjdG9yT3B0cy5icmlkZ2UhLFxuICAgICAgICBzdWJzY3JpcHRpb25zOiBbY2xpZW50SWRdLFxuICAgICAgfSksXG4gICAgfSk7XG4gICAgZHJhZnRDb25uZWN0b3IuY2xpZW50SWQgPSBjbGllbnRJZDtcblxuICAgIGNvbm5lY3RvciA9IGRyYWZ0Q29ubmVjdG9yO1xuXG4gICAgaWYgKCFkcmFmdENvbm5lY3Rvci5jb25uZWN0ZWQpIHtcbiAgICAgIGRyYWZ0Q29ubmVjdG9yLmNyZWF0ZVNlc3Npb24oKS5jYXRjaChjb25zb2xlLmVycm9yKTtcblxuICAgICAgaWYgKHFyY29kZU1vZGFsIGluc3RhbmNlb2YgVGVycmFXYWxsZXRjb25uZWN0UXJjb2RlTW9kYWwpIHtcbiAgICAgICAgcXJjb2RlTW9kYWwuc2V0Q2xvc2VDYWxsYmFjaygoKSA9PiB7XG4gICAgICAgICAgc2Vzc2lvblN1YmplY3QubmV4dCh7XG4gICAgICAgICAgICBzdGF0dXM6IFdhbGxldENvbm5lY3RTZXNzaW9uU3RhdHVzLkRJU0NPTk5FQ1RFRCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGluaXRFdmVudHMoKTtcblxuICAgICAgc2Vzc2lvblN1YmplY3QubmV4dCh7XG4gICAgICAgIHN0YXR1czogV2FsbGV0Q29ubmVjdFNlc3Npb25TdGF0dXMuUkVRVUVTVEVELFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIG1ldGhvZHNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGZ1bmN0aW9uIGRpc2Nvbm5lY3QoKSB7XG4gICAgaWYgKGNvbm5lY3RvciAmJiBjb25uZWN0b3IuY29ubmVjdGVkKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25uZWN0b3Iua2lsbFNlc3Npb24oKTtcbiAgICAgIH0gY2F0Y2gge31cbiAgICB9XG5cbiAgICBzZXNzaW9uU3ViamVjdC5uZXh0KHtcbiAgICAgIHN0YXR1czogV2FsbGV0Q29ubmVjdFNlc3Npb25TdGF0dXMuRElTQ09OTkVDVEVELFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc2Vzc2lvbigpOiBPYnNlcnZhYmxlPFdhbGxldENvbm5lY3RTZXNzaW9uPiB7XG4gICAgcmV0dXJuIHNlc3Npb25TdWJqZWN0LmFzT2JzZXJ2YWJsZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0TGF0ZXN0U2Vzc2lvbigpOiBXYWxsZXRDb25uZWN0U2Vzc2lvbiB7XG4gICAgcmV0dXJuIHNlc3Npb25TdWJqZWN0LmdldFZhbHVlKCk7XG4gIH1cblxuICAvKipcbiAgICogcG9zdCB0cmFuc2FjdGlvblxuICAgKlxuICAgKiBAcGFyYW0gdHggdHJhbnNhY3Rpb24gZGF0YVxuICAgKiBAdGhyb3dzIHsgV2FsbGV0Q29ubmVjdFVzZXJEZW5pZWQgfVxuICAgKiBAdGhyb3dzIHsgV2FsbGV0Q29ubmVjdENyZWF0ZVR4RmFpbGVkIH1cbiAgICogQHRocm93cyB7IFdhbGxldENvbm5lY3RUeEZhaWxlZCB9XG4gICAqIEB0aHJvd3MgeyBXYWxsZXRDb25uZWN0VGltZW91dCB9XG4gICAqIEB0aHJvd3MgeyBXYWxsZXRDb25uZWN0VHhVbnNwZWNpZmllZEVycm9yIH1cbiAgICovXG4gIGZ1bmN0aW9uIHBvc3QodHg6IEV4dGVuc2lvbk9wdGlvbnMpOiBQcm9taXNlPFdhbGxldENvbm5lY3RUeFJlc3VsdD4ge1xuICAgIGlmICghY29ubmVjdG9yIHx8ICFjb25uZWN0b3IuY29ubmVjdGVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFdhbGxldENvbm5lY3QgaXMgbm90IGNvbm5lY3RlZCFgKTtcbiAgICB9XG5cbiAgICBjb25zdCBpZCA9IERhdGUubm93KCk7XG5cbiAgICBjb25zdCBzZXJpYWxpemVkVHhPcHRpb25zID0ge1xuICAgICAgbXNnczogdHgubXNncy5tYXAoKG1zZykgPT4gbXNnLnRvSlNPTigpKSxcbiAgICAgIGZlZTogdHguZmVlPy50b0pTT04oKSxcbiAgICAgIG1lbW86IHR4Lm1lbW8sXG4gICAgICBnYXM6IHR4LmdhcyxcbiAgICAgIGdhc1ByaWNlczogdHguZ2FzUHJpY2VzPy50b1N0cmluZygpLFxuICAgICAgZ2FzQWRqdXN0bWVudDogdHguZ2FzQWRqdXN0bWVudD8udG9TdHJpbmcoKSxcbiAgICAgIC8vYWNjb3VudF9udW1iZXI6IHR4LmFjY291bnRfbnVtYmVyLFxuICAgICAgLy9zZXF1ZW5jZTogdHguc2VxdWVuY2UsXG4gICAgICBmZWVEZW5vbXM6IHR4LmZlZURlbm9tcyxcbiAgICAgIHRpbWVvdXRIZWlnaHQ6IHR4LnRpbWVvdXRIZWlnaHQsXG4gICAgfTtcblxuICAgIGlmIChpc01vYmlsZSgpKSB7XG4gICAgICBjb25zdCBwYXlsb2FkID0gYnRvYShcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIGhhbmRzaGFrZVRvcGljOiBjb25uZWN0b3IuaGFuZHNoYWtlVG9waWMsXG4gICAgICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICAgICAgcGFyYW1zOiBzZXJpYWxpemVkVHhPcHRpb25zLFxuICAgICAgICB9KSxcbiAgICAgICk7XG5cbiAgICAgIC8vIEZJWE1FIGNoYW5nZWQgd2FsbGV0Y29ubmVjdCBjb25maXJtIHNjaGVtYVxuICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgdGVycmFzdGF0aW9uOi8vd2FsbGV0Y29ubmVjdF9jb25maXJtLz9hY3Rpb249d2FsbGV0Y29ubmVjdF9jb25maXJtJnBheWxvYWQ9JHtwYXlsb2FkfWA7XG4gICAgICAvL3dpbmRvdy5sb2NhdGlvbi5ocmVmID0gYHRlcnJhc3RhdGlvbjovL3dhbGxldF9jb25uZWN0X2NvbmZpcm0/aWQ9JHtpZH0maGFuZHNoYWtlVG9waWM9JHtcbiAgICAgIC8vICBjb25uZWN0b3IuaGFuZHNoYWtlVG9waWNcbiAgICAgIC8vfSZwYXJhbXM9JHtKU09OLnN0cmluZ2lmeShbc2VyaWFsaXplZFR4T3B0aW9uc10pfWA7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbm5lY3RvclxuICAgICAgLnNlbmRDdXN0b21SZXF1ZXN0KHtcbiAgICAgICAgaWQsXG4gICAgICAgIG1ldGhvZDogJ3Bvc3QnLFxuICAgICAgICBwYXJhbXM6IFtzZXJpYWxpemVkVHhPcHRpb25zXSxcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgIGxldCB0aHJvd0Vycm9yID0gZXJyb3I7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCB7IGNvZGUsIHR4aGFzaCwgbWVzc2FnZSwgcmF3X21lc3NhZ2UgfSA9IEpTT04ucGFyc2UoXG4gICAgICAgICAgICBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICk7XG4gICAgICAgICAgc3dpdGNoIChjb2RlKSB7XG4gICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgIHRocm93RXJyb3IgPSBuZXcgV2FsbGV0Q29ubmVjdFVzZXJEZW5pZWQoKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgIHRocm93RXJyb3IgPSBuZXcgV2FsbGV0Q29ubmVjdENyZWF0ZVR4RmFpbGVkKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgdGhyb3dFcnJvciA9IG5ldyBXYWxsZXRDb25uZWN0VHhGYWlsZWQoXG4gICAgICAgICAgICAgICAgdHhoYXNoLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgcmF3X21lc3NhZ2UsXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICB0aHJvd0Vycm9yID0gbmV3IFdhbGxldENvbm5lY3RUaW1lb3V0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgOTk6XG4gICAgICAgICAgICAgIHRocm93RXJyb3IgPSBuZXcgV2FsbGV0Q29ubmVjdFR4VW5zcGVjaWZpZWRFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICB0aHJvd0Vycm9yID0gbmV3IFdhbGxldENvbm5lY3RUeFVuc3BlY2lmaWVkRXJyb3IoZXJyb3IubWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyB0aHJvd0Vycm9yO1xuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogc2lnbkJ5dGVzIHRyYW5zYWN0aW9uXG4gICAqXG4gICAqIEBwYXJhbSBieXRlczogQnVmZmVyXG4gICAqIEB0aHJvd3MgeyBXYWxsZXRDb25uZWN0VXNlckRlbmllZCB9XG4gICAqIEB0aHJvd3MgeyBXYWxsZXRDb25uZWN0VGltZW91dCB9XG4gICAqIEB0aHJvd3MgeyBXYWxsZXRDb25uZWN0U2lnbkJ5dGVzVW5zcGVjaWZpZWRFcnJvciB9XG4gICAqL1xuICBmdW5jdGlvbiBzaWduQnl0ZXMoYnl0ZXM6IEJ1ZmZlcik6IFByb21pc2U8V2ViRXh0ZW5zaW9uU2lnbkJ5dGVzUGF5bG9hZD4ge1xuICAgIGlmICghY29ubmVjdG9yIHx8ICFjb25uZWN0b3IuY29ubmVjdGVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFdhbGxldENvbm5lY3QgaXMgbm90IGNvbm5lY3RlZCFgKTtcbiAgICB9XG5cbiAgICBjb25zdCBpZCA9IERhdGUubm93KCk7XG5cbiAgICBpZiAoaXNNb2JpbGUoKSkge1xuICAgICAgY29uc3QgcGF5bG9hZCA9IGJ0b2EoXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBpZCxcbiAgICAgICAgICBoYW5kc2hha2VUb3BpYzogY29ubmVjdG9yLmhhbmRzaGFrZVRvcGljLFxuICAgICAgICAgIG1ldGhvZDogJ3NpZ25CeXRlcycsXG4gICAgICAgICAgcGFyYW1zOiBieXRlcyxcbiAgICAgICAgfSksXG4gICAgICApO1xuXG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGB0ZXJyYXN0YXRpb246Ly93YWxsZXRjb25uZWN0X2NvbmZpcm0vP2FjdGlvbj13YWxsZXRjb25uZWN0X2NvbmZpcm0mcGF5bG9hZD0ke3BheWxvYWR9YDtcbiAgICB9XG5cbiAgICByZXR1cm4gY29ubmVjdG9yXG4gICAgICAuc2VuZEN1c3RvbVJlcXVlc3Qoe1xuICAgICAgICBpZCxcbiAgICAgICAgbWV0aG9kOiAnc2lnbkJ5dGVzJyxcbiAgICAgICAgcGFyYW1zOiBbYnl0ZXNdLFxuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgbGV0IHRocm93RXJyb3IgPSBlcnJvcjtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHsgY29kZSwgbWVzc2FnZSB9ID0gSlNPTi5wYXJzZShcbiAgICAgICAgICAgIGVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIHN3aXRjaCAoY29kZSkge1xuICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICB0aHJvd0Vycm9yID0gbmV3IFdhbGxldENvbm5lY3RVc2VyRGVuaWVkKCk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICB0aHJvd0Vycm9yID0gbmV3IFdhbGxldENvbm5lY3RUaW1lb3V0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgOTk6XG4gICAgICAgICAgICAgIHRocm93RXJyb3IgPSBuZXcgV2FsbGV0Q29ubmVjdFNpZ25CeXRlc1Vuc3BlY2lmaWVkRXJyb3IobWVzc2FnZSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgdGhyb3dFcnJvciA9IG5ldyBXYWxsZXRDb25uZWN0U2lnbkJ5dGVzVW5zcGVjaWZpZWRFcnJvcihlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IHRocm93RXJyb3I7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyByZXR1cm5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHJldHVybiB7XG4gICAgc2Vzc2lvbixcbiAgICBnZXRMYXRlc3RTZXNzaW9uLFxuICAgIHBvc3QsXG4gICAgc2lnbkJ5dGVzLFxuICAgIGRpc2Nvbm5lY3QsXG4gIH07XG59XG4iXX0=