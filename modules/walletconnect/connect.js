import Connector from '@walletconnect/core';
import * as cryptoLib from '@walletconnect/iso-crypto';
import { uuid } from '@walletconnect/utils';
import { BehaviorSubject } from 'rxjs';
import { isMobile } from '../../utils/browser-check';
import { WalletConnectCreateTxFailed, WalletConnectTimeout, WalletConnectTxFailed, WalletConnectTxUnspecifiedError, WalletConnectUserDenied, WalletConnectSignBytesUnspecifiedError } from './errors';
import SocketTransport from './impl/socket-transport';
import { TerraWalletconnectQrcodeModal } from './modal';
import { WalletConnectSessionStatus, } from './types';
const WALLETCONNECT_STORAGE_KEY = 'walletconnect';
export function connectIfSessionExists(options = {}) {
    const storedSession = localStorage.getItem(WALLETCONNECT_STORAGE_KEY);
    if (typeof storedSession === 'string') {
        return connect(options, true);
    }
    return null;
}
export function connect(options = {}, useCachedSession = false) {
    var _a, _b;
    let connector = null;
    let sessionSubject = new BehaviorSubject({
        status: WalletConnectSessionStatus.DISCONNECTED,
    });
    const qrcodeModal = (_b = (_a = options.connectorOpts) === null || _a === void 0 ? void 0 : _a.qrcodeModal) !== null && _b !== void 0 ? _b : new TerraWalletconnectQrcodeModal();
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
                status: WalletConnectSessionStatus.CONNECTED,
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
                status: WalletConnectSessionStatus.CONNECTED,
                peerMeta: payload.params[0],
                terraAddress: payload.params[0].accounts[0],
                chainId: payload.params[0].chainId,
            });
        });
        connector.on('disconnect', (error, payload) => {
            if (error)
                throw error;
            sessionSubject.next({
                status: WalletConnectSessionStatus.DISCONNECTED,
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
        const draftConnector = new Connector({
            connectorOpts: {
                ...connectorOpts,
                session: JSON.parse(cachedSession),
            },
            pushServerOpts,
            cryptoLib,
            transport: new SocketTransport({
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
            status: WalletConnectSessionStatus.CONNECTED,
            peerMeta: draftConnector.peerMeta,
            terraAddress: draftConnector.accounts[0],
            chainId: draftConnector.chainId,
        });
    }
    else {
        const clientId = uuid();
        const draftConnector = new Connector({
            connectorOpts,
            pushServerOpts,
            cryptoLib,
            transport: new SocketTransport({
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
            if (qrcodeModal instanceof TerraWalletconnectQrcodeModal) {
                qrcodeModal.setCloseCallback(() => {
                    sessionSubject.next({
                        status: WalletConnectSessionStatus.DISCONNECTED,
                    });
                });
            }
            initEvents();
            sessionSubject.next({
                status: WalletConnectSessionStatus.REQUESTED,
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
            status: WalletConnectSessionStatus.DISCONNECTED,
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
        if (isMobile()) {
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
                        throwError = new WalletConnectUserDenied();
                        break;
                    case 2:
                        throwError = new WalletConnectCreateTxFailed(message);
                        break;
                    case 3:
                        throwError = new WalletConnectTxFailed(txhash, message, raw_message);
                        break;
                    case 4:
                        throwError = new WalletConnectTimeout(message);
                        break;
                    case 99:
                        throwError = new WalletConnectTxUnspecifiedError(message);
                        break;
                }
            }
            catch (_a) {
                throwError = new WalletConnectTxUnspecifiedError(error.message);
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
        if (isMobile()) {
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
                        throwError = new WalletConnectUserDenied();
                        break;
                    case 4:
                        throwError = new WalletConnectTimeout(message);
                        break;
                    case 99:
                        throwError = new WalletConnectSignBytesUnspecifiedError(message);
                        break;
                }
            }
            catch (_a) {
                throwError = new WalletConnectSignBytesUnspecifiedError(error.message);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ubmVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9AdGVycmEtbW9uZXkvd2FsbGV0LWNvbnRyb2xsZXIvbW9kdWxlcy93YWxsZXRjb25uZWN0L2Nvbm5lY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxTQUFTLE1BQU0scUJBQXFCLENBQUM7QUFDNUMsT0FBTyxLQUFLLFNBQVMsTUFBTSwyQkFBMkIsQ0FBQztBQUt2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDNUMsT0FBTyxFQUFFLGVBQWUsRUFBYyxNQUFNLE1BQU0sQ0FBQztBQUNuRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDckQsT0FBTyxFQUNMLDJCQUEyQixFQUMzQixvQkFBb0IsRUFDcEIscUJBQXFCLEVBQ3JCLCtCQUErQixFQUMvQix1QkFBdUIsRUFDdkIsc0NBQXNDLEVBQ3ZDLE1BQU0sVUFBVSxDQUFDO0FBQ2xCLE9BQU8sZUFBZSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RELE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUN4RCxPQUFPLEVBRUwsMEJBQTBCLEdBRTNCLE1BQU0sU0FBUyxDQUFDO0FBbUNqQixNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FBQztBQUVsRCxNQUFNLFVBQVUsc0JBQXNCLENBQ3BDLFVBQTBDLEVBQUU7SUFFNUMsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBRXRFLElBQUksT0FBTyxhQUFhLEtBQUssUUFBUSxFQUFFO1FBQ3JDLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztLQUMvQjtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVELE1BQU0sVUFBVSxPQUFPLENBQ3JCLFVBQTBDLEVBQUUsRUFDNUMsbUJBQTRCLEtBQUs7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Z0I7UUFDaEIsSUFBSTtRQUNKLFNBQVM7UUFDVCxVQUFVO0tBQ1gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFeHRlbnNpb25PcHRpb25zIH0gZnJvbSAnQHRlcnJhLW1vbmV5L2ZlYXRoZXIuanMnO1xuaW1wb3J0IENvbm5lY3RvciBmcm9tICdAd2FsbGV0Y29ubmVjdC9jb3JlJztcbmltcG9ydCAqIGFzIGNyeXB0b0xpYiBmcm9tICdAd2FsbGV0Y29ubmVjdC9pc28tY3J5cHRvJztcbmltcG9ydCB7XG4gIElQdXNoU2VydmVyT3B0aW9ucyxcbiAgSVdhbGxldENvbm5lY3RPcHRpb25zLFxufSBmcm9tICdAd2FsbGV0Y29ubmVjdC90eXBlcyc7XG5pbXBvcnQgeyB1dWlkIH0gZnJvbSAnQHdhbGxldGNvbm5lY3QvdXRpbHMnO1xuaW1wb3J0IHsgQmVoYXZpb3JTdWJqZWN0LCBPYnNlcnZhYmxlIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBpc01vYmlsZSB9IGZyb20gJy4uLy4uL3V0aWxzL2Jyb3dzZXItY2hlY2snO1xuaW1wb3J0IHtcbiAgV2FsbGV0Q29ubmVjdENyZWF0ZVR4RmFpbGVkLFxuICBXYWxsZXRDb25uZWN0VGltZW91dCxcbiAgV2FsbGV0Q29ubmVjdFR4RmFpbGVkLFxuICBXYWxsZXRDb25uZWN0VHhVbnNwZWNpZmllZEVycm9yLFxuICBXYWxsZXRDb25uZWN0VXNlckRlbmllZCxcbiAgV2FsbGV0Q29ubmVjdFNpZ25CeXRlc1Vuc3BlY2lmaWVkRXJyb3Jcbn0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IFNvY2tldFRyYW5zcG9ydCBmcm9tICcuL2ltcGwvc29ja2V0LXRyYW5zcG9ydCc7XG5pbXBvcnQgeyBUZXJyYVdhbGxldGNvbm5lY3RRcmNvZGVNb2RhbCB9IGZyb20gJy4vbW9kYWwnO1xuaW1wb3J0IHtcbiAgV2FsbGV0Q29ubmVjdFNlc3Npb24sXG4gIFdhbGxldENvbm5lY3RTZXNzaW9uU3RhdHVzLFxuICBXYWxsZXRDb25uZWN0VHhSZXN1bHQsXG59IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtcbiAgV2ViRXh0ZW5zaW9uU2lnbkJ5dGVzUGF5bG9hZCxcbn0gZnJvbSAnQHRlcnJhLW1vbmV5L3dlYi1leHRlbnNpb24taW50ZXJmYWNlJztcblxuZXhwb3J0IGludGVyZmFjZSBXYWxsZXRDb25uZWN0Q29udHJvbGxlck9wdGlvbnMge1xuICAvKipcbiAgICogQ29uZmlndXJhdGlvbiBwYXJhbWV0ZXIgdGhhdCBgbmV3IFdhbGxldENvbm5lY3QoY29ubmVjdG9yT3B0cylgXG4gICAqXG4gICAqIEBkZWZhdWx0XG4gICAqIGBgYGpzXG4gICAqIHtcbiAgICogICBicmlkZ2U6ICdodHRwczovL3dhbGxldGNvbm5lY3QudGVycmEuZGV2LycsXG4gICAqICAgcXJjb2RlTW9kYWw6IG5ldyBUZXJyYVdhbGxldGNvbm5lY3RRcmNvZGVNb2RhbCgpLFxuICAgKiB9XG4gICAqIGBgYFxuICAgKi9cbiAgY29ubmVjdG9yT3B0cz86IElXYWxsZXRDb25uZWN0T3B0aW9ucztcblxuICAvKipcbiAgICogQ29uZmlndXJhdGlvbiBwYXJhbWV0ZXIgdGhhdCBgbmV3IFdhbGxldENvbm5lY3QoXywgcHVzaFNlcnZlck9wdHMpYFxuICAgKlxuICAgKiBAZGVmYXVsdCB1bmRlZmluZWRcbiAgICovXG4gIHB1c2hTZXJ2ZXJPcHRzPzogSVB1c2hTZXJ2ZXJPcHRpb25zO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdhbGxldENvbm5lY3RDb250cm9sbGVyIHtcbiAgc2Vzc2lvbjogKCkgPT4gT2JzZXJ2YWJsZTxXYWxsZXRDb25uZWN0U2Vzc2lvbj47XG4gIGdldExhdGVzdFNlc3Npb246ICgpID0+IFdhbGxldENvbm5lY3RTZXNzaW9uO1xuICBwb3N0OiAodHg6IEV4dGVuc2lvbk9wdGlvbnMpID0+IFByb21pc2U8V2FsbGV0Q29ubmVjdFR4UmVzdWx0PjtcbiAgc2lnbkJ5dGVzOiAoYnl0ZXM6IEJ1ZmZlcikgPT4gUHJvbWlzZTxXZWJFeHRlbnNpb25TaWduQnl0ZXNQYXlsb2FkPjtcbiAgZGlzY29ubmVjdDogKCkgPT4gdm9pZDtcbn1cblxuY29uc3QgV0FMTEVUQ09OTkVDVF9TVE9SQUdFX0tFWSA9ICd3YWxsZXRjb25uZWN0JztcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbm5lY3RJZlNlc3Npb25FeGlzdHMoXG4gIG9wdGlvbnM6IFdhbGxldENvbm5lY3RDb250cm9sbGVyT3B0aW9ucyA9IHt9LFxuKTogV2FsbGV0Q29ubmVjdENvbnRyb2xsZXIgfCBudWxsIHtcbiAgY29uc3Qgc3RvcmVkU2Vzc2lvbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFdBTExFVENPTk5FQ1RfU1RPUkFHRV9LRVkpO1xuXG4gIGlmICh0eXBlb2Ygc3RvcmVkU2Vzc2lvbiA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gY29ubmVjdChvcHRpb25zLCB0cnVlKTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29ubmVjdChcbiAgb3B0aW9uczogV2FsbGV0Q29ubmVjdENvbnRyb2xsZXJPcHRpb25zID0ge30sXG4gIHVzZUNhY2hlZFNlc3Npb246IGJvb2xlYW4gPSBmYWxzZSxcbik6IFdhbGxldENvbm5lY3RDb250cm9sbGVyIHtcbiAgbGV0IGNvbm5lY3RvcjogQ29ubmVjdG9yIHwgbnVsbCA9IG51bGw7XG5cbiAgbGV0IHNlc3Npb25TdWJqZWN0OiBCZWhhdmlvclN1YmplY3Q8V2FsbGV0Q29ubmVjdFNlc3Npb24+ID1cbiAgICBuZXcgQmVoYXZpb3JTdWJqZWN0PFdhbGxldENvbm5lY3RTZXNzaW9uPih7XG4gICAgICBzdGF0dXM6IFdhbGxldENvbm5lY3RTZXNzaW9uU3RhdHVzLkRJU0NPTk5FQ1RFRCxcbiAgICB9KTtcblxuICBjb25zdCBxcmNvZGVNb2RhbCA9XG4gICAgb3B0aW9ucy5jb25uZWN0b3JPcHRzPy5xcmNvZGVNb2RhbCA/PyBuZXcgVGVycmFXYWxsZXRjb25uZWN0UXJjb2RlTW9kYWwoKTtcblxuICBjb25zdCBjb25uZWN0b3JPcHRzOiBJV2FsbGV0Q29ubmVjdE9wdGlvbnMgPSB7XG4gICAgYnJpZGdlOiAnaHR0cHM6Ly93YWxsZXRjb25uZWN0LnRlcnJhLmRldi8nLFxuICAgIHFyY29kZU1vZGFsLFxuICAgIC4uLm9wdGlvbnMuY29ubmVjdG9yT3B0cyxcbiAgfTtcblxuICBjb25zdCBwdXNoU2VydmVyT3B0czogSVB1c2hTZXJ2ZXJPcHRpb25zIHwgdW5kZWZpbmVkID0gb3B0aW9ucy5wdXNoU2VydmVyT3B0cztcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gZXZlbnQgbGlzdGVuZXJzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBmdW5jdGlvbiBpbml0RXZlbnRzKCkge1xuICAgIGlmICghY29ubmVjdG9yKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFdhbGxldENvbm5lY3QgaXMgbm90IGRlZmluZWQhYCk7XG4gICAgfVxuXG4gICAgY29ubmVjdG9yLm9uKCdzZXNzaW9uX3VwZGF0ZScsIGFzeW5jIChlcnJvciwgcGF5bG9hZCkgPT4ge1xuICAgICAgaWYgKGVycm9yKSB0aHJvdyBlcnJvcjtcblxuICAgICAgc2Vzc2lvblN1YmplY3QubmV4dCh7XG4gICAgICAgIHN0YXR1czogV2FsbGV0Q29ubmVjdFNlc3Npb25TdGF0dXMuQ09OTkVDVEVELFxuICAgICAgICBwZWVyTWV0YTogcGF5bG9hZC5wYXJhbXNbMF0sXG4gICAgICAgIHRlcnJhQWRkcmVzczogcGF5bG9hZC5wYXJhbXNbMF0uYWNjb3VudHNbMF0sXG4gICAgICAgIGNoYWluSWQ6IHBheWxvYWQucGFyYW1zWzBdLmNoYWluSWQsXG4gICAgICB9KTtcblxuICAgICAgY29uc29sZS5sb2coJ1dBTExFVENPTk5FQ1QgU0VTU0lPTiBVUERBVEVEOicsIHBheWxvYWQucGFyYW1zWzBdKTtcbiAgICB9KTtcblxuICAgIGNvbm5lY3Rvci5vbignY29ubmVjdCcsIChlcnJvciwgcGF5bG9hZCkgPT4ge1xuICAgICAgaWYgKGVycm9yKSB0aHJvdyBlcnJvcjtcblxuICAgICAgc2Vzc2lvblN1YmplY3QubmV4dCh7XG4gICAgICAgIHN0YXR1czogV2FsbGV0Q29ubmVjdFNlc3Npb25TdGF0dXMuQ09OTkVDVEVELFxuICAgICAgICBwZWVyTWV0YTogcGF5bG9hZC5wYXJhbXNbMF0sXG4gICAgICAgIHRlcnJhQWRkcmVzczogcGF5bG9hZC5wYXJhbXNbMF0uYWNjb3VudHNbMF0sXG4gICAgICAgIGNoYWluSWQ6IHBheWxvYWQucGFyYW1zWzBdLmNoYWluSWQsXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGNvbm5lY3Rvci5vbignZGlzY29ubmVjdCcsIChlcnJvciwgcGF5bG9hZCkgPT4ge1xuICAgICAgaWYgKGVycm9yKSB0aHJvdyBlcnJvcjtcblxuICAgICAgc2Vzc2lvblN1YmplY3QubmV4dCh7XG4gICAgICAgIHN0YXR1czogV2FsbGV0Q29ubmVjdFNlc3Npb25TdGF0dXMuRElTQ09OTkVDVEVELFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gaW5pdGlhbGl6ZVxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY29uc3QgY2FjaGVkU2Vzc2lvbiA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd3YWxsZXRjb25uZWN0Jyk7XG5cbiAgaWYgKHR5cGVvZiBjYWNoZWRTZXNzaW9uID09PSAnc3RyaW5nJyAmJiB1c2VDYWNoZWRTZXNzaW9uKSB7XG4gICAgY29uc3QgY2FjaGVkU2Vzc2lvbk9iamVjdCA9IEpTT04ucGFyc2UoY2FjaGVkU2Vzc2lvbik7XG4gICAgY29uc3QgY2xpZW50SWQgPSBjYWNoZWRTZXNzaW9uT2JqZWN0LmNsaWVudElkO1xuICAgIGNvbnN0IGRyYWZ0Q29ubmVjdG9yID0gbmV3IENvbm5lY3Rvcih7XG4gICAgICBjb25uZWN0b3JPcHRzOiB7XG4gICAgICAgIC4uLmNvbm5lY3Rvck9wdHMsXG4gICAgICAgIHNlc3Npb246IEpTT04ucGFyc2UoY2FjaGVkU2Vzc2lvbiksXG4gICAgICB9LFxuICAgICAgcHVzaFNlcnZlck9wdHMsXG4gICAgICBjcnlwdG9MaWIsXG4gICAgICB0cmFuc3BvcnQ6IG5ldyBTb2NrZXRUcmFuc3BvcnQoe1xuICAgICAgICBwcm90b2NvbDogJ3djJyxcbiAgICAgICAgdmVyc2lvbjogMSxcbiAgICAgICAgdXJsOiBjb25uZWN0b3JPcHRzLmJyaWRnZSEsXG4gICAgICAgIHN1YnNjcmlwdGlvbnM6IFtjbGllbnRJZF0sXG4gICAgICB9KSxcbiAgICB9KTtcbiAgICBkcmFmdENvbm5lY3Rvci5jbGllbnRJZCA9IGNsaWVudElkO1xuXG4gICAgY29ubmVjdG9yID0gZHJhZnRDb25uZWN0b3I7XG5cbiAgICBpbml0RXZlbnRzKCk7XG5cbiAgICBzZXNzaW9uU3ViamVjdC5uZXh0KHtcbiAgICAgIHN0YXR1czogV2FsbGV0Q29ubmVjdFNlc3Npb25TdGF0dXMuQ09OTkVDVEVELFxuICAgICAgcGVlck1ldGE6IGRyYWZ0Q29ubmVjdG9yLnBlZXJNZXRhISxcbiAgICAgIHRlcnJhQWRkcmVzczogZHJhZnRDb25uZWN0b3IuYWNjb3VudHNbMF0sXG4gICAgICBjaGFpbklkOiBkcmFmdENvbm5lY3Rvci5jaGFpbklkLFxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGNsaWVudElkID0gdXVpZCgpO1xuICAgIGNvbnN0IGRyYWZ0Q29ubmVjdG9yID0gbmV3IENvbm5lY3Rvcih7XG4gICAgICBjb25uZWN0b3JPcHRzLFxuICAgICAgcHVzaFNlcnZlck9wdHMsXG4gICAgICBjcnlwdG9MaWIsXG4gICAgICB0cmFuc3BvcnQ6IG5ldyBTb2NrZXRUcmFuc3BvcnQoe1xuICAgICAgICBwcm90b2NvbDogJ3djJyxcbiAgICAgICAgdmVyc2lvbjogMSxcbiAgICAgICAgdXJsOiBjb25uZWN0b3JPcHRzLmJyaWRnZSEsXG4gICAgICAgIHN1YnNjcmlwdGlvbnM6IFtjbGllbnRJZF0sXG4gICAgICB9KSxcbiAgICB9KTtcbiAgICBkcmFmdENvbm5lY3Rvci5jbGllbnRJZCA9IGNsaWVudElkO1xuXG4gICAgY29ubmVjdG9yID0gZHJhZnRDb25uZWN0b3I7XG5cbiAgICBpZiAoIWRyYWZ0Q29ubmVjdG9yLmNvbm5lY3RlZCkge1xuICAgICAgZHJhZnRDb25uZWN0b3IuY3JlYXRlU2Vzc2lvbigpLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xuXG4gICAgICBpZiAocXJjb2RlTW9kYWwgaW5zdGFuY2VvZiBUZXJyYVdhbGxldGNvbm5lY3RRcmNvZGVNb2RhbCkge1xuICAgICAgICBxcmNvZGVNb2RhbC5zZXRDbG9zZUNhbGxiYWNrKCgpID0+IHtcbiAgICAgICAgICBzZXNzaW9uU3ViamVjdC5uZXh0KHtcbiAgICAgICAgICAgIHN0YXR1czogV2FsbGV0Q29ubmVjdFNlc3Npb25TdGF0dXMuRElTQ09OTkVDVEVELFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaW5pdEV2ZW50cygpO1xuXG4gICAgICBzZXNzaW9uU3ViamVjdC5uZXh0KHtcbiAgICAgICAgc3RhdHVzOiBXYWxsZXRDb25uZWN0U2Vzc2lvblN0YXR1cy5SRVFVRVNURUQsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gbWV0aG9kc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZnVuY3Rpb24gZGlzY29ubmVjdCgpIHtcbiAgICBpZiAoY29ubmVjdG9yICYmIGNvbm5lY3Rvci5jb25uZWN0ZWQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbm5lY3Rvci5raWxsU2Vzc2lvbigpO1xuICAgICAgfSBjYXRjaCB7fVxuICAgIH1cblxuICAgIHNlc3Npb25TdWJqZWN0Lm5leHQoe1xuICAgICAgc3RhdHVzOiBXYWxsZXRDb25uZWN0U2Vzc2lvblN0YXR1cy5ESVNDT05ORUNURUQsXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXNzaW9uKCk6IE9ic2VydmFibGU8V2FsbGV0Q29ubmVjdFNlc3Npb24+IHtcbiAgICByZXR1cm4gc2Vzc2lvblN1YmplY3QuYXNPYnNlcnZhYmxlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRMYXRlc3RTZXNzaW9uKCk6IFdhbGxldENvbm5lY3RTZXNzaW9uIHtcbiAgICByZXR1cm4gc2Vzc2lvblN1YmplY3QuZ2V0VmFsdWUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBwb3N0IHRyYW5zYWN0aW9uXG4gICAqXG4gICAqIEBwYXJhbSB0eCB0cmFuc2FjdGlvbiBkYXRhXG4gICAqIEB0aHJvd3MgeyBXYWxsZXRDb25uZWN0VXNlckRlbmllZCB9XG4gICAqIEB0aHJvd3MgeyBXYWxsZXRDb25uZWN0Q3JlYXRlVHhGYWlsZWQgfVxuICAgKiBAdGhyb3dzIHsgV2FsbGV0Q29ubmVjdFR4RmFpbGVkIH1cbiAgICogQHRocm93cyB7IFdhbGxldENvbm5lY3RUaW1lb3V0IH1cbiAgICogQHRocm93cyB7IFdhbGxldENvbm5lY3RUeFVuc3BlY2lmaWVkRXJyb3IgfVxuICAgKi9cbiAgZnVuY3Rpb24gcG9zdCh0eDogRXh0ZW5zaW9uT3B0aW9ucyk6IFByb21pc2U8V2FsbGV0Q29ubmVjdFR4UmVzdWx0PiB7XG4gICAgaWYgKCFjb25uZWN0b3IgfHwgIWNvbm5lY3Rvci5jb25uZWN0ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgV2FsbGV0Q29ubmVjdCBpcyBub3QgY29ubmVjdGVkIWApO1xuICAgIH1cblxuICAgIGNvbnN0IGlkID0gRGF0ZS5ub3coKTtcblxuICAgIGNvbnN0IHNlcmlhbGl6ZWRUeE9wdGlvbnMgPSB7XG4gICAgICBtc2dzOiB0eC5tc2dzLm1hcCgobXNnKSA9PiBtc2cudG9KU09OKCkpLFxuICAgICAgZmVlOiB0eC5mZWU/LnRvSlNPTigpLFxuICAgICAgbWVtbzogdHgubWVtbyxcbiAgICAgIGdhczogdHguZ2FzLFxuICAgICAgZ2FzUHJpY2VzOiB0eC5nYXNQcmljZXM/LnRvU3RyaW5nKCksXG4gICAgICBnYXNBZGp1c3RtZW50OiB0eC5nYXNBZGp1c3RtZW50Py50b1N0cmluZygpLFxuICAgICAgLy9hY2NvdW50X251bWJlcjogdHguYWNjb3VudF9udW1iZXIsXG4gICAgICAvL3NlcXVlbmNlOiB0eC5zZXF1ZW5jZSxcbiAgICAgIGZlZURlbm9tczogdHguZmVlRGVub21zLFxuICAgICAgdGltZW91dEhlaWdodDogdHgudGltZW91dEhlaWdodCxcbiAgICB9O1xuXG4gICAgaWYgKGlzTW9iaWxlKCkpIHtcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBidG9hKFxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgaWQsXG4gICAgICAgICAgaGFuZHNoYWtlVG9waWM6IGNvbm5lY3Rvci5oYW5kc2hha2VUb3BpYyxcbiAgICAgICAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICAgICAgICBwYXJhbXM6IHNlcmlhbGl6ZWRUeE9wdGlvbnMsXG4gICAgICAgIH0pLFxuICAgICAgKTtcblxuICAgICAgLy8gRklYTUUgY2hhbmdlZCB3YWxsZXRjb25uZWN0IGNvbmZpcm0gc2NoZW1hXG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGB0ZXJyYXN0YXRpb246Ly93YWxsZXRjb25uZWN0X2NvbmZpcm0vP2FjdGlvbj13YWxsZXRjb25uZWN0X2NvbmZpcm0mcGF5bG9hZD0ke3BheWxvYWR9YDtcbiAgICAgIC8vd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgdGVycmFzdGF0aW9uOi8vd2FsbGV0X2Nvbm5lY3RfY29uZmlybT9pZD0ke2lkfSZoYW5kc2hha2VUb3BpYz0ke1xuICAgICAgLy8gIGNvbm5lY3Rvci5oYW5kc2hha2VUb3BpY1xuICAgICAgLy99JnBhcmFtcz0ke0pTT04uc3RyaW5naWZ5KFtzZXJpYWxpemVkVHhPcHRpb25zXSl9YDtcbiAgICB9XG5cbiAgICByZXR1cm4gY29ubmVjdG9yXG4gICAgICAuc2VuZEN1c3RvbVJlcXVlc3Qoe1xuICAgICAgICBpZCxcbiAgICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICAgIHBhcmFtczogW3NlcmlhbGl6ZWRUeE9wdGlvbnNdLFxuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgbGV0IHRocm93RXJyb3IgPSBlcnJvcjtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHsgY29kZSwgdHhoYXNoLCBtZXNzYWdlLCByYXdfbWVzc2FnZSB9ID0gSlNPTi5wYXJzZShcbiAgICAgICAgICAgIGVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBzd2l0Y2ggKGNvZGUpIHtcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgdGhyb3dFcnJvciA9IG5ldyBXYWxsZXRDb25uZWN0VXNlckRlbmllZCgpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgdGhyb3dFcnJvciA9IG5ldyBXYWxsZXRDb25uZWN0Q3JlYXRlVHhGYWlsZWQobWVzc2FnZSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICB0aHJvd0Vycm9yID0gbmV3IFdhbGxldENvbm5lY3RUeEZhaWxlZChcbiAgICAgICAgICAgICAgICB0eGhhc2gsXG4gICAgICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgICAgICByYXdfbWVzc2FnZSxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgIHRocm93RXJyb3IgPSBuZXcgV2FsbGV0Q29ubmVjdFRpbWVvdXQobWVzc2FnZSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA5OTpcbiAgICAgICAgICAgICAgdGhyb3dFcnJvciA9IG5ldyBXYWxsZXRDb25uZWN0VHhVbnNwZWNpZmllZEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIHRocm93RXJyb3IgPSBuZXcgV2FsbGV0Q29ubmVjdFR4VW5zcGVjaWZpZWRFcnJvcihlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IHRocm93RXJyb3I7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzaWduQnl0ZXMgdHJhbnNhY3Rpb25cbiAgICpcbiAgICogQHBhcmFtIGJ5dGVzOiBCdWZmZXJcbiAgICogQHRocm93cyB7IFdhbGxldENvbm5lY3RVc2VyRGVuaWVkIH1cbiAgICogQHRocm93cyB7IFdhbGxldENvbm5lY3RUaW1lb3V0IH1cbiAgICogQHRocm93cyB7IFdhbGxldENvbm5lY3RTaWduQnl0ZXNVbnNwZWNpZmllZEVycm9yIH1cbiAgICovXG4gIGZ1bmN0aW9uIHNpZ25CeXRlcyhieXRlczogQnVmZmVyKTogUHJvbWlzZTxXZWJFeHRlbnNpb25TaWduQnl0ZXNQYXlsb2FkPiB7XG4gICAgaWYgKCFjb25uZWN0b3IgfHwgIWNvbm5lY3Rvci5jb25uZWN0ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgV2FsbGV0Q29ubmVjdCBpcyBub3QgY29ubmVjdGVkIWApO1xuICAgIH1cblxuICAgIGNvbnN0IGlkID0gRGF0ZS5ub3coKTtcblxuICAgIGlmIChpc01vYmlsZSgpKSB7XG4gICAgICBjb25zdCBwYXlsb2FkID0gYnRvYShcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIGhhbmRzaGFrZVRvcGljOiBjb25uZWN0b3IuaGFuZHNoYWtlVG9waWMsXG4gICAgICAgICAgbWV0aG9kOiAnc2lnbkJ5dGVzJyxcbiAgICAgICAgICBwYXJhbXM6IGJ5dGVzLFxuICAgICAgICB9KSxcbiAgICAgICk7XG5cbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYHRlcnJhc3RhdGlvbjovL3dhbGxldGNvbm5lY3RfY29uZmlybS8/YWN0aW9uPXdhbGxldGNvbm5lY3RfY29uZmlybSZwYXlsb2FkPSR7cGF5bG9hZH1gO1xuICAgIH1cblxuICAgIHJldHVybiBjb25uZWN0b3JcbiAgICAgIC5zZW5kQ3VzdG9tUmVxdWVzdCh7XG4gICAgICAgIGlkLFxuICAgICAgICBtZXRob2Q6ICdzaWduQnl0ZXMnLFxuICAgICAgICBwYXJhbXM6IFtieXRlc10sXG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICBsZXQgdGhyb3dFcnJvciA9IGVycm9yO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgeyBjb2RlLCBtZXNzYWdlIH0gPSBKU09OLnBhcnNlKFxuICAgICAgICAgICAgZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICApO1xuXG4gICAgICAgICAgc3dpdGNoIChjb2RlKSB7XG4gICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgIHRocm93RXJyb3IgPSBuZXcgV2FsbGV0Q29ubmVjdFVzZXJEZW5pZWQoKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgIHRocm93RXJyb3IgPSBuZXcgV2FsbGV0Q29ubmVjdFRpbWVvdXQobWVzc2FnZSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA5OTpcbiAgICAgICAgICAgICAgdGhyb3dFcnJvciA9IG5ldyBXYWxsZXRDb25uZWN0U2lnbkJ5dGVzVW5zcGVjaWZpZWRFcnJvcihtZXNzYWdlKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICB0aHJvd0Vycm9yID0gbmV3IFdhbGxldENvbm5lY3RTaWduQnl0ZXNVbnNwZWNpZmllZEVycm9yKGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgdGhyb3dFcnJvcjtcbiAgICAgIH0pO1xuICB9XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIHJldHVyblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcmV0dXJuIHtcbiAgICBzZXNzaW9uLFxuICAgIGdldExhdGVzdFNlc3Npb24sXG4gICAgcG9zdCxcbiAgICBzaWduQnl0ZXMsXG4gICAgZGlzY29ubmVjdCxcbiAgfTtcbn1cbiJdfQ==