import { ConnectedWallet, WalletStates } from '@nestwallet/wallet-types';
import { OperatorFunction } from 'rxjs';
import { WalletController } from '../controller';
export declare function toConnectedWallet(controller: WalletController): OperatorFunction<WalletStates, ConnectedWallet | undefined>;
