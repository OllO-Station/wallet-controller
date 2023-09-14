import { Connection, ConnectType } from '@nestwallet/wallet-types';
export declare function selectConnection(connections: Connection[]): Promise<[type: ConnectType, identifier: string | undefined] | null>;
