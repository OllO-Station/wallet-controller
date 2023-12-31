/// <reference types="node" />
import { LCDClientConfig } from '@terra-money/feather.js';
import { ExtensionOptions, LCDClient } from '@terra-money/feather.js';
import { ConnectedWallet, Connection, ConnectType, Installation, NetworkInfo, SignBytesResult, SignResult, TxResult, WalletStates } from '@nestwallet/wallet-types';
import { Observable } from 'rxjs';
import { ExtensionInfo } from './modules/extension-router/multiChannel';
import { ReadonlyWalletSession } from './modules/readonly-wallet';
import { WalletPlugin } from './modules/wallet-plugin/types';
import { WalletConnectControllerOptions } from './modules/walletconnect';
export interface WalletControllerOptions extends WalletConnectControllerOptions {
    /**
     * ⚠️ Don't hardcoding this, use getChain Options()
     *
     * fallback network if controller is not connected
     */
    defaultNetwork: NetworkInfo;
    /**
     * ⚠️ Don't hardcoding this, use getChain Options()
     *
     * for walletconnect
     *
     * The network rules passed by the Terra Station Mobile are 0 is testnet, 1 is mainnet.
     *
     * Always set testnet for 0 and mainnet for 1.
     *
     * @example
     * ```
     * const mainnet: NetworkInfo = {
     *  name: 'mainnet',
     *  chainID: 'columbus-5',
     *  lcd: 'https://lcd.terra.dev',
     * }
     *
     * const testnet: NetworkInfo = {
     *  name: 'testnet',
     *  chainID: 'bombay-12',
     *  lcd: 'https://bombay-lcd.terra.dev',
     * }
     *
     * const walletConnectChainIds: Record<number, NetworkInfo> = {
     *   0: testnet,
     *   1: mainnet,
     * }
     *
     * <WalletProvider walletConnectChainIds={walletConnectChainIds}>
     * ```
     */
    walletConnectChainIds: Record<number, NetworkInfo>;
    /**
     * run at executing the `connect(ConnectType.READONLY)`
     */
    createReadonlyWalletSession?: (networks: NetworkInfo[]) => Promise<ReadonlyWalletSession | null>;
    plugins?: WalletPlugin[];
    /**
     * run at executing the `connect()` - only used when does not input ConnectType
     */
    selectConnection?: (connections: Connection[]) => Promise<[type: ConnectType, identifier: string | undefined] | null>;
    /**
     * run at executing the `connect(ConnectType.EXTENSION)`
     * if user installed multiple wallets
     */
    selectExtension?: (extensionInfos: ExtensionInfo[]) => Promise<ExtensionInfo | null>;
    /**
     * milliseconds to wait checking chrome extension is installed
     *
     * @default 1000 * 3 miliseconds
     */
    waitingChromeExtensionInstallCheck?: number;
    /**
     * ⚠️ This API is an option for wallet developers. Please don't use dApp developers.
     *
     * @example
     * ```
     * <WalletProvider dangerously__chromeExtensionCompatibleBrowserCheck={(userAgent: string) => {
     *   return /MyWallet\//.test(userAgent);
     * }}>
     * ```
     */
    dangerously__chromeExtensionCompatibleBrowserCheck?: (userAgent: string) => boolean;
}
export declare class WalletController {
    readonly options: WalletControllerOptions;
    private extension;
    private walletConnect;
    private readonlyWallet;
    private plugin;
    private _availableConnectTypes;
    private _availableInstallTypes;
    private _states;
    private disableReadonlyWallet;
    private disableExtension;
    private disableWalletConnect;
    private disableWalletPlugin;
    private readonly _notConnected;
    private readonly _initializing;
    constructor(options: WalletControllerOptions);
    /**
     * Some mobile wallet emulates the behavior of chrome extension.
     * It confirms that the current connection environment is such a wallet.
     * (If you are running connect() by checking availableConnectType, you do not need to use this API.)
     *
     * @see Wallet#isChromeExtensionCompatibleBrowser
     */
    isChromeExtensionCompatibleBrowser: () => boolean;
    /**
     * available connect types on the browser
     *
     * @see Wallet#availableConnectTypes
     */
    availableConnectTypes: () => Observable<ConnectType[]>;
    /**
     * available connections includes identifier, name, icon
     *
     * @see Wallet#availableConnections
     */
    availableConnections: () => Observable<Connection[]>;
    /**
     * available install types on the browser
     *
     * in this time, this only contains [ConnectType.EXTENSION]
     *
     * @see Wallet#availableInstallTypes
     */
    availableInstallTypes: () => Observable<ConnectType[]>;
    /**
     * available installations includes identifier, name, icon, url
     *
     * @see Wallet#availableInstallations
     */
    availableInstallations: () => Observable<Installation[]>;
    /**
     * @see Wallet#status
     * @see Wallet#network
     * @see Wallet#wallets
     */
    states: () => Observable<WalletStates>;
    /** get connectedWallet */
    connectedWallet: () => Observable<ConnectedWallet | undefined>;
    /** get lcdClient */
    lcdClient: (lcdClientConfig: Record<string, LCDClientConfig>) => Observable<LCDClient>;
    /**
     * reload the connected wallet states
     *
     * in this time, this only work on the ConnectType.EXTENSION
     *
     * @see Wallet#recheckStatus
     */
    refetchStates: () => void;
    /**
     * @deprecated Please use availableInstallations
     *
     * install for the connect type
     *
     * @see Wallet#install
     */
    install: (type: ConnectType) => void;
    /**
     * connect to wallet
     *
     * @see Wallet#connect
     */
    connect: (_type?: ConnectType, _identifier?: string) => Promise<void>;
    /**
     * manual connect to read only session
     *
     * @see Wallet#connectReadonly
     */
    connectReadonly: (terraAddress: string, network: NetworkInfo) => void;
    /** @see Wallet#disconnect */
    disconnect: () => void;
    /**
     * @see Wallet#post
     * @param tx
     * @param terraAddress only available new extension
     */
    post: (tx: ExtensionOptions, terraAddress?: string | undefined) => Promise<TxResult>;
    /**
     * @see Wallet#sign
     * @param tx
     * @param terraAddress only available new extension
     */
    sign: (tx: ExtensionOptions, terraAddress?: string) => Promise<SignResult>;
    /**
     * @see Wallet#signBytes
     * @param bytes
     * @param terraAddress only available new extension
     */
    signBytes: (bytes: Buffer, terraAddress?: string) => Promise<SignBytesResult>;
    /**
     * @see Wallet#hasCW20Tokens
     * @param chainID
     * @param tokenAddrs Token addresses
     */
    hasCW20Tokens: (chainID: string, ...tokenAddrs: string[]) => Promise<{
        [tokenAddr: string]: boolean;
    }>;
    /**
     * @see Wallet#addCW20Tokens
     * @param chainID
     * @param tokenAddrs Token addresses
     */
    addCW20Tokens: (chainID: string, ...tokenAddrs: string[]) => Promise<{
        [tokenAddr: string]: boolean;
    }>;
    /**
     * @see Wallet#hasNetwork
     * @param network
     */
    hasNetwork: (network: Omit<NetworkInfo, 'name'>) => Promise<boolean>;
    /**
     * @see Wallet#hasNetwork
     * @param network
     */
    addNetwork: (network: NetworkInfo) => Promise<boolean>;
    private availableExtensionFeature;
    private updateStates;
    private enableReadonlyWallet;
    private enableExtension;
    private enableWalletConnect;
    private enableWalletPlugin;
}
