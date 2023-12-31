import { NetworkInfo } from '@nestwallet/wallet-types';
import { ReadonlyWalletSession } from './types';
interface Options {
    networks: NetworkInfo[];
}
export declare function readonlyWalletModal({ networks, }: Options): Promise<ReadonlyWalletSession | null>;
export {};
