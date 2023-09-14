import { WalletStates } from '@terra-money/wallet-types';
import { LCDClient, LCDClientConfig } from '@terra-money/feather.js';
import { OperatorFunction } from 'rxjs';
export declare function toLcdClient(lcdClientConfig: Record<string, LCDClientConfig>): OperatorFunction<WalletStates, LCDClient>;
