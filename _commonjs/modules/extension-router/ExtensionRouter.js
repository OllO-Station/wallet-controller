"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionRouter = void 0;
const web_extension_interface_1 = require("@terra-money/web-extension-interface");
const rxjs_1 = require("rxjs");
const legacy_extension_1 = require("../legacy-extension");
const modal_1 = require("./modal");
const multiChannel_1 = require("./multiChannel");
const session_1 = require("./session");
const types_1 = require("./types");
class ExtensionRouter {
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
            const extensionInfos = (0, multiChannel_1.getTerraExtensions)();
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
                const select = (_a = this.options.selectExtension) !== null && _a !== void 0 ? _a : modal_1.selectModal;
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
            (0, session_1.clearSession)();
            this._states.next({
                type: types_1.ExtensionRouterStatus.WALLET_NOT_CONNECTED,
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
            if (latestStates.type !== types_1.ExtensionRouterStatus.WALLET_CONNECTED) {
                throw new Error(`[ExtensionRouter] Wallet is not connected`);
            }
            return this._connector.post(address !== null && address !== void 0 ? address : latestStates.wallet.addresses[tx.chainID], tx);
        };
        this.sign = (tx, address) => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            const latestStates = this.getLastStates();
            if (latestStates.type !== types_1.ExtensionRouterStatus.WALLET_CONNECTED) {
                throw new Error(`[ExtensionRouter] Wallet is not connected`);
            }
            return this._connector.sign(address !== null && address !== void 0 ? address : latestStates.wallet.addresses[tx.chainID], tx);
        };
        this.signBytes = (bytes, terraAddress) => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            const latestStates = this.getLastStates();
            if (latestStates.type !== types_1.ExtensionRouterStatus.WALLET_CONNECTED) {
                throw new Error(`[ExtensionRouter] Wallet is not connected`);
            }
            return this._connector.signBytes(bytes);
        };
        this.hasCW20Tokens = (chainID, ...tokenAddrs) => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            else if (this._connector instanceof legacy_extension_1.LegacyExtensionConnector) {
                throw new Error('[ExtensionRouter] Legacy extension does not support hasCW20Tokens() ');
            }
            return this._connector.hasCW20Tokens(chainID, ...tokenAddrs);
        };
        this.addCW20Tokens = (chainID, ...tokenAddrs) => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            else if (this._connector instanceof legacy_extension_1.LegacyExtensionConnector) {
                throw new Error('[ExtensionRouter] Legacy extension does not support addCW20Tokens() ');
            }
            return this._connector.addCW20Tokens(chainID, ...tokenAddrs);
        };
        this.hasNetwork = (network) => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            else if (this._connector instanceof legacy_extension_1.LegacyExtensionConnector) {
                throw new Error('[ExtensionRouter] Legacy extension does not support hasNetwork() ');
            }
            return this._connector.hasNetwork(network);
        };
        this.addNetwork = (network) => {
            if (!this._connector) {
                throw new Error('[ExtensionRouter] No connector');
            }
            else if (this._connector instanceof legacy_extension_1.LegacyExtensionConnector) {
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
                : Promise.resolve(new legacy_extension_1.LegacyExtensionConnector(extensionInfo.identifier));
            connectorPromise.then((connector) => {
                var _a;
                connector.open((_a = this.options.hostWindow) !== null && _a !== void 0 ? _a : window, {
                    next: (nextStates) => {
                        var _a;
                        if (nextStates.type === web_extension_interface_1.WebExtensionStatus.INITIALIZING) {
                            this._states.next({
                                type: types_1.ExtensionRouterStatus.INITIALIZING,
                                network: this.options.defaultNetwork,
                            });
                        }
                        else if (nextStates.type === web_extension_interface_1.WebExtensionStatus.NO_AVAILABLE) {
                            this._states.next({
                                type: types_1.ExtensionRouterStatus.NO_AVAILABLE,
                                network: this.options.defaultNetwork,
                                isConnectorExists: true,
                                isApproved: nextStates.isApproved,
                            });
                        }
                        else if (nextStates.wallets.length === 0) {
                            this._states.next({
                                type: types_1.ExtensionRouterStatus.WALLET_NOT_CONNECTED,
                                network: nextStates.network,
                            });
                        }
                        else {
                            this._states.next({
                                type: types_1.ExtensionRouterStatus.WALLET_CONNECTED,
                                network: nextStates.network,
                                wallet: nextStates.focusedWalletAddress
                                    ? (_a = nextStates.wallets.find((itemWallet) => { var _a; return Object.values(itemWallet.addresses).includes((_a = nextStates.focusedWalletAddress) !== null && _a !== void 0 ? _a : ""); })) !== null && _a !== void 0 ? _a : nextStates.wallets[0]
                                    : nextStates.wallets[0],
                                connectorType: connector instanceof legacy_extension_1.LegacyExtensionConnector
                                    ? types_1.ExtensionRouterConnectorType.LEGACY
                                    : types_1.ExtensionRouterConnectorType.WEB_EXTENSION,
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
                (0, session_1.storeSession)({
                    identifier: extensionInfo.identifier,
                });
            });
        };
        this._states = new rxjs_1.BehaviorSubject({
            type: types_1.ExtensionRouterStatus.INITIALIZING,
            network: options.defaultNetwork,
        });
        this._extensionInfos = (0, multiChannel_1.getTerraExtensions)();
        if (this._extensionInfos.length === 0) {
            this._states.next({
                type: types_1.ExtensionRouterStatus.NO_AVAILABLE,
                network: options.defaultNetwork,
                isConnectorExists: false,
            });
            return;
        }
        // ---------------------------------------------
        // initialize session
        // ---------------------------------------------
        const session = (0, session_1.getStoredSession)();
        if (session) {
            const extensionInfo = this._extensionInfos.find((item) => item.identifier === session.identifier);
            if (extensionInfo) {
                this.createConnector(extensionInfo);
                return;
            }
            else {
                console.warn(`Can't find an extension for the session "${session.identifier}"`);
                (0, session_1.clearSession)();
                this._states.next({
                    type: types_1.ExtensionRouterStatus.WALLET_NOT_CONNECTED,
                    network: options.defaultNetwork,
                });
            }
        }
        else {
            this._states.next({
                type: types_1.ExtensionRouterStatus.WALLET_NOT_CONNECTED,
                network: options.defaultNetwork,
            });
        }
    }
}
exports.ExtensionRouter = ExtensionRouter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXh0ZW5zaW9uUm91dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL0B0ZXJyYS1tb25leS93YWxsZXQtY29udHJvbGxlci9tb2R1bGVzL2V4dGVuc2lvbi1yb3V0ZXIvRXh0ZW5zaW9uUm91dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGtGQVM4QztBQUU5QywrQkFBcUQ7QUFDckQsMERBQStEO0FBQy9ELG1DQUFzQztBQUN0QyxpREFBbUU7QUFDbkUsdUNBQXlFO0FBQ3pFLG1DQUlpQjtBQWtCakIsTUFBYSxlQUFlO0lBTTFCLFlBQTZCLE9BQStCO1FBQS9CLFlBQU8sR0FBUCxPQUFPLENBQXdCO1FBRnBELGVBQVUsR0FBc0MsSUFBSSxDQUFDO1FBb0Q3RCxnREFBZ0Q7UUFDaEQsU0FBUztRQUNULGdEQUFnRDtRQUNoRCxXQUFNLEdBQUcsR0FBRyxFQUFFO1lBQ1osT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3JDLENBQUMsQ0FBQztRQUVGLGtCQUFhLEdBQUcsR0FBRyxFQUFFO1lBQ25CLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNqQyxDQUFDLENBQUM7UUFFRixnREFBZ0Q7UUFDaEQsWUFBWTtRQUNaLGdEQUFnRDtRQUNoRCxZQUFPLEdBQUcsS0FBSyxFQUFFLFVBQW1CLEVBQUUsRUFBRTs7WUFDdEMsTUFBTSxjQUFjLEdBQUcsSUFBQSxpQ0FBa0IsR0FBRSxDQUFDO1lBRTVDLElBQUksY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQy9CLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQzthQUM1RDtZQUVELElBQUksYUFBd0MsQ0FBQztZQUU3QyxJQUFJLFVBQVUsRUFBRTtnQkFDZCxhQUFhLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FDakMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFD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QyxvQkFBb0I7b0JBQ2hELE9BQU8sRUFBRSxPQUFPLENBQUMsY0FBYztpQkFDaEMsQ0FBQyxDQUFDO2FBQ0o7U0FDRjthQUFNO1lBQ0wsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ2hCLElBQUksRUFBRSw2QkFBcUIsQ0FBQyxvQkFBb0I7Z0JBQ2hELE9BQU8sRUFBRSxPQUFPLENBQUMsY0FBYzthQUNoQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7Q0E2UEY7QUFuVEQsMENBbVRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV0d29ya0luZm8gfSBmcm9tICdAdGVycmEtbW9uZXkvd2FsbGV0LXR5cGVzJztcbmltcG9ydCB7XG4gIFRlcnJhV2ViRXh0ZW5zaW9uQ29ubmVjdG9yLFxuICBXZWJFeHRlbnNpb25OZXR3b3JrSW5mbyxcbiAgV2ViRXh0ZW5zaW9uUG9zdFBheWxvYWQsXG4gIFdlYkV4dGVuc2lvblNpZ25CeXRlc1BheWxvYWQsXG4gIFdlYkV4dGVuc2lvblNpZ25QYXlsb2FkLFxuICBXZWJFeHRlbnNpb25TdGF0ZXMsXG4gIFdlYkV4dGVuc2lvblN0YXR1cyxcbiAgV2ViRXh0ZW5zaW9uVHhSZXN1bHQsXG59IGZyb20gJ0B0ZXJyYS1tb25leS93ZWItZXh0ZW5zaW9uLWludGVyZmFjZSc7XG5pbXBvcnQgeyBDcmVhdGVUeE9wdGlvbnMgfSBmcm9tICdAdGVycmEtbW9uZXkvZmVhdGhlci5qcyc7XG5pbXBvcnQgeyBCZWhhdmlvclN1YmplY3QsIFN1YnNjcmliYWJsZSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgTGVnYWN5RXh0ZW5zaW9uQ29ubmVjdG9yIH0gZnJvbSAnLi4vbGVnYWN5LWV4dGVuc2lvbic7XG5pbXBvcnQgeyBzZWxlY3RNb2RhbCB9IGZyb20gJy4vbW9kYWwnO1xuaW1wb3J0IHsgRXh0ZW5zaW9uSW5mbywgZ2V0VGVycmFFeHRlbnNpb25zIH0gZnJvbSAnLi9tdWx0aUNoYW5uZWwnO1xuaW1wb3J0IHsgY2xlYXJTZXNzaW9uLCBnZXRTdG9yZWRTZXNzaW9uLCBzdG9yZVNlc3Npb24gfSBmcm9tICcuL3Nlc3Npb24nO1xuaW1wb3J0IHtcbiAgRXh0ZW5zaW9uUm91dGVyQ29ubmVjdG9yVHlwZSxcbiAgRXh0ZW5zaW9uUm91dGVyU3RhdGVzLFxuICBFeHRlbnNpb25Sb3V0ZXJTdGF0dXMsXG59IGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4dGVuc2lvblJvdXRlck9wdGlvbnMge1xuICBkZWZhdWx0TmV0d29yazogTmV0d29ya0luZm87XG4gIHNlbGVjdEV4dGVuc2lvbj86IChcbiAgICBleHRlbnNpb25JbmZvczogRXh0ZW5zaW9uSW5mb1tdLFxuICApID0+IFByb21pc2U8RXh0ZW5zaW9uSW5mbyB8IG51bGw+O1xuXG4gIGhvc3RXaW5kb3c/OiBXaW5kb3c7XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIGRldmVsb3BtZW50IGZlYXR1cmVzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBkYW5nZXJvdXNseV9fY2hyb21lRXh0ZW5zaW9uQ29tcGF0aWJsZUJyb3dzZXJDaGVjazogKFxuICAgIHVzZXJBZ2VudDogc3RyaW5nLFxuICApID0+IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjbGFzcyBFeHRlbnNpb25Sb3V0ZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IF9zdGF0ZXM6IEJlaGF2aW9yU3ViamVjdDxFeHRlbnNpb25Sb3V0ZXJTdGF0ZXM+O1xuICBwcml2YXRlIHJlYWRvbmx5IF9leHRlbnNpb25JbmZvczogRXh0ZW5zaW9uSW5mb1tdO1xuXG4gIHByaXZhdGUgX2Nvbm5lY3RvcjogVGVycmFXZWJFeHRlbnNpb25Db25uZWN0b3IgfCBudWxsID0gbnVsbDtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IEV4dGVuc2lvblJvdXRlck9wdGlvbnMpIHtcbiAgICB0aGlzLl9zdGF0ZXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PEV4dGVuc2lvblJvdXRlclN0YXRlcz4oe1xuICAgICAgdHlwZTogRXh0ZW5zaW9uUm91dGVyU3RhdHVzLklOSVRJQUxJWklORyxcbiAgICAgIG5ldHdvcms6IG9wdGlvbnMuZGVmYXVsdE5ldHdvcmssXG4gICAgfSk7XG5cbiAgICB0aGlzLl9leHRlbnNpb25JbmZvcyA9IGdldFRlcnJhRXh0ZW5zaW9ucygpO1xuXG4gICAgaWYgKHRoaXMuX2V4dGVuc2lvbkluZm9zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy5fc3RhdGVzLm5leHQoe1xuICAgICAgICB0eXBlOiBFeHRlbnNpb25Sb3V0ZXJTdGF0dXMuTk9fQVZBSUxBQkxFLFxuICAgICAgICBuZXR3b3JrOiBvcHRpb25zLmRlZmF1bHROZXR3b3JrLFxuICAgICAgICBpc0Nvbm5lY3RvckV4aXN0czogZmFsc2UsXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIGluaXRpYWxpemUgc2Vzc2lvblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGNvbnN0IHNlc3Npb24gPSBnZXRTdG9yZWRTZXNzaW9uKCk7XG5cbiAgICBpZiAoc2Vzc2lvbikge1xuICAgICAgY29uc3QgZXh0ZW5zaW9uSW5mbyA9IHRoaXMuX2V4dGVuc2lvbkluZm9zLmZpbmQoXG4gICAgICAgIChpdGVtKSA9PiBpdGVtLmlkZW50aWZpZXIgPT09IHNlc3Npb24uaWRlbnRpZmllcixcbiAgICAgICk7XG5cbiAgICAgIGlmIChleHRlbnNpb25JbmZvKSB7XG4gICAgICAgIHRoaXMuY3JlYXRlQ29ubmVjdG9yKGV4dGVuc2lvbkluZm8pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgYENhbid0IGZpbmQgYW4gZXh0ZW5zaW9uIGZvciB0aGUgc2Vzc2lvbiBcIiR7c2Vzc2lvbi5pZGVudGlmaWVyfVwiYCxcbiAgICAgICAgKTtcbiAgICAgICAgY2xlYXJTZXNzaW9uKCk7XG5cbiAgICAgICAgdGhpcy5fc3RhdGVzLm5leHQoe1xuICAgICAgICAgIHR5cGU6IEV4dGVuc2lvblJvdXRlclN0YXR1cy5XQUxMRVRfTk9UX0NPTk5FQ1RFRCxcbiAgICAgICAgICBuZXR3b3JrOiBvcHRpb25zLmRlZmF1bHROZXR3b3JrLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fc3RhdGVzLm5leHQoe1xuICAgICAgICB0eXBlOiBFeHRlbnNpb25Sb3V0ZXJTdGF0dXMuV0FMTEVUX05PVF9DT05ORUNURUQsXG4gICAgICAgIG5ldHdvcms6IG9wdGlvbnMuZGVmYXVsdE5ldHdvcmssXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gc3RhdGVzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBzdGF0ZXMgPSAoKSA9PiB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlcy5hc09ic2VydmFibGUoKTtcbiAgfTtcblxuICBnZXRMYXN0U3RhdGVzID0gKCkgPT4ge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZXMuZ2V0VmFsdWUoKTtcbiAgfTtcblxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gYmVoYXZpb3JzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjb25uZWN0ID0gYXN5bmMgKGlkZW50aWZpZXI/OiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBleHRlbnNpb25JbmZvcyA9IGdldFRlcnJhRXh0ZW5zaW9ucygpO1xuXG4gICAgaWYgKGV4dGVuc2lvbkluZm9zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBbRXh0ZW5zaW9uUm91dGVyXSBDYW4ndCBmaW5kIGNvbm5lY3RvcnNgKTtcbiAgICB9XG5cbiAgICBsZXQgZXh0ZW5zaW9uSW5mbzogRXh0ZW5zaW9uSW5mbyB8IHVuZGVmaW5lZDtcblxuICAgIGlmIChpZGVudGlmaWVyKSB7XG4gICAgICBleHRlbnNpb25JbmZvID0gZXh0ZW5zaW9uSW5mb3MuZmluZChcbiAgICAgICAgKGl0ZW0pID0+IGl0ZW0uaWRlbnRpZmllciA9PT0gaWRlbnRpZmllcixcbiAgICAgICk7XG4gICAgfSBlbHNlIGlmIChleHRlbnNpb25JbmZvcy5sZW5ndGggPT09IDEpIHtcbiAgICAgIGV4dGVuc2lvbkluZm8gPSBleHRlbnNpb25JbmZvc1swXTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc2VsZWN0ID0gdGhpcy5vcHRpb25zLnNlbGVjdEV4dGVuc2lvbiA/PyBzZWxlY3RNb2RhbDtcbiAgICAgIGNvbnN0IHNlbGVjdGVkRXh0ZW5zaW9uSW5mbyA9IGF3YWl0IHNlbGVjdChleHRlbnNpb25JbmZvcyk7XG5cbiAgICAgIGlmIChzZWxlY3RlZEV4dGVuc2lvbkluZm8pIHtcbiAgICAgICAgZXh0ZW5zaW9uSW5mbyA9IHNlbGVjdGVkRXh0ZW5zaW9uSW5mbztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZXh0ZW5zaW9uSW5mbykge1xuICAgICAgdGhpcy5jcmVhdGVDb25uZWN0b3IoZXh0ZW5zaW9uSW5mbyk7XG4gICAgfVxuICB9O1xuXG4gIGRpc2Nvbm5lY3QgPSAoKSA9PiB7XG4gICAgY2xlYXJTZXNzaW9uKCk7XG5cbiAgICB0aGlzLl9zdGF0ZXMubmV4dCh7XG4gICAgICB0eXBlOiBFeHRlbnNpb25Sb3V0ZXJTdGF0dXMuV0FMTEVUX05PVF9DT05ORUNURUQsXG4gICAgICBuZXR3b3JrOiB0aGlzLm9wdGlvbnMuZGVmYXVsdE5ldHdvcmssXG4gICAgfSk7XG5cbiAgICB0aGlzLl9jb25uZWN0b3I/LmNsb3NlKCk7XG4gICAgdGhpcy5fY29ubmVjdG9yID0gbnVsbDtcbiAgfTtcblxuICByZXF1ZXN0QXBwcm92YWwgPSAoKSA9PiB7XG4gICAgaWYgKCF0aGlzLl9jb25uZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignW0V4dGVuc2lvblJvdXRlcl0gTm8gY29ubmVjdG9yJyk7XG4gICAgfVxuXG4gICAgdGhpcy5fY29ubmVjdG9yLnJlcXVlc3RBcHByb3ZhbCgpO1xuICB9O1xuXG4gIHJlZmV0Y2hTdGF0ZXMgPSAoKSA9PiB7XG4gICAgaWYgKCF0aGlzLl9jb25uZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignW0V4dGVuc2lvblJvdXRlcl0gTm8gY29ubmVjdG9yJyk7XG4gICAgfVxuXG4gICAgdGhpcy5fY29ubmVjdG9yLnJlZmV0Y2hTdGF0ZXMoKTtcbiAgfTtcblxuICBwb3N0ID0gKFxuICAgIHR4OiBDcmVhdGVUeE9wdGlvbnMsXG4gICAgYWRkcmVzcz86IHN0cmluZyxcbiAgKTogU3Vic2NyaWJhYmxlPFdlYkV4dGVuc2lvblR4UmVzdWx0PFdlYkV4dGVuc2lvblBvc3RQYXlsb2FkPj4gPT4ge1xuICAgIGlmICghdGhpcy5fY29ubmVjdG9yKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1tFeHRlbnNpb25Sb3V0ZXJdIE5vIGNvbm5lY3RvcicpO1xuICAgIH1cblxuICAgIGNvbnN0IGxhdGVzdFN0YXRlcyA9IHRoaXMuZ2V0TGFzdFN0YXRlcygpO1xuXG4gICAgaWYgKGxhdGVzdFN0YXRlcy50eXBlICE9PSBFeHRlbnNpb25Sb3V0ZXJTdGF0dXMuV0FMTEVUX0NPTk5FQ1RFRCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBbRXh0ZW5zaW9uUm91dGVyXSBXYWxsZXQgaXMgbm90IGNvbm5lY3RlZGApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9jb25uZWN0b3IucG9zdChcbiAgICAgIGFkZHJlc3MgPz8gbGF0ZXN0U3RhdGVzLndhbGxldC5hZGRyZXNzZXNbdHguY2hhaW5JRF0sXG4gICAgICB0eCxcbiAgICApO1xuICB9O1xuXG4gIHNpZ24gPSAoXG4gICAgdHg6IENyZWF0ZVR4T3B0aW9ucyxcbiAgICBhZGRyZXNzPzogc3RyaW5nLFxuICApOiBTdWJzY3JpYmFibGU8V2ViRXh0ZW5zaW9uVHhSZXN1bHQ8V2ViRXh0ZW5zaW9uU2lnblBheWxvYWQ+PiA9PiB7XG4gICAgaWYgKCF0aGlzLl9jb25uZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignW0V4dGVuc2lvblJvdXRlcl0gTm8gY29ubmVjdG9yJyk7XG4gICAgfVxuXG4gICAgY29uc3QgbGF0ZXN0U3RhdGVzID0gdGhpcy5nZXRMYXN0U3RhdGVzKCk7XG5cbiAgICBpZiAobGF0ZXN0U3RhdGVzLnR5cGUgIT09IEV4dGVuc2lvblJvdXRlclN0YXR1cy5XQUxMRVRfQ09OTkVDVEVEKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFtFeHRlbnNpb25Sb3V0ZXJdIFdhbGxldCBpcyBub3QgY29ubmVjdGVkYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rvci5zaWduKFxuICAgICAgYWRkcmVzcyA/PyBsYXRlc3RTdGF0ZXMud2FsbGV0LmFkZHJlc3Nlc1t0eC5jaGFpbklEXSxcbiAgICAgIHR4LFxuICAgICk7XG4gIH07XG5cbiAgc2lnbkJ5dGVzID0gKFxuICAgIGJ5dGVzOiBCdWZmZXIsXG4gICAgdGVycmFBZGRyZXNzPzogc3RyaW5nLFxuICApOiBTdWJzY3JpYmFibGU8V2ViRXh0ZW5zaW9uVHhSZXN1bHQ8V2ViRXh0ZW5zaW9uU2lnbkJ5dGVzUGF5bG9hZD4+ID0+IHtcbiAgICBpZiAoIXRoaXMuX2Nvbm5lY3Rvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdbRXh0ZW5zaW9uUm91dGVyXSBObyBjb25uZWN0b3InKTtcbiAgICB9XG5cbiAgICBjb25zdCBsYXRlc3RTdGF0ZXMgPSB0aGlzLmdldExhc3RTdGF0ZXMoKTtcblxuICAgIGlmIChsYXRlc3RTdGF0ZXMudHlwZSAhPT0gRXh0ZW5zaW9uUm91dGVyU3RhdHVzLldBTExFVF9DT05ORUNURUQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgW0V4dGVuc2lvblJvdXRlcl0gV2FsbGV0IGlzIG5vdCBjb25uZWN0ZWRgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fY29ubmVjdG9yLnNpZ25CeXRlcyhcbiAgICAgIGJ5dGVzLFxuICAgICk7XG4gIH07XG5cbiAgaGFzQ1cyMFRva2VucyA9IChcbiAgICBjaGFpbklEOiBzdHJpbmcsXG4gICAgLi4udG9rZW5BZGRyczogc3RyaW5nW11cbiAgKTogUHJvbWlzZTx7IFt0b2tlbkFkZHI6IHN0cmluZ106IGJvb2xlYW4gfT4gPT4ge1xuICAgIGlmICghdGhpcy5fY29ubmVjdG9yKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1tFeHRlbnNpb25Sb3V0ZXJdIE5vIGNvbm5lY3RvcicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5fY29ubmVjdG9yIGluc3RhbmNlb2YgTGVnYWN5RXh0ZW5zaW9uQ29ubmVjdG9yKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdbRXh0ZW5zaW9uUm91dGVyXSBMZWdhY3kgZXh0ZW5zaW9uIGRvZXMgbm90IHN1cHBvcnQgaGFzQ1cyMFRva2VucygpICcsXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9jb25uZWN0b3IuaGFzQ1cyMFRva2VucyhjaGFpbklELCAuLi50b2tlbkFkZHJzKTtcbiAgfTtcblxuICBhZGRDVzIwVG9rZW5zID0gKFxuICAgIGNoYWluSUQ6IHN0cmluZyxcbiAgICAuLi50b2tlbkFkZHJzOiBzdHJpbmdbXVxuICApOiBQcm9taXNlPHsgW3Rva2VuQWRkcjogc3RyaW5nXTogYm9vbGVhbiB9PiA9PiB7XG4gICAgaWYgKCF0aGlzLl9jb25uZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignW0V4dGVuc2lvblJvdXRlcl0gTm8gY29ubmVjdG9yJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9jb25uZWN0b3IgaW5zdGFuY2VvZiBMZWdhY3lFeHRlbnNpb25Db25uZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1tFeHRlbnNpb25Sb3V0ZXJdIExlZ2FjeSBleHRlbnNpb24gZG9lcyBub3Qgc3VwcG9ydCBhZGRDVzIwVG9rZW5zKCkgJyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rvci5hZGRDVzIwVG9rZW5zKGNoYWluSUQsIC4uLnRva2VuQWRkcnMpO1xuICB9O1xuXG4gIGhhc05ldHdvcmsgPSAoXG4gICAgbmV0d29yazogT21pdDxXZWJFeHRlbnNpb25OZXR3b3JrSW5mbywgJ25hbWUnPixcbiAgKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgaWYgKCF0aGlzLl9jb25uZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignW0V4dGVuc2lvblJvdXRlcl0gTm8gY29ubmVjdG9yJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9jb25uZWN0b3IgaW5zdGFuY2VvZiBMZWdhY3lFeHRlbnNpb25Db25uZWN0b3IpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ1tFeHRlbnNpb25Sb3V0ZXJdIExlZ2FjeSBleHRlbnNpb24gZG9lcyBub3Qgc3VwcG9ydCBoYXNOZXR3b3JrKCkgJyxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rvci5oYXNOZXR3b3JrKG5ldHdvcmspO1xuICB9O1xuXG4gIGFkZE5ldHdvcmsgPSAobmV0d29yazogV2ViRXh0ZW5zaW9uTmV0d29ya0luZm8pOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBpZiAoIXRoaXMuX2Nvbm5lY3Rvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdbRXh0ZW5zaW9uUm91dGVyXSBObyBjb25uZWN0b3InKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuX2Nvbm5lY3RvciBpbnN0YW5jZW9mIExlZ2FjeUV4dGVuc2lvbkNvbm5lY3Rvcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnW0V4dGVuc2lvblJvdXRlcl0gTGVnYWN5IGV4dGVuc2lvbiBkb2VzIG5vdCBzdXBwb3J0IGFkZE5ldHdvcmsoKSAnLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fY29ubmVjdG9yLmFkZE5ldHdvcmsobmV0d29yayk7XG4gIH07XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIGludGVybmFsXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwcml2YXRlIGNyZWF0ZUNvbm5lY3RvciA9IChleHRlbnNpb25JbmZvOiBFeHRlbnNpb25JbmZvKSA9PiB7XG4gICAgdGhpcy5fY29ubmVjdG9yPy5jbG9zZSgpO1xuXG4gICAgY29uc3QgY29ubmVjdG9yUHJvbWlzZTogUHJvbWlzZTxUZXJyYVdlYkV4dGVuc2lvbkNvbm5lY3Rvcj4gPVxuICAgICAgZXh0ZW5zaW9uSW5mby5jb25uZWN0b3JcbiAgICAgICAgPyBQcm9taXNlLnJlc29sdmUoZXh0ZW5zaW9uSW5mby5jb25uZWN0b3IoKSlcbiAgICAgICAgOiBQcm9taXNlLnJlc29sdmUoXG4gICAgICAgICAgbmV3IExlZ2FjeUV4dGVuc2lvbkNvbm5lY3RvcihleHRlbnNpb25JbmZvLmlkZW50aWZpZXIpLFxuICAgICAgICApO1xuXG4gICAgY29ubmVjdG9yUHJvbWlzZS50aGVuKChjb25uZWN0b3IpID0+IHtcbiAgICAgIGNvbm5lY3Rvci5vcGVuKHRoaXMub3B0aW9ucy5ob3N0V2luZG93ID8/IHdpbmRvdywge1xuICAgICAgICBuZXh0OiAobmV4dFN0YXRlczogV2ViRXh0ZW5zaW9uU3RhdGVzKSA9PiB7XG4gICAgICAgICAgaWYgKG5leHRTdGF0ZXMudHlwZSA9PT0gV2ViRXh0ZW5zaW9uU3RhdHVzLklOSVRJQUxJWklORykge1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVzLm5leHQoe1xuICAgICAgICAgICAgICB0eXBlOiBFeHRlbnNpb25Sb3V0ZXJTdGF0dXMuSU5JVElBTElaSU5HLFxuICAgICAgICAgICAgICBuZXR3b3JrOiB0aGlzLm9wdGlvbnMuZGVmYXVsdE5ldHdvcmssXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG5leHRTdGF0ZXMudHlwZSA9PT0gV2ViRXh0ZW5zaW9uU3RhdHVzLk5PX0FWQUlMQUJMRSkge1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVzLm5leHQoe1xuICAgICAgICAgICAgICB0eXBlOiBFeHRlbnNpb25Sb3V0ZXJTdGF0dXMuTk9fQVZBSUxBQkxFLFxuICAgICAgICAgICAgICBuZXR3b3JrOiB0aGlzLm9wdGlvbnMuZGVmYXVsdE5ldHdvcmssXG4gICAgICAgICAgICAgIGlzQ29ubmVjdG9yRXhpc3RzOiB0cnVlLFxuICAgICAgICAgICAgICBpc0FwcHJvdmVkOiBuZXh0U3RhdGVzLmlzQXBwcm92ZWQsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG5leHRTdGF0ZXMud2FsbGV0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuX3N0YXRlcy5uZXh0KHtcbiAgICAgICAgICAgICAgdHlwZTogRXh0ZW5zaW9uUm91dGVyU3RhdHVzLldBTExFVF9OT1RfQ09OTkVDVEVELFxuICAgICAgICAgICAgICBuZXR3b3JrOiBuZXh0U3RhdGVzLm5ldHdvcmssXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fc3RhdGVzLm5leHQoe1xuICAgICAgICAgICAgICB0eXBlOiBFeHRlbnNpb25Sb3V0ZXJTdGF0dXMuV0FMTEVUX0NPTk5FQ1RFRCxcbiAgICAgICAgICAgICAgbmV0d29yazogbmV4dFN0YXRlcy5uZXR3b3JrLFxuICAgICAgICAgICAgICB3YWxsZXQ6IG5leHRTdGF0ZXMuZm9jdXNlZFdhbGxldEFkZHJlc3NcbiAgICAgICAgICAgICAgICA/IG5leHRTdGF0ZXMud2FsbGV0cy5maW5kKFxuICAgICAgICAgICAgICAgICAgKGl0ZW1XYWxsZXQpID0+XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC52YWx1ZXMoaXRlbVdhbGxldC5hZGRyZXNzZXMpLmluY2x1ZGVzKG5leHRTdGF0ZXMuZm9jdXNlZFdhbGxldEFkZHJlc3MgPz8gXCJcIilcbiAgICAgICAgICAgICAgICApID8/IG5leHRTdGF0ZXMud2FsbGV0c1swXVxuICAgICAgICAgICAgICAgIDogbmV4dFN0YXRlcy53YWxsZXRzWzBdLFxuICAgICAgICAgICAgICBjb25uZWN0b3JUeXBlOlxuICAgICAgICAgICAgICAgIGNvbm5lY3RvciBpbnN0YW5jZW9mIExlZ2FjeUV4dGVuc2lvbkNvbm5lY3RvclxuICAgICAgICAgICAgICAgICAgPyBFeHRlbnNpb25Sb3V0ZXJDb25uZWN0b3JUeXBlLkxFR0FDWVxuICAgICAgICAgICAgICAgICAgOiBFeHRlbnNpb25Sb3V0ZXJDb25uZWN0b3JUeXBlLldFQl9FWFRFTlNJT04sXG4gICAgICAgICAgICAgIHN1cHBvcnRGZWF0dXJlczogbmV3IFNldChjb25uZWN0b3Iuc3VwcG9ydEZlYXR1cmVzKCkpLFxuICAgICAgICAgICAgICBleHRlbnNpb25JbmZvLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBlcnJvcjogKGVycm9yKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgICAgIH0sXG4gICAgICAgIGNvbXBsZXRlOiAoKSA9PiB7IH0sXG4gICAgICB9KTtcblxuICAgICAgdGhpcy5fY29ubmVjdG9yID0gY29ubmVjdG9yO1xuXG4gICAgICBzdG9yZVNlc3Npb24oe1xuICAgICAgICBpZGVudGlmaWVyOiBleHRlbnNpb25JbmZvLmlkZW50aWZpZXIsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcbn1cbiJdfQ==