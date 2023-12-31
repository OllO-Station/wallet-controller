/// <reference types="node" />
import { NetworkInfo } from '@nestwallet/wallet-types';
import { WebExtensionNetworkInfo, WebExtensionPostPayload, WebExtensionSignBytesPayload, WebExtensionSignPayload, WebExtensionTxResult } from '@nestwallet/web-extension-interface';
import { CreateTxOptions } from '@terra-money/feather.js';
import { Subscribable } from 'rxjs';
import { ExtensionInfo } from './multiChannel';
import { ExtensionRouterStates } from './types';
export interface ExtensionRouterOptions {
    defaultNetwork: NetworkInfo;
    selectExtension?: (extensionInfos: ExtensionInfo[]) => Promise<ExtensionInfo | null>;
    hostWindow?: Window;
    dangerously__chromeExtensionCompatibleBrowserCheck: (userAgent: string) => boolean;
}
export declare class ExtensionRouter {
    private readonly options;
    private readonly _states;
    private readonly _extensionInfos;
    private _connector;
    constructor(options: ExtensionRouterOptions);
    states: () => import("rxjs").Observable<ExtensionRouterStates>;
    getLastStates: () => ExtensionRouterStates;
    connect: (identifier?: string) => Promise<void>;
    disconnect: () => void;
    requestApproval: () => void;
    refetchStates: () => void;
    post: (tx: CreateTxOptions, address?: string) => Subscribable<WebExtensionTxResult<WebExtensionPostPayload>>;
    sign: (tx: CreateTxOptions, address?: string) => Subscribable<WebExtensionTxResult<WebExtensionSignPayload>>;
    signBytes: (bytes: Buffer, terraAddress?: string) => Subscribable<WebExtensionTxResult<WebExtensionSignBytesPayload>>;
    hasCW20Tokens: (chainID: string, ...tokenAddrs: string[]) => Promise<{
        [tokenAddr: string]: boolean;
    }>;
    addCW20Tokens: (chainID: string, ...tokenAddrs: string[]) => Promise<{
        [tokenAddr: string]: boolean;
    }>;
    hasNetwork: (network: Omit<WebExtensionNetworkInfo, 'name'>) => Promise<boolean>;
    addNetwork: (network: WebExtensionNetworkInfo) => Promise<boolean>;
    private createConnector;
}
