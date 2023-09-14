import { AccAddress, PublicKey, SimplePublicKey, Tx, } from '@terra-money/feather.js';
import { ConnectType, WalletStatus, } from '@nestwallet/wallet-types';
import { WebExtensionTxStatus, } from '@nestwallet/web-extension-interface';
import deepEqual from 'fast-deep-equal';
import { BehaviorSubject, combineLatest, firstValueFrom, } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { CHROME_EXTENSION_INSTALL_URL, DEFAULT_CHROME_EXTENSION_COMPATIBLE_BROWSER_CHECK, } from './env';
import { mapExtensionSignBytesError, mapExtensionTxError, } from './exception/mapExtensionTxError';
import { mapWalletConnectError, mapWalletConnectSignBytesError } from './exception/mapWalletConnectError';
import { selectConnection } from './modules/connect-modal';
import { ExtensionRouter, ExtensionRouterStatus, } from './modules/extension-router';
import { getTerraExtensions, } from './modules/extension-router/multiChannel';
import { connect as reConnect, connectIfSessionExists as reConnectIfSessionExists, readonlyWalletModal, } from './modules/readonly-wallet';
import { connect as wcConnect, connectIfSessionExists as wcConnectIfSessionExists, WalletConnectSessionStatus, } from './modules/walletconnect';
import { getExtensions } from './operators/getExtensions';
import { toConnectedWallet } from './operators/toConnectedWallet';
import { toLcdClient } from './operators/toLcdClient';
import { isDesktopChrome } from './utils/browser-check';
import { checkExtensionReady } from './utils/checkExtensionReady';
import { sortConnections } from './utils/sortConnections';
const CONNECTIONS = {
    [ConnectType.READONLY]: {
        type: ConnectType.READONLY,
        name: 'View an address',
        icon: 'https://assets.terra.dev/icon/wallet-provider/readonly.svg',
    },
    [ConnectType.WALLETCONNECT]: {
        type: ConnectType.WALLETCONNECT,
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
export class WalletController {
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
            return ((_a = this.options.dangerously__chromeExtensionCompatibleBrowserCheck) !== null && _a !== void 0 ? _a : DEFAULT_CHROME_EXTENSION_COMPATIBLE_BROWSER_CHECK)(navigator.userAgent);
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
            return this._availableConnectTypes.pipe(map((connectTypes) => {
                const connections = [];
                for (const connectType of connectTypes) {
                    if (connectType === ConnectType.EXTENSION) {
                        const terraExtensions = getTerraExtensions();
                        for (const terraExtension of terraExtensions) {
                            connections.push(memoConnection(ConnectType.EXTENSION, terraExtension.name, terraExtension.icon, terraExtension.identifier));
                        }
                    }
                    else if (connectType === ConnectType.PLUGINS) {
                        for (const plugin of this.options.plugins || []) {
                            connections.push(memoConnection(ConnectType.PLUGINS, plugin.name, plugin.icon, plugin.identifier));
                        }
                    }
                    else {
                        connections.push(CONNECTIONS[connectType]);
                    }
                }
                return sortConnections(connections);
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
            return combineLatest([this.availableConnections(), getExtensions()]).pipe(map(([connections, extensions]) => {
                const installedIdentifiers = new Set(connections
                    .filter(({ type, identifier }) => {
                    return type === ConnectType.EXTENSION && !!identifier;
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
                        type: ConnectType.EXTENSION,
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
            return this._states.pipe(toConnectedWallet(this));
        };
        /** get lcdClient */
        this.lcdClient = (lcdClientConfig) => {
            return this._states.pipe(toLcdClient(lcdClientConfig));
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
            if (type === ConnectType.EXTENSION) {
                // TODO separate install links by browser types
                window.open(CHROME_EXTENSION_INSTALL_URL, '_blank');
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
                const connections = await firstValueFrom(this.availableConnections());
                const selector = (_a = this.options.selectConnection) !== null && _a !== void 0 ? _a : selectConnection;
                const selected = await selector(connections);
                if (!selected) {
                    return;
                }
                type = selected[0];
                identifier = selected[1];
            }
            let networks;
            switch (type) {
                case ConnectType.READONLY:
                    networks = Object.keys(this.options.walletConnectChainIds).map((chainId) => this.options.walletConnectChainIds[+chainId]);
                    const createReadonlyWalletSession = (_d = (_c = (_b = this.options).createReadonlyWalletSession) === null || _c === void 0 ? void 0 : _c.call(_b, networks)) !== null && _d !== void 0 ? _d : readonlyWalletModal({ networks });
                    const readonlyWalletSession = await createReadonlyWalletSession;
                    if (readonlyWalletSession) {
                        this.enableReadonlyWallet(reConnect(readonlyWalletSession));
                    }
                    break;
                case ConnectType.WALLETCONNECT:
                    this.enableWalletConnect(wcConnect(this.options));
                    break;
                case ConnectType.EXTENSION:
                    if (!this.extension) {
                        throw new Error(`extension instance is not created!`);
                    }
                    this.extension.connect(identifier);
                    this.enableExtension();
                    break;
                case ConnectType.PLUGINS:
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
            this.enableReadonlyWallet(reConnect({
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
                            if (txResult.status === WebExtensionTxStatus.SUCCEED) {
                                resolve({
                                    ...tx,
                                    result: txResult.payload,
                                    success: true,
                                });
                                subscription.unsubscribe();
                            }
                        },
                        error: (error) => {
                            reject(mapExtensionTxError(tx, error));
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
                    throw mapWalletConnectError(tx, error);
                });
            }
            else if (this.plugin) {
                return this.plugin.post(tx).catch((error) => {
                    throw mapExtensionSignBytesError(Buffer.from(''), error);
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
                            if (txResult.status === WebExtensionTxStatus.SUCCEED) {
                                resolve({
                                    ...tx,
                                    result: Tx.fromData(txResult.payload),
                                    success: true,
                                });
                                subscription.unsubscribe();
                            }
                        },
                        error: (error) => {
                            reject(mapExtensionTxError(tx, error));
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
                            if (txResult.status === WebExtensionTxStatus.SUCCEED) {
                                resolve({
                                    result: {
                                        recid: txResult.payload.recid,
                                        signature: Uint8Array.from(Buffer.from(txResult.payload.signature, 'base64')),
                                        public_key: txResult.payload.public_key
                                            ? PublicKey.fromData(txResult.payload.public_key)
                                            : undefined,
                                    },
                                    success: true,
                                });
                                subscription.unsubscribe();
                            }
                        },
                        error: (error) => {
                            reject(mapExtensionSignBytesError(bytes, error));
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
                    const key = new SimplePublicKey(String(result.public_key)).toData();
                    return {
                        result: {
                            recid: result.recid,
                            signature: Uint8Array.from(Buffer.from(result.signature, 'base64')),
                            public_key: key
                                ? PublicKey.fromData(key)
                                : undefined,
                        },
                        success: true,
                    };
                })
                    .catch((error) => {
                    throw mapWalletConnectSignBytesError(bytes, error);
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
                return (states.type === ExtensionRouterStatus.WALLET_CONNECTED &&
                    states.supportFeatures.has(feature));
            }
        };
        this.updateStates = (next) => {
            const prev = this._states.getValue();
            if (next.status === WalletStatus.WALLET_CONNECTED &&
                next.wallets.length === 0) {
                next = {
                    status: WalletStatus.WALLET_NOT_CONNECTED,
                    network: next.network,
                };
            }
            if (prev.status !== next.status || !deepEqual(prev, next)) {
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
                status: WalletStatus.WALLET_CONNECTED,
                network: readonlyWallet.network,
                wallets: [
                    {
                        connectType: ConnectType.READONLY,
                        addresses: { [(_e = (_d = Object.values(readonlyWallet.network).find(({ prefix }) => AccAddress.getPrefix(readonlyWallet.terraAddress) === prefix)) === null || _d === void 0 ? void 0 : _d.chainID) !== null && _e !== void 0 ? _e : ""]: readonlyWallet.terraAddress },
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
                    if (extensionStates.type === ExtensionRouterStatus.WALLET_CONNECTED
                    // && AccAddress.validate(extensionStates.wallet.terraAddress)
                    ) {
                        this.updateStates({
                            status: WalletStatus.WALLET_CONNECTED,
                            network: extensionStates.network,
                            wallets: [
                                {
                                    connectType: ConnectType.EXTENSION,
                                    addresses: extensionStates.wallet.addresses,
                                    design: extensionStates.wallet.design,
                                },
                            ],
                            supportFeatures: extensionStates.supportFeatures,
                            connection: memoConnection(ConnectType.EXTENSION, extensionStates.extensionInfo.name, extensionStates.extensionInfo.icon, extensionStates.extensionInfo.identifier),
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
                            case WalletConnectSessionStatus.CONNECTED:
                                this.updateStates({
                                    status: WalletStatus.WALLET_CONNECTED,
                                    network: (_a = this.options.walletConnectChainIds[status.chainId]) !== null && _a !== void 0 ? _a : this.options.defaultNetwork,
                                    wallets: [
                                        {
                                            connectType: ConnectType.WALLETCONNECT,
                                            // FIXME: Interchain WalletConnect
                                            addresses: {
                                                [(_d = (_c = Object.values((_b = this.options.walletConnectChainIds[status.chainId]) !== null && _b !== void 0 ? _b : this.options.defaultNetwork).find(({ prefix }) => AccAddress.getPrefix(status.terraAddress) === prefix)) === null || _c === void 0 ? void 0 : _c.chainID) !== null && _d !== void 0 ? _d : ""]: status.terraAddress
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
                status: WalletStatus.WALLET_CONNECTED,
                network: session.network,
                wallets: [
                    {
                        connectType: ConnectType.PLUGINS,
                        addresses: (_d = session.addresses) !== null && _d !== void 0 ? _d : {},
                        metadata: session.getMetadata && session.getMetadata(),
                    },
                ],
                supportFeatures: WALLETCONNECT_SUPPORT_FEATURES,
                connection: memoConnection(ConnectType.PLUGINS, plugin.name, plugin.icon),
            });
            this.disableWalletPlugin = () => {
                var _a;
                this.disableWalletPlugin = null;
                (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.disconnect();
                this.plugin = null;
            };
        };
        this._notConnected = {
            status: WalletStatus.WALLET_NOT_CONNECTED,
            network: options.defaultNetwork,
        };
        this._initializing = {
            status: WalletStatus.INITIALIZING,
            network: options.defaultNetwork,
        };
        const defaultConnectionTypes = [
            ConnectType.READONLY,
            ConnectType.WALLETCONNECT,
        ];
        if (this.options.plugins) {
            defaultConnectionTypes.push(ConnectType.PLUGINS);
        }
        this._availableConnectTypes = new BehaviorSubject(defaultConnectionTypes);
        this._availableInstallTypes = new BehaviorSubject([]);
        this._states = new BehaviorSubject(this._initializing);
        let numSessionCheck = 0;
        // wait checking the availability of the chrome extension
        // 0. check if extension wallet session is exists
        checkExtensionReady((_a = options.waitingChromeExtensionInstallCheck) !== null && _a !== void 0 ? _a : DEFAULT_WAITING_CHROME_EXTENSION_INSTALL_CHECK, this.isChromeExtensionCompatibleBrowser()).then((ready) => {
            var _a;
            if (ready) {
                this._availableConnectTypes.next([
                    ConnectType.EXTENSION,
                    ...defaultConnectionTypes,
                ]);
                this.extension = new ExtensionRouter({
                    hostWindow: window,
                    selectExtension: options.selectExtension,
                    dangerously__chromeExtensionCompatibleBrowserCheck: (_a = options.dangerously__chromeExtensionCompatibleBrowserCheck) !== null && _a !== void 0 ? _a : DEFAULT_CHROME_EXTENSION_COMPATIBLE_BROWSER_CHECK,
                    defaultNetwork: options.defaultNetwork,
                });
                const subscription = this.extension
                    .states()
                    .pipe(filter(({ type }) => type !== ExtensionRouterStatus.INITIALIZING))
                    .subscribe((extensionStates) => {
                    try {
                        subscription.unsubscribe();
                    }
                    catch (_a) { }
                    if (extensionStates.type === ExtensionRouterStatus.WALLET_CONNECTED &&
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
                if (isDesktopChrome(this.isChromeExtensionCompatibleBrowser())) {
                    this._availableInstallTypes.next([ConnectType.EXTENSION]);
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
        const draftReadonlyWallet = reConnectIfSessionExists();
        if (draftReadonlyWallet) {
            this.enableReadonlyWallet(draftReadonlyWallet);
            return;
        }
        // 2. check if walletconnect sesison is exists
        const draftWalletConnect = wcConnectIfSessionExists(options);
        if (draftWalletConnect &&
            draftWalletConnect.getLatestSession().status ===
                WalletConnectSessionStatus.CONNECTED) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9AdGVycmEtbW9uZXkvd2FsbGV0LWNvbnRyb2xsZXIvY29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQ0wsVUFBVSxFQUdWLFNBQVMsRUFDVCxlQUFlLEVBQ2YsRUFBRSxHQUNILE1BQU0seUJBQXlCLENBQUM7QUFDakMsT0FBTyxFQUdMLFdBQVcsRUFPWCxZQUFZLEdBQ2IsTUFBTSwyQkFBMkIsQ0FBQztBQUNuQyxPQUFPLEVBRUwsb0JBQW9CLEdBQ3JCLE1BQU0sc0NBQXNDLENBQUM7QUFDOUMsT0FBTyxTQUFTLE1BQU0saUJBQWlCLENBQUM7QUFDeEMsT0FBTyxFQUNMLGVBQWUsRUFDZixhQUFhLEVBQ2IsY0FBYyxHQUdmLE1BQU0sTUFBTSxDQUFDO0FBQ2QsT0FBTyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM3QyxPQUFPLEVBQ0wsNEJBQTRCLEVBQzVCLGlEQUFpRCxHQUNsRCxNQUFNLE9BQU8sQ0FBQztBQUNmLE9BQU8sRUFDTCwwQkFBMEIsRUFDMUIsbUJBQW1CLEdBQ3BCLE1BQU0saUNBQWlDLENBQUM7QUFDekMsT0FBTyxFQUNMLHFCQUFxQixFQUNyQiw4QkFBOEIsRUFDL0IsTUFBTSxtQ0FBbUMsQ0FBQztBQUMzQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUMzRCxPQUFPLEVBQ0wsZUFBZSxFQUNmLHFCQUFxQixHQUN0QixNQUFNLDRCQUE0QixDQUFDO0FBQ3BDLE9BQU8sRUFFTCxrQkFBa0IsR0FDbkIsTUFBTSx5Q0FBeUMsQ0FBQztBQUNqRCxPQUFPLEVBQ0wsT0FBTyxJQUFJLFNBQVMsRUFDcEIsc0JBQXNCLElBQUksd0JBQXdCLEVBRWxELG1CQUFtQixHQUVwQixNQUFNLDJCQUEyQixDQUFDO0FBS25DLE9BQU8sRUFDTCxPQUFPLElB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QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTENEQ2xpZW50Q29uZmlnIH0gZnJvbSAnQHRlcnJhLW1vbmV5L2ZlYXRoZXIuanMnO1xuaW1wb3J0IHtcbiAgQWNjQWRkcmVzcyxcbiAgRXh0ZW5zaW9uT3B0aW9ucyxcbiAgTENEQ2xpZW50LFxuICBQdWJsaWNLZXksXG4gIFNpbXBsZVB1YmxpY0tleSxcbiAgVHgsXG59IGZyb20gJ0B0ZXJyYS1tb25leS9mZWF0aGVyLmpzJztcbmltcG9ydCB7XG4gIENvbm5lY3RlZFdhbGxldCxcbiAgQ29ubmVjdGlvbixcbiAgQ29ubmVjdFR5cGUsXG4gIEluc3RhbGxhdGlvbixcbiAgTmV0d29ya0luZm8sXG4gIFNpZ25CeXRlc1Jlc3VsdCxcbiAgU2lnblJlc3VsdCxcbiAgVHhSZXN1bHQsXG4gIFdhbGxldFN0YXRlcyxcbiAgV2FsbGV0U3RhdHVzLFxufSBmcm9tICdAdGVycmEtbW9uZXkvd2FsbGV0LXR5cGVzJztcbmltcG9ydCB7XG4gIFRlcnJhV2ViRXh0ZW5zaW9uRmVhdHVyZXMsXG4gIFdlYkV4dGVuc2lvblR4U3RhdHVzLFxufSBmcm9tICdAdGVycmEtbW9uZXkvd2ViLWV4dGVuc2lvbi1pbnRlcmZhY2UnO1xuaW1wb3J0IGRlZXBFcXVhbCBmcm9tICdmYXN0LWRlZXAtZXF1YWwnO1xuaW1wb3J0IHtcbiAgQmVoYXZpb3JTdWJqZWN0LFxuICBjb21iaW5lTGF0ZXN0LFxuICBmaXJzdFZhbHVlRnJvbSxcbiAgT2JzZXJ2YWJsZSxcbiAgU3Vic2NyaXB0aW9uLFxufSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGZpbHRlciwgbWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtcbiAgQ0hST01FX0VYVEVOU0lPTl9JTlNUQUxMX1VSTCxcbiAgREVGQVVMVF9DSFJPTUVfRVhURU5TSU9OX0NPTVBBVElCTEVfQlJPV1NFUl9DSEVDSyxcbn0gZnJvbSAnLi9lbnYnO1xuaW1wb3J0IHtcbiAgbWFwRXh0ZW5zaW9uU2lnbkJ5dGVzRXJyb3IsXG4gIG1hcEV4dGVuc2lvblR4RXJyb3IsXG59IGZyb20gJy4vZXhjZXB0aW9uL21hcEV4dGVuc2lvblR4RXJyb3InO1xuaW1wb3J0IHtcbiAgbWFwV2FsbGV0Q29ubmVjdEVycm9yLFxuICBtYXBXYWxsZXRDb25uZWN0U2lnbkJ5dGVzRXJyb3Jcbn0gZnJvbSAnLi9leGNlcHRpb24vbWFwV2FsbGV0Q29ubmVjdEVycm9yJztcbmltcG9ydCB7IHNlbGVjdENvbm5lY3Rpb24gfSBmcm9tICcuL21vZHVsZXMvY29ubmVjdC1tb2RhbCc7XG5pbXBvcnQge1xuICBFeHRlbnNpb25Sb3V0ZXIsXG4gIEV4dGVuc2lvblJvdXRlclN0YXR1cyxcbn0gZnJvbSAnLi9tb2R1bGVzL2V4dGVuc2lvbi1yb3V0ZXInO1xuaW1wb3J0IHtcbiAgRXh0ZW5zaW9uSW5mbyxcbiAgZ2V0VGVycmFFeHRlbnNpb25zLFxufSBmcm9tICcuL21vZHVsZXMvZXh0ZW5zaW9uLXJvdXRlci9tdWx0aUNoYW5uZWwnO1xuaW1wb3J0IHtcbiAgY29ubmVjdCBhcyByZUNvbm5lY3QsXG4gIGNvbm5lY3RJZlNlc3Npb25FeGlzdHMgYXMgcmVDb25uZWN0SWZTZXNzaW9uRXhpc3RzLFxuICBSZWFkb25seVdhbGxldENvbnRyb2xsZXIsXG4gIHJlYWRvbmx5V2FsbGV0TW9kYWwsXG4gIFJlYWRvbmx5V2FsbGV0U2Vzc2lvbixcbn0gZnJvbSAnLi9tb2R1bGVzL3JlYWRvbmx5LXdhbGxldCc7XG5pbXBvcnQge1xuICBXYWxsZXRQbHVnaW4sXG4gIFdhbGxldFBsdWdpblNlc3Npb24sXG59IGZyb20gJy4vbW9kdWxlcy93YWxsZXQtcGx1Z2luL3R5cGVzJztcbmltcG9ydCB7XG4gIGNvbm5lY3QgYXMgd2NDb25uZWN0LFxuICBjb25uZWN0SWZTZXNzaW9uRXhpc3RzIGFzIHdjQ29ubmVjdElmU2Vzc2lvbkV4aXN0cyxcbiAgV2FsbGV0Q29ubmVjdENvbnRyb2xsZXIsXG4gIFdhbGxldENvbm5lY3RDb250cm9sbGVyT3B0aW9ucyxcbiAgV2FsbGV0Q29ubmVjdFNlc3Npb25TdGF0dXMsXG59IGZyb20gJy4vbW9kdWxlcy93YWxsZXRjb25uZWN0JztcbmltcG9ydCB7IGdldEV4dGVuc2lvbnMgfSBmcm9tICcuL29wZXJhdG9ycy9nZXRFeHRlbnNpb25zJztcbmltcG9ydCB7IHRvQ29ubmVjdGVkV2FsbGV0IH0gZnJvbSAnLi9vcGVyYXRvcnMvdG9Db25uZWN0ZWRXYWxsZXQnO1xuaW1wb3J0IHsgdG9MY2RDbGllbnQgfSBmcm9tICcuL29wZXJhdG9ycy90b0xjZENsaWVudCc7XG5pbXBvcnQgeyBpc0Rlc2t0b3BDaHJvbWUgfSBmcm9tICcuL3V0aWxzL2Jyb3dzZXItY2hlY2snO1xuaW1wb3J0IHsgY2hlY2tFeHRlbnNpb25SZWFkeSB9IGZyb20gJy4vdXRpbHMvY2hlY2tFeHRlbnNpb25SZWFkeSc7XG5pbXBvcnQgeyBzb3J0Q29ubmVjdGlvbnMgfSBmcm9tICcuL3V0aWxzL3NvcnRDb25uZWN0aW9ucyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2FsbGV0Q29udHJvbGxlck9wdGlvbnNcbiAgZXh0ZW5kcyBXYWxsZXRDb25uZWN0Q29udHJvbGxlck9wdGlvbnMge1xuICAvKipcbiAgICog4pqg77iPIERvbid0IGhhcmRjb2RpbmcgdGhpcywgdXNlIGdldENoYWluIE9wdGlvbnMoKVxuICAgKlxuICAgKiBmYWxsYmFjayBuZXR3b3JrIGlmIGNvbnRyb2xsZXIgaXMgbm90IGNvbm5lY3RlZFxuICAgKi9cbiAgZGVmYXVsdE5ldHdvcms6IE5ldHdvcmtJbmZvO1xuXG4gIC8qKlxuICAgKiDimqDvuI8gRG9uJ3QgaGFyZGNvZGluZyB0aGlzLCB1c2UgZ2V0Q2hhaW4gT3B0aW9ucygpXG4gICAqXG4gICAqIGZvciB3YWxsZXRjb25uZWN0XG4gICAqXG4gICAqIFRoZSBuZXR3b3JrIHJ1bGVzIHBhc3NlZCBieSB0aGUgVGVycmEgU3RhdGlvbiBNb2JpbGUgYXJlIDAgaXMgdGVzdG5ldCwgMSBpcyBtYWlubmV0LlxuICAgKlxuICAgKiBBbHdheXMgc2V0IHRlc3RuZXQgZm9yIDAgYW5kIG1haW5uZXQgZm9yIDEuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYFxuICAgKiBjb25zdCBtYWlubmV0OiBOZXR3b3JrSW5mbyA9IHtcbiAgICogIG5hbWU6ICdtYWlubmV0JyxcbiAgICogIGNoYWluSUQ6ICdjb2x1bWJ1cy01JyxcbiAgICogIGxjZDogJ2h0dHBzOi8vbGNkLnRlcnJhLmRldicsXG4gICAqIH1cbiAgICpcbiAgICogY29uc3QgdGVzdG5ldDogTmV0d29ya0luZm8gPSB7XG4gICAqICBuYW1lOiAndGVzdG5ldCcsXG4gICAqICBjaGFpbklEOiAnYm9tYmF5LTEyJyxcbiAgICogIGxjZDogJ2h0dHBzOi8vYm9tYmF5LWxjZC50ZXJyYS5kZXYnLFxuICAgKiB9XG4gICAqXG4gICAqIGNvbnN0IHdhbGxldENvbm5lY3RDaGFpbklkczogUmVjb3JkPG51bWJlciwgTmV0d29ya0luZm8+ID0ge1xuICAgKiAgIDA6IHRlc3RuZXQsXG4gICAqICAgMTogbWFpbm5ldCxcbiAgICogfVxuICAgKlxuICAgKiA8V2FsbGV0UHJvdmlkZXIgd2FsbGV0Q29ubmVjdENoYWluSWRzPXt3YWxsZXRDb25uZWN0Q2hhaW5JZHN9PlxuICAgKiBgYGBcbiAgICovXG4gIHdhbGxldENvbm5lY3RDaGFpbklkczogUmVjb3JkPG51bWJlciwgTmV0d29ya0luZm8+O1xuXG4gIC8qKlxuICAgKiBydW4gYXQgZXhlY3V0aW5nIHRoZSBgY29ubmVjdChDb25uZWN0VHlwZS5SRUFET05MWSlgXG4gICAqL1xuICBjcmVhdGVSZWFkb25seVdhbGxldFNlc3Npb24/OiAoXG4gICAgbmV0d29ya3M6IE5ldHdvcmtJbmZvW10sXG4gICkgPT4gUHJvbWlzZTxSZWFkb25seVdhbGxldFNlc3Npb24gfCBudWxsPjtcblxuICBwbHVnaW5zPzogV2FsbGV0UGx1Z2luW107XG5cbiAgLyoqXG4gICAqIHJ1biBhdCBleGVjdXRpbmcgdGhlIGBjb25uZWN0KClgIC0gb25seSB1c2VkIHdoZW4gZG9lcyBub3QgaW5wdXQgQ29ubmVjdFR5cGVcbiAgICovXG4gIHNlbGVjdENvbm5lY3Rpb24/OiAoXG4gICAgY29ubmVjdGlvbnM6IENvbm5lY3Rpb25bXSxcbiAgKSA9PiBQcm9taXNlPFt0eXBlOiBDb25uZWN0VHlwZSwgaWRlbnRpZmllcjogc3RyaW5nIHwgdW5kZWZpbmVkXSB8IG51bGw+O1xuXG4gIC8qKlxuICAgKiBydW4gYXQgZXhlY3V0aW5nIHRoZSBgY29ubmVjdChDb25uZWN0VHlwZS5FWFRFTlNJT04pYFxuICAgKiBpZiB1c2VyIGluc3RhbGxlZCBtdWx0aXBsZSB3YWxsZXRzXG4gICAqL1xuICBzZWxlY3RFeHRlbnNpb24/OiAoXG4gICAgZXh0ZW5zaW9uSW5mb3M6IEV4dGVuc2lvbkluZm9bXSxcbiAgKSA9PiBQcm9taXNlPEV4dGVuc2lvbkluZm8gfCBudWxsPjtcblxuICAvKipcbiAgICogbWlsbGlzZWNvbmRzIHRvIHdhaXQgY2hlY2tpbmcgY2hyb21lIGV4dGVuc2lvbiBpcyBpbnN0YWxsZWRcbiAgICpcbiAgICogQGRlZmF1bHQgMTAwMCAqIDMgbWlsaXNlY29uZHNcbiAgICovXG4gIHdhaXRpbmdDaHJvbWVFeHRlbnNpb25JbnN0YWxsQ2hlY2s/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIOKaoO+4jyBUaGlzIEFQSSBpcyBhbiBvcHRpb24gZm9yIHdhbGxldCBkZXZlbG9wZXJzLiBQbGVhc2UgZG9uJ3QgdXNlIGRBcHAgZGV2ZWxvcGVycy5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogYGBgXG4gICAqIDxXYWxsZXRQcm92aWRlciBkYW5nZXJvdXNseV9fY2hyb21lRXh0ZW5zaW9uQ29tcGF0aWJsZUJyb3dzZXJDaGVjaz17KHVzZXJBZ2VudDogc3RyaW5nKSA9PiB7XG4gICAqICAgcmV0dXJuIC9NeVdhbGxldFxcLy8udGVzdCh1c2VyQWdlbnQpO1xuICAgKiB9fT5cbiAgICogYGBgXG4gICAqL1xuICBkYW5nZXJvdXNseV9fY2hyb21lRXh0ZW5zaW9uQ29tcGF0aWJsZUJyb3dzZXJDaGVjaz86IChcbiAgICB1c2VyQWdlbnQ6IHN0cmluZyxcbiAgKSA9PiBib29sZWFuO1xufVxuXG5jb25zdCBDT05ORUNUSU9OUyA9IHtcbiAgW0Nvbm5lY3RUeXBlLlJFQURPTkxZXToge1xuICAgIHR5cGU6IENvbm5lY3RUeXBlLlJFQURPTkxZLFxuICAgIG5hbWU6ICdWaWV3IGFuIGFkZHJlc3MnLFxuICAgIGljb246ICdodHRwczovL2Fzc2V0cy50ZXJyYS5kZXYvaWNvbi93YWxsZXQtcHJvdmlkZXIvcmVhZG9ubHkuc3ZnJyxcbiAgfSBhcyBDb25uZWN0aW9uLFxuICBbQ29ubmVjdFR5cGUuV0FMTEVUQ09OTkVDVF06IHtcbiAgICB0eXBlOiBDb25uZWN0VHlwZS5XQUxMRVRDT05ORUNULFxuICAgIG5hbWU6ICdXYWxsZXQgQ29ubmVjdCcsXG4gICAgaWNvbjogJ2h0dHBzOi8vYXNzZXRzLnRlcnJhLmRldi9pY29uL3dhbGxldC1wcm92aWRlci93YWxsZXRjb25uZWN0LnN2ZycsXG4gIH0gYXMgQ29ubmVjdGlvbixcbn0gYXMgY29uc3Q7XG5cbmNvbnN0IERFRkFVTFRfV0FJVElOR19DSFJPTUVfRVhURU5TSU9OX0lOU1RBTExfQ0hFQ0sgPSAxMDAwICogMztcblxuY29uc3QgV0FMTEVUQ09OTkVDVF9TVVBQT1JUX0ZFQVRVUkVTID0gbmV3IFNldDxUZXJyYVdlYkV4dGVuc2lvbkZlYXR1cmVzPihbXG4gICdwb3N0JywgJ3NpZ24tYnl0ZXMnXG5dKTtcblxuY29uc3QgRU1QVFlfU1VQUE9SVF9GRUFUVVJFUyA9IG5ldyBTZXQ8VGVycmFXZWJFeHRlbnNpb25GZWF0dXJlcz4oKTtcblxuLy9ub2luc3BlY3Rpb24gRVM2TWlzc2luZ0F3YWl0XG5leHBvcnQgY2xhc3MgV2FsbGV0Q29udHJvbGxlciB7XG4gIHByaXZhdGUgZXh0ZW5zaW9uOiBFeHRlbnNpb25Sb3V0ZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSB3YWxsZXRDb25uZWN0OiBXYWxsZXRDb25uZWN0Q29udHJvbGxlciB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHJlYWRvbmx5V2FsbGV0OiBSZWFkb25seVdhbGxldENvbnRyb2xsZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBwbHVnaW46IFdhbGxldFBsdWdpblNlc3Npb24gfCBudWxsID0gbnVsbDtcblxuICBwcml2YXRlIF9hdmFpbGFibGVDb25uZWN0VHlwZXM6IEJlaGF2aW9yU3ViamVjdDxDb25uZWN0VHlwZVtdPjtcbiAgcHJpdmF0ZSBfYXZhaWxhYmxlSW5zdGFsbFR5cGVzOiBCZWhhdmlvclN1YmplY3Q8Q29ubmVjdFR5cGVbXT47XG4gIHByaXZhdGUgX3N0YXRlczogQmVoYXZpb3JTdWJqZWN0PFdhbGxldFN0YXRlcz47XG5cbiAgcHJpdmF0ZSBkaXNhYmxlUmVhZG9ubHlXYWxsZXQ6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRpc2FibGVFeHRlbnNpb246ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGRpc2FibGVXYWxsZXRDb25uZWN0OiAoKCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBkaXNhYmxlV2FsbGV0UGx1Z2luOiAoKCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcblxuICBwcml2YXRlIHJlYWRvbmx5IF9ub3RDb25uZWN0ZWQ6IFdhbGxldFN0YXRlcztcbiAgcHJpdmF0ZSByZWFkb25seSBfaW5pdGlhbGl6aW5nOiBXYWxsZXRTdGF0ZXM7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgb3B0aW9uczogV2FsbGV0Q29udHJvbGxlck9wdGlvbnMpIHtcbiAgICB0aGlzLl9ub3RDb25uZWN0ZWQgPSB7XG4gICAgICBzdGF0dXM6IFdhbGxldFN0YXR1cy5XQUxMRVRfTk9UX0NPTk5FQ1RFRCxcbiAgICAgIG5ldHdvcms6IG9wdGlvbnMuZGVmYXVsdE5ldHdvcmssXG4gICAgfTtcblxuICAgIHRoaXMuX2luaXRpYWxpemluZyA9IHtcbiAgICAgIHN0YXR1czogV2FsbGV0U3RhdHVzLklOSVRJQUxJWklORyxcbiAgICAgIG5ldHdvcms6IG9wdGlvbnMuZGVmYXVsdE5ldHdvcmssXG4gICAgfTtcblxuICAgIGNvbnN0IGRlZmF1bHRDb25uZWN0aW9uVHlwZXM6IENvbm5lY3RUeXBlW10gPSBbXG4gICAgICBDb25uZWN0VHlwZS5SRUFET05MWSxcbiAgICAgIENvbm5lY3RUeXBlLldBTExFVENPTk5FQ1QsXG4gICAgXTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucGx1Z2lucykge1xuICAgICAgZGVmYXVsdENvbm5lY3Rpb25UeXBlcy5wdXNoKENvbm5lY3RUeXBlLlBMVUdJTlMpO1xuICAgIH1cblxuICAgIHRoaXMuX2F2YWlsYWJsZUNvbm5lY3RUeXBlcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8Q29ubmVjdFR5cGVbXT4oXG4gICAgICBkZWZhdWx0Q29ubmVjdGlvblR5cGVzLFxuICAgICk7XG5cbiAgICB0aGlzLl9hdmFpbGFibGVJbnN0YWxsVHlwZXMgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PENvbm5lY3RUeXBlW10+KFtdKTtcblxuICAgIHRoaXMuX3N0YXRlcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8V2FsbGV0U3RhdGVzPih0aGlzLl9pbml0aWFsaXppbmcpO1xuXG4gICAgbGV0IG51bVNlc3Npb25DaGVjazogbnVtYmVyID0gMDtcblxuICAgIC8vIHdhaXQgY2hlY2tpbmcgdGhlIGF2YWlsYWJpbGl0eSBvZiB0aGUgY2hyb21lIGV4dGVuc2lvblxuICAgIC8vIDAuIGNoZWNrIGlmIGV4dGVuc2lvbiB3YWxsZXQgc2Vzc2lvbiBpcyBleGlzdHNcbiAgICBjaGVja0V4dGVuc2lvblJlYWR5KFxuICAgICAgb3B0aW9ucy53YWl0aW5nQ2hyb21lRXh0ZW5zaW9uSW5zdGFsbENoZWNrID8/XG4gICAgICBERUZBVUxUX1dBSVRJTkdfQ0hST01FX0VYVEVOU0lPTl9JTlNUQUxMX0NIRUNLLFxuICAgICAgdGhpcy5pc0Nocm9tZUV4dGVuc2lvbkNvbXBhdGlibGVCcm93c2VyKCksXG4gICAgKS50aGVuKChyZWFkeTogYm9vbGVhbikgPT4ge1xuICAgICAgaWYgKHJlYWR5KSB7XG4gICAgICAgIHRoaXMuX2F2YWlsYWJsZUNvbm5lY3RUeXBlcy5uZXh0KFtcbiAgICAgICAgICBDb25uZWN0VHlwZS5FWFRFTlNJT04sXG4gICAgICAgICAgLi4uZGVmYXVsdENvbm5lY3Rpb25UeXBlcyxcbiAgICAgICAgXSk7XG5cbiAgICAgICAgdGhpcy5leHRlbnNpb24gPSBuZXcgRXh0ZW5zaW9uUm91dGVyKHtcbiAgICAgICAgICBob3N0V2luZG93OiB3aW5kb3csXG4gICAgICAgICAgc2VsZWN0RXh0ZW5zaW9uOiBvcHRpb25zLnNlbGVjdEV4dGVuc2lvbixcbiAgICAgICAgICBkYW5nZXJvdXNseV9fY2hyb21lRXh0ZW5zaW9uQ29tcGF0aWJsZUJyb3dzZXJDaGVjazpcbiAgICAgICAgICAgIG9wdGlvbnMuZGFuZ2Vyb3VzbHlfX2Nocm9tZUV4dGVuc2lvbkNvbXBhdGlibGVCcm93c2VyQ2hlY2sgPz9cbiAgICAgICAgICAgIERFRkFVTFRfQ0hST01FX0VYVEVOU0lPTl9DT01QQVRJQkxFX0JST1dTRVJfQ0hFQ0ssXG4gICAgICAgICAgZGVmYXVsdE5ldHdvcms6IG9wdGlvbnMuZGVmYXVsdE5ldHdvcmssXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRoaXMuZXh0ZW5zaW9uXG4gICAgICAgICAgLnN0YXRlcygpXG4gICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICBmaWx0ZXIoKHsgdHlwZSB9KSA9PiB0eXBlICE9PSBFeHRlbnNpb25Sb3V0ZXJTdGF0dXMuSU5JVElBTElaSU5HKSxcbiAgICAgICAgICApXG4gICAgICAgICAgLnN1YnNjcmliZSgoZXh0ZW5zaW9uU3RhdGVzKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggeyB9XG5cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgZXh0ZW5zaW9uU3RhdGVzLnR5cGUgPT09IEV4dGVuc2lvblJvdXRlclN0YXR1cy5XQUxMRVRfQ09OTkVDVEVEICYmXG4gICAgICAgICAgICAgICF0aGlzLmRpc2FibGVXYWxsZXRDb25uZWN0ICYmXG4gICAgICAgICAgICAgICF0aGlzLmRpc2FibGVSZWFkb25seVdhbGxldFxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHRoaXMuZW5hYmxlRXh0ZW5zaW9uKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG51bVNlc3Npb25DaGVjayA9PT0gMCkge1xuICAgICAgICAgICAgICBudW1TZXNzaW9uQ2hlY2sgKz0gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdGVzKHRoaXMuX25vdENvbm5lY3RlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoaXNEZXNrdG9wQ2hyb21lKHRoaXMuaXNDaHJvbWVFeHRlbnNpb25Db21wYXRpYmxlQnJvd3NlcigpKSkge1xuICAgICAgICAgIHRoaXMuX2F2YWlsYWJsZUluc3RhbGxUeXBlcy5uZXh0KFtDb25uZWN0VHlwZS5FWFRFTlNJT05dKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChudW1TZXNzaW9uQ2hlY2sgPT09IDApIHtcbiAgICAgICAgICBudW1TZXNzaW9uQ2hlY2sgKz0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlcyh0aGlzLl9ub3RDb25uZWN0ZWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyAxLiBjaGVjayBpZiByZWFkb25seSB3YWxsZXQgc2Vzc2lvbiBpcyBleGlzdHNcbiAgICBjb25zdCBkcmFmdFJlYWRvbmx5V2FsbGV0ID0gcmVDb25uZWN0SWZTZXNzaW9uRXhpc3RzKCk7XG5cbiAgICBpZiAoZHJhZnRSZWFkb25seVdhbGxldCkge1xuICAgICAgdGhpcy5lbmFibGVSZWFkb25seVdhbGxldChkcmFmdFJlYWRvbmx5V2FsbGV0KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyAyLiBjaGVjayBpZiB3YWxsZXRjb25uZWN0IHNlc2lzb24gaXMgZXhpc3RzXG4gICAgY29uc3QgZHJhZnRXYWxsZXRDb25uZWN0ID0gd2NDb25uZWN0SWZTZXNzaW9uRXhpc3RzKG9wdGlvbnMpO1xuXG4gICAgaWYgKFxuICAgICAgZHJhZnRXYWxsZXRDb25uZWN0ICYmXG4gICAgICBkcmFmdFdhbGxldENvbm5lY3QuZ2V0TGF0ZXN0U2Vzc2lvbigpLnN0YXR1cyA9PT1cbiAgICAgIFdhbGxldENvbm5lY3RTZXNzaW9uU3RhdHVzLkNPTk5FQ1RFRFxuICAgICkge1xuICAgICAgdGhpcy5lbmFibGVXYWxsZXRDb25uZWN0KGRyYWZ0V2FsbGV0Q29ubmVjdCk7XG4gICAgfSBlbHNlIGlmIChudW1TZXNzaW9uQ2hlY2sgPT09IDApIHtcbiAgICAgIG51bVNlc3Npb25DaGVjayArPSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVwZGF0ZVN0YXRlcyh0aGlzLl9ub3RDb25uZWN0ZWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTb21lIG1vYmlsZSB3YWxsZXQgZW11bGF0ZXMgdGhlIGJlaGF2aW9yIG9mIGNocm9tZSBleHRlbnNpb24uXG4gICAqIEl0IGNvbmZpcm1zIHRoYXQgdGhlIGN1cnJlbnQgY29ubmVjdGlvbiBlbnZpcm9ubWVudCBpcyBzdWNoIGEgd2FsbGV0LlxuICAgKiAoSWYgeW91IGFyZSBydW5uaW5nIGNvbm5lY3QoKSBieSBjaGVja2luZyBhdmFpbGFibGVDb25uZWN0VHlwZSwgeW91IGRvIG5vdCBuZWVkIHRvIHVzZSB0aGlzIEFQSS4pXG4gICAqXG4gICAqIEBzZWUgV2FsbGV0I2lzQ2hyb21lRXh0ZW5zaW9uQ29tcGF0aWJsZUJyb3dzZXJcbiAgICovXG4gIGlzQ2hyb21lRXh0ZW5zaW9uQ29tcGF0aWJsZUJyb3dzZXIgPSAoKTogYm9vbGVhbiA9PiB7XG4gICAgcmV0dXJuIChcbiAgICAgIHRoaXMub3B0aW9ucy5kYW5nZXJvdXNseV9fY2hyb21lRXh0ZW5zaW9uQ29tcGF0aWJsZUJyb3dzZXJDaGVjayA/P1xuICAgICAgREVGQVVMVF9DSFJPTUVfRVhURU5TSU9OX0NPTVBBVElCTEVfQlJPV1NFUl9DSEVDS1xuICAgICkobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIGF2YWlsYWJsZSBjb25uZWN0IHR5cGVzIG9uIHRoZSBicm93c2VyXG4gICAqXG4gICAqIEBzZWUgV2FsbGV0I2F2YWlsYWJsZUNvbm5lY3RUeXBlc1xuICAgKi9cbiAgYXZhaWxhYmxlQ29ubmVjdFR5cGVzID0gKCk6IE9ic2VydmFibGU8Q29ubmVjdFR5cGVbXT4gPT4ge1xuICAgIHJldHVybiB0aGlzLl9hdmFpbGFibGVDb25uZWN0VHlwZXMuYXNPYnNlcnZhYmxlKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIGF2YWlsYWJsZSBjb25uZWN0aW9ucyBpbmNsdWRlcyBpZGVudGlmaWVyLCBuYW1lLCBpY29uXG4gICAqXG4gICAqIEBzZWUgV2FsbGV0I2F2YWlsYWJsZUNvbm5lY3Rpb25zXG4gICAqL1xuICBhdmFpbGFibGVDb25uZWN0aW9ucyA9ICgpOiBPYnNlcnZhYmxlPENvbm5lY3Rpb25bXT4gPT4ge1xuICAgIHJldHVybiB0aGlzLl9hdmFpbGFibGVDb25uZWN0VHlwZXMucGlwZShcbiAgICAgIG1hcCgoY29ubmVjdFR5cGVzKSA9PiB7XG4gICAgICAgIGNvbnN0IGNvbm5lY3Rpb25zOiBDb25uZWN0aW9uW10gPSBbXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGNvbm5lY3RUeXBlIG9mIGNvbm5lY3RUeXBlcykge1xuICAgICAgICAgIGlmIChjb25uZWN0VHlwZSA9PT0gQ29ubmVjdFR5cGUuRVhURU5TSU9OKSB7XG4gICAgICAgICAgICBjb25zdCB0ZXJyYUV4dGVuc2lvbnMgPSBnZXRUZXJyYUV4dGVuc2lvbnMoKTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCB0ZXJyYUV4dGVuc2lvbiBvZiB0ZXJyYUV4dGVuc2lvbnMpIHtcbiAgICAgICAgICAgICAgY29ubmVjdGlvbnMucHVzaChcbiAgICAgICAgICAgICAgICBtZW1vQ29ubmVjdGlvbihcbiAgICAgICAgICAgICAgICAgIENvbm5lY3RUeXBlLkVYVEVOU0lPTixcbiAgICAgICAgICAgICAgICAgIHRlcnJhRXh0ZW5zaW9uLm5hbWUsXG4gICAgICAgICAgICAgICAgICB0ZXJyYUV4dGVuc2lvbi5pY29uLFxuICAgICAgICAgICAgICAgICAgdGVycmFFeHRlbnNpb24uaWRlbnRpZmllcixcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoY29ubmVjdFR5cGUgPT09IENvbm5lY3RUeXBlLlBMVUdJTlMpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcGx1Z2luIG9mIHRoaXMub3B0aW9ucy5wbHVnaW5zIHx8IFtdKSB7XG4gICAgICAgICAgICAgIGNvbm5lY3Rpb25zLnB1c2goXG4gICAgICAgICAgICAgICAgbWVtb0Nvbm5lY3Rpb24oXG4gICAgICAgICAgICAgICAgICBDb25uZWN0VHlwZS5QTFVHSU5TLFxuICAgICAgICAgICAgICAgICAgcGx1Z2luLm5hbWUsXG4gICAgICAgICAgICAgICAgICBwbHVnaW4uaWNvbixcbiAgICAgICAgICAgICAgICAgIHBsdWdpbi5pZGVudGlmaWVyLFxuICAgICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbm5lY3Rpb25zLnB1c2goQ09OTkVDVElPTlNbY29ubmVjdFR5cGVdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc29ydENvbm5lY3Rpb25zKGNvbm5lY3Rpb25zKTtcbiAgICAgIH0pLFxuICAgICk7XG4gIH07XG5cbiAgLyoqXG4gICAqIGF2YWlsYWJsZSBpbnN0YWxsIHR5cGVzIG9uIHRoZSBicm93c2VyXG4gICAqXG4gICAqIGluIHRoaXMgdGltZSwgdGhpcyBvbmx5IGNvbnRhaW5zIFtDb25uZWN0VHlwZS5FWFRFTlNJT05dXG4gICAqXG4gICAqIEBzZWUgV2FsbGV0I2F2YWlsYWJsZUluc3RhbGxUeXBlc1xuICAgKi9cbiAgYXZhaWxhYmxlSW5zdGFsbFR5cGVzID0gKCk6IE9ic2VydmFibGU8Q29ubmVjdFR5cGVbXT4gPT4ge1xuICAgIHJldHVybiB0aGlzLl9hdmFpbGFibGVJbnN0YWxsVHlwZXMuYXNPYnNlcnZhYmxlKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIGF2YWlsYWJsZSBpbnN0YWxsYXRpb25zIGluY2x1ZGVzIGlkZW50aWZpZXIsIG5hbWUsIGljb24sIHVybFxuICAgKlxuICAgKiBAc2VlIFdhbGxldCNhdmFpbGFibGVJbnN0YWxsYXRpb25zXG4gICAqL1xuICBhdmFpbGFibGVJbnN0YWxsYXRpb25zID0gKCk6IE9ic2VydmFibGU8SW5zdGFsbGF0aW9uW10+ID0+IHtcbiAgICByZXR1cm4gY29tYmluZUxhdGVzdChbdGhpcy5hdmFpbGFibGVDb25uZWN0aW9ucygpLCBnZXRFeHRlbnNpb25zKCldKS5waXBlKFxuICAgICAgbWFwKChbY29ubmVjdGlvbnMsIGV4dGVuc2lvbnNdKSA9PiB7XG4gICAgICAgIGNvbnN0IGluc3RhbGxlZElkZW50aWZpZXJzID0gbmV3IFNldDxzdHJpbmc+KFxuICAgICAgICAgIGNvbm5lY3Rpb25zXG4gICAgICAgICAgICAuZmlsdGVyKCh7IHR5cGUsIGlkZW50aWZpZXIgfSkgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gdHlwZSA9PT0gQ29ubmVjdFR5cGUuRVhURU5TSU9OICYmICEhaWRlbnRpZmllcjtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAubWFwKCh7IGlkZW50aWZpZXIgfSkgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gaWRlbnRpZmllciE7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgKTtcblxuICAgICAgICByZXR1cm4gZXh0ZW5zaW9uc1xuICAgICAgICAgIC5maWx0ZXIoKHsgaWRlbnRpZmllciB9KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gIWluc3RhbGxlZElkZW50aWZpZXJzLmhhcyhpZGVudGlmaWVyKTtcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5tYXAoKHsgbmFtZSwgaWRlbnRpZmllciwgaWNvbiwgdXJsIH0pID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHR5cGU6IENvbm5lY3RUeXBlLkVYVEVOU0lPTixcbiAgICAgICAgICAgICAgaWRlbnRpZmllcixcbiAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgaWNvbixcbiAgICAgICAgICAgICAgdXJsLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pLFxuICAgICk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBzZWUgV2FsbGV0I3N0YXR1c1xuICAgKiBAc2VlIFdhbGxldCNuZXR3b3JrXG4gICAqIEBzZWUgV2FsbGV0I3dhbGxldHNcbiAgICovXG4gIHN0YXRlcyA9ICgpOiBPYnNlcnZhYmxlPFdhbGxldFN0YXRlcz4gPT4ge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZXMuYXNPYnNlcnZhYmxlKCk7XG4gIH07XG5cbiAgLyoqIGdldCBjb25uZWN0ZWRXYWxsZXQgKi9cbiAgY29ubmVjdGVkV2FsbGV0ID0gKCk6IE9ic2VydmFibGU8Q29ubmVjdGVkV2FsbGV0IHwgdW5kZWZpbmVkPiA9PiB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXRlcy5waXBlKHRvQ29ubmVjdGVkV2FsbGV0KHRoaXMpKTtcbiAgfTtcblxuICAvKiogZ2V0IGxjZENsaWVudCAqL1xuICBsY2RDbGllbnQgPSAoXG4gICAgbGNkQ2xpZW50Q29uZmlnOiBSZWNvcmQ8c3RyaW5nLCBMQ0RDbGllbnRDb25maWc+LFxuICApOiBPYnNlcnZhYmxlPExDRENsaWVudD4gPT4ge1xuICAgIHJldHVybiB0aGlzLl9zdGF0ZXMucGlwZSh0b0xjZENsaWVudChsY2RDbGllbnRDb25maWcpKTtcbiAgfTtcblxuICAvKipcbiAgICogcmVsb2FkIHRoZSBjb25uZWN0ZWQgd2FsbGV0IHN0YXRlc1xuICAgKlxuICAgKiBpbiB0aGlzIHRpbWUsIHRoaXMgb25seSB3b3JrIG9uIHRoZSBDb25uZWN0VHlwZS5FWFRFTlNJT05cbiAgICpcbiAgICogQHNlZSBXYWxsZXQjcmVjaGVja1N0YXR1c1xuICAgKi9cbiAgcmVmZXRjaFN0YXRlcyA9ICgpID0+IHtcbiAgICBpZiAodGhpcy5kaXNhYmxlRXh0ZW5zaW9uKSB7XG4gICAgICB0aGlzLmV4dGVuc2lvbj8ucmVmZXRjaFN0YXRlcygpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQGRlcHJlY2F0ZWQgUGxlYXNlIHVzZSBhdmFpbGFibGVJbnN0YWxsYXRpb25zXG4gICAqXG4gICAqIGluc3RhbGwgZm9yIHRoZSBjb25uZWN0IHR5cGVcbiAgICpcbiAgICogQHNlZSBXYWxsZXQjaW5zdGFsbFxuICAgKi9cbiAgaW5zdGFsbCA9ICh0eXBlOiBDb25uZWN0VHlwZSkgPT4ge1xuICAgIGlmICh0eXBlID09PSBDb25uZWN0VHlwZS5FWFRFTlNJT04pIHtcbiAgICAgIC8vIFRPRE8gc2VwYXJhdGUgaW5zdGFsbCBsaW5rcyBieSBicm93c2VyIHR5cGVzXG4gICAgICB3aW5kb3cub3BlbihDSFJPTUVfRVhURU5TSU9OX0lOU1RBTExfVVJMLCAnX2JsYW5rJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgYFtXYWxsZXRDb250cm9sbGVyXSBDb25uZWN0VHlwZSBcIiR7dHlwZX1cIiBkb2VzIG5vdCBzdXBwb3J0IGluc3RhbGwoKSBmdW5jdGlvbmAsXG4gICAgICApO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogY29ubmVjdCB0byB3YWxsZXRcbiAgICpcbiAgICogQHNlZSBXYWxsZXQjY29ubmVjdFxuICAgKi9cbiAgY29ubmVjdCA9IGFzeW5jIChfdHlwZT86IENvbm5lY3RUeXBlLCBfaWRlbnRpZmllcj86IHN0cmluZykgPT4ge1xuICAgIGxldCB0eXBlOiBDb25uZWN0VHlwZTtcbiAgICBsZXQgaWRlbnRpZmllcjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gICAgaWYgKCEhX3R5cGUpIHtcbiAgICAgIHR5cGUgPSBfdHlwZTtcbiAgICAgIGlkZW50aWZpZXIgPSBfaWRlbnRpZmllcjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgY29ubmVjdGlvbnMgPSBhd2FpdCBmaXJzdFZhbHVlRnJvbSh0aGlzLmF2YWlsYWJsZUNvbm5lY3Rpb25zKCkpO1xuICAgICAgY29uc3Qgc2VsZWN0b3IgPSB0aGlzLm9wdGlvbnMuc2VsZWN0Q29ubmVjdGlvbiA/PyBzZWxlY3RDb25uZWN0aW9uO1xuICAgICAgY29uc3Qgc2VsZWN0ZWQgPSBhd2FpdCBzZWxlY3Rvcihjb25uZWN0aW9ucyk7XG5cbiAgICAgIGlmICghc2VsZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0eXBlID0gc2VsZWN0ZWRbMF07XG4gICAgICBpZGVudGlmaWVyID0gc2VsZWN0ZWRbMV07XG4gICAgfVxuICAgIGxldCBuZXR3b3JrczogTmV0d29ya0luZm9bXTtcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgQ29ubmVjdFR5cGUuUkVBRE9OTFk6XG4gICAgICAgIG5ldHdvcmtzID0gT2JqZWN0LmtleXModGhpcy5vcHRpb25zLndhbGxldENvbm5lY3RDaGFpbklkcykubWFwKFxuICAgICAgICAgIChjaGFpbklkKSA9PiB0aGlzLm9wdGlvbnMud2FsbGV0Q29ubmVjdENoYWluSWRzWytjaGFpbklkXSxcbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBjcmVhdGVSZWFkb25seVdhbGxldFNlc3Npb24gPVxuICAgICAgICAgIHRoaXMub3B0aW9ucy5jcmVhdGVSZWFkb25seVdhbGxldFNlc3Npb24/LihuZXR3b3JrcykgPz9cbiAgICAgICAgICByZWFkb25seVdhbGxldE1vZGFsKHsgbmV0d29ya3MgfSk7XG5cbiAgICAgICAgY29uc3QgcmVhZG9ubHlXYWxsZXRTZXNzaW9uID0gYXdhaXQgY3JlYXRlUmVhZG9ubHlXYWxsZXRTZXNzaW9uO1xuXG4gICAgICAgIGlmIChyZWFkb25seVdhbGxldFNlc3Npb24pIHtcbiAgICAgICAgICB0aGlzLmVuYWJsZVJlYWRvbmx5V2FsbGV0KHJlQ29ubmVjdChyZWFkb25seVdhbGxldFNlc3Npb24pKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgQ29ubmVjdFR5cGUuV0FMTEVUQ09OTkVDVDpcbiAgICAgICAgdGhpcy5lbmFibGVXYWxsZXRDb25uZWN0KHdjQ29ubmVjdCh0aGlzLm9wdGlvbnMpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIENvbm5lY3RUeXBlLkVYVEVOU0lPTjpcbiAgICAgICAgaWYgKCF0aGlzLmV4dGVuc2lvbikge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZXh0ZW5zaW9uIGluc3RhbmNlIGlzIG5vdCBjcmVhdGVkIWApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZXh0ZW5zaW9uLmNvbm5lY3QoaWRlbnRpZmllcik7XG4gICAgICAgIHRoaXMuZW5hYmxlRXh0ZW5zaW9uKCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBDb25uZWN0VHlwZS5QTFVHSU5TOlxuICAgICAgICBuZXR3b3JrcyA9IE9iamVjdC5rZXlzKHRoaXMub3B0aW9ucy53YWxsZXRDb25uZWN0Q2hhaW5JZHMpLm1hcChcbiAgICAgICAgICAoY2hhaW5JZCkgPT4gdGhpcy5vcHRpb25zLndhbGxldENvbm5lY3RDaGFpbklkc1srY2hhaW5JZF0sXG4gICAgICAgICk7XG4gICAgICAgIGlmICghdGhpcy5vcHRpb25zLnBsdWdpbnMgfHwgdGhpcy5vcHRpb25zLnBsdWdpbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBub3QgcGx1Z2lucyBmb3VuZGApO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHBsdWdpbiA9IHRoaXMub3B0aW9ucy5wbHVnaW5zPy5maW5kKChwKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHAuaWRlbnRpZmllciA9PT0gaWRlbnRpZmllcjtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFwbHVnaW4pIHtcbiAgICAgICAgICBwbHVnaW4gPSB0aGlzLm9wdGlvbnMucGx1Z2luc1swXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBhd2FpdCBwbHVnaW4uY3JlYXRlU2Vzc2lvbihuZXR3b3Jrcyk7XG4gICAgICAgIGlmICghc2Vzc2lvbikge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgZXJyb3IgZ2V0dGluZyB3ZWIzc2Vzc2lvbmApO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHNlc3Npb24uY29ubmVjdCgpO1xuICAgICAgICB0aGlzLmVuYWJsZVdhbGxldFBsdWdpbihwbHVnaW4sIHNlc3Npb24pO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBDb25uZWN0VHlwZSFgKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIG1hbnVhbCBjb25uZWN0IHRvIHJlYWQgb25seSBzZXNzaW9uXG4gICAqXG4gICAqIEBzZWUgV2FsbGV0I2Nvbm5lY3RSZWFkb25seVxuICAgKi9cbiAgY29ubmVjdFJlYWRvbmx5ID0gKHRlcnJhQWRkcmVzczogc3RyaW5nLCBuZXR3b3JrOiBOZXR3b3JrSW5mbykgPT4ge1xuICAgIHRoaXMuZW5hYmxlUmVhZG9ubHlXYWxsZXQoXG4gICAgICByZUNvbm5lY3Qoe1xuICAgICAgICB0ZXJyYUFkZHJlc3MsXG4gICAgICAgIG5ldHdvcmssXG4gICAgICB9KSxcbiAgICApO1xuICB9O1xuXG4gIC8qKiBAc2VlIFdhbGxldCNkaXNjb25uZWN0ICovXG4gIGRpc2Nvbm5lY3QgPSAoKSA9PiB7XG4gICAgdGhpcy5kaXNhYmxlUmVhZG9ubHlXYWxsZXQ/LigpO1xuICAgIHRoaXMuZGlzYWJsZVJlYWRvbmx5V2FsbGV0ID0gbnVsbDtcblxuICAgIHRoaXMuZGlzYWJsZUV4dGVuc2lvbj8uKCk7XG4gICAgdGhpcy5kaXNhYmxlRXh0ZW5zaW9uID0gbnVsbDtcblxuICAgIHRoaXMuZGlzYWJsZVdhbGxldENvbm5lY3Q/LigpO1xuICAgIHRoaXMuZGlzYWJsZVdhbGxldENvbm5lY3QgPSBudWxsO1xuXG4gICAgdGhpcy5kaXNhYmxlV2FsbGV0UGx1Z2luPy4oKTtcbiAgICB0aGlzLmRpc2FibGVXYWxsZXRQbHVnaW4gPSBudWxsO1xuXG4gICAgdGhpcy51cGRhdGVTdGF0ZXModGhpcy5fbm90Q29ubmVjdGVkKTtcbiAgfTtcblxuICAvKipcbiAgICogQHNlZSBXYWxsZXQjcG9zdFxuICAgKiBAcGFyYW0gdHhcbiAgICogQHBhcmFtIHRlcnJhQWRkcmVzcyBvbmx5IGF2YWlsYWJsZSBuZXcgZXh0ZW5zaW9uXG4gICAqL1xuICBwb3N0ID0gYXN5bmMgKFxuICAgIHR4OiBFeHRlbnNpb25PcHRpb25zLFxuICAgIHRlcnJhQWRkcmVzcz86IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgKTogUHJvbWlzZTxUeFJlc3VsdD4gPT4ge1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIGV4dGVuc2lvblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGlmICh0aGlzLmRpc2FibGVFeHRlbnNpb24pIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxUeFJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgZXh0ZW5zaW9uIGluc3RhbmNlIG5vdCBjcmVhdGVkIWApKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSB0aGlzLmV4dGVuc2lvbi5wb3N0KHR4LCB0ZXJyYUFkZHJlc3MpLnN1YnNjcmliZSh7XG4gICAgICAgICAgbmV4dDogKHR4UmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBpZiAodHhSZXN1bHQuc3RhdHVzID09PSBXZWJFeHRlbnNpb25UeFN0YXR1cy5TVUNDRUVEKSB7XG4gICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgIC4uLnR4LFxuICAgICAgICAgICAgICAgIHJlc3VsdDogdHhSZXN1bHQucGF5bG9hZCxcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogKGVycm9yKSA9PiB7XG4gICAgICAgICAgICByZWplY3QobWFwRXh0ZW5zaW9uVHhFcnJvcih0eCwgZXJyb3IpKTtcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIHdhbGxldCBjb25uZWN0XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgZWxzZSBpZiAodGhpcy53YWxsZXRDb25uZWN0KSB7XG4gICAgICByZXR1cm4gdGhpcy53YWxsZXRDb25uZWN0XG4gICAgICAgIC5wb3N0KHR4KVxuICAgICAgICAudGhlbihcbiAgICAgICAgICAocmVzdWx0KSA9PlxuICAgICAgICAgICh7XG4gICAgICAgICAgICAuLi50eCxcbiAgICAgICAgICAgIHJlc3VsdCxcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgfSBhcyBUeFJlc3VsdCksXG4gICAgICAgIClcbiAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgIHRocm93IG1hcFdhbGxldENvbm5lY3RFcnJvcih0eCwgZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMucGx1Z2luKSB7XG4gICAgICByZXR1cm4gdGhpcy5wbHVnaW4ucG9zdCh0eCkuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgIHRocm93IG1hcEV4dGVuc2lvblNpZ25CeXRlc0Vycm9yKEJ1ZmZlci5mcm9tKCcnKSwgZXJyb3IpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGhlcmUgYXJlIG5vIGNvbm5lY3Rpb25zIHRoYXQgY2FuIGJlIHBvc3RpbmcgdHghYCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBAc2VlIFdhbGxldCNzaWduXG4gICAqIEBwYXJhbSB0eFxuICAgKiBAcGFyYW0gdGVycmFBZGRyZXNzIG9ubHkgYXZhaWxhYmxlIG5ldyBleHRlbnNpb25cbiAgICovXG4gIHNpZ24gPSBhc3luYyAoXG4gICAgdHg6IEV4dGVuc2lvbk9wdGlvbnMsXG4gICAgdGVycmFBZGRyZXNzPzogc3RyaW5nLFxuICApOiBQcm9taXNlPFNpZ25SZXN1bHQ+ID0+IHtcbiAgICBpZiAodGhpcy5kaXNhYmxlRXh0ZW5zaW9uKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2U8U2lnblJlc3VsdD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgZXh0ZW5zaW9uIGluc3RhbmNlIGlzIG5vdCBjcmVhdGVkIWApKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSB0aGlzLmV4dGVuc2lvbi5zaWduKHR4LCB0ZXJyYUFkZHJlc3MpLnN1YnNjcmliZSh7XG4gICAgICAgICAgbmV4dDogKHR4UmVzdWx0KSA9PiB7XG4gICAgICAgICAgICBpZiAodHhSZXN1bHQuc3RhdHVzID09PSBXZWJFeHRlbnNpb25UeFN0YXR1cy5TVUNDRUVEKSB7XG4gICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgIC4uLnR4LFxuICAgICAgICAgICAgICAgIHJlc3VsdDogVHguZnJvbURhdGEodHhSZXN1bHQucGF5bG9hZCksXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgZXJyb3I6IChlcnJvcikgPT4ge1xuICAgICAgICAgICAgcmVqZWN0KG1hcEV4dGVuc2lvblR4RXJyb3IodHgsIGVycm9yKSk7XG4gICAgICAgICAgICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcihgc2lnbigpIG1ldGhvZCBvbmx5IGF2YWlsYWJsZSBvbiBleHRlbnNpb25gKTtcbiAgfTtcblxuICAvKipcbiAgICogQHNlZSBXYWxsZXQjc2lnbkJ5dGVzXG4gICAqIEBwYXJhbSBieXRlc1xuICAgKiBAcGFyYW0gdGVycmFBZGRyZXNzIG9ubHkgYXZhaWxhYmxlIG5ldyBleHRlbnNpb25cbiAgICovXG4gIHNpZ25CeXRlcyA9IGFzeW5jIChcbiAgICBieXRlczogQnVmZmVyLFxuICAgIHRlcnJhQWRkcmVzcz86IHN0cmluZyxcbiAgKTogUHJvbWlzZTxTaWduQnl0ZXNSZXN1bHQ+ID0+IHtcbiAgICBpZiAodGhpcy5kaXNhYmxlRXh0ZW5zaW9uKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2U8U2lnbkJ5dGVzUmVzdWx0PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGlmICghdGhpcy5leHRlbnNpb24pIHtcbiAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBleHRlbnNpb24gaW5zdGFuY2UgaXMgbm90IGNyZWF0ZWQhYCkpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHRoaXMuZXh0ZW5zaW9uXG4gICAgICAgICAgLnNpZ25CeXRlcyhieXRlcywgdGVycmFBZGRyZXNzKVxuICAgICAgICAgIC5zdWJzY3JpYmUoe1xuICAgICAgICAgICAgbmV4dDogKHR4UmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgIGlmICh0eFJlc3VsdC5zdGF0dXMgPT09IFdlYkV4dGVuc2lvblR4U3RhdHVzLlNVQ0NFRUQpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgICAgICAgICByZWNpZDogdHhSZXN1bHQucGF5bG9hZC5yZWNpZCxcbiAgICAgICAgICAgICAgICAgICAgc2lnbmF0dXJlOiBVaW50OEFycmF5LmZyb20oXG4gICAgICAgICAgICAgICAgICAgICAgQnVmZmVyLmZyb20odHhSZXN1bHQucGF5bG9hZC5zaWduYXR1cmUsICdiYXNlNjQnKSxcbiAgICAgICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICAgICAgcHVibGljX2tleTogdHhSZXN1bHQucGF5bG9hZC5wdWJsaWNfa2V5XG4gICAgICAgICAgICAgICAgICAgICAgPyBQdWJsaWNLZXkuZnJvbURhdGEodHhSZXN1bHQucGF5bG9hZC5wdWJsaWNfa2V5KVxuICAgICAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogKGVycm9yKSA9PiB7XG4gICAgICAgICAgICAgIHJlamVjdChtYXBFeHRlbnNpb25TaWduQnl0ZXNFcnJvcihieXRlcywgZXJyb3IpKTtcbiAgICAgICAgICAgICAgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIHdhbGxldCBjb25uZWN0XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgZWxzZSBpZiAodGhpcy53YWxsZXRDb25uZWN0KSB7XG4gICAgICByZXR1cm4gdGhpcy53YWxsZXRDb25uZWN0XG4gICAgICAgIC5zaWduQnl0ZXMoYnl0ZXMpXG4gICAgICAgIC50aGVuKFxuICAgICAgICAgIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IG5ldyBTaW1wbGVQdWJsaWNLZXkoU3RyaW5nKHJlc3VsdC5wdWJsaWNfa2V5KSkudG9EYXRhKClcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgICAgIHJlY2lkOiByZXN1bHQucmVjaWQsXG4gICAgICAgICAgICAgICAgc2lnbmF0dXJlOiBVaW50OEFycmF5LmZyb20oXG4gICAgICAgICAgICAgICAgICBCdWZmZXIuZnJvbShyZXN1bHQuc2lnbmF0dXJlLCAnYmFzZTY0JyksXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICBwdWJsaWNfa2V5OiBrZXlcbiAgICAgICAgICAgICAgICAgID8gUHVibGljS2V5LmZyb21EYXRhKGtleSlcbiAgICAgICAgICAgICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKVxuICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgdGhyb3cgbWFwV2FsbGV0Q29ubmVjdFNpZ25CeXRlc0Vycm9yKGJ5dGVzLCBlcnJvcik7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZXJlIGFyZSBubyBjb25uZWN0aW9ucyB0aGF0IGNhbiBiZSBzaWduaW5nIGJ5dGVzIWApO1xuICAgIH1cblxuICB9O1xuXG4gIC8qKlxuICAgKiBAc2VlIFdhbGxldCNoYXNDVzIwVG9rZW5zXG4gICAqIEBwYXJhbSBjaGFpbklEXG4gICAqIEBwYXJhbSB0b2tlbkFkZHJzIFRva2VuIGFkZHJlc3Nlc1xuICAgKi9cbiAgaGFzQ1cyMFRva2VucyA9IGFzeW5jIChcbiAgICBjaGFpbklEOiBzdHJpbmcsXG4gICAgLi4udG9rZW5BZGRyczogc3RyaW5nW11cbiAgKTogUHJvbWlzZTx7IFt0b2tlbkFkZHI6IHN0cmluZ106IGJvb2xlYW4gfT4gPT4ge1xuICAgIGlmICh0aGlzLmF2YWlsYWJsZUV4dGVuc2lvbkZlYXR1cmUoJ2N3MjAtdG9rZW4nKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZXh0ZW5zaW9uIS5oYXNDVzIwVG9rZW5zKGNoYWluSUQsIC4uLnRva2VuQWRkcnMpO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcihgRG9lcyBub3Qgc3VwcG9ydCBoYXNDVzIwVG9rZW5zKCkgb24gdGhpcyBjb25uZWN0aW9uYCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBzZWUgV2FsbGV0I2FkZENXMjBUb2tlbnNcbiAgICogQHBhcmFtIGNoYWluSURcbiAgICogQHBhcmFtIHRva2VuQWRkcnMgVG9rZW4gYWRkcmVzc2VzXG4gICAqL1xuICBhZGRDVzIwVG9rZW5zID0gYXN5bmMgKFxuICAgIGNoYWluSUQ6IHN0cmluZyxcbiAgICAuLi50b2tlbkFkZHJzOiBzdHJpbmdbXVxuICApOiBQcm9taXNlPHsgW3Rva2VuQWRkcjogc3RyaW5nXTogYm9vbGVhbiB9PiA9PiB7XG4gICAgaWYgKHRoaXMuYXZhaWxhYmxlRXh0ZW5zaW9uRmVhdHVyZSgnY3cyMC10b2tlbicpKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHRlbnNpb24hLmFkZENXMjBUb2tlbnMoY2hhaW5JRCwgLi4udG9rZW5BZGRycyk7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBEb2VzIG5vdCBzdXBwb3J0IGFkZENXMjBUb2tlbnMoKSBvbiB0aGlzIGNvbm5lY3Rpb25gKTtcbiAgfTtcblxuICAvKipcbiAgICogQHNlZSBXYWxsZXQjaGFzTmV0d29ya1xuICAgKiBAcGFyYW0gbmV0d29ya1xuICAgKi9cbiAgaGFzTmV0d29yayA9IChuZXR3b3JrOiBPbWl0PE5ldHdvcmtJbmZvLCAnbmFtZSc+KTogUHJvbWlzZTxib29sZWFuPiA9PiB7XG4gICAgaWYgKHRoaXMuYXZhaWxhYmxlRXh0ZW5zaW9uRmVhdHVyZSgnbmV0d29yaycpKSB7XG4gICAgICByZXR1cm4gdGhpcy5leHRlbnNpb24hLmhhc05ldHdvcmsobmV0d29yayk7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKGBEb2VzIG5vdCBzdXBwb3J0IGhhc05ldHdvcmsoKSBvbiB0aGlzIGNvbm5lY3Rpb25gKTtcbiAgfTtcblxuICAvKipcbiAgICogQHNlZSBXYWxsZXQjaGFzTmV0d29ya1xuICAgKiBAcGFyYW0gbmV0d29ya1xuICAgKi9cbiAgYWRkTmV0d29yayA9IChuZXR3b3JrOiBOZXR3b3JrSW5mbyk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xuICAgIGlmICh0aGlzLmF2YWlsYWJsZUV4dGVuc2lvbkZlYXR1cmUoJ25ldHdvcmsnKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZXh0ZW5zaW9uIS5hZGROZXR3b3JrKG5ldHdvcmspO1xuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcihgRG9lcyBub3Qgc3VwcG9ydCBhZGROZXR3b3JrKCkgb24gdGhpcyBjb25uZWN0aW9uYCk7XG4gIH07XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBpbnRlcm5hbFxuICAvLyBjb25uZWN0IHR5cGUgY2hhbmdpbmdcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICBwcml2YXRlIGF2YWlsYWJsZUV4dGVuc2lvbkZlYXR1cmUgPSAoZmVhdHVyZTogVGVycmFXZWJFeHRlbnNpb25GZWF0dXJlcykgPT4ge1xuICAgIGlmICh0aGlzLmRpc2FibGVFeHRlbnNpb24gJiYgdGhpcy5leHRlbnNpb24pIHtcbiAgICAgIGNvbnN0IHN0YXRlcyA9IHRoaXMuZXh0ZW5zaW9uLmdldExhc3RTdGF0ZXMoKTtcblxuICAgICAgcmV0dXJuIChcbiAgICAgICAgc3RhdGVzLnR5cGUgPT09IEV4dGVuc2lvblJvdXRlclN0YXR1cy5XQUxMRVRfQ09OTkVDVEVEICYmXG4gICAgICAgIHN0YXRlcy5zdXBwb3J0RmVhdHVyZXMuaGFzKGZlYXR1cmUpXG4gICAgICApO1xuICAgIH1cbiAgfTtcblxuICBwcml2YXRlIHVwZGF0ZVN0YXRlcyA9IChuZXh0OiBXYWxsZXRTdGF0ZXMpID0+IHtcbiAgICBjb25zdCBwcmV2ID0gdGhpcy5fc3RhdGVzLmdldFZhbHVlKCk7XG5cbiAgICBpZiAoXG4gICAgICBuZXh0LnN0YXR1cyA9PT0gV2FsbGV0U3RhdHVzLldBTExFVF9DT05ORUNURUQgJiZcbiAgICAgIG5leHQud2FsbGV0cy5sZW5ndGggPT09IDBcbiAgICApIHtcbiAgICAgIG5leHQgPSB7XG4gICAgICAgIHN0YXR1czogV2FsbGV0U3RhdHVzLldBTExFVF9OT1RfQ09OTkVDVEVELFxuICAgICAgICBuZXR3b3JrOiBuZXh0Lm5ldHdvcmssXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChwcmV2LnN0YXR1cyAhPT0gbmV4dC5zdGF0dXMgfHwgIWRlZXBFcXVhbChwcmV2LCBuZXh0KSkge1xuICAgICAgdGhpcy5fc3RhdGVzLm5leHQobmV4dCk7XG4gICAgfVxuICB9O1xuXG4gIHByaXZhdGUgZW5hYmxlUmVhZG9ubHlXYWxsZXQgPSAocmVhZG9ubHlXYWxsZXQ6IFJlYWRvbmx5V2FsbGV0Q29udHJvbGxlcikgPT4ge1xuICAgIHRoaXMuZGlzYWJsZVdhbGxldENvbm5lY3Q/LigpO1xuICAgIHRoaXMuZGlzYWJsZUV4dGVuc2lvbj8uKCk7XG5cbiAgICBpZiAoXG4gICAgICB0aGlzLnJlYWRvbmx5V2FsbGV0ID09PSByZWFkb25seVdhbGxldCB8fFxuICAgICAgKHRoaXMucmVhZG9ubHlXYWxsZXQ/LnRlcnJhQWRkcmVzcyA9PT0gcmVhZG9ubHlXYWxsZXQudGVycmFBZGRyZXNzICYmXG4gICAgICAgIHRoaXMucmVhZG9ubHlXYWxsZXQubmV0d29yayA9PT0gcmVhZG9ubHlXYWxsZXQubmV0d29yaylcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5yZWFkb25seVdhbGxldCkge1xuICAgICAgdGhpcy5yZWFkb25seVdhbGxldC5kaXNjb25uZWN0KCk7XG4gICAgfVxuXG4gICAgdGhpcy5yZWFkb25seVdhbGxldCA9IHJlYWRvbmx5V2FsbGV0O1xuXG4gICAgdGhpcy51cGRhdGVTdGF0ZXMoe1xuICAgICAgc3RhdHVzOiBXYWxsZXRTdGF0dXMuV0FMTEVUX0NPTk5FQ1RFRCxcbiAgICAgIG5ldHdvcms6IHJlYWRvbmx5V2FsbGV0Lm5ldHdvcmssXG4gICAgICB3YWxsZXRzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjb25uZWN0VHlwZTogQ29ubmVjdFR5cGUuUkVBRE9OTFksXG4gICAgICAgICAgYWRkcmVzc2VzOiB7IFtPYmplY3QudmFsdWVzKHJlYWRvbmx5V2FsbGV0Lm5ldHdvcmspLmZpbmQoKHsgcHJlZml4IH0pID0+IEFjY0FkZHJlc3MuZ2V0UHJlZml4KHJlYWRvbmx5V2FsbGV0LnRlcnJhQWRkcmVzcykgPT09IHByZWZpeCk/LmNoYWluSUQgPz8gXCJcIl06IHJlYWRvbmx5V2FsbGV0LnRlcnJhQWRkcmVzcyB9LFxuICAgICAgICAgIGRlc2lnbjogJ3JlYWRvbmx5JyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBzdXBwb3J0RmVhdHVyZXM6IEVNUFRZX1NVUFBPUlRfRkVBVFVSRVMsXG4gICAgICBjb25uZWN0aW9uOiBDT05ORUNUSU9OUy5SRUFET05MWSxcbiAgICB9KTtcblxuICAgIHRoaXMuZGlzYWJsZVJlYWRvbmx5V2FsbGV0ID0gKCkgPT4ge1xuICAgICAgcmVhZG9ubHlXYWxsZXQuZGlzY29ubmVjdCgpO1xuICAgICAgdGhpcy5yZWFkb25seVdhbGxldCA9IG51bGw7XG4gICAgICB0aGlzLmRpc2FibGVSZWFkb25seVdhbGxldCA9IG51bGw7XG4gICAgfTtcbiAgfTtcblxuICBwcml2YXRlIGVuYWJsZUV4dGVuc2lvbiA9ICgpID0+IHtcbiAgICB0aGlzLmRpc2FibGVSZWFkb25seVdhbGxldD8uKCk7XG4gICAgdGhpcy5kaXNhYmxlV2FsbGV0Q29ubmVjdD8uKCk7XG5cbiAgICBpZiAodGhpcy5kaXNhYmxlRXh0ZW5zaW9uIHx8ICF0aGlzLmV4dGVuc2lvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGV4dGVuc2lvblN1YnNjcmlwdGlvbiA9IHRoaXMuZXh0ZW5zaW9uLnN0YXRlcygpLnN1YnNjcmliZSh7XG4gICAgICBuZXh0OiAoZXh0ZW5zaW9uU3RhdGVzKSA9PiB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICBleHRlbnNpb25TdGF0ZXMudHlwZSA9PT0gRXh0ZW5zaW9uUm91dGVyU3RhdHVzLldBTExFVF9DT05ORUNURURcbiAgICAgICAgICAvLyAmJiBBY2NBZGRyZXNzLnZhbGlkYXRlKGV4dGVuc2lvblN0YXRlcy53YWxsZXQudGVycmFBZGRyZXNzKVxuICAgICAgICApIHtcbiAgICAgICAgICBcbiAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlcyh7XG4gICAgICAgICAgICBzdGF0dXM6IFdhbGxldFN0YXR1cy5XQUxMRVRfQ09OTkVDVEVELFxuICAgICAgICAgICAgbmV0d29yazogZXh0ZW5zaW9uU3RhdGVzLm5ldHdvcmssXG4gICAgICAgICAgICB3YWxsZXRzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25uZWN0VHlwZTogQ29ubmVjdFR5cGUuRVhURU5TSU9OLFxuICAgICAgICAgICAgICAgIGFkZHJlc3NlczogZXh0ZW5zaW9uU3RhdGVzLndhbGxldC5hZGRyZXNzZXMsXG4gICAgICAgICAgICAgICAgZGVzaWduOiBleHRlbnNpb25TdGF0ZXMud2FsbGV0LmRlc2lnbixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBzdXBwb3J0RmVhdHVyZXM6IGV4dGVuc2lvblN0YXRlcy5zdXBwb3J0RmVhdHVyZXMsXG4gICAgICAgICAgICBjb25uZWN0aW9uOiBtZW1vQ29ubmVjdGlvbihcbiAgICAgICAgICAgICAgQ29ubmVjdFR5cGUuRVhURU5TSU9OLFxuICAgICAgICAgICAgICBleHRlbnNpb25TdGF0ZXMuZXh0ZW5zaW9uSW5mby5uYW1lLFxuICAgICAgICAgICAgICBleHRlbnNpb25TdGF0ZXMuZXh0ZW5zaW9uSW5mby5pY29uLFxuICAgICAgICAgICAgICBleHRlbnNpb25TdGF0ZXMuZXh0ZW5zaW9uSW5mby5pZGVudGlmaWVyLFxuICAgICAgICAgICAgKSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXRlcyh0aGlzLl9ub3RDb25uZWN0ZWQpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5kaXNhYmxlRXh0ZW5zaW9uID0gKCkgPT4ge1xuICAgICAgdGhpcy5leHRlbnNpb24/LmRpc2Nvbm5lY3QoKTtcbiAgICAgIGV4dGVuc2lvblN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xuICAgICAgdGhpcy5kaXNhYmxlRXh0ZW5zaW9uID0gbnVsbDtcbiAgICB9O1xuICB9O1xuXG4gIHByaXZhdGUgZW5hYmxlV2FsbGV0Q29ubmVjdCA9ICh3YWxsZXRDb25uZWN0OiBXYWxsZXRDb25uZWN0Q29udHJvbGxlcikgPT4ge1xuICAgIHRoaXMuZGlzYWJsZVJlYWRvbmx5V2FsbGV0Py4oKTtcbiAgICB0aGlzLmRpc2FibGVFeHRlbnNpb24/LigpO1xuXG4gICAgaWYgKHRoaXMud2FsbGV0Q29ubmVjdCA9PT0gd2FsbGV0Q29ubmVjdCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLndhbGxldENvbm5lY3QpIHtcbiAgICAgIHRoaXMud2FsbGV0Q29ubmVjdC5kaXNjb25uZWN0KCk7XG4gICAgfVxuXG4gICAgdGhpcy53YWxsZXRDb25uZWN0ID0gd2FsbGV0Q29ubmVjdDtcblxuICAgIGNvbnN0IHN1YnNjcmliZVdhbGxldENvbm5lY3QgPSAoXG4gICAgICB3YzogV2FsbGV0Q29ubmVjdENvbnRyb2xsZXIsXG4gICAgKTogU3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIHJldHVybiB3Yy5zZXNzaW9uKCkuc3Vic2NyaWJlKHtcbiAgICAgICAgbmV4dDogKHN0YXR1cykgPT4ge1xuICAgICAgICAgIHN3aXRjaCAoc3RhdHVzLnN0YXR1cykge1xuICAgICAgICAgICAgY2FzZSBXYWxsZXRDb25uZWN0U2Vzc2lvblN0YXR1cy5DT05ORUNURUQ6XG4gICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdGVzKHtcbiAgICAgICAgICAgICAgICBzdGF0dXM6IFdhbGxldFN0YXR1cy5XQUxMRVRfQ09OTkVDVEVELFxuICAgICAgICAgICAgICAgIG5ldHdvcms6XG4gICAgICAgICAgICAgICAgICB0aGlzLm9wdGlvbnMud2FsbGV0Q29ubmVjdENoYWluSWRzW3N0YXR1cy5jaGFpbklkXSA/P1xuICAgICAgICAgICAgICAgICAgdGhpcy5vcHRpb25zLmRlZmF1bHROZXR3b3JrLFxuICAgICAgICAgICAgICAgIHdhbGxldHM6IFtcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdFR5cGU6IENvbm5lY3RUeXBlLldBTExFVENPTk5FQ1QsXG4gICAgICAgICAgICAgICAgICAgIC8vIEZJWE1FOiBJbnRlcmNoYWluIFdhbGxldENvbm5lY3RcbiAgICAgICAgICAgICAgICAgICAgYWRkcmVzc2VzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgW09iamVjdC52YWx1ZXModGhpcy5vcHRpb25zLndhbGxldENvbm5lY3RDaGFpbklkc1tzdGF0dXMuY2hhaW5JZF0gPz9cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3B0aW9ucy5kZWZhdWx0TmV0d29yaykuZmluZCgoeyBwcmVmaXggfSkgPT4gQWNjQWRkcmVzcy5nZXRQcmVmaXgoc3RhdHVzLnRlcnJhQWRkcmVzcykgPT09IHByZWZpeCk/LmNoYWluSUQgPz8gXCJcIl06IHN0YXR1cy50ZXJyYUFkZHJlc3NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZGVzaWduOiAnd2FsbGV0Y29ubmVjdCcsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgc3VwcG9ydEZlYXR1cmVzOiBXQUxMRVRDT05ORUNUX1NVUFBPUlRfRkVBVFVSRVMsXG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbjogQ09OTkVDVElPTlMuV0FMTEVUQ09OTkVDVCxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0ZXModGhpcy5fbm90Q29ubmVjdGVkKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHdhbGxldENvbm5lY3RTZXNzaW9uU3Vic2NyaXB0aW9uID1cbiAgICAgIHN1YnNjcmliZVdhbGxldENvbm5lY3Qod2FsbGV0Q29ubmVjdCk7XG5cbiAgICB0aGlzLmRpc2FibGVXYWxsZXRDb25uZWN0ID0gKCkgPT4ge1xuICAgICAgdGhpcy53YWxsZXRDb25uZWN0Py5kaXNjb25uZWN0KCk7XG4gICAgICB0aGlzLndhbGxldENvbm5lY3QgPSBudWxsO1xuICAgICAgd2FsbGV0Q29ubmVjdFNlc3Npb25TdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcbiAgICAgIHRoaXMuZGlzYWJsZVdhbGxldENvbm5lY3QgPSBudWxsO1xuICAgIH07XG4gIH07XG5cbiAgcHJpdmF0ZSBlbmFibGVXYWxsZXRQbHVnaW4gPSAoXG4gICAgcGx1Z2luOiBXYWxsZXRQbHVnaW4sXG4gICAgc2Vzc2lvbjogV2FsbGV0UGx1Z2luU2Vzc2lvbixcbiAgKSA9PiB7XG4gICAgdGhpcy5kaXNhYmxlUmVhZG9ubHlXYWxsZXQ/LigpO1xuICAgIHRoaXMuZGlzYWJsZUV4dGVuc2lvbj8uKCk7XG4gICAgdGhpcy5kaXNhYmxlV2FsbGV0Q29ubmVjdD8uKCk7XG5cbiAgICB0aGlzLnBsdWdpbiA9IHNlc3Npb247XG4gICAgdGhpcy51cGRhdGVTdGF0ZXMoe1xuICAgICAgc3RhdHVzOiBXYWxsZXRTdGF0dXMuV0FMTEVUX0NPTk5FQ1RFRCxcbiAgICAgIG5ldHdvcms6IHNlc3Npb24ubmV0d29yayEsXG4gICAgICB3YWxsZXRzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjb25uZWN0VHlwZTogQ29ubmVjdFR5cGUuUExVR0lOUyxcbiAgICAgICAgICBhZGRyZXNzZXM6IHNlc3Npb24uYWRkcmVzc2VzID8/IHt9LFxuICAgICAgICAgIG1ldGFkYXRhOiBzZXNzaW9uLmdldE1ldGFkYXRhICYmIHNlc3Npb24uZ2V0TWV0YWRhdGEoKSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICBzdXBwb3J0RmVhdHVyZXM6IFdBTExFVENPTk5FQ1RfU1VQUE9SVF9GRUFUVVJFUyxcbiAgICAgIGNvbm5lY3Rpb246IG1lbW9Db25uZWN0aW9uKENvbm5lY3RUeXBlLlBMVUdJTlMsIHBsdWdpbi5uYW1lLCBwbHVnaW4uaWNvbiksXG4gICAgfSk7XG4gICAgdGhpcy5kaXNhYmxlV2FsbGV0UGx1Z2luID0gKCkgPT4ge1xuICAgICAgdGhpcy5kaXNhYmxlV2FsbGV0UGx1Z2luID0gbnVsbDtcbiAgICAgIHRoaXMucGx1Z2luPy5kaXNjb25uZWN0KCk7XG4gICAgICB0aGlzLnBsdWdpbiA9IG51bGw7XG4gICAgfTtcbiAgfTtcbn1cblxuY29uc3QgbWVtb2l6ZWRDb25uZWN0aW9ucyA9IG5ldyBNYXA8c3RyaW5nLCBDb25uZWN0aW9uPigpO1xuXG5mdW5jdGlvbiBtZW1vQ29ubmVjdGlvbihcbiAgY29ubmVjdFR5cGU6IENvbm5lY3RUeXBlLFxuICBuYW1lOiBzdHJpbmcsXG4gIGljb246IHN0cmluZyxcbiAgaWRlbnRpZmllcjogc3RyaW5nIHwgdW5kZWZpbmVkID0gJycsXG4pOiBDb25uZWN0aW9uIHtcbiAgY29uc3Qga2V5ID0gW2Nvbm5lY3RUeXBlLCBuYW1lLCBpY29uLCBpZGVudGlmaWVyXS5qb2luKCc7Jyk7XG5cbiAgaWYgKG1lbW9pemVkQ29ubmVjdGlvbnMuaGFzKGtleSkpIHtcbiAgICByZXR1cm4gbWVtb2l6ZWRDb25uZWN0aW9ucy5nZXQoa2V5KSE7XG4gIH1cblxuICBjb25zdCBjb25uZWN0aW9uOiBDb25uZWN0aW9uID0ge1xuICAgIHR5cGU6IGNvbm5lY3RUeXBlLFxuICAgIG5hbWUsXG4gICAgaWNvbixcbiAgICBpZGVudGlmaWVyLFxuICB9O1xuXG4gIG1lbW9pemVkQ29ubmVjdGlvbnMuc2V0KGtleSwgY29ubmVjdGlvbik7XG5cbiAgcmV0dXJuIGNvbm5lY3Rpb247XG59XG4iXX0=