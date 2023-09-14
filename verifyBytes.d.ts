/// <reference types="node" />
import { SignBytesResult } from '@nestwallet/wallet-types';
export declare function verifyBytes(bytes: Buffer, signBytesResult: SignBytesResult['result']): boolean;
