import { WalletControllerOptions } from './controller';
export type WalletControllerChainOptions = Pick<WalletControllerOptions, 'defaultNetwork' | 'walletConnectChainIds'>;
export declare function getChainOptions(): Promise<WalletControllerChainOptions>;
