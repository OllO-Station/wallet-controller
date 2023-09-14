/// <reference types="node" />
import { CreateTxOptions } from '@terra-money/feather.js';
export declare function mapWalletConnectError(tx: CreateTxOptions, error: unknown): Error;
export declare function mapWalletConnectSignBytesError(bytes: Buffer, error: unknown): Error;
