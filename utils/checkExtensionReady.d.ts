declare global {
    interface Window {
        isStationExtensionAvailable: boolean;
    }
}
export declare function checkExtensionReady(timeout: number, isChromeExtensionCompatibleBrowser: boolean): Promise<boolean>;
