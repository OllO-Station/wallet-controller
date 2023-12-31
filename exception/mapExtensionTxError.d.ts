/// <reference types="node" />
import { CreateTxOptions } from '@terra-money/feather.js';
export declare function mapExtensionTxError(tx: CreateTxOptions, error: unknown): Error;
export declare function mapExtensionSignBytesError(bytes: Buffer, error: unknown): Error;
