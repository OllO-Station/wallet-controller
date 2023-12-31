import { IQRCodeModal, IQRCodeModalOptions } from '@walletconnect/types';
export declare class TerraWalletconnectQrcodeModal implements IQRCodeModal {
    modalContainer: HTMLDivElement | null;
    styleContainer: HTMLStyleElement | null;
    private callback;
    setCloseCallback: (callback: () => void) => void;
    open: (uri: string, cb: () => void, _qrcodeModalOptions?: IQRCodeModalOptions) => void;
    close: () => void;
}
