"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyExtensionConnector = void 0;
const web_extension_interface_1 = require("@nestwallet/web-extension-interface");
const feather_js_1 = require("@terra-money/feather.js");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const createFixedExtension_1 = require("./createFixedExtension");
const supportFeatures = [
    'post',
    'sign',
    'sign-bytes',
];
class LegacyExtensionConnector {
    supportFeatures() {
        return supportFeatures;
    }
    constructor(identifier) {
        this.identifier = identifier;
        this.hostWindow = null;
        this.statesSubscription = null;
        this.open = (hostWindow, statesObserver) => {
            this.hostWindow = hostWindow;
            this.statesSubscription = this._states
                .pipe((0, operators_1.filter)((states) => !!states))
                .subscribe(statesObserver);
            this.refetchStates();
        };
        this.close = () => {
            this._extension.disconnect();
        };
        this.requestApproval = () => {
            this.recheckStates();
        };
        this.refetchStates = () => {
            this.recheckStates();
        };
        this.post = (address, tx) => {
            const subject = new rxjs_1.BehaviorSubject({
                status: web_extension_interface_1.WebExtensionTxStatus.PROGRESS,
            });
            this._extension
                .post(tx)
                .then(({ payload }) => {
                subject.next({
                    status: web_extension_interface_1.WebExtensionTxStatus.SUCCEED,
                    payload: payload.result,
                });
                subject.complete();
            })
                .catch((error) => subject.error(error));
            return subject.asObservable();
        };
        this.sign = (address, tx) => {
            const subject = new rxjs_1.BehaviorSubject({
                status: web_extension_interface_1.WebExtensionTxStatus.PROGRESS,
            });
            this._extension
                .sign(tx)
                .then(({ payload }) => {
                subject.next({
                    status: web_extension_interface_1.WebExtensionTxStatus.SUCCEED,
                    payload: payload.result,
                });
                subject.complete();
            })
                .catch((error) => subject.error(error));
            return subject.asObservable();
        };
        this.signBytes = (bytes) => {
            const subject = new rxjs_1.BehaviorSubject({
                status: web_extension_interface_1.WebExtensionTxStatus.PROGRESS,
            });
            this._extension
                .signBytes(bytes)
                .then(({ payload }) => {
                subject.next({
                    status: web_extension_interface_1.WebExtensionTxStatus.SUCCEED,
                    payload: {
                        recid: payload.result.recid,
                        signature: payload.result.signature,
                        public_key: {
                            '@type': '/cosmos.crypto.secp256k1.PubKey',
                            'key': payload.result.public_key,
                        },
                    },
                });
            })
                .catch((error) => subject.error(error));
            return subject.asObservable();
        };
        this.hasCW20Tokens = () => {
            throw new Error('[LegacyExtensionConnector] does not support hasCW20Tokens()');
        };
        this.addCW20Tokens = () => {
            throw new Error('[LegacyExtensionConnector] does not support addCW20Tokens()');
        };
        this.hasNetwork = () => {
            throw new Error('[LegacyExtensionConnector] does not support hasNetwork()');
        };
        this.addNetwork = () => {
            throw new Error('[LegacyExtensionConnector] does not support addNetwork()');
        };
        // ---------------------------------------------
        // internal
        // ---------------------------------------------
        this.recheckStates = async () => {
            if (this._extension.inTransactionProgress()) {
                return;
            }
            const infoResult = await this._extension.info();
            const connectResult = await this._extension.connect();
            if (connectResult.addresses && !Object.values(connectResult.addresses).map(address => feather_js_1.AccAddress.validate(address)).some(isValid => !isValid)) {
                this._states.next({
                    type: web_extension_interface_1.WebExtensionStatus.READY,
                    network: infoResult,
                    focusedWalletAddress: connectResult.addresses[Object.values(infoResult)[0].chainID],
                    wallets: [
                        {
                            name: '',
                            addresses: connectResult.addresses,
                            design: 'terra',
                        },
                    ],
                });
            }
            else {
                this._states.next({
                    type: web_extension_interface_1.WebExtensionStatus.READY,
                    network: infoResult,
                    focusedWalletAddress: undefined,
                    wallets: [],
                });
            }
        };
        this._states = new rxjs_1.BehaviorSubject({
            type: web_extension_interface_1.WebExtensionStatus.INITIALIZING,
        });
        this._extension = (0, createFixedExtension_1.createFixedExtension)(identifier);
    }
}
exports.LegacyExtensionConnector = LegacyExtensionConnector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGVnYWN5RXh0ZW5zaW9uQ29ubmVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL0B0ZXJyYS1tb25leS93YWxsZXQtY29udHJvbGxlci9tb2R1bGVzL2xlZ2FjeS1leHRlbnNpb24vTGVnYWN5RXh0ZW5zaW9uQ29ubmVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGtGQVU4QztBQUM5Qyx3REFBc0U7QUFDdEUsK0JBQTZFO0FBQzdFLDhDQUF3QztBQUN4QyxpRUFBOEU7QUFFOUUsTUFBTSxlQUFlLEdBQWdDO0lBQ25ELE1BQU07SUFDTixNQUFNO0lBQ04sWUFBWTtDQUNiLENBQUM7QUFFRixNQUFhLHdCQUF3QjtJQU1uQyxlQUFlO1FBQ2IsT0FBTyxlQUFlLENBQUM7SUFDekIsQ0FBQztJQUVELFlBQW9CLFVBQWtCO1FBQWxCLGVBQVUsR0FBVixVQUFVLENBQVE7UUFQOUIsZUFBVSxHQUFrQixJQUFJLENBQUM7UUFDakMsdUJBQWtCLEdBQXdCLElBQUksQ0FBQztRQWN2RCxTQUFJLEdBQUcsQ0FBQyxVQUFrQixFQUFFLGNBQTRDLEVBQUUsRUFBRTtZQUMxRSxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztZQUM3QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLE9BQU87aUJBQ25DLElBQUksQ0FDSCxJQUFBLGtCQUFNLEVBQ0osQ0FBQyxNQUFpQyxFQUFnQyxFQUFFLENBQ2xFLENBQUMsQ0FBQyxNQUFNLENBQ1gsQ0FDRjtpQkFDQSxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFN0IsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQztRQUVGLFVBQUssR0FBRyxHQUFHLEVBQUU7WUFDWCxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQy9CLENBQUMsQ0FBQztRQUVGLG9CQUFlLEdBQUcsR0FBRyxFQUFFO1lBQ3JC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LFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztvQkFDbkYsT0FBTyxFQUFFO3dCQUNQOzRCQUNFLElBQUksRUFBRSxFQUFFOzRCQUNSLFNBQVMsRUFBRSxhQUFhLENBQUMsU0FBUzs0QkFDbEMsTUFBTSxFQUFFLE9BQU87eUJBQ2hCO3FCQUNGO2lCQUNGLENBQUMsQ0FBQzthQUNKO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNoQixJQUFJLEVBQUUsNENBQWtCLENBQUMsS0FBSztvQkFDOUIsT0FBTyxFQUFFLFVBQVU7b0JBQ25CLG9CQUFvQixFQUFFLFNBQVM7b0JBQy9CLE9BQU8sRUFBRSxFQUFFO2lCQUNaLENBQUMsQ0FBQzthQUNKO1FBQ0gsQ0FBQyxDQUFDO1FBbEtBLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxzQkFBZSxDQUFxQjtZQUNyRCxJQUFJLEVBQUUsNENBQWtCLENBQUMsWUFBWTtTQUN0QyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUEsMkNBQW9CLEVBQUMsVUFBVSxDQUFDLENBQUM7SUFDckQsQ0FBQztDQThKRjtBQTlLRCw0REE4S0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXR3b3JrSW5mbyB9IGZyb20gJ0B0ZXJyYS1tb25leS93YWxsZXQtdHlwZXMnO1xuaW1wb3J0IHtcbiAgVGVycmFXZWJFeHRlbnNpb25Db25uZWN0b3IsXG4gIFRlcnJhV2ViRXh0ZW5zaW9uRmVhdHVyZXMsXG4gIFdlYkV4dGVuc2lvblBvc3RQYXlsb2FkLFxuICBXZWJFeHRlbnNpb25TaWduQnl0ZXNQYXlsb2FkLFxuICBXZWJFeHRlbnNpb25TaWduUGF5bG9hZCxcbiAgV2ViRXh0ZW5zaW9uU3RhdGVzLFxuICBXZWJFeHRlbnNpb25TdGF0dXMsXG4gIFdlYkV4dGVuc2lvblR4UmVzdWx0LFxuICBXZWJFeHRlbnNpb25UeFN0YXR1cyxcbn0gZnJvbSAnQHRlcnJhLW1vbmV5L3dlYi1leHRlbnNpb24taW50ZXJmYWNlJztcbmltcG9ydCB7IEFjY0FkZHJlc3MsIENyZWF0ZVR4T3B0aW9ucyB9IGZyb20gJ0B0ZXJyYS1tb25leS9mZWF0aGVyLmpzJztcbmltcG9ydCB7IEJlaGF2aW9yU3ViamVjdCwgT2JzZXJ2ZXIsIFN1YnNjcmliYWJsZSwgU3Vic2NyaXB0aW9uIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBmaWx0ZXIgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBjcmVhdGVGaXhlZEV4dGVuc2lvbiwgRml4ZWRFeHRlbnNpb24gfSBmcm9tICcuL2NyZWF0ZUZpeGVkRXh0ZW5zaW9uJztcblxuY29uc3Qgc3VwcG9ydEZlYXR1cmVzOiBUZXJyYVdlYkV4dGVuc2lvbkZlYXR1cmVzW10gPSBbXG4gICdwb3N0JyxcbiAgJ3NpZ24nLFxuICAnc2lnbi1ieXRlcycsXG5dO1xuXG5leHBvcnQgY2xhc3MgTGVnYWN5RXh0ZW5zaW9uQ29ubmVjdG9yIGltcGxlbWVudHMgVGVycmFXZWJFeHRlbnNpb25Db25uZWN0b3Ige1xuICBwcml2YXRlIF9zdGF0ZXM6IEJlaGF2aW9yU3ViamVjdDxXZWJFeHRlbnNpb25TdGF0ZXM+O1xuICBwcml2YXRlIF9leHRlbnNpb246IEZpeGVkRXh0ZW5zaW9uO1xuICBwcml2YXRlIGhvc3RXaW5kb3c6IFdpbmRvdyB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIHN0YXRlc1N1YnNjcmlwdGlvbjogU3Vic2NyaXB0aW9uIHwgbnVsbCA9IG51bGw7XG5cbiAgc3VwcG9ydEZlYXR1cmVzKCkge1xuICAgIHJldHVybiBzdXBwb3J0RmVhdHVyZXM7XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGlkZW50aWZpZXI6IHN0cmluZykge1xuICAgIHRoaXMuX3N0YXRlcyA9IG5ldyBCZWhhdmlvclN1YmplY3Q8V2ViRXh0ZW5zaW9uU3RhdGVzPih7XG4gICAgICB0eXBlOiBXZWJFeHRlbnNpb25TdGF0dXMuSU5JVElBTElaSU5HLFxuICAgIH0pO1xuXG4gICAgdGhpcy5fZXh0ZW5zaW9uID0gY3JlYXRlRml4ZWRFeHRlbnNpb24oaWRlbnRpZmllcik7XG4gIH1cblxuICBvcGVuID0gKGhvc3RXaW5kb3c6IFdpbmRvdywgc3RhdGVzT2JzZXJ2ZXI6IE9ic2VydmVyPFdlYkV4dGVuc2lvblN0YXRlcz4pID0+IHtcbiAgICB0aGlzLmhvc3RXaW5kb3cgPSBob3N0V2luZG93O1xuICAgIHRoaXMuc3RhdGVzU3Vic2NyaXB0aW9uID0gdGhpcy5fc3RhdGVzXG4gICAgICAucGlwZShcbiAgICAgICAgZmlsdGVyKFxuICAgICAgICAgIChzdGF0ZXM6IFdlYkV4dGVuc2lvblN0YXRlcyB8IG51bGwpOiBzdGF0ZXMgaXMgV2ViRXh0ZW5zaW9uU3RhdGVzID0+XG4gICAgICAgICAgICAhIXN0YXRlcyxcbiAgICAgICAgKSxcbiAgICAgIClcbiAgICAgIC5zdWJzY3JpYmUoc3RhdGVzT2JzZXJ2ZXIpO1xuXG4gICAgdGhpcy5yZWZldGNoU3RhdGVzKCk7XG4gIH07XG5cbiAgY2xvc2UgPSAoKSA9PiB7XG4gICAgdGhpcy5fZXh0ZW5zaW9uLmRpc2Nvbm5lY3QoKTtcbiAgfTtcblxuICByZXF1ZXN0QXBwcm92YWwgPSAoKSA9PiB7XG4gICAgdGhpcy5yZWNoZWNrU3RhdGVzKCk7XG4gIH07XG5cbiAgcmVmZXRjaFN0YXRlcyA9ICgpID0+IHtcbiAgICB0aGlzLnJlY2hlY2tTdGF0ZXMoKTtcbiAgfTtcblxuICBwb3N0ID0gKFxuICAgIGFkZHJlc3M6IEFjY0FkZHJlc3MsXG4gICAgdHg6IENyZWF0ZVR4T3B0aW9ucyxcbiAgKTogU3Vic2NyaWJhYmxlPFdlYkV4dGVuc2lvblR4UmVzdWx0PFdlYkV4dGVuc2lvblBvc3RQYXlsb2FkPj4gPT4ge1xuICAgIGNvbnN0IHN1YmplY3QgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFxuICAgICAgV2ViRXh0ZW5zaW9uVHhSZXN1bHQ8V2ViRXh0ZW5zaW9uUG9zdFBheWxvYWQ+XG4gICAgPih7XG4gICAgICBzdGF0dXM6IFdlYkV4dGVuc2lvblR4U3RhdHVzLlBST0dSRVNTLFxuICAgIH0pO1xuXG4gICAgdGhpcy5fZXh0ZW5zaW9uXG4gICAgICAucG9zdCh0eClcbiAgICAgIC50aGVuKCh7IHBheWxvYWQgfSkgPT4ge1xuICAgICAgICBzdWJqZWN0Lm5leHQoe1xuICAgICAgICAgIHN0YXR1czogV2ViRXh0ZW5zaW9uVHhTdGF0dXMuU1VDQ0VFRCxcbiAgICAgICAgICBwYXlsb2FkOiBwYXlsb2FkLnJlc3VsdCxcbiAgICAgICAgfSk7XG4gICAgICAgIHN1YmplY3QuY29tcGxldGUoKTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycm9yKSA9PiBzdWJqZWN0LmVycm9yKGVycm9yKSk7XG5cbiAgICByZXR1cm4gc3ViamVjdC5hc09ic2VydmFibGUoKTtcbiAgfTtcblxuICBzaWduID0gKFxuICAgIGFkZHJlc3M6IEFjY0FkZHJlc3MsXG4gICAgdHg6IENyZWF0ZVR4T3B0aW9ucyxcbiAgKTogU3Vic2NyaWJhYmxlPFdlYkV4dGVuc2lvblR4UmVzdWx0PFdlYkV4dGVuc2lvblNpZ25QYXlsb2FkPj4gPT4ge1xuICAgIGNvbnN0IHN1YmplY3QgPSBuZXcgQmVoYXZpb3JTdWJqZWN0PFxuICAgICAgV2ViRXh0ZW5zaW9uVHhSZXN1bHQ8V2ViRXh0ZW5zaW9uU2lnblBheWxvYWQ+XG4gICAgPih7XG4gICAgICBzdGF0dXM6IFdlYkV4dGVuc2lvblR4U3RhdHVzLlBST0dSRVNTLFxuICAgIH0pO1xuXG4gICAgdGhpcy5fZXh0ZW5zaW9uXG4gICAgICAuc2lnbih0eClcbiAgICAgIC50aGVuKCh7IHBheWxvYWQgfSkgPT4ge1xuICAgICAgICBzdWJqZWN0Lm5leHQoe1xuICAgICAgICAgIHN0YXR1czogV2ViRXh0ZW5zaW9uVHhTdGF0dXMuU1VDQ0VFRCxcbiAgICAgICAgICBwYXlsb2FkOiBwYXlsb2FkLnJlc3VsdCxcbiAgICAgICAgfSk7XG4gICAgICAgIHN1YmplY3QuY29tcGxldGUoKTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycm9yKSA9PiBzdWJqZWN0LmVycm9yKGVycm9yKSk7XG5cbiAgICByZXR1cm4gc3ViamVjdC5hc09ic2VydmFibGUoKTtcbiAgfTtcblxuICBzaWduQnl0ZXMgPSAoXG4gICAgYnl0ZXM6IEJ1ZmZlcixcbiAgKTogU3Vic2NyaWJhYmxlPFdlYkV4dGVuc2lvblR4UmVzdWx0PFdlYkV4dGVuc2lvblNpZ25CeXRlc1BheWxvYWQ+PiA9PiB7XG4gICAgY29uc3Qgc3ViamVjdCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8XG4gICAgICBXZWJFeHRlbnNpb25UeFJlc3VsdDxXZWJFeHRlbnNpb25TaWduQnl0ZXNQYXlsb2FkPlxuICAgID4oe1xuICAgICAgc3RhdHVzOiBXZWJFeHRlbnNpb25UeFN0YXR1cy5QUk9HUkVTUyxcbiAgICB9KTtcblxuICAgIHRoaXMuX2V4dGVuc2lvblxuICAgICAgLnNpZ25CeXRlcyhieXRlcylcbiAgICAgIC50aGVuKCh7IHBheWxvYWQgfSkgPT4ge1xuICAgICAgICBzdWJqZWN0Lm5leHQoe1xuICAgICAgICAgIHN0YXR1czogV2ViRXh0ZW5zaW9uVHhTdGF0dXMuU1VDQ0VFRCxcbiAgICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgICByZWNpZDogcGF5bG9hZC5yZXN1bHQucmVjaWQsXG4gICAgICAgICAgICBzaWduYXR1cmU6IHBheWxvYWQucmVzdWx0LnNpZ25hdHVyZSxcbiAgICAgICAgICAgIHB1YmxpY19rZXk6IHtcbiAgICAgICAgICAgICAgJ0B0eXBlJzogJy9jb3Ntb3MuY3J5cHRvLnNlY3AyNTZrMS5QdWJLZXknLFxuICAgICAgICAgICAgICAna2V5JzogcGF5bG9hZC5yZXN1bHQucHVibGljX2tleSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgICAgLmNhdGNoKChlcnJvcikgPT4gc3ViamVjdC5lcnJvcihlcnJvcikpO1xuXG4gICAgcmV0dXJuIHN1YmplY3QuYXNPYnNlcnZhYmxlKCk7XG4gIH07XG5cbiAgaGFzQ1cyMFRva2VucyA9ICgpID0+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnW0xlZ2FjeUV4dGVuc2lvbkNvbm5lY3Rvcl0gZG9lcyBub3Qgc3VwcG9ydCBoYXNDVzIwVG9rZW5zKCknLFxuICAgICk7XG4gIH07XG5cbiAgYWRkQ1cyMFRva2VucyA9ICgpID0+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnW0xlZ2FjeUV4dGVuc2lvbkNvbm5lY3Rvcl0gZG9lcyBub3Qgc3VwcG9ydCBhZGRDVzIwVG9rZW5zKCknLFxuICAgICk7XG4gIH07XG5cbiAgaGFzTmV0d29yayA9ICgpID0+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1tMZWdhY3lFeHRlbnNpb25Db25uZWN0b3JdIGRvZXMgbm90IHN1cHBvcnQgaGFzTmV0d29yaygpJyk7XG4gIH07XG5cbiAgYWRkTmV0d29yayA9ICgpID0+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1tMZWdhY3lFeHRlbnNpb25Db25uZWN0b3JdIGRvZXMgbm90IHN1cHBvcnQgYWRkTmV0d29yaygpJyk7XG4gIH07XG5cbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIGludGVybmFsXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICByZWNoZWNrU3RhdGVzID0gYXN5bmMgKCkgPT4ge1xuICAgIGlmICh0aGlzLl9leHRlbnNpb24uaW5UcmFuc2FjdGlvblByb2dyZXNzKCkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBpbmZvUmVzdWx0OiBOZXR3b3JrSW5mbyA9IGF3YWl0IHRoaXMuX2V4dGVuc2lvbi5pbmZvKCk7XG4gICAgY29uc3QgY29ubmVjdFJlc3VsdDogeyBhZGRyZXNzZXM/OiBSZWNvcmQ8c3RyaW5nLCBBY2NBZGRyZXNzPiB9ID0gYXdhaXQgdGhpcy5fZXh0ZW5zaW9uLmNvbm5lY3QoKTtcblxuICAgIGlmIChjb25uZWN0UmVzdWx0LmFkZHJlc3NlcyAmJiAhT2JqZWN0LnZhbHVlcyhjb25uZWN0UmVzdWx0LmFkZHJlc3NlcykubWFwKGFkZHJlc3MgPT4gQWNjQWRkcmVzcy52YWxpZGF0ZShhZGRyZXNzKSkuc29tZShpc1ZhbGlkID0+ICFpc1ZhbGlkKSkge1xuICAgICAgdGhpcy5fc3RhdGVzLm5leHQoe1xuICAgICAgICB0eXBlOiBXZWJFeHRlbnNpb25TdGF0dXMuUkVBRFksXG4gICAgICAgIG5ldHdvcms6IGluZm9SZXN1bHQsXG4gICAgICAgIGZvY3VzZWRXYWxsZXRBZGRyZXNzOiBjb25uZWN0UmVzdWx0LmFkZHJlc3Nlc1tPYmplY3QudmFsdWVzKGluZm9SZXN1bHQpWzBdLmNoYWluSURdLFxuICAgICAgICB3YWxsZXRzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogJycsXG4gICAgICAgICAgICBhZGRyZXNzZXM6IGNvbm5lY3RSZXN1bHQuYWRkcmVzc2VzLFxuICAgICAgICAgICAgZGVzaWduOiAndGVycmEnLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fc3RhdGVzLm5leHQoe1xuICAgICAgICB0eXBlOiBXZWJFeHRlbnNpb25TdGF0dXMuUkVBRFksXG4gICAgICAgIG5ldHdvcms6IGluZm9SZXN1bHQsXG4gICAgICAgIGZvY3VzZWRXYWxsZXRBZGRyZXNzOiB1bmRlZmluZWQsXG4gICAgICAgIHdhbGxldHM6IFtdLFxuICAgICAgfSk7XG4gICAgfVxuICB9O1xufVxuIl19