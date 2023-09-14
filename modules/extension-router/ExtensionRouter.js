import { WebExtensionStatus, } from '@terra-money/web-extension-interface';
import { BehaviorSubject } from 'rxjs';
import { LegacyExtensionConnector } from '../legacy-extension';
import { selectModal } from './modal';
import { getTerraExtensions } from './multiChannel';
import { clearSession, getStoredSession, storeSession } from './session';
import { ExtensionRouterConnectorType, ExtensionRouterStatus, } from './types';
export class ExtensionRouter {
    constructor(options) {
        this.options = options;
        this._connector = null;
        // ---------------------------------------------
        // states
        // ---------------------------------------------
        this.states = () => {
            return this._states.asObservable();
        };
        this.getLastStates = () => {
            return this._states.getValue();
        };
        // ---------------------------------------------
        // behaviors
        // ---------------------------------------------
        this.connect = async (identifier) => {
            var _a;
            const extensionInfos = getTerraExtensions();
            if (extensionInfos.length === 0) {
                throw new Error(`[ExtensionRouter] Can't find connectors`);
            }
            let extensionInfo;
            if (identifier) {
                extensionInfo = extensionInfos.find((item) => item.identifier === identifier);
            }
            else if (extensionInfos.length === 1) {
                extensionInfo = extensionInfos[0];
            }
            else {
                const select = (_a = this.options.selectExtension) !== null && _a !== void 0 ? _a : selectModal;
                const selectedExtensionInfo = await select(extensionInfos);
                if (selectedExtensionInfo) {
                    extensionInfo = selectedExtensionInfo;
                }
            }
            if (extensionInfo) {
                this.createConnector(extensionInfo);
            }
        };
        this.disconnect = () => {
            var _a;
            clearSession();
            this._states.next({
                type: ExtensionRouterStatus.WALLET_NOT_CONNECTED,
                network: this.options.defaultNetwork,
            });
            (_a = this._connector) === null || _a === void 0 ? void 0 : _a.close();
            this._connector = null;
        };
        this.requestApproval = () => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            this._connector.requestApproval();
        };
        this.refetchStates = () => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            this._connector.refetchStates();
        };
        this.post = (tx, address) => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            const latestStates = this.getLastStates();
            if (latestStates.type !== ExtensionRouterStatus.WALLET_CONNECTED) {
                throw new Error(`[ExtensionRouter] Wallet is not connected`);
            }
            return this._connector.post(address !== null && address !== void 0 ? address : latestStates.wallet.addresses[tx.chainID], tx);
        };
        this.sign = (tx, address) => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            const latestStates = this.getLastStates();
            if (latestStates.type !== ExtensionRouterStatus.WALLET_CONNECTED) {
                throw new Error(`[ExtensionRouter] Wallet is not connected`);
            }
            return this._connector.sign(address !== null && address !== void 0 ? address : latestStates.wallet.addresses[tx.chainID], tx);
        };
        this.signBytes = (bytes, terraAddress) => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            const latestStates = this.getLastStates();
            if (latestStates.type !== ExtensionRouterStatus.WALLET_CONNECTED) {
                throw new Error(`[ExtensionRouter] Wallet is not connected`);
            }
            return this._connector.signBytes(bytes);
        };
        this.hasCW20Tokens = (chainID, ...tokenAddrs) => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            else if (this._connector instanceof LegacyExtensionConnector) {
                throw new Error('[ExtensionRouter] Legacy extension does not support hasCW20Tokens() ');
            }
            return this._connector.hasCW20Tokens(chainID, ...tokenAddrs);
        };
        this.addCW20Tokens = (chainID, ...tokenAddrs) => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            else if (this._connector instanceof LegacyExtensionConnector) {
                throw new Error('[ExtensionRouter] Legacy extension does not support addCW20Tokens() ');
            }
            return this._connector.addCW20Tokens(chainID, ...tokenAddrs);
        };
        this.hasNetwork = (network) => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            else if (this._connector instanceof LegacyExtensionConnector) {
                throw new Error('[ExtensionRouter] Legacy extension does not support hasNetwork() ');
            }
            return this._connector.hasNetwork(network);
        };
        this.addNetwork = (network) => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            else if (this._connector instanceof LegacyExtensionConnector) {
                throw new Error('[ExtensionRouter] Legacy extension does not support addNetwork() ');
            }
            return this._connector.addNetwork(network);
        };
        // ---------------------------------------------
        // internal
        // ---------------------------------------------
        this.createConnector = (extensionInfo) => {
            var _a;
            (_a = this._connector) === null || _a === void 0 ? void 0 : _a.close();
            const connectorPromise = extensionInfo.connector
                ? Promise.resolve(extensionInfo.connector())
                : Promise.resolve(new LegacyExtensionConnector(extensionInfo.identifier));
            connectorPromise.then((connector) => {
                var _a;
                connector.open((_a = this.options.hostWindow) !== null && _a !== void 0 ? _a : window, {
                    next: (nextStates) => {
                        var _a;
                        if (nextStates.type === WebExtensionStatus.INITIALIZING) {
                            this._states.next({
                                type: ExtensionRouterStatus.INITIALIZING,
                                network: this.options.defaultNetwork,
                            });
                        }
                        else if (nextStates.type === WebExtensionStatus.NO_AVAILABLE) {
                            this._states.next({
                                type: ExtensionRouterStatus.NO_AVAILABLE,
                                network: this.options.defaultNetwork,
                                isConnectorExists: true,
                                isApproved: nextStates.isApproved,
                            });
                        }
                        else if (nextStates.wallets.length === 0) {
                            this._states.next({
                                type: ExtensionRouterStatus.WALLET_NOT_CONNECTED,
                                network: nextStates.network,
                            });
                        }
                        else {
                            this._states.next({
                                type: ExtensionRouterStatus.WALLET_CONNECTED,
                                network: nextStates.network,
                                wallet: nextStates.focusedWalletAddress
                                    ? (_a = nextStates.wallets.find((itemWallet) => { var _a; return Object.values(itemWallet.addresses).includes((_a = nextStates.focusedWalletAddress) !== null && _a !== void 0 ? _a : ""); })) !== null && _a !== void 0 ? _a : nextStates.wallets[0]
                                    : nextStates.wallets[0],
                                connectorType: connector instanceof LegacyExtensionConnector
                                    ? ExtensionRouterConnectorType.LEGACY
                                    : ExtensionRouterConnectorType.WEB_EXTENSION,
                                supportFeatures: new Set(connector.supportFeatures()),
                                extensionInfo,
                            });
                        }
                    },
                    error: (error) => {
                        console.error(error);
                    },
                    complete: () => { },
                });
                this._connector = connector;
                storeSession({
                    identifier: extensionInfo.identifier,
                });
            });
        };
        this._states = new BehaviorSubject({
            type: ExtensionRouterStatus.INITIALIZING,
            network: options.defaultNetwork,
        });
        this._extensionInfos = getTerraExtensions();
        if (this._extensionInfos.length === 0) {
            this._states.next({
                type: ExtensionRouterStatus.NO_AVAILABLE,
                network: options.defaultNetwork,
                isConnectorExists: false,
            });
            return;
        }
        // ---------------------------------------------
        // initialize session
        // ---------------------------------------------
        const session = getStoredSession();
        if (session) {
            const extensionInfo = this._extensionInfos.find((item) => item.identifier === session.identifier);
            if (extensionInfo) {
                this.createConnector(extensionInfo);
                return;
            }
            else {
                console.warn(`Can't find an extension for the session "${session.identifier}"`);
                clearSession();
                this._states.next({
                    type: ExtensionRouterStatus.WALLET_NOT_CONNECTED,
                    network: options.defaultNetwork,
                });
            }
        }
        else {
            this._states.next({
                type: ExtensionRouterStatus.WALLET_NOT_CONNECTED,
                network: options.defaultNetwork,
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXh0ZW5zaW9uUm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL0B0ZXJyYS1tb25leS93YWxsZXQtY29udHJvbGxlci9tb2R1bGVzL2V4dGVuc2lvbi1yb3V0ZXIvRXh0ZW5zaW9uUm91dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFPTCxrQkFBa0IsR0FFbkIsTUFBTSxzQ0FBc0MsQ0FBQztBQUU5QyxPQUFPLEVBQUUsZUFBZSxFQUFnQixNQUFNLE1BQU0sQ0FBQztBQUNyRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ3RDLE9BQU8sRUFBaUIsa0JBQWtCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGdCQUFnQixFQUFFLFlBQVksRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUN6RSxPQUFPLEVBQ0wsNEJBQTRCLEVBRTVCLHFCQUFxQixHQUN0QixNQUFNLFNBQVMsQ0FBQztBQWtCakIsTUFBTSxPQUFPLGVBQWU7SUFNMUIsWUFBNkIsT0FBK0I7UUFBL0IsWUFBTyxHQUFQLE9BQU8sQ0FBd0I7UUFGcEQsZUFBVSxHQUFzQyxJQUFJLENBQUM7UUFvRDdELGdEQUFnRDtRQUNoRCxTQUFTO1FBQ1QsZ0RBQWdEO1FBQ2hELFdBQU0sR0FBRyxHQUFHLEVBQUU7WUFDWixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDckMsQ0FBQyxDQUFDO1FBRUYsa0JBQWEsR0FBRyxHQUFHLEVBQUU7WUFDbkIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2pDLENBQUMsQ0FBQztRQUVGLGdEQUFnRDtRQUNoRCxZQUFZO1FBQ1osZ0RBQWdEO1FBQ2hELFlBQU8sR0FBRyxLQUFLLEVBQUUsVUFBbUIs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Z0JBQ2pCLElBQUksQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ3BDLE9BQU87YUFDUjtpQkFBTTtnQkFDTCxPQUFPLENBQUMsSUFBSSxDQUNWLDRDQUE0QyxPQUFPLENBQUMsVUFBVSxHQUFHLENBQ2xFLENBQUM7Z0JBQ0YsWUFBWSxFQUFFLENBQUM7Z0JBRWYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ2hCLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxvQkFBb0I7b0JBQ2hELE9BQU8sRUFBRSxPQUFPLENBQUMsY0FBYztpQkFDaEMsQ0FBQyxDQUFDO2FBQ0o7U0FDRjthQUFNO1lBQ0wsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ2hCLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxvQkFBb0I7Z0JBQ2hELE9BQU8sRUFBRSxPQUFPLENBQUMsY0FBYzthQUNoQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0E2UEYiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXR3b3JrSW5mbyB9IGZyb20gJ0B0ZXJyYS1tb25leS93YWxsZXQtdHlwZXMnO1xuaW1wb3J0IHtcbiAgVGVycmFXZWJFeHRlbnNpb25Db25uZWN0b3IsXG4gIFdlYkV4dGVuc2lvbk5ldHdvcmtJbmZvLFxuICBXZWJFeHRlbnNpb25Qb3N0UGF5bG9hZCxcbiAgV2ViRXh0ZW5zaW9uU2lnbkJ5dGVzUGF5bG9hZCxcbiAgV2ViRXh0ZW5zaW9uU2lnblBheWxvYWQsXG4gIFdlYkV4dGVuc2lvblN0YXRlcyxcbiAgV2ViRXh0ZW5zaW9uU3RhdHVzLFxuICBXZWJFeHRlbnNpb25UeFJlc3VsdCxcbn0gZnJvbSAnQHRlcnJhLW1vbmV5L3dlYi1leHRlbnNpb24taW50ZXJmYWNlJztcbmltcG9ydCB7IENyZWF0ZVR4T3B0aW9ucyB9IGZyb20gJ0B0ZXJyYS1tb25leS9mZWF0aGVyLmpzJztcbmltcG9ydCB7IEJlaGF2aW9yU3ViamVjdCwgU3Vic2NyaWJhYmxlIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBMZWdhY3lFeHRlbnNpb25Db25uZWN0b3IgfSBmcm9tICcuLi9sZWdhY3ktZXh0ZW5zaW9uJztcbmltcG9ydCB7IHNlbGVjdE1vZGFsIH0gZnJvbSAnLi9tb2RhbCc7XG5pbXBvcnQgeyBFeHRlbnNpb25JbmZvLCBnZXRUZXJyYUV4dGVuc2lvbnMgfSBmcm9tICcuL211bHRpQ2hhbm5lbCc7XG5pbXBvcnQgeyBjbGVhclNlc3Npb24sIGdldFN0b3JlZFNlc3Npb24sIHN0b3JlU2Vzc2lvbiB9IGZyb20gJy4vc2Vzc2lvbic7XG5pbXBvcnQge1xuICBFeHRlbnNpb25Sb3V0ZXJDb25uZWN0b3JUeXBlLFxuICBFeHRlbnNpb25Sb3V0ZXJTdGF0ZXMsXG4gIEV4dGVuc2lvblJvdXRlclN0YXR1cyxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXh0ZW5zaW9uUm91dGVyT3B0aW9ucyB7XG4gIGRlZmF1bHROZXR3b3JrOiBOZXR3b3JrSW5mbztcbiAgc2VsZWN0RXh0ZW5zaW9uPzogKFxuICAgIGV4dGVuc2lvbkluZm9zOiBFeHRlbnNpb25JbmZvW10sXG4gICkgPT4gUHJvbWlzZTxFeHRlbnNpb25JbmZvIHwgbnVsbD47XG5cbiAgaG9zdFdpbmRvdz86IFdpbmRvdztcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gZGV2ZWxvcG1lbnQgZmVhdHVyZXNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGRhbmdlcm91c2x5X19jaHJvbWVFeHRlbnNpb25Db21wYXRpYmxlQnJvd3NlckNoZWNrOiAoXG4gICAgdXNlckFnZW50OiBzdHJpbmcsXG4gICkgPT4gYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNsYXNzIEV4dGVuc2lvblJvdXRlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgX3N0YXRlczogQmVoYXZpb3JTdWJqZWN0PEV4dGVuc2lvblJvdXRlclN0YXRlcz47XG4gIHByaXZhdGUgcmVhZG9ubHkgX2V4dGVuc2lvbkluZm9zOiBFeHRlbnNpb25JbmZvW107XG5cbiAgcHJpdmF0ZSBfY29ubmVjdG9yOiBUZXJyYVdlYkV4dGVuc2lvbkNvbm5lY3RvciB8IG51bGwgPSBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgb3B0aW9uczogRXh0ZW5zaW9uUm91dGVyT3B0aW9ucykge1xuICAgIHRoaXMuX3N0YXRlcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8RXh0ZW5zaW9uUm91dGVyU3RhdGVzPih7XG4gICAgICB0eXBlOiBFeHRlbnNpb25Sb3V0ZXJTdGF0dXMuSU5JVElBTElaSU5HLFxuICAgICAgbmV0d29yazogb3B0aW9ucy5kZWZhdWx0TmV0d29yayxcbiAgICB9KTtcblxuICAgIHRoaXMuX2V4dGVuc2lvbkluZm9zID0gZ2V0VGVycmFFeHRlbnNpb25zKCk7XG5cbiAgICBpZiAodGhpcy5fZXh0ZW5zaW9uSW5mb3MubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLl9zdGF0ZXMubmV4dCh7XG4gICAgICAgIHR5cGU6IEV4dGVuc2lvblJvdXRlclN0YXR1cy5OT19BVkFJTEFCTEUsXG4gICAgICAgIG5ldHdvcms6IG9wdGlvbnMuZGVmYXVsdE5ldHdvcmssXG4gICAgICAgIGlzQ29ubmVjdG9yRXhpc3RzOiBmYWxzZSxcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gaW5pdGlhbGl6ZSBzZXNzaW9uXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgY29uc3Qgc2Vzc2lvbiA9IGdldFN0b3JlZFNlc3Npb24oKTtcblxuICAgIGlmIChzZXNzaW9uKSB7XG4gICAgICBjb25zdCBleHRlbnNpb25JbmZvID0gdGhpcy5fZXh0ZW5zaW9uSW5mb3MuZmluZChcbiAgICAgICAgKGl0ZW0pID0+IGl0ZW0uaWRlbnRpZmllciA9PT0gc2Vzc2lvbi5pZGVudGlmaWVyLFxuICAgICAgKTtcblxuICAgICAgaWYgKGV4dGVuc2lvbkluZm8pIHtcbiAgICAgICAgdGhpcy5jcmVhdGVDb25uZWN0b3IoZXh0ZW5zaW9uSW5mbyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICBgQ2FuJ3QgZmluZCBhbiBleHRlbnNpb24gZm9yIHRoZSBzZXNzaW9uIFwiJHtzZXNzaW9uLmlkZW50aWZpZXJ9XCJgLFxuICAgICAgICApO1xuICAgICAgICBjbGVhclNlc3Npb24oKTtcblxuICAgICAgICB0aGlzLl9zdGF0ZXMubmV4dCh7XG4gICAgICAgICAgdHlwZTogRXh0ZW5zaW9uUm91dGVyU3RhdHVzLldBTExFVF9OT1RfQ09OTkVDVEVELFxuICAgICAgICAgIG5ldHdvcms6IG9wdGlvbnMuZGVmYXVsdE5ldHdvcmssXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9zdGF0ZXMubmV4dCh7XG4gICAgICAgIHR5cGU6IEV4dGVuc2lvblJvdXRlclN0YXR1cy5XQUxMRVRfTk9UX0NPTk5FQ1RFRCxcbiAgICAgICAgbmV0d29yazogb3B0aW9ucy5kZWZhdWx0TmV0d29yayxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBzdGF0ZXNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHN0YXRlcyA9ICgpID0+IHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdGVzLmFzT2JzZXJ2YWJsZSgpO1xuICB9O1xuXG4gIGdldExhc3RTdGF0ZXMgPSAoKSA9PiB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlcy5nZXRWYWx1ZSgpO1xuICB9O1xuXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBiZWhhdmlvcnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNvbm5lY3QgPSBhc3luYyAoaWRlbnRpZmllcj86IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IGV4dGVuc2lvbkluZm9zID0gZ2V0VGVycmFFeHRlbnNpb25zKCk7XG5cbiAgICBpZiAoZXh0ZW5zaW9uSW5mb3MubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFtFeHRlbnNpb25Sb3V0ZXJdIENhbid0IGZpbmQgY29ubmVjdG9yc2ApO1xuICAgIH1cblxuICAgIGxldCBleHRlbnNpb25JbmZvOiBFeHRlbnNpb25JbmZvIHwgdW5kZWZpbmVkO1xuXG4gICAgaWYgKGlkZW50aWZpZXIpIHtcbiAgICAgIGV4dGVuc2lvbkluZm8gPSBleHRlbnNpb25JbmZvcy5maW5kKFxuICAgICAgICAoaXRlbSkgPT4gaXRlbS5pZGVudGlmaWVyID09PSBpZGVudGlmaWVyLFxuICAgICAgKTtcbiAgICB9IGVsc2UgaWYgKGV4dGVuc2lvbkluZm9zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgZXh0ZW5zaW9uSW5mbyA9IGV4dGVuc2lvbkluZm9zWzBdO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzZWxlY3QgPSB0aGlzLm9wdGlvbnMuc2VsZWN0RXh0ZW5zaW9uID8/IHNlbGVjdE1vZGFsO1xuICAgICAgY29uc3Qgc2VsZWN0ZWRFeHRlbnNpb25JbmZvID0gYXdhaXQgc2VsZWN0KGV4dGVuc2lvbkluZm9zKTtcblxuICAgICAgaWYgKHNlbGVjdGVkRXh0ZW5zaW9uSW5mbykge1xuICAgICAgICBleHRlbnNpb25JbmZvID0gc2VsZWN0ZWRFeHRlbnNpb25JbmZvO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChleHRlbnNpb25JbmZvKSB7XG4gICAgICB0aGlzLmNyZWF0ZUNvbm5lY3RvcihleHRlbnNpb25JbmZvKTtcbiAgICB9XG4gIH07XG5cbiAgZGlzY29ubmVjdCA9ICgpID0+IHtcbiAgICBjbGVhclNlc3Npb24oKTtcblxuICAgIHRoaXMuX3N0YXRlcy5uZXh0KHtcbiAgICAgIHR5cGU6IEV4dGVuc2lvblJvdXRlclN0YXR1cy5XQUxMRVRfTk9UX0NPTk5FQ1RFRCxcbiAgICAgIG5ldHdvcms6IHRoaXMub3B0aW9ucy5kZWZhdWx0TmV0d29yayxcbiAgICB9KTtcblxuICAgIHRoaXMuX2Nvbm5lY3Rvcj8uY2xvc2UoKTtcbiAgICB0aGlzLl9jb25uZWN0b3IgPSBudWxsO1xuICB9O1xuXG4gIHJlcXVlc3RBcHByb3ZhbCA9ICgpID0+IHtcbiAgICBpZiAoIXRoaXMuX2Nvbm5lY3Rvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdbRXh0ZW5zaW9uUm91dGVyXSBObyBjb25uZWN0b3InKTtcbiAgICB9XG5cbiAgICB0aGlzLl9jb25uZWN0b3IucmVxdWVzdEFwcHJvdmFsKCk7XG4gIH07XG5cbiAgcmVmZXRjaFN0YXRlcyA9ICgpID0+IHtcbiAgICBpZiAoIXRoaXMuX2Nvbm5lY3Rvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdbRXh0ZW5zaW9uUm91dGVyXSBObyBjb25uZWN0b3InKTtcbiAgICB9XG5cbiAgICB0aGlzLl9jb25uZWN0b3IucmVmZXRjaFN0YXRlcygpO1xuICB9O1xuXG4gIHBvc3QgPSAoXG4gICAgdHg6IENyZWF0ZVR4T3B0aW9ucyxcbiAgICBhZGRyZXNzPzogc3RyaW5nLFxuICApOiBTdWJzY3JpYmFibGU8V2ViRXh0ZW5zaW9uVHhSZXN1bHQ8V2ViRXh0ZW5zaW9uUG9zdFBheWxvYWQ+PiA9PiB7XG4gICAgaWYgKCF0aGlzLl9jb25uZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignW0V4dGVuc2lvblJvdXRlcl0gTm8gY29ubmVjdG9yJyk7XG4gICAgfVxuXG4gICAgY29uc3QgbGF0ZXN0U3RhdGVzID0gdGhpcy5nZXRMYXN0U3RhdGVzKCk7XG5cbiAgICBpZiAobGF0ZXN0U3RhdGVzLnR5cGUgIT09IEV4dGVuc2lvblJvdXRlclN0YXR1cy5XQUxMRVRfQ09OTkVDVEVEKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFtFeHRlbnNpb25Sb3V0ZXJdIFdhbGxldCBpcyBub3QgY29ubmVjdGVkYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rvci5wb3N0KFxuICAgICAgYWRkcmVzcyA/PyBsYXRlc3RTdGF0ZXMud2FsbGV0LmFkZHJlc3Nlc1t0eC5jaGFpbklEXSxcbiAgICAgIHR4LFxuICAgICk7XG4gIH07XG5cbiAgc2lnbiA9IChcbiAgICB0eDogQ3JlYXRlVHhPcHRpb25zLFxuICAgIGFkZHJlc3M/OiBzdHJpbmcsXG4gICk6IFN1YnNjcmliYWJsZTxXZWJFeHRlbnNpb25UeFJlc3VsdDxXZWJFeHRlbnNpb25TaWduUGF5bG9hZD4+ID0+IHtcbiAgICBpZiAoIXRoaXMuX2Nvbm5lY3Rvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdbRXh0ZW5zaW9uUm91dGVyXSBObyBjb25uZWN0b3InKTtcbiAgICB9XG5cbiAgICBjb25zdCBsYXRlc3RTdGF0ZXMgPSB0aGlzLmdldExhc3RTdGF0ZXMoKTtcblxuICAgIGlmIChsYXRlc3RTdGF0ZXMudHlwZSAhPT0gRXh0ZW5zaW9uUm91dGVyU3RhdHVzLldBTExFVF9DT05ORUNURUQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgW0V4dGVuc2lvblJvdXRlcl0gV2FsbGV0IGlzIG5vdCBjb25uZWN0ZWRgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fY29ubmVjdG9yLnNpZ24oXG4gICAgICBhZGRyZXNzID8/IGxhdGVzdFN0YXRlcy53YWxsZXQuYWRkcmVzc2VzW3R4LmNoYWluSURdLFxuICAgICAgdHgsXG4gICAgKTtcbiAgfTtcblxuICBzaWduQnl0ZXMgPSAoXG4gICAgYnl0ZXM6IEJ1ZmZlcixcbiAgICB0ZXJyYUFkZHJlc3M/OiBzdHJpbmcsXG4gICk6IFN1YnNjcmliYWJsZTxXZWJFeHRlbnNpb25UeFJlc3VsdDxXZWJFeHRlbnNpb25TaWduQnl0ZXNQYXlsb2FkPj4gPT4ge1xuICAgIGlmICghdGhpcy5fY29ubmVjdG9yKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1tFeHRlbnNpb25Sb3V0ZXJdIE5vIGNvbm5lY3RvcicpO1xuICAgIH1cblxuICAgIGNvbnN0IGxhdGVzdFN0YXRlcyA9IHRoaXMuZ2V0TGFzdFN0YXRlcygpO1xuXG4gICAgaWYgKGxhdGVzdFN0YXRlcy50eXBlICE9PSBFeHRlbnNpb25Sb3V0ZXJTdGF0dXMuV0FMTEVUX0NPTk5FQ1RFRCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBbRXh0ZW5zaW9uUm91dGVyXSBXYWxsZXQgaXMgbm90IGNvbm5lY3RlZGApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9jb25uZWN0b3Iuc2lnbkJ5dGVzKFxuICAgICAgYnl0ZXMsXG4gICAgKTtcbiAgfTtcblxuICBoYXNDVzIwVG9rZW5zID0gKFxuICAgIGNoYWluSUQ6IHN0cmluZyxcbiAgICAuLi50b2tlbkFkZHJzOiBzdHJpbmdbXVxuICApOiBQcm9taXNlPHsgW3Rva2VuQWRkcjogc3RyaW5nXTogYm9vbGVhbiB9PiA9PiB7XG4gICAgaWYgKCF0aGlzLl9jb25uZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignW0V4dGVuc2lvblJvdXRlcl0gTm8gY29ubmVjdG9yJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9jb25uZWN0b3IgaW5zdGFuY2VvZiBMZWdhY3lFeHRlbnNpb25Db25uZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1tFeHRlbnNpb25Sb3V0ZXJdIExlZ2FjeSBleHRlbnNpb24gZG9lcyBub3Qgc3VwcG9ydCBoYXNDVzIwVG9rZW5zKCkgJyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rvci5oYXNDVzIwVG9rZW5zKGNoYWluSUQsIC4uLnRva2VuQWRkcnMpO1xuICB9O1xuXG4gIGFkZENXMjBUb2tlbnMgPSAoXG4gICAgY2hhaW5JRDogc3RyaW5nLFxuICAgIC4uLnRva2VuQWRkcnM6IHN0cmluZ1tdXG4gICk6IFByb21pc2U8eyBbdG9rZW5BZGRyOiBzdHJpbmddOiBib29sZWFuIH0+ID0+IHtcbiAgICBpZiAoIXRoaXMuX2Nvbm5lY3Rvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdbRXh0ZW5zaW9uUm91dGVyXSBObyBjb25uZWN0b3InKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX2Nvbm5lY3RvciBpbnN0YW5jZW9mIExlZ2FjeUV4dGVuc2lvbkNvbm5lY3Rvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnW0V4dGVuc2lvblJvdXRlcl0gTGVnYWN5IGV4dGVuc2lvbiBkb2VzIG5vdCBzdXBwb3J0IGFkZENXMjBUb2tlbnMoKSAnLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fY29ubmVjdG9yLmFkZENXMjBUb2tlbnMoY2hhaW5JRCwgLi4udG9rZW5BZGRycyk7XG4gIH07XG5cbiAgaGFzTmV0d29yayA9IChcbiAgICBuZXR3b3JrOiBPbWl0PFdlYkV4dGVuc2lvbk5ldHdvcmtJbmZvLCAnbmFtZSc+LFxuICApOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBpZiAoIXRoaXMuX2Nvbm5lY3Rvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdbRXh0ZW5zaW9uUm91dGVyXSBObyBjb25uZWN0b3InKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX2Nvbm5lY3RvciBpbnN0YW5jZW9mIExlZ2FjeUV4dGVuc2lvbkNvbm5lY3Rvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnW0V4dGVuc2lvblJvdXRlcl0gTGVnYWN5IGV4dGVuc2lvbiBkb2VzIG5vdCBzdXBwb3J0IGhhc05ldHdvcmsoKSAnLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fY29ubmVjdG9yLmhhc05ldHdvcmsobmV0d29yayk7XG4gIH07XG5cbiAgYWRkTmV0d29yayA9IChuZXR3b3JrOiBXZWJFeHRlbnNpb25OZXR3b3JrSW5mbyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGlmICghdGhpcy5fY29ubmVjdG9yKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1tFeHRlbnNpb25Sb3V0ZXJdIE5vIGNvbm5lY3RvcicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fY29ubmVjdG9yIGluc3RhbmNlb2YgTGVnYWN5RXh0ZW5zaW9uQ29ubmVjdG9yKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdbRXh0ZW5zaW9uUm91dGVyXSBMZWdhY3kgZXh0ZW5zaW9uIGRvZXMgbm90IHN1cHBvcnQgYWRkTmV0d29yaygpICcsXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9jb25uZWN0b3IuYWRkTmV0d29yayhuZXR3b3JrKTtcbiAgfTtcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gaW50ZXJuYWxcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHByaXZhdGUgY3JlYXRlQ29ubmVjdG9yID0gKGV4dGVuc2lvbkluZm86IEV4dGVuc2lvbkluZm8pID0+IHtcbiAgICB0aGlzLl9jb25uZWN0b3I/LmNsb3NlKCk7XG5cbiAgICBjb25zdCBjb25uZWN0b3JQcm9taXNlOiBQcm9taXNlPFRlcnJhV2ViRXh0ZW5zaW9uQ29ubmVjdG9yPiA9XG4gICAgICBleHRlbnNpb25JbmZvLmNvbm5lY3RvclxuICAgICAgICA/IFByb21pc2UucmVzb2x2ZShleHRlbnNpb25JbmZvLmNvbm5lY3RvcigpKVxuICAgICAgICA6IFByb21pc2UucmVzb2x2ZShcbiAgICAgICAgICBuZXcgTGVnYWN5RXh0ZW5zaW9uQ29ubmVjdG9yKGV4dGVuc2lvbkluZm8uaWRlbnRpZmllciksXG4gICAgICAgICk7XG5cbiAgICBjb25uZWN0b3JQcm9taXNlLnRoZW4oKGNvbm5lY3RvcikgPT4ge1xuICAgICAgY29ubmVjdG9yLm9wZW4odGhpcy5vcHRpb25zLmhvc3RXaW5kb3cgPz8gd2luZG93LCB7XG4gICAgICAgIG5leHQ6IChuZXh0U3RhdGVzOiBXZWJFeHRlbnNpb25TdGF0ZXMpID0+IHtcbiAgICAgICAgICBpZiAobmV4dFN0YXRlcy50eXBlID09PSBXZWJFeHRlbnNpb25TdGF0dXMuSU5JVElBTElaSU5HKSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZXMubmV4dCh7XG4gICAgICAgICAgICAgIHR5cGU6IEV4dGVuc2lvblJvdXRlclN0YXR1cy5JTklUSUFMSVpJTkcsXG4gICAgICAgICAgICAgIG5ldHdvcms6IHRoaXMub3B0aW9ucy5kZWZhdWx0TmV0d29yayxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSBpZiAobmV4dFN0YXRlcy50eXBlID09PSBXZWJFeHRlbnNpb25TdGF0dXMuTk9fQVZBSUxBQkxFKSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZXMubmV4dCh7XG4gICAgICAgICAgICAgIHR5cGU6IEV4dGVuc2lvblJvdXRlclN0YXR1cy5OT19BVkFJTEFCTEUsXG4gICAgICAgICAgICAgIG5ldHdvcms6IHRoaXMub3B0aW9ucy5kZWZhdWx0TmV0d29yayxcbiAgICAgICAgICAgICAgaXNDb25uZWN0b3JFeGlzdHM6IHRydWUsXG4gICAgICAgICAgICAgIGlzQXBwcm92ZWQ6IG5leHRTdGF0ZXMuaXNBcHByb3ZlZCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSBpZiAobmV4dFN0YXRlcy53YWxsZXRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVzLm5leHQoe1xuICAgICAgICAgICAgICB0eXBlOiBFeHRlbnNpb25Sb3V0ZXJTdGF0dXMuV0FMTEVUX05PVF9DT05ORUNURUQsXG4gICAgICAgICAgICAgIG5ldHdvcms6IG5leHRTdGF0ZXMubmV0d29yayxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9zdGF0ZXMubmV4dCh7XG4gICAgICAgICAgICAgIHR5cGU6IEV4dGVuc2lvblJvdXRlclN0YXR1cy5XQUxMRVRfQ09OTkVDVEVELFxuICAgICAgICAgICAgICBuZXR3b3JrOiBuZXh0U3RhdGVzLm5ldHdvcmssXG4gICAgICAgICAgICAgIHdhbGxldDogbmV4dFN0YXRlcy5mb2N1c2VkV2FsbGV0QWRkcmVzc1xuICAgICAgICAgICAgICAgID8gbmV4dFN0YXRlcy53YWxsZXRzLmZpbmQoXG4gICAgICAgICAgICAgICAgICAoaXRlbVdhbGxldCkgPT5cbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LnZhbHVlcyhpdGVtV2FsbGV0LmFkZHJlc3NlcykuaW5jbHVkZXMobmV4dFN0YXRlcy5mb2N1c2VkV2FsbGV0QWRkcmVzcyA/PyBcIlwiKVxuICAgICAgICAgICAgICAgICkgPz8gbmV4dFN0YXRlcy53YWxsZXRzWzBdXG4gICAgICAgICAgICAgICAgOiBuZXh0U3RhdGVzLndhbGxldHNbMF0sXG4gICAgICAgICAgICAgIGNvbm5lY3RvclR5cGU6XG4gICAgICAgICAgICAgICAgY29ubmVjdG9yIGluc3RhbmNlb2YgTGVnYWN5RXh0ZW5zaW9uQ29ubmVjdG9yXG4gICAgICAgICAgICAgICAgICA/IEV4dGVuc2lvblJvdXRlckNvbm5lY3RvclR5cGUuTEVHQUNZXG4gICAgICAgICAgICAgICAgICA6IEV4dGVuc2lvblJvdXRlckNvbm5lY3RvclR5cGUuV0VCX0VYVEVOU0lPTixcbiAgICAgICAgICAgICAgc3VwcG9ydEZlYXR1cmVzOiBuZXcgU2V0KGNvbm5lY3Rvci5zdXBwb3J0RmVhdHVyZXMoKSksXG4gICAgICAgICAgICAgIGV4dGVuc2lvbkluZm8sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiAoZXJyb3IpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29tcGxldGU6ICgpID0+IHsgfSxcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9jb25uZWN0b3IgPSBjb25uZWN0b3I7XG5cbiAgICAgIHN0b3JlU2Vzc2lvbih7XG4gICAgICAgIGlkZW50aWZpZXI6IGV4dGVuc2lvbkluZm8uaWRlbnRpZmllcixcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xufVxuIl19