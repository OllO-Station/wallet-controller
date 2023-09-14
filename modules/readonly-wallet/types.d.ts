import { NetworkInfo } from '@nestwallet/wallet-types';
export interface ReadonlyWalletSession {
    network: NetworkInfo;
    terraAddress: string;
}
