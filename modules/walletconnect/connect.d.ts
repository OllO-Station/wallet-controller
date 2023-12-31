/// <reference types="node" />
import { ExtensionOptions } from '@terra-money/feather.js';
import { IPushServerOptions, IWalletConnectOptions } from '@walletconnect/types';
import { Observable } from 'rxjs';
import { WalletConnectSession, WalletConnectTxResult } from './types';
import { WebExtensionSignBytesPayload } from '@nestwallet/web-extension-interface';
export interface WalletConnectControllerOptions {
    /**
     * Configuration parameter that `new WalletConnect(connectorOpts)`
     *
     * @default
     * ```js
     * {
     *   bridge: 'https://walletconnect.terra.dev/',
     *   qrcodeModal: new TerraWalletconnectQrcodeModal(),
     * }
     * ```
     */
    connectorOpts?: IWalletConnectOptions;
    /**
     * Configuration parameter that `new WalletConnect(_, pushServerOpts)`
     *
     * @default undefined
     */
    pushServerOpts?: IPushServerOptions;
}
export interface WalletConnectController {
    session: () => Observable<WalletConnectSession>;
    getLatestSession: () => WalletConnectSession;
    post: (tx: ExtensionOptions) => Promise<WalletConnectTxResult>;
    signBytes: (bytes: Buffer) => Promise<WebExtensionSignBytesPayload>;
    disconnect: () => void;
}
export declare function connectIfSessionExists(options?: WalletConnectControllerOptions): WalletConnectController | null;
export declare function connect(options?: WalletConnectControllerOptions, useCachedSession?: boolean): WalletConnectController;
