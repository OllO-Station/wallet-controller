import { TerraWebExtensionConnector } from '@nestwallet/web-extension-interface';
export interface ExtensionInfo {
    name: string;
    identifier: string;
    icon: string;
    connector?: () => TerraWebExtensionConnector | Promise<TerraWebExtensionConnector>;
}
declare global {
    interface Window {
        interchainWallets: ExtensionInfo[] | undefined;
    }
}
export declare function getTerraExtensions(): ExtensionInfo[];
