/// <reference types="node" />
import { TerraWebExtensionConnector, TerraWebExtensionFeatures, WebExtensionPostPayload, WebExtensionSignBytesPayload, WebExtensionSignPayload, WebExtensionStates, WebExtensionTxResult } from '@nestwallet/web-extension-interface';
import { AccAddress, CreateTxOptions } from '@terra-money/feather.js';
import { Observer, Subscribable } from 'rxjs';
export declare class LegacyExtensionConnector implements TerraWebExtensionConnector {
    private identifier;
    private _states;
    private _extension;
    private hostWindow;
    private statesSubscription;
    supportFeatures(): TerraWebExtensionFeatures[];
    constructor(identifier: string);
    open: (hostWindow: Window, statesObserver: Observer<WebExtensionStates>) => void;
    close: () => void;
    requestApproval: () => void;
    refetchStates: () => void;
    post: (address: AccAddress, tx: CreateTxOptions) => Subscribable<WebExtensionTxResult<WebExtensionPostPayload>>;
    sign: (address: AccAddress, tx: CreateTxOptions) => Subscribable<WebExtensionTxResult<WebExtensionSignPayload>>;
    signBytes: (bytes: Buffer) => Subscribable<WebExtensionTxResult<WebExtensionSignBytesPayload>>;
    hasCW20Tokens: () => never;
    addCW20Tokens: () => never;
    hasNetwork: () => never;
    addNetwork: () => never;
    recheckStates: () => Promise<void>;
}
