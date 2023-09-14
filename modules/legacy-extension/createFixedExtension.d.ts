/// <reference types="node" />
import { NetworkInfo } from '@nestwallet/wallet-types';
import { ExtensionOptions, Tx, AccAddress } from '@terra-money/feather.js';
type ConnectResponse = {
    addresses?: Record<string, AccAddress>;
};
type PostResponse = {
    payload: {
        result: {
            height: number;
            raw_log: string;
            txhash: string;
        };
    };
};
type SignResponse = {
    payload: {
        result: Tx.Data;
    };
};
type SignBytesResponse = {
    payload: {
        result: {
            public_key: string;
            recid: number;
            signature: string;
        };
    };
};
type InfoResponse = NetworkInfo;
export interface FixedExtension {
    post: (data: ExtensionOptions) => Promise<PostResponse>;
    sign: (data: ExtensionOptions) => Promise<SignResponse>;
    signBytes: (bytes: Buffer) => Promise<SignBytesResponse>;
    info: () => Promise<InfoResponse>;
    connect: () => Promise<ConnectResponse>;
    inTransactionProgress: () => boolean;
    disconnect: () => void;
}
export declare function createFixedExtension(identifier: string): FixedExtension;
export {};
