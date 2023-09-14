"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const feather_js_1 = require("@terra-money/feather.js");
const wallet_types_1 = require("@terra-money/wallet-types");
const web_extension_interface_1 = require("@terra-money/web-extension-interface");
const fast_deep_equal_1 = __importDefault(require("fast-deep-equal"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const env_1 = require("./env");
const mapExtensionTxError_1 = require("./exception/mapExtensionTxError");
const mapWalletConnectError_1 = require("./exception/mapWalletConnectError");
const connect_modal_1 = require("./modules/connect-modal");
const extension_router_1 = require("./modules/extension-router");
const multiChannel_1 = require("./modules/extension-router/multiChannel");
const readonly_wallet_1 = require("./modules/readonly-wallet");
const walletconnect_1 = require("./modules/walletconnect");
const getExtensions_1 = require("./operators/getExtensions");
const toConnectedWallet_1 = require("./operators/toConnectedWallet");
const toLcdClient_1 = require("./operators/toLcdClient");
const browser_check_1 = require("./utils/browser-check");
const checkExtensionReady_1 = require("./utils/checkExtensionReady");
const sortConnections_1 = require("./utils/sortConnections");
const CONNECTIONS = {
    [wallet_types_1.ConnectType.READONLY]: {
        type: wallet_types_1.ConnectType.READONLY,
        name: 'View an address',
        icon: 'https://assets.terra.dev/icon/wallet-provider/readonly.svg',
    },
    [wallet_types_1.ConnectType.WALLETCONNECT]: {
        type: wallet_types_1.ConnectType.WALLETCONNECT,
        name: 'Wallet Connect',
        icon: 'https://assets.terra.dev/icon/wallet-provider/walletconnect.svg',
    },
};
const DEFAULT_WAITING_CHROME_EXTENSION_INSTALL_CHECK = 1000 * 3;
const WALLETCONNECT_SUPPORT_FEATURES = new Set([
    'post', 'sign-bytes'
]);
const EMPTY_SUPPORT_FEATURES = new Set();
//noinspection ES6MissingAwait
class WalletController {
    constructor(options) {
        var _a;
        this.options = options;
        this.extension = null;
        this.walletConnect = null;
        this.readonlyWallet = null;
        this.plugin = null;
        this.disableReadonlyWallet = null;
        this.disableExtension = null;
        this.disableWalletConnect = null;
        this.disableWalletPlugin = null;
        /**
         * Some mobile wallet emulates the behavior of chrome extension.
         * It confirms that the current connection environment is such a wallet.
         * (If you are running connect() by checking availableConnectType, you do not need to use this API.)
         *
         * @see Wallet#isChromeExtensionCompatibleBrowser
         */
        this.isChromeExtensionCompatibleBrowser = () => {
            var _a;
            return ((_a = this.options.dangerously__chromeExtensionCompatibleBrowserCheck) !== null && _a !== void 0 ? _a : env_1.DEFAULT_CHROME_EXTENSION_COMPATIBLE_BROWSER_CHECK)(navigator.userAgent);
        };
        /**
         * available connect types on the browser
         *
         * @see Wallet#availableConnectTypes
         */
        this.availableConnectTypes = () => {
            return this._availableConnectTypes.asObservable();
        };
        /**
         * available connections includes identifier, name, icon
         *
         * @see Wallet#availableConnections
         */
        this.availableConnections = () => {
            return this._availableConnectTypes.pipe((0, operators_1.map)((connectTypes) => {
                const connections = [];
                for (const connectType of connectTypes) {
                    if (connectType === wallet_types_1.ConnectType.EXTENSION) {
                        const terraExtensions = (0, multiChannel_1.getTerraExtensions)();
                        for (const terraExtension of terraExtensions) {
                            connections.push(memoConnection(wallet_types_1.ConnectType.EXTENSION, terraExtension.name, terraExtension.icon, terraExtension.identifier));
                        }
                    }
                    else if (connectType === wallet_types_1.ConnectType.PLUGINS) {
                        for (const plugin of this.options.plugins || []) {
                            connections.push(memoConnection(wallet_types_1.ConnectType.PLUGINS, plugin.name, plugin.icon, plugin.identifier));
                        }
                    }
                    else {
                        connections.push(CONNECTIONS[connectType]);
                    }
                }
                return (0, sortConnections_1.sortConnections)(connections);
            }));
        };
        /**
         * available install types on the browser
         *
         * in this time, this only contains [ConnectType.EXTENSION]
         *
         * @see Wallet#availableInstallTypes
         */
        this.availableInstallTypes = () => {
            return this._availableInstallTypes.asObservable();
        };
        /**
         * available installations includes identifier, name, icon, url
         *
         * @see Wallet#availableInstallations
         */
        this.availableInstallations = () => {
            return (0, rxjs_1.combineLatest)([this.availableConnections(), (0, getExtensions_1.getExtensions)()]).pipe((0, operators_1.map)(([connections, extensions]) => {
                const installedIdentifiers = new Set(connections
                    .filter(({ type, identifier }) => {
                    return type === wallet_types_1.ConnectType.EXTENSION && !!identifier;
                })
                    .map(({ identifier }) => {
                    return identifier;
                }));
                return extensions
                    .filter(({ identifier }) => {
                    return !installedIdentifiers.has(identifier);
                })
                    .map(({ name, identifier, icon, url }) => {
                    return {
                        type: wallet_types_1.ConnectType.EXTENSION,
                        identifier,
                        name,
                        icon,
                        url,
                    };
                });
            }));
        };
        /**
         * @see Wallet#status
         * @see Wallet#network
         * @see Wallet#wallets
         */
        this.states = () => {
            return this._states.asObservable();
        };
        /** get connectedWallet */
        this.connectedWallet = () => {
            return this._states.pipe((0, toConnectedWallet_1.toConnectedWallet)(this));
        };
        /** get lcdClient */
        this.lcdClient = (lcdClientConfig) => {
            return this._states.pipe((0, toLcdClient_1.toLcdClient)(lcdClientConfig));
        };
        /**
         * reload the connected wallet states
         *
         * in this time, this only work on the ConnectType.EXTENSION
         *
         * @see Wallet#recheckStatus
         */
        this.refetchStates = () => {
            var _a;
            if (this.disableExtension) {
                (_a = this.extension) === null || _a === void 0 ? void 0 : _a.refetchStates();
            }
        };
        /**
         * @deprecated Please use availableInstallations
         *
         * install for the connect type
         *
         * @see Wallet#install
         */
        this.install = (type) => {
            if (type === wallet_types_1.ConnectType.EXTENSION) {
                // TODO separate install links by browser types
                window.open(env_1.CHROME_EXTENSION_INSTALL_URL, '_blank');
            }
            else {
                console.warn(`[WalletController] ConnectType "${type}" does not support install() function`);
            }
        };
        /**
         * connect to wallet
         *
         * @see Wallet#connect
         */
        this.connect = async (_type, _identifier) => {
            var _a, _b, _c, _d, _e;
            let type;
            let identifier;
            if (!!_type) {
                type = _type;
                identifier = _identifier;
            }
            else {
                const connections = await (0, rxjs_1.firstValueFrom)(this.availableConnections());
                const selector = (_a = this.options.selectConnection) !== null && _a !== void 0 ? _a : connect_modal_1.selectConnection;
                const selected = await selector(connections);
                if (!selected) {
                    return;
                }
                type = selected[0];
                identifier = selected[1];
            }
            let networks;
            switch (type) {
                case wallet_types_1.ConnectType.READONLY:
                    networks = Object.keys(this.options.walletConnectChainIds).map((chainId) => this.options.walletConnectChainIds[+chainId]);
                    const createReadonlyWalletSession = (_d = (_c = (_b = this.options).createReadonlyWalletSession) === null || _c === void 0 ? void 0 : _c.call(_b, networks)) !== null && _d !== void 0 ? _d : (0, readonly_wallet_1.readonlyWalletModal)({ networks });
                    const readonlyWalletSession = await createReadonlyWalletSession;
                    if (readonlyWalletSession) {
                        this.enableReadonlyWallet((0, readonly_wallet_1.connect)(readonlyWalletSession));
                    }
                    break;
                case wallet_types_1.ConnectType.WALLETCONNECT:
                    this.enableWalletConnect((0, walletconnect_1.connect)(this.options));
                    break;
                case wallet_types_1.ConnectType.EXTENSION:
                    if (!this.extension) {
                        throw new Error(`extension instance is not created!`);
                    }
                    this.extension.connect(identifier);
                    this.enableExtension();
                    break;
                case wallet_types_1.ConnectType.PLUGINS:
                    networks = Object.keys(this.options.walletConnectChainIds).map((chainId) => this.options.walletConnectChainIds[+chainId]);
                    if (!this.options.plugins || this.options.plugins.length === 0) {
                        throw new Error(`not plugins found`);
                    }
                    let plugin = (_e = this.options.plugins) === null || _e === void 0 ? void 0 : _e.find((p) => {
                        return p.identifier === identifier;
                    });
                    if (!plugin) {
                        plugin = this.options.plugins[0];
                    }
                    const session = await plugin.createSession(networks);
                    if (!session) {
                        throw new Error(`error getting web3session`);
                    }
                    await session.connect();
                    this.enableWalletPlugin(plugin, session);
                    break;
                default:
                    throw new Error(`Unknown ConnectType!`);
            }
        };
        /**
         * manual connect to read only session
         *
         * @see Wallet#connectReadonly
         */
        this.connectReadonly = (terraAddress, network) => {
            this.enableReadonlyWallet((0, readonly_wallet_1.connect)({
                terraAddress,
                network,
            }));
        };
        /** @see Wallet#disconnect */
        this.disconnect = () => {
            var _a, _b, _c, _d;
            (_a = this.disableReadonlyWallet) === null || _a === void 0 ? void 0 : _a.call(this);
            this.disableReadonlyWallet = null;
            (_b = this.disableExtension) === null || _b === void 0 ? void 0 : _b.call(this);
            this.disableExtension = null;
            (_c = this.disableWalletConnect) === null || _c === void 0 ? void 0 : _c.call(this);
            this.disableWalletConnect = null;
            (_d = this.disableWalletPlugin) === null || _d === void 0 ? void 0 : _d.call(this);
            this.disableWalletPlugin = null;
            this.updateStates(this._notConnected);
        };
        /**
         * @see Wallet#post
         * @param tx
         * @param terraAddress only available new extension
         */
        this.post = async (tx, terraAddress) => {
            // ---------------------------------------------
            // extension
            // ---------------------------------------------
            if (this.disableExtension) {
                return new Promise((resolve, reject) => {
                    if (!this.extension) {
                        reject(new Error(`extension instance not created!`));
                        return;
                    }
                    const subscription = this.extension.post(tx, terraAddress).subscribe({
                        next: (txResult) => {
                            if (txResult.status === web_extension_interface_1.WebExtensionTxStatus.SUCCEED) {
                                resolve({
                                    ...tx,
                                    result: txResult.payload,
                                    success: true,
                                });
                                subscription.unsubscribe();
                            }
                        },
                        error: (error) => {
                            reject((0, mapExtensionTxError_1.mapExtensionTxError)(tx, error));
                            subscription.unsubscribe();
                        },
                    });
                });
            }
            // ---------------------------------------------
            // wallet connect
            // ---------------------------------------------
            else if (this.walletConnect) {
                return this.walletConnect
                    .post(tx)
                    .then((result) => ({
                    ...tx,
                    result,
                    success: true,
                }))
                    .catch((error) => {
                    throw (0, mapWalletConnectError_1.mapWalletConnectError)(tx, error);
                });
            }
            else if (this.plugin) {
                return this.plugin.post(tx).catch((error) => {
                    throw (0, mapExtensionTxError_1.mapExtensionSignBytesError)(Buffer.from(''), error);
                });
            }
            else {
                throw new Error(`There are no connections that can be posting tx!`);
            }
        };
        /**
         * @see Wallet#sign
         * @param tx
         * @param terraAddress only available new extension
         */
        this.sign = async (tx, terraAddress) => {
            if (this.disableExtension) {
                return new Promise((resolve, reject) => {
                    if (!this.extension) {
                        reject(new Error(`extension instance is not created!`));
                        return;
                    }
                    const subscription = this.extension.sign(tx, terraAddress).subscribe({
                        next: (txResult) => {
                            if (txResult.status === web_extension_interface_1.WebExtensionTxStatus.SUCCEED) {
                                resolve({
                                    ...tx,
                                    result: feather_js_1.Tx.fromData(txResult.payload),
                                    success: true,
                                });
                                subscription.unsubscribe();
                            }
                        },
                        error: (error) => {
                            reject((0, mapExtensionTxError_1.mapExtensionTxError)(tx, error));
                            subscription.unsubscribe();
                        },
                    });
                });
            }
            throw new Error(`sign() method only available on extension`);
        };
        /**
         * @see Wallet#signBytes
         * @param bytes
         * @param terraAddress only available new extension
         */
        this.signBytes = async (bytes, terraAddress) => {
            if (this.disableExtension) {
                return new Promise((resolve, reject) => {
                    if (!this.extension) {
                        reject(new Error(`extension instance is not created!`));
                        return;
                    }
                    const subscription = this.extension
                        .signBytes(bytes, terraAddress)
                        .subscribe({
                        next: (txResult) => {
                            if (txResult.status === web_extension_interface_1.WebExtensionTxStatus.SUCCEED) {
                                resolve({
                                    result: {
                                        recid: txResult.payload.recid,
                                        signature: Uint8Array.from(Buffer.from(txResult.payload.signature, 'base64')),
                                        public_key: txResult.payload.public_key
                                            ? feather_js_1.PublicKey.fromData(txResult.payload.public_key)
                                            : undefined,
                                    },
                                    success: true,
                                });
                                subscription.unsubscribe();
                            }
                        },
                        error: (error) => {
                            reject((0, mapExtensionTxError_1.mapExtensionSignBytesError)(bytes, error));
                            subscription.unsubscribe();
                        },
                    });
                });
            }
            // ---------------------------------------------
            // wallet connect
            // ---------------------------------------------
            else if (this.walletConnect) {
                return this.walletConnect
                    .signBytes(bytes)
                    .then((result) => {
                    const key = new feather_js_1.SimplePublicKey(String(result.public_key)).toData();
                    return {
                        result: {
                            recid: result.recid,
                            signature: Uint8Array.from(Buffer.from(result.signature, 'base64')),
                            public_key: key
                                ? feather_js_1.PublicKey.fromData(key)
                                : undefined,
                        },
                        success: true,
                    };
                })
                    .catch((error) => {
                    throw (0, mapWalletConnectError_1.mapWalletConnectSignBytesError)(bytes, error);
                });
            }
            else {
                throw new Error(`There are no connections that can be signing bytes!`);
            }
        };
        /**
         * @see Wallet#hasCW20Tokens
         * @param chainID
         * @param tokenAddrs Token addresses
         */
        this.hasCW20Tokens = async (chainID, ...tokenAddrs) => {
            if (this.availableExtensionFeature('cw20-token')) {
                return this.extension.hasCW20Tokens(chainID, ...tokenAddrs);
            }
            throw new Error(`Does not support hasCW20Tokens() on this connection`);
        };
        /**
         * @see Wallet#addCW20Tokens
         * @param chainID
         * @param tokenAddrs Token addresses
         */
        this.addCW20Tokens = async (chainID, ...tokenAddrs) => {
            if (this.availableExtensionFeature('cw20-token')) {
                return this.extension.addCW20Tokens(chainID, ...tokenAddrs);
            }
            throw new Error(`Does not support addCW20Tokens() on this connection`);
        };
        /**
         * @see Wallet#hasNetwork
         * @param network
         */
        this.hasNetwork = (network) => {
            if (this.availableExtensionFeature('network')) {
                return this.extension.hasNetwork(network);
            }
            throw new Error(`Does not support hasNetwork() on this connection`);
        };
        /**
         * @see Wallet#hasNetwork
         * @param network
         */
        this.addNetwork = (network) => {
            if (this.availableExtensionFeature('network')) {
                return this.extension.addNetwork(network);
            }
            throw new Error(`Does not support addNetwork() on this connection`);
        };
        // ================================================================
        // internal
        // connect type changing
        // ================================================================
        this.availableExtensionFeature = (feature) => {
            if (this.disableExtension && this.extension) {
                const states = this.extension.getLastStates();
                return (states.type === extension_router_1.ExtensionRouterStatus.WALLET_CONNECTED &&
                    states.supportFeatures.has(feature));
            }
        };
        this.updateStates = (next) => {
            const prev = this._states.getValue();
            if (next.status === wallet_types_1.WalletStatus.WALLET_CONNECTED &&
                next.wallets.length === 0) {
                next = {
                    status: wallet_types_1.WalletStatus.WALLET_NOT_CONNECTED,
                    network: next.network,
                };
            }
            if (prev.status !== next.status || !(0, fast_deep_equal_1.default)(prev, next)) {
                this._states.next(next);
            }
        };
        this.enableReadonlyWallet = (readonlyWallet) => {
            var _a, _b, _c, _d, _e;
            (_a = this.disableWalletConnect) === null || _a === void 0 ? void 0 : _a.call(this);
            (_b = this.disableExtension) === null || _b === void 0 ? void 0 : _b.call(this);
            if (this.readonlyWallet === readonlyWallet ||
                (((_c = this.readonlyWallet) === null || _c === void 0 ? void 0 : _c.terraAddress) === readonlyWallet.terraAddress &&
                    this.readonlyWallet.network === readonlyWallet.network)) {
                return;
            }
            if (this.readonlyWallet) {
                this.readonlyWallet.disconnect();
            }
            this.readonlyWallet = readonlyWallet;
            this.updateStates({
                status: wallet_types_1.WalletStatus.WALLET_CONNECTED,
                network: readonlyWallet.network,
                wallets: [
                    {
                        connectType: wallet_types_1.ConnectType.READONLY,
                        addresses: { [(_e = (_d = Object.values(readonlyWallet.network).find(({ prefix }) => feather_js_1.AccAddress.getPrefix(readonlyWallet.terraAddress) === prefix)) === null || _d === void 0 ? void 0 : _d.chainID) !== null && _e !== void 0 ? _e : ""]: readonlyWallet.terraAddress },
                        design: 'readonly',
                    },
                ],
                supportFeatures: EMPTY_SUPPORT_FEATURES,
                connection: CONNECTIONS.READONLY,
            });
            this.disableReadonlyWallet = () => {
                readonlyWallet.disconnect();
                this.readonlyWallet = null;
                this.disableReadonlyWallet = null;
            };
        };
        this.enableExtension = () => {
            var _a, _b;
            (_a = this.disableReadonlyWallet) === null || _a === void 0 ? void 0 : _a.call(this);
            (_b = this.disableWalletConnect) === null || _b === void 0 ? void 0 : _b.call(this);
            if (this.disableExtension || !this.extension) {
                return;
            }
            const extensionSubscription = this.extension.states().subscribe({
                next: (extensionStates) => {
                    if (extensionStates.type === extension_router_1.ExtensionRouterStatus.WALLET_CONNECTED
                    // && AccAddress.validate(extensionStates.wallet.terraAddress)
                    ) {
                        this.updateStates({
                            status: wallet_types_1.WalletStatus.WALLET_CONNECTED,
                            network: extensionStates.network,
                            wallets: [
                                {
                                    connectType: wallet_types_1.ConnectType.EXTENSION,
                                    addresses: extensionStates.wallet.addresses,
                                    design: extensionStates.wallet.design,
                                },
                            ],
                            supportFeatures: extensionStates.supportFeatures,
                            connection: memoConnection(wallet_types_1.ConnectType.EXTENSION, extensionStates.extensionInfo.name, extensionStates.extensionInfo.icon, extensionStates.extensionInfo.identifier),
                        });
                    }
                    else {
                        this.updateStates(this._notConnected);
                    }
                },
            });
            this.disableExtension = () => {
                var _a;
                (_a = this.extension) === null || _a === void 0 ? void 0 : _a.disconnect();
                extensionSubscription.unsubscribe();
                this.disableExtension = null;
            };
        };
        this.enableWalletConnect = (walletConnect) => {
            var _a, _b;
            (_a = this.disableReadonlyWallet) === null || _a === void 0 ? void 0 : _a.call(this);
            (_b = this.disableExtension) === null || _b === void 0 ? void 0 : _b.call(this);
            if (this.walletConnect === walletConnect) {
                return;
            }
            if (this.walletConnect) {
                this.walletConnect.disconnect();
            }
            this.walletConnect = walletConnect;
            const subscribeWalletConnect = (wc) => {
                return wc.session().subscribe({
                    next: (status) => {
                        var _a, _b, _c, _d;
                        switch (status.status) {
                            case walletconnect_1.WalletConnectSessionStatus.CONNECTED:
                                this.updateStates({
                                    status: wallet_types_1.WalletStatus.WALLET_CONNECTED,
                                    network: (_a = this.options.walletConnectChainIds[status.chainId]) !== null && _a !== void 0 ? _a : this.options.defaultNetwork,
                                    wallets: [
                                        {
                                            connectType: wallet_types_1.ConnectType.WALLETCONNECT,
                                            // FIXME: Interchain WalletConnect
                                            addresses: {
                                                [(_d = (_c = Object.values((_b = this.options.walletConnectChainIds[status.chainId]) !== null && _b !== void 0 ? _b : this.options.defaultNetwork).find(({ prefix }) => feather_js_1.AccAddress.getPrefix(status.terraAddress) === prefix)) === null || _c === void 0 ? void 0 : _c.chainID) !== null && _d !== void 0 ? _d : ""]: status.terraAddress
                                            },
                                            design: 'walletconnect',
                                        },
                                    ],
                                    supportFeatures: WALLETCONNECT_SUPPORT_FEATURES,
                                    connection: CONNECTIONS.WALLETCONNECT,
                                });
                                break;
                            default:
                                this.updateStates(this._notConnected);
                                break;
                        }
                    },
                });
            };
            const walletConnectSessionSubscription = subscribeWalletConnect(walletConnect);
            this.disableWalletConnect = () => {
                var _a;
                (_a = this.walletConnect) === null || _a === void 0 ? void 0 : _a.disconnect();
                this.walletConnect = null;
                walletConnectSessionSubscription.unsubscribe();
                this.disableWalletConnect = null;
            };
        };
        this.enableWalletPlugin = (plugin, session) => {
            var _a, _b, _c, _d;
            (_a = this.disableReadonlyWallet) === null || _a === void 0 ? void 0 : _a.call(this);
            (_b = this.disableExtension) === null || _b === void 0 ? void 0 : _b.call(this);
            (_c = this.disableWalletConnect) === null || _c === void 0 ? void 0 : _c.call(this);
            this.plugin = session;
            this.updateStates({
                status: wallet_types_1.WalletStatus.WALLET_CONNECTED,
                network: session.network,
                wallets: [
                    {
                        connectType: wallet_types_1.ConnectType.PLUGINS,
                        addresses: (_d = session.addresses) !== null && _d !== void 0 ? _d : {},
                        metadata: session.getMetadata && session.getMetadata(),
                    },
                ],
                supportFeatures: WALLETCONNECT_SUPPORT_FEATURES,
                connection: memoConnection(wallet_types_1.ConnectType.PLUGINS, plugin.name, plugin.icon),
            });
            this.disableWalletPlugin = () => {
                var _a;
                this.disableWalletPlugin = null;
                (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.disconnect();
                this.plugin = null;
            };
        };
        this._notConnected = {
            status: wallet_types_1.WalletStatus.WALLET_NOT_CONNECTED,
            network: options.defaultNetwork,
        };
        this._initializing = {
            status: wallet_types_1.WalletStatus.INITIALIZING,
            network: options.defaultNetwork,
        };
        const defaultConnectionTypes = [
            wallet_types_1.ConnectType.READONLY,
            wallet_types_1.ConnectType.WALLETCONNECT,
        ];
        if (this.options.plugins) {
            defaultConnectionTypes.push(wallet_types_1.ConnectType.PLUGINS);
        }
        this._availableConnectTypes = new rxjs_1.BehaviorSubject(defaultConnectionTypes);
        this._availableInstallTypes = new rxjs_1.BehaviorSubject([]);
        this._states = new rxjs_1.BehaviorSubject(this._initializing);
        let numSessionCheck = 0;
        // wait checking the availability of the chrome extension
        // 0. check if extension wallet session is exists
        (0, checkExtensionReady_1.checkExtensionReady)((_a = options.waitingChromeExtensionInstallCheck) !== null && _a !== void 0 ? _a : DEFAULT_WAITING_CHROME_EXTENSION_INSTALL_CHECK, this.isChromeExtensionCompatibleBrowser()).then((ready) => {
            var _a;
            if (ready) {
                this._availableConnectTypes.next([
                    wallet_types_1.ConnectType.EXTENSION,
                    ...defaultConnectionTypes,
                ]);
                this.extension = new extension_router_1.ExtensionRouter({
                    hostWindow: window,
                    selectExtension: options.selectExtension,
                    dangerously__chromeExtensionCompatibleBrowserCheck: (_a = options.dangerously__chromeExtensionCompatibleBrowserCheck) !== null && _a !== void 0 ? _a : env_1.DEFAULT_CHROME_EXTENSION_COMPATIBLE_BROWSER_CHECK,
                    defaultNetwork: options.defaultNetwork,
                });
                const subscription = this.extension
                    .states()
                    .pipe((0, operators_1.filter)(({ type }) => type !== extension_router_1.ExtensionRouterStatus.INITIALIZING))
                    .subscribe((extensionStates) => {
                    try {
                        subscription.unsubscribe();
                    }
                    catch (_a) { }
                    if (extensionStates.type === extension_router_1.ExtensionRouterStatus.WALLET_CONNECTED &&
                        !this.disableWalletConnect &&
                        !this.disableReadonlyWallet) {
                        this.enableExtension();
                    }
                    else if (numSessionCheck === 0) {
                        numSessionCheck += 1;
                    }
                    else {
                        this.updateStates(this._notConnected);
                    }
                });
            }
            else {
                if ((0, browser_check_1.isDesktopChrome)(this.isChromeExtensionCompatibleBrowser())) {
                    this._availableInstallTypes.next([wallet_types_1.ConnectType.EXTENSION]);
                }
                if (numSessionCheck === 0) {
                    numSessionCheck += 1;
                }
                else {
                    this.updateStates(this._notConnected);
                }
            }
        });
        // 1. check if readonly wallet session is exists
        const draftReadonlyWallet = (0, readonly_wallet_1.connectIfSessionExists)();
        if (draftReadonlyWallet) {
            this.enableReadonlyWallet(draftReadonlyWallet);
            return;
        }
        // 2. check if walletconnect sesison is exists
        const draftWalletConnect = (0, walletconnect_1.connectIfSessionExists)(options);
        if (draftWalletConnect &&
            draftWalletConnect.getLatestSession().status ===
                walletconnect_1.WalletConnectSessionStatus.CONNECTED) {
            this.enableWalletConnect(draftWalletConnect);
        }
        else if (numSessionCheck === 0) {
            numSessionCheck += 1;
        }
        else {
            this.updateStates(this._notConnected);
        }
    }
}
exports.WalletController = WalletController;
const memoizedConnections = new Map();
function memoConnection(connectType, name, icon, identifier = '') {
    const key = [connectType, name, icon, identifier].join(';');
    if (memoizedConnections.has(key)) {
        return memoizedConnections.get(key);
    }
    const connection = {
        type: connectType,
        name,
        icon,
        identifier,
    };
    memoizedConnections.set(key, connection);
    return connection;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9AdGVycmEtbW9uZXkvd2FsbGV0LWNvbnRyb2xsZXIvY29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSx3REFPaUM7QUFDakMsNERBV21DO0FBQ25DLGtGQUc4QztBQUM5QyxzRUFBd0M7QUFDeEMsK0JBTWM7QUFDZCw4Q0FBNkM7QUFDN0MsK0JBR2U7QUFDZix5RUFHeUM7QUFDekMsNkVBRzJDO0FBQzNDLDJEQUEyRDtBQUMzRCxpRUFHb0M7QUFDcEMsMEVBR2lEO0FBQ2pELCtEQU1tQztBQUtuQywyREFNaUM7QUFDakMsNkRBQTBEO0FBQzFELHFFQUFrRTtBQUNsRSx5REFBc0Q7QUFDdEQseURBQXdEO0FBQ3hELHFFQUFrRTtBQUNsRSw2REFBMEQ7QUEwRjFELE1BQU0sV0FBVyxHQUFHO0lBQ2xCLENBQUMsMEJBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUN0QixJQUFJLEVBQUUsMEJBQVcsQ0FBQyxRQUFRO1FBQzFCLElBQUksRUFBRSxpQkFBaUI7UUFDdkIsSUFBSSxFQUFFLDREQUE0RDtLQUNyRDtJQUNmLENBQUMsMEJBQVcsQ0FBQyxhQUFhLENBQUMsRUFBRTtRQUMzQixJQUFJLEVBQUUsMEJBQVcsQ0FBQyxhQUFhO1FBQy9CLElBQUksRUFBRSxnQkFBZ0I7UUFDdEIsSUFBSSxFQUFFLGlFQUFpRTtLQUMxRDtDQUNQLENBQUM7QUFFWCxNQUFNLDhDQUE4QyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUM7QUFFaEUsTUFBTSw4QkFBOEIsR0FBRyxJQUFJLEdBQUcsQ0FBNEI7SUFDeEUsTUFBTSxFQUFFLFlBQVk7Q0FDckIsQ0FBQyxDQUFDO0FBRUgsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLEdBQUcsRUFBNkIsQ0FBQztBQUVwRSw4QkFBOEI7QUFDOUIsTUFBYSxnQkFBZ0I7SUFrQjNCLFlBQXFCLE9BQWdDOztRQUFo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QUMsQ0FBQztJQUU1RCxJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNoQyxPQUFPLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUUsQ0FBQztLQUN0QztJQUVELE1BQU0sVUFBVSxHQUFlO1FBQzdCLElBQUksRUFBRSxXQUFXO1FBQ2pCLElBQUk7UUFDSixJQUFJO1FBQ0osVUFBVTtLQUNYLENBQUM7SUFFRixtQkFBbUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBRXpDLE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMQ0RDbGllbnRDb25maWcgfSBmcm9tICdAdGVycmEtbW9uZXkvZmVhdGhlci5qcyc7XG5pbXBvcnQge1xuICBBY2NBZGRyZXNzLFxuICBFeHRlbnNpb25PcHRpb25zLFxuICBMQ0RDbGllbnQsXG4gIFB1YmxpY0tleSxcbiAgU2ltcGxlUHVibGljS2V5LFxuICBUeCxcbn0gZnJvbSAnQHRlcnJhLW1vbmV5L2ZlYXRoZXIuanMnO1xuaW1wb3J0IHtcbiAgQ29ubmVjdGVkV2FsbGV0LFxuICBDb25uZWN0aW9uLFxuICBDb25uZWN0VHlwZSxcbiAgSW5zdGFsbGF0aW9uLFxuICBOZXR3b3JrSW5mbyxcbiAgU2lnbkJ5dGVzUmVzdWx0LFxuICBTaWduUmVzdWx0LFxuICBUeFJlc3VsdCxcbiAgV2FsbGV0U3RhdGVzLFxuICBXYWxsZXRTdGF0dXMsXG59IGZyb20gJ0B0ZXJyYS1tb25leS93YWxsZXQtdHlwZXMnO1xuaW1wb3J0IHtcbiAgVGVycmFXZWJFeHRlbnNpb25GZWF0dXJlcyxcbiAgV2ViRXh0ZW5zaW9uVHhTdGF0dXMsXG59IGZyb20gJ0B0ZXJyYS1tb25leS93ZWItZXh0ZW5zaW9uLWludGVyZmFjZSc7XG5pbXBvcnQgZGVlcEVxdWFsIGZyb20gJ2Zhc3QtZGVlcC1lcXVhbCc7XG5pbXBvcnQge1xuICBCZWhhdmlvclN1YmplY3QsXG4gIGNvbWJpbmVMYXRlc3QsXG4gIGZpcnN0VmFsdWVGcm9tLFxuICBPYnNlcnZhYmxlLFxuICBTdWJzY3JpcHRpb24sXG59IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZmlsdGVyLCBtYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge1xuICBDSFJPTUVfRVhURU5TSU9OX0lOU1RBTExfVVJMLFxuICBERUZBVUxUX0NIUk9NRV9FWFRFTlNJT05fQ09NUEFUSUJMRV9CUk9XU0VSX0NIRUNLLFxufSBmcm9tICcuL2Vudic7XG5pbXBvcnQge1xuICBtYXBFeHRlbnNpb25TaWduQnl0ZXNFcnJvcixcbiAgbWFwRXh0ZW5zaW9uVHhFcnJvcixcbn0gZnJvbSAnLi9leGNlcHRpb24vbWFwRXh0ZW5zaW9uVHhFcnJvcic7XG5pbXBvcnQge1xuICBtYXBXYWxsZXRDb25uZWN0RXJyb3IsXG4gIG1hcFdhbGxldENvbm5lY3RTaWduQnl0ZXNFcnJvclxufSBmcm9tICcuL2V4Y2VwdGlvbi9tYXBXYWxsZXRDb25uZWN0RXJyb3InO1xuaW1wb3J0IHsgc2VsZWN0Q29ubmVjdGlvbiB9IGZyb20gJy4vbW9kdWxlcy9jb25uZWN0LW1vZGFsJztcbmltcG9ydCB7XG4gIEV4dGVuc2lvblJvdXRlcixcbiAgRXh0ZW5zaW9uUm91dGVyU3RhdHVzLFxufSBmcm9tICcuL21vZHVsZXMvZXh0ZW5zaW9uLXJvdXRlcic7XG5pbXBvcnQge1xuICBFeHRlbnNpb25JbmZvLFxuICBnZXRUZXJyYUV4dGVuc2lvbnMsXG59IGZyb20gJy4vbW9kdWxlcy9leHRlbnNpb24tcm91dGVyL211bHRpQ2hhbm5lbCc7XG5pbXBvcnQge1xuICBjb25uZWN0IGFzIHJlQ29ubmVjdCxcbiAgY29ubmVjdElmU2Vzc2lvbkV4aXN0cyBhcyByZUNvbm5lY3RJZlNlc3Npb25FeGlzdHMsXG4gIFJlYWRvbmx5V2FsbGV0Q29udHJvbGxlcixcbiAgcmVhZG9ubHlXYWxsZXRNb2RhbCxcbiAgUmVhZG9ubHlXYWxsZXRTZXNzaW9uLFxufSBmcm9tICcuL21vZHVsZXMvcmVhZG9ubHktd2FsbGV0JztcbmltcG9ydCB7XG4gIFdhbGxldFBsdWdpbixcbiAgV2FsbGV0UGx1Z2luU2Vzc2lvbixcbn0gZnJvbSAnLi9tb2R1bGVzL3dhbGxldC1wbHVnaW4vdHlwZXMnO1xuaW1wb3J0IHtcbiAgY29ubmVjdCBhcyB3Y0Nvbm5lY3QsXG4gIGNvbm5lY3RJZlNlc3Npb25FeGlzdHMgYXMgd2NDb25uZWN0SWZTZXNzaW9uRXhpc3RzLFxuICBXYWxsZXRDb25uZWN0Q29udHJvbGxlcixcbiAgV2FsbGV0Q29ubmVjdENvbnRyb2xsZXJPcHRpb25zLFxuICBXYWxsZXRDb25uZWN0U2Vzc2lvblN0YXR1cyxcbn0gZnJvbSAnLi9tb2R1bGVzL3dhbGxldGNvbm5lY3QnO1xuaW1wb3J0IHsgZ2V0RXh0ZW5zaW9ucyB9IGZyb20gJy4vb3BlcmF0b3JzL2dldEV4dGVuc2lvbnMnO1xuaW1wb3J0IHsgdG9Db25uZWN0ZWRXYWxsZXQgfSBmcm9tICcuL29wZXJhdG9ycy90b0Nvbm5lY3RlZFdhbGxldCc7XG5pbXBvcnQgeyB0b0xjZENsaWVudCB9IGZyb20gJy4vb3BlcmF0b3JzL3RvTGNkQ2xpZW50JztcbmltcG9ydCB7IGlzRGVza3RvcENocm9tZSB9IGZyb20gJy4vdXRpbHMvYnJvd3Nlci1jaGVjayc7XG5pbXBvcnQgeyBjaGVja0V4dGVuc2lvblJlYWR5IH0gZnJvbSAnLi91dGlscy9jaGVja0V4dGVuc2lvblJlYWR5JztcbmltcG9ydCB7IHNvcnRDb25uZWN0aW9ucyB9IGZyb20gJy4vdXRpbHMvc29ydENvbm5lY3Rpb25zJztcblxuZXhwb3J0IGludGVyZmFjZSBXYWxsZXRDb250cm9sbGVyT3B0aW9uc1xuICBleHRlbmRzIFdhbGxldENvbm5lY3RDb250cm9sbGVyT3B0aW9ucyB7XG4gIC8qKlxuICAgKiDimqDvuI8gRG9uJ3QgaGFyZGNvZGluZyB0aGlzLCB1c2UgZ2V0Q2hhaW4gT3B0aW9ucygpXG4gICAqXG4gICAqIGZhbGxiYWNrIG5ldHdvcmsgaWYgY29udHJvbGxlciBpcyBub3QgY29ubmVjdGVkXG4gICAqL1xuICBkZWZhdWx0TmV0d29yazogTmV0d29ya0luZm87XG5cbiAgLyoqXG4gICAqIOKaoO+4jyBEb24ndCBoYXJkY29kaW5nIHRoaXMsIHVzZSBnZXRDaGFpbiBPcHRpb25zKClcbiAgICpcbiAgICogZm9yIHdhbGxldGNvbm5lY3RcbiAgICpcbiAgICogVGhlIG5ldHdvcmsgcnVsZXMgcGFzc2VkIGJ5IHRoZSBUZXJyYSBTdGF0aW9uIE1vYmlsZSBhcmUgMCBpcyB0ZXN0bmV0LCAxIGlzIG1haW5uZXQuXG4gICAqXG4gICAqIEFsd2F5cyBzZXQgdGVzdG5ldCBmb3IgMCBhbmQgbWFpbm5ldCBmb3IgMS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYGBgXG4gICAqIGNvbnN0IG1haW5uZXQ6IE5ldHdvcmtJbmZvID0ge1xuICAgKiAgbmFtZTogJ21haW5uZXQnLFxuICAgKiAgY2hhaW5JRDogJ2NvbHVtYnVzLTUnLFxuICAgKiAgbGNkOiAnaHR0cHM6Ly9sY2QudGVycmEuZGV2JyxcbiAgICogfVxuICAgKlxuICAgKiBjb25zdCB0ZXN0bmV0OiBOZXR3b3JrSW5mbyA9IHtcbiAgICogIG5hbWU6ICd0ZXN0bmV0JyxcbiAgICogIGNoYWluSUQ6ICdib21iYXktMTInLFxuICAgKiAgbGNkOiAnaHR0cHM6Ly9ib21iYXktbGNkLnRlcnJhLmRldicsXG4gICAqIH1cbiAgICpcbiAgICogY29uc3Qgd2FsbGV0Q29ubmVjdENoYWluSWRzOiBSZWNvcmQ8bnVtYmVyLCBOZXR3b3JrSW5mbz4gPSB7XG4gICAqICAgMDogdGVzdG5ldCxcbiAgICogICAxOiBtYWlubmV0LFxuICAgKiB9XG4gICAqXG4gICAqIDxXYWxsZXRQcm92aWRlciB3YWxsZXRDb25uZWN0Q2hhaW5JZHM9e3dhbGxldENvbm5lY3RDaGFpbklkc30+XG4gICAqIGBgYFxuICAgKi9cbiAgd2FsbGV0Q29ubmVjdENoYWluSWRzOiBSZWNvcmQ8bnVtYmVyLCBOZXR3b3JrSW5mbz47XG5cbiAgLyoqXG4gICAqIHJ1biBhdCBleGVjdXRpbmcgdGhlIGBjb25uZWN0KENvbm5lY3RUeXBlLlJFQURPTkxZKWBcbiAgICovXG4gIGNyZWF0ZVJlYWRvbmx5V2FsbGV0U2Vzc2lvbj86IChcbiAgICBuZXR3b3JrczogTmV0d29ya0luZm9bXSxcbiAgKSA9PiBQcm9taXNlPFJlYWRvbmx5V2FsbGV0U2Vzc2lvbiB8IG51bGw+O1xuXG4gIHBsdWdpbnM/OiBXYWxsZXRQbHVnaW5bXTtcblxuICAvKipcbiAgICogcnVuIGF0IGV4ZWN1dGluZyB0aGUgYGNvbm5lY3QoKWAgLSBvbmx5IHVzZWQgd2hlbiBkb2VzIG5vdCBpbnB1dCBDb25uZWN0VHlwZVxuICAgKi9cbiAgc2VsZWN0Q29ubmVjdGlvbj86IChcbiAgICBjb25uZWN0aW9uczogQ29ubmVjdGlvbltdLFxuICApID0+IFByb21pc2U8W3R5cGU6IENvbm5lY3RUeXBlLCBpZGVudGlmaWVyOiBzdHJpbmcgfCB1bmRlZmluZWRdIHwgbnVsbD47XG5cbiAgLyoqXG4gICAqIHJ1biBhdCBleGVjdXRpbmcgdGhlIGBjb25uZWN0KENvbm5lY3RUeXBlLkVYVEVOU0lPTilgXG4gICAqIGlmIHVzZXIgaW5zdGFsbGVkIG11bHRpcGxlIHdhbGxldHNcbiAgICovXG4gIHNlbGVjdEV4dGVuc2lvbj86IChcbiAgICBleHRlbnNpb25JbmZvczogRXh0ZW5zaW9uSW5mb1tdLFxuICApID0+IFByb21pc2U8RXh0ZW5zaW9uSW5mbyB8IG51bGw+O1xuXG4gIC8qKlxuICAgKiBtaWxsaXNlY29uZHMgdG8gd2FpdCBjaGVja2luZyBjaHJvbWUgZXh0ZW5zaW9uIGlzIGluc3RhbGxlZFxuICAgKlxuICAgKiBAZGVmYXVsdCAxMDAwICogMyBtaWxpc2Vjb25kc1xuICAgKi9cbiAgd2FpdGluZ0Nocm9tZUV4dGVuc2lvbkluc3RhbGxDaGVjaz86IG51bWJlcjtcblxuICAvKipcbiAgICog4pqg77iPIFRoaXMgQVBJIGlzIGFuIG9wdGlvbiBmb3Igd2FsbGV0IGRldmVsb3BlcnMuIFBsZWFzZSBkb24ndCB1c2UgZEFwcCBkZXZlbG9wZXJzLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGBcbiAgICogPFdhbGxldFByb3ZpZGVyIGRhbmdlcm91c2x5X19jaHJvbWVFeHRlbnNpb25Db21wYXRpYmxlQnJvd3NlckNoZWNrPXsodXNlckFnZW50OiBzdHJpbmcpID0+IHtcbiAgICogICByZXR1cm4gL015V2FsbGV0XFwvLy50ZXN0KHVzZXJBZ2VudCk7XG4gICAqIH19PlxuICAgKiBgYGBcbiAgICovXG4gIGRhbmdlcm91c2x5X19jaHJvbWVFeHRlbnNpb25Db21wYXRpYmxlQnJvd3NlckNoZWNrPzogKFxuICAgIHVzZXJBZ2VudDogc3RyaW5nLFxuICApID0+IGJvb2xlYW47XG59XG5cbmNvbnN0IENPTk5FQ1RJT05TID0ge1xuICBbQ29ubmVjdFR5cGUuUkVBRE9OTFldOiB7XG4gICAgdHlwZTogQ29ubmVjdFR5cGUuUkVBRE9OTFksXG4gICAgbmFtZTogJ1ZpZXcgYW4gYWRkcmVzcycsXG4gICAgaWNvbjogJ2h0dHBzOi8vYXNzZXRzLnRlcnJhLmRldi9pY29uL3dhbGxldC1wcm92aWRlci9yZWFkb25seS5zdmcnLFxuICB9IGFzIENvbm5lY3Rpb24sXG4gIFtDb25uZWN0VHlwZS5XQUxMRVRDT05ORUNUXToge1xuICAgIHR5cGU6IENvbm5lY3RUeXBlLldBTExFVENPTk5FQ1QsXG4gICAgbmFtZTogJ1dhbGxldCBDb25uZWN0JyxcbiAgICBpY29uOiAnaHR0cHM6Ly9hc3NldHMudGVycmEuZGV2L2ljb24vd2FsbGV0LXByb3ZpZGVyL3dhbGxldGNvbm5lY3Quc3ZnJyxcbiAgfSBhcyBDb25uZWN0aW9uLFxufSBhcyBjb25zdDtcblxuY29uc3QgREVGQVVMVF9XQUlUSU5HX0NIUk9NRV9FWFRFTlNJT05fSU5TVEFMTF9DSEVDSyA9IDEwMDAgKiAzO1xuXG5jb25zdCBXQUxMRVRDT05ORUNUX1NVUFBPUlRfRkVBVFVSRVMgPSBuZXcgU2V0PFRlcnJhV2ViRXh0ZW5zaW9uRmVhdHVyZXM+KFtcbiAgJ3Bvc3QnLCAnc2lnbi1ieXRlcydcbl0pO1xuXG5jb25zdCBFTVBUWV9TVVBQT1JUX0ZFQVRVUkVTID0gbmV3IFNldDxUZXJyYVdlYkV4dGVuc2lvbkZlYXR1cmVzPigpO1xuXG4vL25vaW5zcGVjdGlvbiBFUzZNaXNzaW5nQXdhaXRcbmV4cG9ydCBjbGFzcyBXYWxsZXRDb250cm9sbGVyIHtcbiAgcHJpdmF0ZSBleHRlbnNpb246IEV4dGVuc2lvblJvdXRlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHdhbGxldENvbm5lY3Q6IFdhbGxldENvbm5lY3RDb250cm9sbGVyIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgcmVhZG9ubHlXYWxsZXQ6IFJlYWRvbmx5V2FsbGV0Q29udHJvbGxlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHBsdWdpbjogV2FsbGV0UGx1Z2luU2Vzc2lvbiB8IG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgX2F2YWlsYWJsZUNvbm5lY3RUeXBlczogQmVoYXZpb3JTdWJqZWN0PENvbm5lY3RUeXBlW10+O1xuICBwcml2YXRlIF9hdmFpbGFibGVJbnN0YWxsVHlwZXM6IEJlaGF2aW9yU3ViamVjdDxDb25uZWN0VHlwZVtdPjtcbiAgcHJpdmF0ZSBfc3RhdGVzOiBCZWhhdmlvclN1YmplY3Q8V2FsbGV0U3RhdGVzPjtcblxuICBwcml2YXRlIGRpc2FibGVSZWFkb25seVdhbGxldDogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZGlzYWJsZUV4dGVuc2lvbjogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgZGlzYWJsZVdhbGxldENvbm5lY3Q6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRpc2FibGVXYWxsZXRQbHVnaW46ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgX25vdENvbm5lY3RlZDogV2FsbGV0U3RhdGVzO1xuICBwcml2YXRlIHJlYWRvbmx5IF9pbml0aWFsaXppbmc6IFdhbGxldFN0YXRlcztcblxuICBjb25zdHJ1Y3RvcihyZWFkb25seSBvcHRpb25zOiBXYWxsZXRDb250cm9sbGVyT3B0aW9ucykge1xuICAgIHRoaXMuX25vdENvbm5lY3RlZCA9IHtcbiAgICAgIHN0YXR1czogV2FsbGV0U3RhdHVzLldBTExFVF9OT1RfQ09OTkVDVEVELFxuICAgICAgbmV0d29yazogb3B0aW9ucy5kZWZhdWx0TmV0d29yayxcbiAgICB9O1xuXG4gICAgdGhpcy5faW5pdGlhbGl6aW5nID0ge1xuICAgICAgc3RhdHVzOiBXYWxsZXRTdGF0dXMuSU5JVElBTElaSU5HLFxuICAgICAgbmV0d29yazogb3B0aW9ucy5kZWZhdWx0TmV0d29yayxcbiAgICB9O1xuXG4gICAgY29uc3QgZGVmYXVsdENvbm5lY3Rpb25UeXBlczogQ29ubmVjdFR5cGVbXSA9IFtcbiAgICAgIENvbm5lY3RUeXBlLlJFQURPTkxZLFxuICAgICAgQ29ubmVjdFR5cGUuV0FMTEVUQ09OTkVDVCxcbiAgICBdO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5wbHVnaW5zKSB7XG4gICAgICBkZWZhdWx0Q29ubmVjdGlvblR5cGVzLnB1c2goQ29ubmVjdFR5cGUuUExVR0lOUyk7XG4gICAgfVxuXG4gICAgdGhpcy5fYXZhaWxhYmxlQ29ubmVjdFR5cGVzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxDb25uZWN0VHlwZVtdPihcbiAgICAgIGRlZmF1bHRDb25uZWN0aW9uVHlwZXMsXG4gICAgKTtcblxuICAgIHRoaXMuX2F2YWlsYWJsZUluc3RhbGxUeXBlcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8Q29ubmVjdFR5cGVbXT4oW10pO1xuXG4gICAgdGhpcy5fc3RhdGVzID0gbmV3IEJlaGF2aW9yU3ViamVjdDxXYWxsZXRTdGF0ZXM+KHRoaXMuX2luaXRpYWxpemluZyk7XG5cbiAgICBsZXQgbnVtU2Vzc2lvbkNoZWNrOiBudW1iZXIgPSAwO1xuXG4gICAgLy8gd2FpdCBjaGVja2luZyB0aGUgYXZhaWxhYmlsaXR5IG9mIHRoZSBjaHJvbWUgZXh0ZW5zaW9uXG4gICAgLy8gMC4gY2hlY2sgaWYgZXh0ZW5zaW9uIHdhbGxldCBzZXNzaW9uIGlzIGV4aXN0c1xuICAgIGNoZWNrRXh0ZW5zaW9uUmVhZHkoXG4gICAgICBvcHRpb25zLndhaXRpbmdDaHJvbWVFeHRlbnNpb25JbnN0YWxsQ2hlY2sgPz9cbiAgICAgIERFRkFVTFRfV0FJVElOR19DSFJPTUVfRVhURU5TSU9OX0lOU1RBTExfQ0hFQ0ssXG4gICAgICB0aGlzLmlzQ2hyb21lRXh0ZW5zaW9uQ29tcGF0aWJsZUJyb3dzZXIoKSxcbiAgICApLnRoZW4oKHJlYWR5OiBib29sZWFuKSA9PiB7XG4gICAgICBpZiAocmVhZHkpIHtcbiAgICAgICAgdGhpcy5fYXZhaWxhYmxlQ29ubmVjdFR5cGVzLm5leHQoW1xuICAgICAgICAgIENvbm5lY3RUeXBlLkVYVEVOU0lPTixcbiAgICAgICAgICAuLi5kZWZhdWx0Q29ubmVjdGlvblR5cGVzLFxuICAgICAgICBdKTtcblxuICAgICAgICB0aGlzLmV4dGVuc2lvbiA9IG5ldyBFeHRlbnNpb25Sb3V0ZXIoe1xuICAgICAgICAgIGhvc3RXaW5kb3c6IHdpbmRvdyxcbiAgICAgICAgICBzZWxlY3RFeHRlbnNpb246IG9wdGlvbnMuc2VsZWN0RXh0ZW5zaW9uLFxuICAgICAgICAgIGRhbmdlcm91c2x5X19jaHJvbWVFeHRlbnNpb25Db21wYXRpYmxlQnJvd3NlckNoZWNrOlxuICAgICAgICAgICAgb3B0aW9ucy5kYW5nZXJvdXNseV9fY2hyb21lRXh0ZW5zaW9uQ29tcGF0aWJsZUJyb3dzZXJDaGVjayA/P1xuICAgICAgICAgICAgREVGQVVMVF9DSFJPTUVfRVhURU5TSU9OX0NPTVBBVElCTEVfQlJPV1NFUl9DSEVDSyxcbiAgICAgICAgICBkZWZhdWx0TmV0d29yazogb3B0aW9ucy5kZWZhdWx0TmV0d29yayxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gdGhpcy5leHRlbnNpb25cbiAgICAgICAgICAuc3RhdGVzKClcbiAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgIGZpbHRlcigoeyB0eXBlIH0pID0+IHR5cGUgIT09IEV4dGVuc2lvblJvdXRlclN0YXR1cy5JTklUSUFMSVpJTkcpLFxuICAgICAgICAgIClcbiAgICAgICAgICAuc3Vic2NyaWJlKChleHRlbnNpb25TdGF0ZXMpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgfSBjYXRjaCB7IH1cblxuICAgICAgICAgICAgaWYgKFxuICAgICAgICAgICAgICBleHRlbnNpb25TdGF0ZXMudHlwZSA9PT0gRXh0ZW5zaW9uUm91dGVyU3RhdHVzLldBTExFVF9DT05ORUNURUQgJiZcbiAgICAgICAgICAgICAgIXRoaXMuZGlzYWJsZVdhbGxldENvbm5lY3QgJiZcbiAgICAgICAgICAgICAgIXRoaXMuZGlzYWJsZVJlYWRvbmx5V2FsbGV0XG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgdGhpcy5lbmFibGVFeHRlbnNpb24oKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobnVtU2Vzc2lvbkNoZWNrID09PSAwKSB7XG4gICAgICAgICAgICAgIG51bVNlc3Npb25DaGVjayArPSAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0ZXModGhpcy5fbm90Q29ubmVjdGVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpc0Rlc2t0b3BDaHJvbWUodGhpcy5pc0Nocm9tZUV4dGVuc2lvbkNvbXBhdGlibGVCcm93c2VyKCkpKSB7XG4gICAgICAgICAgdGhpcy5fYXZhaWxhYmxlSW5zdGFsbFR5cGVzLm5leHQoW0Nvbm5lY3RUeXBlLkVYVEVOU0lPTl0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG51bVNlc3Npb25DaGVjayA9PT0gMCkge1xuICAgICAgICAgIG51bVNlc3Npb25DaGVjayArPSAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudXBkYXRlU3RhdGVzKHRoaXMuX25vdENvbm5lY3RlZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIDEuIGNoZWNrIGlmIHJlYWRvbmx5IHdhbGxldCBzZXNzaW9uIGlzIGV4aXN0c1xuICAgIGNvbnN0IGRyYWZ0UmVhZG9ubHlXYWxsZXQgPSByZUNvbm5lY3RJZlNlc3Npb25FeGlzdHMoKTtcblxuICAgIGlmIChkcmFmdFJlYWRvbmx5V2FsbGV0KSB7XG4gICAgICB0aGlzLmVuYWJsZVJlYWRvbmx5V2FsbGV0KGRyYWZ0UmVhZG9ubHlXYWxsZXQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIDIuIGNoZWNrIGlmIHdhbGxldGNvbm5lY3Qgc2VzaXNvbiBpcyBleGlzdHNcbiAgICBjb25zdCBkcmFmdFdhbGxldENvbm5lY3QgPSB3Y0Nvbm5lY3RJZlNlc3Npb25FeGlzdHMob3B0aW9ucyk7XG5cbiAgICBpZiAoXG4gICAgICBkcmFmdFdhbGxldENvbm5lY3QgJiZcbiAgICAgIGRyYWZ0V2FsbGV0Q29ubmVjdC5nZXRMYXRlc3RTZXNzaW9uKCkuc3RhdHVzID09PVxuICAgICAgV2FsbGV0Q29ubmVjdFNlc3Npb25TdGF0dXMuQ09OTkVDVEVEXG4gICAgKSB7XG4gICAgICB0aGlzLmVuYWJsZVdhbGxldENvbm5lY3QoZHJhZnRXYWxsZXRDb25uZWN0KTtcbiAgICB9IGVsc2UgaWYgKG51bVNlc3Npb25DaGVjayA9PT0gMCkge1xuICAgICAgbnVtU2Vzc2lvbkNoZWNrICs9IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXBkYXRlU3RhdGVzKHRoaXMuX25vdENvbm5lY3RlZCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNvbWUgbW9iaWxlIHdhbGxldCBlbXVsYXRlcyB0aGUgYmVoYXZpb3Igb2YgY2hyb21lIGV4dGVuc2lvbi5cbiAgICogSXQgY29uZmlybXMgdGhhdCB0aGUgY3VycmVudCBjb25uZWN0aW9uIGVudmlyb25tZW50IGlzIHN1Y2ggYSB3YWxsZXQuXG4gICAqIChJZiB5b3UgYXJlIHJ1bm5pbmcgY29ubmVjdCgpIGJ5IGNoZWNraW5nIGF2YWlsYWJsZUNvbm5lY3RUeXBlLCB5b3UgZG8gbm90IG5lZWQgdG8gdXNlIHRoaXMgQVBJLilcbiAgICpcbiAgICogQHNlZSBXYWxsZXQjaXNDaHJvbWVFeHRlbnNpb25Db21wYXRpYmxlQnJvd3NlclxuICAgKi9cbiAgaXNDaHJvbWVFeHRlbnNpb25Db21wYXRpYmxlQnJvd3NlciA9ICgpOiBib29sZWFuID0+IHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy5vcHRpb25zLmRhbmdlcm91c2x5X19jaHJvbWVFeHRlbnNpb25Db21wYXRpYmxlQnJvd3NlckNoZWNrID8/XG4gICAgICBERUZBVUxUX0NIUk9NRV9FWFRFTlNJT05fQ09NUEFUSUJMRV9CUk9XU0VSX0NIRUNLXG4gICAgKShuYXZpZ2F0b3IudXNlckFnZW50KTtcbiAgfTtcblxuICAvKipcbiAgICogYXZhaWxhYmxlIGNvbm5lY3QgdHlwZXMgb24gdGhlIGJyb3dzZXJcbiAgICpcbiAgICogQHNlZSBXYWxsZXQjYXZhaWxhYmxlQ29ubmVjdFR5cGVzXG4gICAqL1xuICBhdmFpbGFibGVDb25uZWN0VHlwZXMgPSAoKTogT2JzZXJ2YWJsZTxDb25uZWN0VHlwZVtdPiA9PiB7XG4gICAgcmV0dXJuIHRoaXMuX2F2YWlsYWJsZUNvbm5lY3RUeXBlcy5hc09ic2VydmFibGUoKTtcbiAgfTtcblxuICAvKipcbiAgICogYXZhaWxhYmxlIGNvbm5lY3Rpb25zIGluY2x1ZGVzIGlkZW50aWZpZXIsIG5hbWUsIGljb25cbiAgICpcbiAgICogQHNlZSBXYWxsZXQjYXZhaWxhYmxlQ29ubmVjdGlvbnNcbiAgICovXG4gIGF2YWlsYWJsZUNvbm5lY3Rpb25zID0gKCk6IE9ic2VydmFibGU8Q29ubmVjdGlvbltdPiA9PiB7XG4gICAgcmV0dXJuIHRoaXMuX2F2YWlsYWJsZUNvbm5lY3RUeXBlcy5waXBlKFxuICAgICAgbWFwKChjb25uZWN0VHlwZXMpID0+IHtcbiAgICAgICAgY29uc3QgY29ubmVjdGlvbnM6IENvbm5lY3Rpb25bXSA9IFtdO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29ubmVjdFR5cGUgb2YgY29ubmVjdFR5cGVzKSB7XG4gICAgICAgICAgaWYgKGNvbm5lY3RUeXBlID09PSBDb25uZWN0VHlwZS5FWFRFTlNJT04pIHtcbiAgICAgICAgICAgIGNvbnN0IHRlcnJhRXh0ZW5zaW9ucyA9IGdldFRlcnJhRXh0ZW5zaW9ucygpO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHRlcnJhRXh0ZW5zaW9uIG9mIHRlcnJhRXh0ZW5zaW9ucykge1xuICAgICAgICAgICAgICBjb25uZWN0aW9ucy5wdXNoKFxuICAgICAgICAgICAgICAgIG1lbW9Db25uZWN0aW9uKFxuICAgICAgICAgICAgICAgICAgQ29ubmVjdFR5cGUuRVhURU5TSU9OLFxuICAgICAgICAgICAgICAgICAgdGVycmFFeHRlbnNpb24ubmFtZSxcbiAgICAgICAgICAgICAgICAgIHRlcnJhRXh0ZW5zaW9uLmljb24sXG4gICAgICAgICAgICAgICAgICB0ZXJyYUV4dGVuc2lvbi5pZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChjb25uZWN0VHlwZSA9PT0gQ29ubmVjdFR5cGUuUExVR0lOUykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBwbHVnaW4gb2YgdGhpcy5vcHRpb25zLnBsdWdpbnMgfHwgW10pIHtcbiAgICAgICAgICAgICAgY29ubmVjdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgICBtZW1vQ29ubmVjdGlvbihcbiAgICAgICAgICAgICAgICAgIENvbm5lY3RUeXBlLlBMVUdJTlMsXG4gICAgICAgICAgICAgICAgICBwbHVnaW4ubmFtZSxcbiAgICAgICAgICAgICAgICAgIHBsdWdpbi5pY29uLFxuICAgICAgICAgICAgICAgICAgcGx1Z2luLmlkZW50aWZpZXIsXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29ubmVjdGlvbnMucHVzaChDT05ORUNUSU9OU1tjb25uZWN0VHlwZV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzb3J0Q29ubmVjdGlvbnMoY29ubmVjdGlvbnMpO1xuICAgICAgfSksXG4gICAgKTtcbiAgfTtcblxuICAvKipcbiAgICogYXZhaWxhYmxlIGluc3RhbGwgdHlwZXMgb24gdGhlIGJyb3dzZXJcbiAgICpcbiAgICogaW4gdGhpcyB0aW1lLCB0aGlzIG9ubHkgY29udGFpbnMgW0Nvbm5lY3RUeXBlLkVYVEVOU0lPTl1cbiAgICpcbiAgICogQHNlZSBXYWxsZXQjYXZhaWxhYmxlSW5zdGFsbFR5cGVzXG4gICAqL1xuICBhdmFpbGFibGVJbnN0YWxsVHlwZXMgPSAoKTogT2JzZXJ2YWJsZTxDb25uZWN0VHlwZVtdPiA9PiB7XG4gICAgcmV0dXJuIHRoaXMuX2F2YWlsYWJsZUluc3RhbGxUeXBlcy5hc09ic2VydmFibGUoKTtcbiAgfTtcblxuICAvKipcbiAgICogYXZhaWxhYmxlIGluc3RhbGxhdGlvbnMgaW5jbHVkZXMgaWRlbnRpZmllciwgbmFtZSwgaWNvbiwgdXJsXG4gICAqXG4gICAqIEBzZWUgV2FsbGV0I2F2YWlsYWJsZUluc3RhbGxhdGlvbnNcbiAgICovXG4gIGF2YWlsYWJsZUluc3RhbGxhdGlvbnMgPSAoKTogT2JzZXJ2YWJsZTxJbnN0YWxsYXRpb25bXT4gPT4ge1xuICAgIHJldHVybiBjb21iaW5lTGF0ZXN0KFt0aGlzLmF2YWlsYWJsZUNvbm5lY3Rpb25zKCksIGdldEV4dGVuc2lvbnMoKV0pLnBpcGUoXG4gICAgICBtYXAoKFtjb25uZWN0aW9ucywgZXh0ZW5zaW9uc10pID0+IHtcbiAgICAgICAgY29uc3QgaW5zdGFsbGVkSWRlbnRpZmllcnMgPSBuZXcgU2V0PHN0cmluZz4oXG4gICAgICAgICAgY29ubmVjdGlvbnNcbiAgICAgICAgICAgIC5maWx0ZXIoKHsgdHlwZSwgaWRlbnRpZmllciB9KSA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiB0eXBlID09PSBDb25uZWN0VHlwZS5FWFRFTlNJT04gJiYgISFpZGVudGlmaWVyO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5tYXAoKHsgaWRlbnRpZmllciB9KSA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiBpZGVudGlmaWVyITtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICApO1xuXG4gICAgICAgIHJldHVybiBleHRlbnNpb25zXG4gICAgICAgICAgLmZpbHRlcigoeyBpZGVudGlmaWVyIH0pID0+IHtcbiAgICAgICAgICAgIHJldHVybiAhaW5zdGFsbGVkSWRlbnRpZmllcnMuaGFzKGlkZW50aWZpZXIpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLm1hcCgoeyBuYW1lLCBpZGVudGlmaWVyLCBpY29uLCB1cmwgfSkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdHlwZTogQ29ubmVjdFR5cGUuRVhURU5TSU9OLFxuICAgICAgICAgICAgICBpZGVudGlmaWVyLFxuICAgICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgICBpY29uLFxuICAgICAgICAgICAgICB1cmwsXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH0pO1xuICAgICAgfSksXG4gICAgKTtcbiAgfTtcblxuICAvKipcbiAgICogQHNlZSBXYWxsZXQjc3RhdHVzXG4gICAqIEBzZWUgV2FsbGV0I25ldHdvcmtcbiAgICogQHNlZSBXYWxsZXQjd2FsbGV0c1xuICAgKi9cbiAgc3RhdGVzID0gKCk6IE9ic2VydmFibGU8V2FsbGV0U3RhdGVzPiA9PiB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlcy5hc09ic2VydmFibGUoKTtcbiAgfTtcblxuICAvKiogZ2V0IGNvbm5lY3RlZFdhbGxldCAqL1xuICBjb25uZWN0ZWRXYWxsZXQgPSAoKTogT2JzZXJ2YWJsZTxDb25uZWN0ZWRXYWxsZXQgfCB1bmRlZmluZWQ+ID0+IHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdGVzLnBpcGUodG9Db25uZWN0ZWRXYWxsZXQodGhpcykpO1xuICB9O1xuXG4gIC8qKiBnZXQgbGNkQ2xpZW50ICovXG4gIGxjZENsaWVudCA9IChcbiAgICBsY2RDbGllbnRDb25maWc6IFJlY29yZDxzdHJpbmcsIExDRENsaWVudENvbmZpZz4sXG4gICk6IE9ic2VydmFibGU8TENEQ2xpZW50PiA9PiB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlcy5waXBlKHRvTGNkQ2xpZW50KGxjZENsaWVudENvbmZpZykpO1xuICB9O1xuXG4gIC8qKlxuICAgKiByZWxvYWQgdGhlIGNvbm5lY3RlZCB3YWxsZXQgc3RhdGVzXG4gICAqXG4gICAqIGluIHRoaXMgdGltZSwgdGhpcyBvbmx5IHdvcmsgb24gdGhlIENvbm5lY3RUeXBlLkVYVEVOU0lPTlxuICAgKlxuICAgKiBAc2VlIFdhbGxldCNyZWNoZWNrU3RhdHVzXG4gICAqL1xuICByZWZldGNoU3RhdGVzID0gKCkgPT4ge1xuICAgIGlmICh0aGlzLmRpc2FibGVFeHRlbnNpb24pIHtcbiAgICAgIHRoaXMuZXh0ZW5zaW9uPy5yZWZldGNoU3RhdGVzKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBAZGVwcmVjYXRlZCBQbGVhc2UgdXNlIGF2YWlsYWJsZUluc3RhbGxhdGlvbnNcbiAgICpcbiAgICogaW5zdGFsbCBmb3IgdGhlIGNvbm5lY3QgdHlwZVxuICAgKlxuICAgKiBAc2VlIFdhbGxldCNpbnN0YWxsXG4gICAqL1xuICBpbnN0YWxsID0gKHR5cGU6IENvbm5lY3RUeXBlKSA9PiB7XG4gICAgaWYgKHR5cGUgPT09IENvbm5lY3RUeXBlLkVYVEVOU0lPTikge1xuICAgICAgLy8gVE9ETyBzZXBhcmF0ZSBpbnN0YWxsIGxpbmtzIGJ5IGJyb3dzZXIgdHlwZXNcbiAgICAgIHdpbmRvdy5vcGVuKENIUk9NRV9FWFRFTlNJT05fSU5TVEFMTF9VUkwsICdfYmxhbmsnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICBgW1dhbGxldENvbnRyb2xsZXJdIENvbm5lY3RUeXBlIFwiJHt0eXBlfVwiIGRvZXMgbm90IHN1cHBvcnQgaW5zdGFsbCgpIGZ1bmN0aW9uYCxcbiAgICAgICk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBjb25uZWN0IHRvIHdhbGxldFxuICAgKlxuICAgKiBAc2VlIFdhbGxldCNjb25uZWN0XG4gICAqL1xuICBjb25uZWN0ID0gYXN5bmMgKF90eXBlPzogQ29ubmVjdFR5cGUsIF9pZGVudGlmaWVyPzogc3RyaW5nKSA9PiB7XG4gICAgbGV0IHR5cGU6IENvbm5lY3RUeXBlO1xuICAgIGxldCBpZGVudGlmaWVyOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICBpZiAoISFfdHlwZSkge1xuICAgICAgdHlwZSA9IF90eXBlO1xuICAgICAgaWRlbnRpZmllciA9IF9pZGVudGlmaWVyO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBjb25uZWN0aW9ucyA9IGF3YWl0IGZpcnN0VmFsdWVGcm9tKHRoaXMuYXZhaWxhYmxlQ29ubmVjdGlvbnMoKSk7XG4gICAgICBjb25zdCBzZWxlY3RvciA9IHRoaXMub3B0aW9ucy5zZWxlY3RDb25uZWN0aW9uID8/IHNlbGVjdENvbm5lY3Rpb247XG4gICAgICBjb25zdCBzZWxlY3RlZCA9IGF3YWl0IHNlbGVjdG9yKGNvbm5lY3Rpb25zKTtcblxuICAgICAgaWYgKCFzZWxlY3RlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHR5cGUgPSBzZWxlY3RlZFswXTtcbiAgICAgIGlkZW50aWZpZXIgPSBzZWxlY3RlZFsxXTtcbiAgICB9XG4gICAgbGV0IG5ldHdvcmtzOiBOZXR3b3JrSW5mb1tdO1xuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSBDb25uZWN0VHlwZS5SRUFET05MWTpcbiAgICAgICAgbmV0d29ya3MgPSBPYmplY3Qua2V5cyh0aGlzLm9wdGlvbnMud2FsbGV0Q29ubmVjdENoYWluSWRzKS5tYXAoXG4gICAgICAgICAgKGNoYWluSWQpID0+IHRoaXMub3B0aW9ucy53YWxsZXRDb25uZWN0Q2hhaW5JZHNbK2NoYWluSWRdLFxuICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IGNyZWF0ZVJlYWRvbmx5V2FsbGV0U2Vzc2lvbiA9XG4gICAgICAgICAgdGhpcy5vcHRpb25zLmNyZWF0ZVJlYWRvbmx5V2FsbGV0U2Vzc2lvbj8uKG5ldHdvcmtzKSA/P1xuICAgICAgICAgIHJlYWRvbmx5V2FsbGV0TW9kYWwoeyBuZXR3b3JrcyB9KTtcblxuICAgICAgICBjb25zdCByZWFkb25seVdhbGxldFNlc3Npb24gPSBhd2FpdCBjcmVhdGVSZWFkb25seVdhbGxldFNlc3Npb247XG5cbiAgICAgICAgaWYgKHJlYWRvbmx5V2FsbGV0U2Vzc2lvbikge1xuICAgICAgICAgIHRoaXMuZW5hYmxlUmVhZG9ubHlXYWxsZXQocmVDb25uZWN0KHJlYWRvbmx5V2FsbGV0U2Vzc2lvbikpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBDb25uZWN0VHlwZS5XQUxMRVRDT05ORUNUOlxuICAgICAgICB0aGlzLmVuYWJsZVdhbGxldENvbm5lY3Qod2NDb25uZWN0KHRoaXMub3B0aW9ucykpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQ29ubmVjdFR5cGUuRVhURU5TSU9OOlxuICAgICAgICBpZiAoIXRoaXMuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBleHRlbnNpb24gaW5zdGFuY2UgaXMgbm90IGNyZWF0ZWQhYCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5leHRlbnNpb24uY29ubmVjdChpZGVudGlmaWVyKTtcbiAgICAgICAgdGhpcy5lbmFibGVFeHRlbnNpb24oKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIENvbm5lY3RUeXBlLlBMVUdJTlM6XG4gICAgICAgIG5ldHdvcmtzID0gT2JqZWN0LmtleXModGhpcy5vcHRpb25zLndhbGxldENvbm5lY3RDaGFpbklkcykubWFwKFxuICAgICAgICAgIChjaGFpbklkKSA9PiB0aGlzLm9wdGlvbnMud2FsbGV0Q29ubmVjdENoYWluSWRzWytjaGFpbklkXSxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKCF0aGlzLm9wdGlvbnMucGx1Z2lucyB8fCB0aGlzLm9wdGlvbnMucGx1Z2lucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYG5vdCBwbHVnaW5zIGZvdW5kYCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcGx1Z2luID0gdGhpcy5vcHRpb25zLnBsdWdpbnM/LmZpbmQoKHApID0+IHtcbiAgICAgICAgICByZXR1cm4gcC5pZGVudGlmaWVyID09PSBpZGVudGlmaWVyO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXBsdWdpbikge1xuICAgICAgICAgIHBsdWdpbiA9IHRoaXMub3B0aW9ucy5wbHVnaW5zWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IGF3YWl0IHBsdWdpbi5jcmVhdGVTZXNzaW9uKG5ldHdvcmtzKTtcbiAgICAgICAgaWYgKCFzZXNzaW9uKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBlcnJvciBnZXR0aW5nIHdlYjNzZXNzaW9uYCk7XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgc2Vzc2lvbi5jb25uZWN0KCk7XG4gICAgICAgIHRoaXMuZW5hYmxlV2FsbGV0UGx1Z2luKHBsdWdpbiwgc2Vzc2lvbik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIENvbm5lY3RUeXBlIWApO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogbWFudWFsIGNvbm5lY3QgdG8gcmVhZCBvbmx5IHNlc3Npb25cbiAgICpcbiAgICogQHNlZSBXYWxsZXQjY29ubmVjdFJlYWRvbmx5XG4gICAqL1xuICBjb25uZWN0UmVhZG9ubHkgPSAodGVycmFBZGRyZXNzOiBzdHJpbmcsIG5ldHdvcms6IE5ldHdvcmtJbmZvKSA9PiB7XG4gICAgdGhpcy5lbmFibGVSZWFkb25seVdhbGxldChcbiAgICAgIHJlQ29ubmVjdCh7XG4gICAgICAgIHRlcnJhQWRkcmVzcyxcbiAgICAgICAgbmV0d29yayxcbiAgICAgIH0pLFxuICAgICk7XG4gIH07XG5cbiAgLyoqIEBzZWUgV2FsbGV0I2Rpc2Nvbm5lY3QgKi9cbiAgZGlzY29ubmVjdCA9ICgpID0+IHtcbiAgICB0aGlzLmRpc2FibGVSZWFkb25seVdhbGxldD8uKCk7XG4gICAgdGhpcy5kaXNhYmxlUmVhZG9ubHlXYWxsZXQgPSBudWxsO1xuXG4gICAgdGhpcy5kaXNhYmxlRXh0ZW5zaW9uPy4oKTtcbiAgICB0aGlzLmRpc2FibGVFeHRlbnNpb24gPSBudWxsO1xuXG4gICAgdGhpcy5kaXNhYmxlV2FsbGV0Q29ubmVjdD8uKCk7XG4gICAgdGhpcy5kaXNhYmxlV2FsbGV0Q29ubmVjdCA9IG51bGw7XG5cbiAgICB0aGlzLmRpc2FibGVXYWxsZXRQbHVnaW4/LigpO1xuICAgIHRoaXMuZGlzYWJsZVdhbGxldFBsdWdpbiA9IG51bGw7XG5cbiAgICB0aGlzLnVwZGF0ZVN0YXRlcyh0aGlzLl9ub3RDb25uZWN0ZWQpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAc2VlIFdhbGxldCNwb3N0XG4gICAqIEBwYXJhbSB0eFxuICAgKiBAcGFyYW0gdGVycmFBZGRyZXNzIG9ubHkgYXZhaWxhYmxlIG5ldyBleHRlbnNpb25cbiAgICovXG4gIHBvc3QgPSBhc3luYyAoXG4gICAgdHg6IEV4dGVuc2lvbk9wdGlvbnMsXG4gICAgdGVycmFBZGRyZXNzPzogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICApOiBQcm9taXNlPFR4UmVzdWx0PiA9PiB7XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gZXh0ZW5zaW9uXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgaWYgKHRoaXMuZGlzYWJsZUV4dGVuc2lvbikge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPFR4UmVzdWx0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGlmICghdGhpcy5leHRlbnNpb24pIHtcbiAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBleHRlbnNpb24gaW5zdGFuY2Ugbm90IGNyZWF0ZWQhYCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRoaXMuZXh0ZW5zaW9uLnBvc3QodHgsIHRlcnJhQWRkcmVzcykuc3Vic2NyaWJlKHtcbiAgICAgICAgICBuZXh0OiAodHhSZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGlmICh0eFJlc3VsdC5zdGF0dXMgPT09IFdlYkV4dGVuc2lvblR4U3RhdHVzLlNVQ0NFRUQpIHtcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgLi4udHgsXG4gICAgICAgICAgICAgICAgcmVzdWx0OiB0eFJlc3VsdC5wYXlsb2FkLFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIHJlamVjdChtYXBFeHRlbnNpb25UeEVycm9yKHR4LCBlcnJvcikpO1xuICAgICAgICAgICAgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gd2FsbGV0IGNvbm5lY3RcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBlbHNlIGlmICh0aGlzLndhbGxldENvbm5lY3QpIHtcbiAgICAgIHJldHVybiB0aGlzLndhbGxldENvbm5lY3RcbiAgICAgICAgLnBvc3QodHgpXG4gICAgICAgIC50aGVuKFxuICAgICAgICAgIChyZXN1bHQpID0+XG4gICAgICAgICAgKHtcbiAgICAgICAgICAgIC4uLnR4LFxuICAgICAgICAgICAgcmVzdWx0LFxuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICB9IGFzIFR4UmVzdWx0KSxcbiAgICAgICAgKVxuICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgdGhyb3cgbWFwV2FsbGV0Q29ubmVjdEVycm9yKHR4LCBlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodGhpcy5wbHVnaW4pIHtcbiAgICAgIHJldHVybiB0aGlzLnBsdWdpbi5wb3N0KHR4KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgdGhyb3cgbWFwRXh0ZW5zaW9uU2lnbkJ5dGVzRXJyb3IoQnVmZmVyLmZyb20oJycpLCBlcnJvcik7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGVyZSBhcmUgbm8gY29ubmVjdGlvbnMgdGhhdCBjYW4gYmUgcG9zdGluZyB0eCFgKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEBzZWUgV2FsbGV0I3NpZ25cbiAgICogQHBhcmFtIHR4XG4gICAqIEBwYXJhbSB0ZXJyYUFkZHJlc3Mgb25seSBhdmFpbGFibGUgbmV3IGV4dGVuc2lvblxuICAgKi9cbiAgc2lnbiA9IGFzeW5jIChcbiAgICB0eDogRXh0ZW5zaW9uT3B0aW9ucyxcbiAgICB0ZXJyYUFkZHJlc3M/OiBzdHJpbmcsXG4gICk6IFByb21pc2U8U2lnblJlc3VsdD4gPT4ge1xuICAgIGlmICh0aGlzLmRpc2FibGVFeHRlbnNpb24pIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxTaWduUmVzdWx0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGlmICghdGhpcy5leHRlbnNpb24pIHtcbiAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBleHRlbnNpb24gaW5zdGFuY2UgaXMgbm90IGNyZWF0ZWQhYCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRoaXMuZXh0ZW5zaW9uLnNpZ24odHgsIHRlcnJhQWRkcmVzcykuc3Vic2NyaWJlKHtcbiAgICAgICAgICBuZXh0OiAodHhSZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGlmICh0eFJlc3VsdC5zdGF0dXMgPT09IFdlYkV4dGVuc2lvblR4U3RhdHVzLlNVQ0NFRUQpIHtcbiAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgLi4udHgsXG4gICAgICAgICAgICAgICAgcmVzdWx0OiBUeC5mcm9tRGF0YSh0eFJlc3VsdC5wYXlsb2FkKSxcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogKGVycm9yKSA9PiB7XG4gICAgICAgICAgICByZWplY3QobWFwRXh0ZW5zaW9uVHhFcnJvcih0eCwgZXJyb3IpKTtcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBzaWduKCkgbWV0aG9kIG9ubHkgYXZhaWxhYmxlIG9uIGV4dGVuc2lvbmApO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAc2VlIFdhbGxldCNzaWduQnl0ZXNcbiAgICogQHBhcmFtIGJ5dGVzXG4gICAqIEBwYXJhbSB0ZXJyYUFkZHJlc3Mgb25seSBhdmFpbGFibGUgbmV3IGV4dGVuc2lvblxuICAgKi9cbiAgc2lnbkJ5dGVzID0gYXN5bmMgKFxuICAgIGJ5dGVzOiBCdWZmZXIsXG4gICAgdGVycmFBZGRyZXNzPzogc3RyaW5nLFxuICApOiBQcm9taXNlPFNpZ25CeXRlc1Jlc3VsdD4gPT4ge1xuICAgIGlmICh0aGlzLmRpc2FibGVFeHRlbnNpb24pIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxTaWduQnl0ZXNSZXN1bHQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgaWYgKCF0aGlzLmV4dGVuc2lvbikge1xuICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYGV4dGVuc2lvbiBpbnN0YW5jZSBpcyBub3QgY3JlYXRlZCFgKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gdGhpcy5leHRlbnNpb25cbiAgICAgICAgICAuc2lnbkJ5dGVzKGJ5dGVzLCB0ZXJyYUFkZHJlc3MpXG4gICAgICAgICAgLnN1YnNjcmliZSh7XG4gICAgICAgICAgICBuZXh0OiAodHhSZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHR4UmVzdWx0LnN0YXR1cyA9PT0gV2ViRXh0ZW5zaW9uVHhTdGF0dXMuU1VDQ0VFRCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICAgICAgICAgIHJlY2lkOiB0eFJlc3VsdC5wYXlsb2FkLnJlY2lkLFxuICAgICAgICAgICAgICAgICAgICBzaWduYXR1cmU6IFVpbnQ4QXJyYXkuZnJvbShcbiAgICAgICAgICAgICAgICAgICAgICBCdWZmZXIuZnJvbSh0eFJlc3VsdC5wYXlsb2FkLnNpZ25hdHVyZSwgJ2Jhc2U2NCcpLFxuICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICAgICBwdWJsaWNfa2V5OiB0eFJlc3VsdC5wYXlsb2FkLnB1YmxpY19rZXlcbiAgICAgICAgICAgICAgICAgICAgICA/IFB1YmxpY0tleS5mcm9tRGF0YSh0eFJlc3VsdC5wYXlsb2FkLnB1YmxpY19rZXkpXG4gICAgICAgICAgICAgICAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVycm9yOiAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgcmVqZWN0KG1hcEV4dGVuc2lvblNpZ25CeXRlc0Vycm9yKGJ5dGVzLCBlcnJvcikpO1xuICAgICAgICAgICAgICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gd2FsbGV0IGNvbm5lY3RcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBlbHNlIGlmICh0aGlzLndhbGxldENvbm5lY3QpIHtcbiAgICAgIHJldHVybiB0aGlzLndhbGxldENvbm5lY3RcbiAgICAgICAgLnNpZ25CeXRlcyhieXRlcylcbiAgICAgICAgLnRoZW4oXG4gICAgICAgICAgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qga2V5ID0gbmV3IFNpbXBsZVB1YmxpY0tleShTdHJpbmcocmVzdWx0LnB1YmxpY19rZXkpKS50b0RhdGEoKVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICAgICAgcmVjaWQ6IHJlc3VsdC5yZWNpZCxcbiAgICAgICAgICAgICAgICBzaWduYXR1cmU6IFVpbnQ4QXJyYXkuZnJvbShcbiAgICAgICAgICAgICAgICAgIEJ1ZmZlci5mcm9tKHJlc3VsdC5zaWduYXR1cmUsICdiYXNlNjQnKSxcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgIHB1YmxpY19rZXk6IGtleVxuICAgICAgICAgICAgICAgICAgPyBQdWJsaWNLZXkuZnJvbURhdGEoa2V5KVxuICAgICAgICAgICAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICApXG4gICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICB0aHJvdyBtYXBXYWxsZXRDb25uZWN0U2lnbkJ5dGVzRXJyb3IoYnl0ZXMsIGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlcmUgYXJlIG5vIGNvbm5lY3Rpb25zIHRoYXQgY2FuIGJlIHNpZ25pbmcgYnl0ZXMhYCk7XG4gICAgfVxuXG4gIH07XG5cbiAgLyoqXG4gICAqIEBzZWUgV2FsbGV0I2hhc0NXMjBUb2tlbnNcbiAgICogQHBhcmFtIGNoYWluSURcbiAgICogQHBhcmFtIHRva2VuQWRkcnMgVG9rZW4gYWRkcmVzc2VzXG4gICAqL1xuICBoYXNDVzIwVG9rZW5zID0gYXN5bmMgKFxuICAgIGNoYWluSUQ6IHN0cmluZyxcbiAgICAuLi50b2tlbkFkZHJzOiBzdHJpbmdbXVxuICApOiBQcm9taXNlPHsgW3Rva2VuQWRkcjogc3RyaW5nXTogYm9vbGVhbiB9PiA9PiB7XG4gICAgaWYgKHRoaXMuYXZhaWxhYmxlRXh0ZW5zaW9uRmVhdHVyZSgnY3cyMC10b2tlbicpKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHRlbnNpb24hLmhhc0NXMjBUb2tlbnMoY2hhaW5JRCwgLi4udG9rZW5BZGRycyk7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBEb2VzIG5vdCBzdXBwb3J0IGhhc0NXMjBUb2tlbnMoKSBvbiB0aGlzIGNvbm5lY3Rpb25gKTtcbiAgfTtcblxuICAvKipcbiAgICogQHNlZSBXYWxsZXQjYWRkQ1cyMFRva2Vuc1xuICAgKiBAcGFyYW0gY2hhaW5JRFxuICAgKiBAcGFyYW0gdG9rZW5BZGRycyBUb2tlbiBhZGRyZXNzZXNcbiAgICovXG4gIGFkZENXMjBUb2tlbnMgPSBhc3luYyAoXG4gICAgY2hhaW5JRDogc3RyaW5nLFxuICAgIC4uLnRva2VuQWRkcnM6IHN0cmluZ1tdXG4gICk6IFByb21pc2U8eyBbdG9rZW5BZGRyOiBzdHJpbmddOiBib29sZWFuIH0+ID0+IHtcbiAgICBpZiAodGhpcy5hdmFpbGFibGVFeHRlbnNpb25GZWF0dXJlKCdjdzIwLXRva2VuJykpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4dGVuc2lvbiEuYWRkQ1cyMFRva2VucyhjaGFpbklELCAuLi50b2tlbkFkZHJzKTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYERvZXMgbm90IHN1cHBvcnQgYWRkQ1cyMFRva2VucygpIG9uIHRoaXMgY29ubmVjdGlvbmApO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAc2VlIFdhbGxldCNoYXNOZXR3b3JrXG4gICAqIEBwYXJhbSBuZXR3b3JrXG4gICAqL1xuICBoYXNOZXR3b3JrID0gKG5ldHdvcms6IE9taXQ8TmV0d29ya0luZm8sICduYW1lJz4pOiBQcm9taXNlPGJvb2xlYW4+ID0+IHtcbiAgICBpZiAodGhpcy5hdmFpbGFibGVFeHRlbnNpb25GZWF0dXJlKCduZXR3b3JrJykpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4dGVuc2lvbiEuaGFzTmV0d29yayhuZXR3b3JrKTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYERvZXMgbm90IHN1cHBvcnQgaGFzTmV0d29yaygpIG9uIHRoaXMgY29ubmVjdGlvbmApO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAc2VlIFdhbGxldCNoYXNOZXR3b3JrXG4gICAqIEBwYXJhbSBuZXR3b3JrXG4gICAqL1xuICBhZGROZXR3b3JrID0gKG5ldHdvcms6IE5ldHdvcmtJbmZvKTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgaWYgKHRoaXMuYXZhaWxhYmxlRXh0ZW5zaW9uRmVhdHVyZSgnbmV0d29yaycpKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHRlbnNpb24hLmFkZE5ldHdvcmsobmV0d29yayk7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBEb2VzIG5vdCBzdXBwb3J0IGFkZE5ldHdvcmsoKSBvbiB0aGlzIGNvbm5lY3Rpb25gKTtcbiAgfTtcblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIGludGVybmFsXG4gIC8vIGNvbm5lY3QgdHlwZSBjaGFuZ2luZ1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIHByaXZhdGUgYXZhaWxhYmxlRXh0ZW5zaW9uRmVhdHVyZSA9IChmZWF0dXJlOiBUZXJyYVdlYkV4dGVuc2lvbkZlYXR1cmVzKSA9PiB7XG4gICAgaWYgKHRoaXMuZGlzYWJsZUV4dGVuc2lvbiAmJiB0aGlzLmV4dGVuc2lvbikge1xuICAgICAgY29uc3Qgc3RhdGVzID0gdGhpcy5leHRlbnNpb24uZ2V0TGFzdFN0YXRlcygpO1xuXG4gICAgICByZXR1cm4gKFxuICAgICAgICBzdGF0ZXMudHlwZSA9PT0gRXh0ZW5zaW9uUm91dGVyU3RhdHVzLldBTExFVF9DT05ORUNURUQgJiZcbiAgICAgICAgc3RhdGVzLnN1cHBvcnRGZWF0dXJlcy5oYXMoZmVhdHVyZSlcbiAgICAgICk7XG4gICAgfVxuICB9O1xuXG4gIHByaXZhdGUgdXBkYXRlU3RhdGVzID0gKG5leHQ6IFdhbGxldFN0YXRlcykgPT4ge1xuICAgIGNvbnN0IHByZXYgPSB0aGlzLl9zdGF0ZXMuZ2V0VmFsdWUoKTtcblxuICAgIGlmIChcbiAgICAgIG5leHQuc3RhdHVzID09PSBXYWxsZXRTdGF0dXMuV0FMTEVUX0NPTk5FQ1RFRCAmJlxuICAgICAgbmV4dC53YWxsZXRzLmxlbmd0aCA9PT0gMFxuICAgICkge1xuICAgICAgbmV4dCA9IHtcbiAgICAgICAgc3RhdHVzOiBXYWxsZXRTdGF0dXMuV0FMTEVUX05PVF9DT05ORUNURUQsXG4gICAgICAgIG5ldHdvcms6IG5leHQubmV0d29yayxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKHByZXYuc3RhdHVzICE9PSBuZXh0LnN0YXR1cyB8fCAhZGVlcEVxdWFsKHByZXYsIG5leHQpKSB7XG4gICAgICB0aGlzLl9zdGF0ZXMubmV4dChuZXh0KTtcbiAgICB9XG4gIH07XG5cbiAgcHJpdmF0ZSBlbmFibGVSZWFkb25seVdhbGxldCA9IChyZWFkb25seVdhbGxldDogUmVhZG9ubHlXYWxsZXRDb250cm9sbGVyKSA9PiB7XG4gICAgdGhpcy5kaXNhYmxlV2FsbGV0Q29ubmVjdD8uKCk7XG4gICAgdGhpcy5kaXNhYmxlRXh0ZW5zaW9uPy4oKTtcblxuICAgIGlmIChcbiAgICAgIHRoaXMucmVhZG9ubHlXYWxsZXQgPT09IHJlYWRvbmx5V2FsbGV0IHx8XG4gICAgICAodGhpcy5yZWFkb25seVdhbGxldD8udGVycmFBZGRyZXNzID09PSByZWFkb25seVdhbGxldC50ZXJyYUFkZHJlc3MgJiZcbiAgICAgICAgdGhpcy5yZWFkb25seVdhbGxldC5uZXR3b3JrID09PSByZWFkb25seVdhbGxldC5uZXR3b3JrKVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnJlYWRvbmx5V2FsbGV0KSB7XG4gICAgICB0aGlzLnJlYWRvbmx5V2FsbGV0LmRpc2Nvbm5lY3QoKTtcbiAgICB9XG5cbiAgICB0aGlzLnJlYWRvbmx5V2FsbGV0ID0gcmVhZG9ubHlXYWxsZXQ7XG5cbiAgICB0aGlzLnVwZGF0ZVN0YXRlcyh7XG4gICAgICBzdGF0dXM6IFdhbGxldFN0YXR1cy5XQUxMRVRfQ09OTkVDVEVELFxuICAgICAgbmV0d29yazogcmVhZG9ubHlXYWxsZXQubmV0d29yayxcbiAgICAgIHdhbGxldHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNvbm5lY3RUeXBlOiBDb25uZWN0VHlwZS5SRUFET05MWSxcbiAgICAgICAgICBhZGRyZXNzZXM6IHsgW09iamVjdC52YWx1ZXMocmVhZG9ubHlXYWxsZXQubmV0d29yaykuZmluZCgoeyBwcmVmaXggfSkgPT4gQWNjQWRkcmVzcy5nZXRQcmVmaXgocmVhZG9ubHlXYWxsZXQudGVycmFBZGRyZXNzKSA9PT0gcHJlZml4KT8uY2hhaW5JRCA/PyBcIlwiXTogcmVhZG9ubHlXYWxsZXQudGVycmFBZGRyZXNzIH0sXG4gICAgICAgICAgZGVzaWduOiAncmVhZG9ubHknLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHN1cHBvcnRGZWF0dXJlczogRU1QVFlfU1VQUE9SVF9GRUFUVVJFUyxcbiAgICAgIGNvbm5lY3Rpb246IENPTk5FQ1RJT05TLlJFQURPTkxZLFxuICAgIH0pO1xuXG4gICAgdGhpcy5kaXNhYmxlUmVhZG9ubHlXYWxsZXQgPSAoKSA9PiB7XG4gICAgICByZWFkb25seVdhbGxldC5kaXNjb25uZWN0KCk7XG4gICAgICB0aGlzLnJlYWRvbmx5V2FsbGV0ID0gbnVsbDtcbiAgICAgIHRoaXMuZGlzYWJsZVJlYWRvbmx5V2FsbGV0ID0gbnVsbDtcbiAgICB9O1xuICB9O1xuXG4gIHByaXZhdGUgZW5hYmxlRXh0ZW5zaW9uID0gKCkgPT4ge1xuICAgIHRoaXMuZGlzYWJsZVJlYWRvbmx5V2FsbGV0Py4oKTtcbiAgICB0aGlzLmRpc2FibGVXYWxsZXRDb25uZWN0Py4oKTtcblxuICAgIGlmICh0aGlzLmRpc2FibGVFeHRlbnNpb24gfHwgIXRoaXMuZXh0ZW5zaW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgZXh0ZW5zaW9uU3Vic2NyaXB0aW9uID0gdGhpcy5leHRlbnNpb24uc3RhdGVzKCkuc3Vic2NyaWJlKHtcbiAgICAgIG5leHQ6IChleHRlbnNpb25TdGF0ZXMpID0+IHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGV4dGVuc2lvblN0YXRlcy50eXBlID09PSBFeHRlbnNpb25Sb3V0ZXJTdGF0dXMuV0FMTEVUX0NPTk5FQ1RFRFxuICAgICAgICAgIC8vICYmIEFjY0FkZHJlc3MudmFsaWRhdGUoZXh0ZW5zaW9uU3RhdGVzLndhbGxldC50ZXJyYUFkZHJlc3MpXG4gICAgICAgICkge1xuICAgICAgICAgIFxuICAgICAgICAgIHRoaXMudXBkYXRlU3RhdGVzKHtcbiAgICAgICAgICAgIHN0YXR1czogV2FsbGV0U3RhdHVzLldBTExFVF9DT05ORUNURUQsXG4gICAgICAgICAgICBuZXR3b3JrOiBleHRlbnNpb25TdGF0ZXMubmV0d29yayxcbiAgICAgICAgICAgIHdhbGxldHM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbm5lY3RUeXBlOiBDb25uZWN0VHlwZS5FWFRFTlNJT04sXG4gICAgICAgICAgICAgICAgYWRkcmVzc2VzOiBleHRlbnNpb25TdGF0ZXMud2FsbGV0LmFkZHJlc3NlcyxcbiAgICAgICAgICAgICAgICBkZXNpZ246IGV4dGVuc2lvblN0YXRlcy53YWxsZXQuZGVzaWduLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIHN1cHBvcnRGZWF0dXJlczogZXh0ZW5zaW9uU3RhdGVzLnN1cHBvcnRGZWF0dXJlcyxcbiAgICAgICAgICAgIGNvbm5lY3Rpb246IG1lbW9Db25uZWN0aW9uKFxuICAgICAgICAgICAgICBDb25uZWN0VHlwZS5FWFRFTlNJT04sXG4gICAgICAgICAgICAgIGV4dGVuc2lvblN0YXRlcy5leHRlbnNpb25JbmZvLm5hbWUsXG4gICAgICAgICAgICAgIGV4dGVuc2lvblN0YXRlcy5leHRlbnNpb25JbmZvLmljb24sXG4gICAgICAgICAgICAgIGV4dGVuc2lvblN0YXRlcy5leHRlbnNpb25JbmZvLmlkZW50aWZpZXIsXG4gICAgICAgICAgICApLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMudXBkYXRlU3RhdGVzKHRoaXMuX25vdENvbm5lY3RlZCk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmRpc2FibGVFeHRlbnNpb24gPSAoKSA9PiB7XG4gICAgICB0aGlzLmV4dGVuc2lvbj8uZGlzY29ubmVjdCgpO1xuICAgICAgZXh0ZW5zaW9uU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICB0aGlzLmRpc2FibGVFeHRlbnNpb24gPSBudWxsO1xuICAgIH07XG4gIH07XG5cbiAgcHJpdmF0ZSBlbmFibGVXYWxsZXRDb25uZWN0ID0gKHdhbGxldENvbm5lY3Q6IFdhbGxldENvbm5lY3RDb250cm9sbGVyKSA9PiB7XG4gICAgdGhpcy5kaXNhYmxlUmVhZG9ubHlXYWxsZXQ/LigpO1xuICAgIHRoaXMuZGlzYWJsZUV4dGVuc2lvbj8uKCk7XG5cbiAgICBpZiAodGhpcy53YWxsZXRDb25uZWN0ID09PSB3YWxsZXRDb25uZWN0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMud2FsbGV0Q29ubmVjdCkge1xuICAgICAgdGhpcy53YWxsZXRDb25uZWN0LmRpc2Nvbm5lY3QoKTtcbiAgICB9XG5cbiAgICB0aGlzLndhbGxldENvbm5lY3QgPSB3YWxsZXRDb25uZWN0O1xuXG4gICAgY29uc3Qgc3Vic2NyaWJlV2FsbGV0Q29ubmVjdCA9IChcbiAgICAgIHdjOiBXYWxsZXRDb25uZWN0Q29udHJvbGxlcixcbiAgICApOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgcmV0dXJuIHdjLnNlc3Npb24oKS5zdWJzY3JpYmUoe1xuICAgICAgICBuZXh0OiAoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgc3dpdGNoIChzdGF0dXMuc3RhdHVzKSB7XG4gICAgICAgICAgICBjYXNlIFdhbGxldENvbm5lY3RTZXNzaW9uU3RhdHVzLkNPTk5FQ1RFRDpcbiAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0ZXMoe1xuICAgICAgICAgICAgICAgIHN0YXR1czogV2FsbGV0U3RhdHVzLldBTExFVF9DT05ORUNURUQsXG4gICAgICAgICAgICAgICAgbmV0d29yazpcbiAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy53YWxsZXRDb25uZWN0Q2hhaW5JZHNbc3RhdHVzLmNoYWluSWRdID8/XG4gICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMuZGVmYXVsdE5ldHdvcmssXG4gICAgICAgICAgICAgICAgd2FsbGV0czogW1xuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBjb25uZWN0VHlwZTogQ29ubmVjdFR5cGUuV0FMTEVUQ09OTkVDVCxcbiAgICAgICAgICAgICAgICAgICAgLy8gRklYTUU6IEludGVyY2hhaW4gV2FsbGV0Q29ubmVjdFxuICAgICAgICAgICAgICAgICAgICBhZGRyZXNzZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICBbT2JqZWN0LnZhbHVlcyh0aGlzLm9wdGlvbnMud2FsbGV0Q29ubmVjdENoYWluSWRzW3N0YXR1cy5jaGFpbklkXSA/P1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmRlZmF1bHROZXR3b3JrKS5maW5kKCh7IHByZWZpeCB9KSA9PiBBY2NBZGRyZXNzLmdldFByZWZpeChzdGF0dXMudGVycmFBZGRyZXNzKSA9PT0gcHJlZml4KT8uY2hhaW5JRCA/PyBcIlwiXTogc3RhdHVzLnRlcnJhQWRkcmVzc1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBkZXNpZ246ICd3YWxsZXRjb25uZWN0JyxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBzdXBwb3J0RmVhdHVyZXM6IFdBTExFVENPTk5FQ1RfU1VQUE9SVF9GRUFUVVJFUyxcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9uOiBDT05ORUNUSU9OUy5XQUxMRVRDT05ORUNULFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlcyh0aGlzLl9ub3RDb25uZWN0ZWQpO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgY29uc3Qgd2FsbGV0Q29ubmVjdFNlc3Npb25TdWJzY3JpcHRpb24gPVxuICAgICAgc3Vic2NyaWJlV2FsbGV0Q29ubmVjdCh3YWxsZXRDb25uZWN0KTtcblxuICAgIHRoaXMuZGlzYWJsZVdhbGxldENvbm5lY3QgPSAoKSA9PiB7XG4gICAgICB0aGlzLndhbGxldENvbm5lY3Q/LmRpc2Nvbm5lY3QoKTtcbiAgICAgIHRoaXMud2FsbGV0Q29ubmVjdCA9IG51bGw7XG4gICAgICB3YWxsZXRDb25uZWN0U2Vzc2lvblN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgdGhpcy5kaXNhYmxlV2FsbGV0Q29ubmVjdCA9IG51bGw7XG4gICAgfTtcbiAgfTtcblxuICBwcml2YXRlIGVuYWJsZVdhbGxldFBsdWdpbiA9IChcbiAgICBwbHVnaW46IFdhbGxldFBsdWdpbixcbiAgICBzZXNzaW9uOiBXYWxsZXRQbHVnaW5TZXNzaW9uLFxuICApID0+IHtcbiAgICB0aGlzLmRpc2FibGVSZWFkb25seVdhbGxldD8uKCk7XG4gICAgdGhpcy5kaXNhYmxlRXh0ZW5zaW9uPy4oKTtcbiAgICB0aGlzLmRpc2FibGVXYWxsZXRDb25uZWN0Py4oKTtcblxuICAgIHRoaXMucGx1Z2luID0gc2Vzc2lvbjtcbiAgICB0aGlzLnVwZGF0ZVN0YXRlcyh7XG4gICAgICBzdGF0dXM6IFdhbGxldFN0YXR1cy5XQUxMRVRfQ09OTkVDVEVELFxuICAgICAgbmV0d29yazogc2Vzc2lvbi5uZXR3b3JrISxcbiAgICAgIHdhbGxldHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNvbm5lY3RUeXBlOiBDb25uZWN0VHlwZS5QTFVHSU5TLFxuICAgICAgICAgIGFkZHJlc3Nlczogc2Vzc2lvbi5hZGRyZXNzZXMgPz8ge30sXG4gICAgICAgICAgbWV0YWRhdGE6IHNlc3Npb24uZ2V0TWV0YWRhdGEgJiYgc2Vzc2lvbi5nZXRNZXRhZGF0YSgpLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIHN1cHBvcnRGZWF0dXJlczogV0FMTEVUQ09OTkVDVF9TVVBQT1JUX0ZFQVRVUkVTLFxuICAgICAgY29ubmVjdGlvbjogbWVtb0Nvbm5lY3Rpb24oQ29ubmVjdFR5cGUuUExVR0lOUywgcGx1Z2luLm5hbWUsIHBsdWdpbi5pY29uKSxcbiAgICB9KTtcbiAgICB0aGlzLmRpc2FibGVXYWxsZXRQbHVnaW4gPSAoKSA9PiB7XG4gICAgICB0aGlzLmRpc2FibGVXYWxsZXRQbHVnaW4gPSBudWxsO1xuICAgICAgdGhpcy5wbHVnaW4/LmRpc2Nvbm5lY3QoKTtcbiAgICAgIHRoaXMucGx1Z2luID0gbnVsbDtcbiAgICB9O1xuICB9O1xufVxuXG5jb25zdCBtZW1vaXplZENvbm5lY3Rpb25zID0gbmV3IE1hcDxzdHJpbmcsIENvbm5lY3Rpb24+KCk7XG5cbmZ1bmN0aW9uIG1lbW9Db25uZWN0aW9uKFxuICBjb25uZWN0VHlwZTogQ29ubmVjdFR5cGUsXG4gIG5hbWU6IHN0cmluZyxcbiAgaWNvbjogc3RyaW5nLFxuICBpZGVudGlmaWVyOiBzdHJpbmcgfCB1bmRlZmluZWQgPSAnJyxcbik6IENvbm5lY3Rpb24ge1xuICBjb25zdCBrZXkgPSBbY29ubmVjdFR5cGUsIG5hbWUsIGljb24sIGlkZW50aWZpZXJdLmpvaW4oJzsnKTtcblxuICBpZiAobWVtb2l6ZWRDb25uZWN0aW9ucy5oYXMoa2V5KSkge1xuICAgIHJldHVybiBtZW1vaXplZENvbm5lY3Rpb25zLmdldChrZXkpITtcbiAgfVxuXG4gIGNvbnN0IGNvbm5lY3Rpb246IENvbm5lY3Rpb24gPSB7XG4gICAgdHlwZTogY29ubmVjdFR5cGUsXG4gICAgbmFtZSxcbiAgICBpY29uLFxuICAgIGlkZW50aWZpZXIsXG4gIH07XG5cbiAgbWVtb2l6ZWRDb25uZWN0aW9ucy5zZXQoa2V5LCBjb25uZWN0aW9uKTtcblxuICByZXR1cm4gY29ubmVjdGlvbjtcbn1cbiJdfQ==