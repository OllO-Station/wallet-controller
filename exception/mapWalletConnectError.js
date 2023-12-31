import { CreateTxFailed, Timeout, TxFailed, TxUnspecifiedError, UserDenied, SignBytesUnspecifiedError } from '@nestwallet/wallet-types';
import { WalletConnectCreateTxFailed, WalletConnectTimeout, WalletConnectTxFailed, WalletConnectTxUnspecifiedError, WalletConnectUserDenied, WalletConnectSignBytesUnspecifiedError, } from '../modules/walletconnect';
import { isError } from './isError';
export function mapWalletConnectError(tx, error) {
    if (isError(error, UserDenied) ||
        isError(error, Timeout) ||
        isError(error, CreateTxFailed) ||
        isError(error, TxFailed) ||
        isError(error, TxUnspecifiedError)) {
        return error;
    }
    else if (isError(error, WalletConnectUserDenied)) {
        return new UserDenied();
    }
    else if (isError(error, WalletConnectTimeout)) {
        return new Timeout(error.message);
    }
    else if (isError(error, WalletConnectCreateTxFailed)) {
        return new CreateTxFailed(tx, error.message);
    }
    else if (isError(error, WalletConnectTxFailed)) {
        return new TxFailed(tx, error.txhash, error.message, null);
    }
    else if (isError(error, WalletConnectTxUnspecifiedError)) {
        return new TxUnspecifiedError(tx, error.message);
    }
    return new TxUnspecifiedError(tx, error instanceof Error ? error.message : String(error));
}
export function mapWalletConnectSignBytesError(bytes, error) {
    if (isError(error, UserDenied) ||
        isError(error, Timeout) ||
        isError(error, SignBytesUnspecifiedError)) {
        return error;
    }
    else if (isError(error, WalletConnectUserDenied)) {
        return new UserDenied();
    }
    else if (isError(error, WalletConnectTimeout)) {
        return new Timeout(error.message);
    }
    else if (isError(error, WalletConnectSignBytesUnspecifiedError)) {
        return new SignBytesUnspecifiedError(bytes, error.message);
    }
    return new SignBytesUnspecifiedError(bytes, error instanceof Error ? error.message : String(error));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwV2FsbGV0Q29ubmVjdEVycm9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL0B0ZXJyYS1tb25leS93YWxsZXQtY29udHJvbGxlci9leGNlcHRpb24vbWFwV2FsbGV0Q29ubmVjdEVycm9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFDTCxjQUFjLEVBQ2QsT0FBTyxFQUNQLFFBQVEsRUFDUixrQkFBa0IsRUFDbEIsVUFBVSxFQUNWLHlCQUF5QixFQUMxQixNQUFNLDJCQUEyQixDQUFDO0FBQ25DLE9BQU8sRUFDTCwyQkFBMkIsRUFDM0Isb0JBQW9CLEVBQ3BCLHFCQUFxQixFQUNyQiwrQkFBK0IsRUFDL0IsdUJBQXVCLEVBQ3ZCLHNDQUFzQyxHQUN2QyxNQUFNLDBCQUEwQixDQUFDO0FBQ2xDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFFcEMsTUFBTSxVQUFVLHFCQUFxQixDQUNuQyxFQUFtQixFQUNuQixLQUFjO0lBRWQsSUFDRSxPQUFPLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQztRQUMxQixPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQztRQUN2QixPQUFPLENBQUMsS0FBSyxFQUFFLGNBQWMsQ0FBQztRQUM5QixPQUFPLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQztRQUN4QixPQUFPLENBQUMsS0FBSyxFQUFFLGtCQUFrQixDQUFDLEVBQ2xDO1FBQ0EsT0FBTyxLQUFLLENBQUM7S0FDZDtTQUFNLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSx1QkFBdUIsQ0FBQyxFQUFFO1FBQ2xELE9BQU8sSUFBSSxVQUFVLEVBQUUsQ0FBQztLQUN6QjtTQUFNLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxvQkFBb0IsQ0FBQyxFQUFFO1FBQy9DLE9BQU8sSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ25DO1NBQU0sSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLDJCQUEyQixDQUFDLEVBQUU7UUFDdEQsT0FBTyxJQUFJLGNBQWMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQzlDO1NBQU0sSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLHFCQUFxQixDQUFDLEVBQUU7UUFDaEQsT0FBTyxJQUFJLFFBQVEsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0tBQzVEO1NBQU0sSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLCtCQUErQixDQUFDLEVBQUU7UUFDMUQsT0FBTyxJQUFJLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDbEQ7SUFDRCxPQUFPLElBQUksa0JBQWtCLENBQzNCLEVBQUUsRUFDRixLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQ3ZELENBQUM7QUFDSixDQUFDO0FBRUQsTUFBTSxVQUFVLDhCQUE4QixDQUM1QyxLQUFhLEVBQ2IsS0FBYztJQUVkLElBQ0UsT0FBTyxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUM7UUFDMUIsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUM7UUFDdkIsT0FBTyxDQUFDLEtBQUssRUFBRSx5QkFBeUIsQ0FBQyxFQUN6QztRQUNBLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7U0FBTSxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsdUJBQXVCLENBQUMsRUFBRTtRQUNsRCxPQUFPLElBQUksVUFBVSxFQUFFLENBQUM7S0FDekI7U0FBTSxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLENBQUMsRUFBRTtRQUMvQyxPQUFPLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztLQUNuQztTQUFNLElBQUksT0FBTyxDQUFDLEtBQUssRUFBRSxzQ0FBc0MsQ0FBQyxFQUFFO1FBQ2pFLE9BQU8sSUFBSSx5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQzVEO0lBQ0QsT0FBTyxJQUFJLHlCQUF5QixDQUNsQyxLQUFLLEVBQ0wsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUN2RCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENyZWF0ZVR4T3B0aW9ucyB9IGZyb20gJ0B0ZXJyYS1tb25leS9mZWF0aGVyLmpzJztcbmltcG9ydCB7XG4gIENyZWF0ZVR4RmFpbGVkLFxuICBUaW1lb3V0LFxuICBUeEZhaWxlZCxcbiAgVHhVbnNwZWNpZmllZEVycm9yLFxuICBVc2VyRGVuaWVkLFxuICBTaWduQnl0ZXNVbnNwZWNpZmllZEVycm9yXG59IGZyb20gJ0B0ZXJyYS1tb25leS93YWxsZXQtdHlwZXMnO1xuaW1wb3J0IHtcbiAgV2FsbGV0Q29ubmVjdENyZWF0ZVR4RmFpbGVkLFxuICBXYWxsZXRDb25uZWN0VGltZW91dCxcbiAgV2FsbGV0Q29ubmVjdFR4RmFpbGVkLFxuICBXYWxsZXRDb25uZWN0VHhVbnNwZWNpZmllZEVycm9yLFxuICBXYWxsZXRDb25uZWN0VXNlckRlbmllZCxcbiAgV2FsbGV0Q29ubmVjdFNpZ25CeXRlc1Vuc3BlY2lmaWVkRXJyb3IsXG59IGZyb20gJy4uL21vZHVsZXMvd2FsbGV0Y29ubmVjdCc7XG5pbXBvcnQgeyBpc0Vycm9yIH0gZnJvbSAnLi9pc0Vycm9yJztcblxuZXhwb3J0IGZ1bmN0aW9uIG1hcFdhbGxldENvbm5lY3RFcnJvcihcbiAgdHg6IENyZWF0ZVR4T3B0aW9ucyxcbiAgZXJyb3I6IHVua25vd24sXG4pOiBFcnJvciB7XG4gIGlmIChcbiAgICBpc0Vycm9yKGVycm9yLCBVc2VyRGVuaWVkKSB8fFxuICAgIGlzRXJyb3IoZXJyb3IsIFRpbWVvdXQpIHx8XG4gICAgaXNFcnJvcihlcnJvciwgQ3JlYXRlVHhGYWlsZWQpIHx8XG4gICAgaXNFcnJvcihlcnJvciwgVHhGYWlsZWQpIHx8XG4gICAgaXNFcnJvcihlcnJvciwgVHhVbnNwZWNpZmllZEVycm9yKVxuICApIHtcbiAgICByZXR1cm4gZXJyb3I7XG4gIH0gZWxzZSBpZiAoaXNFcnJvcihlcnJvciwgV2FsbGV0Q29ubmVjdFVzZXJEZW5pZWQpKSB7XG4gICAgcmV0dXJuIG5ldyBVc2VyRGVuaWVkKCk7XG4gIH0gZWxzZSBpZiAoaXNFcnJvcihlcnJvciwgV2FsbGV0Q29ubmVjdFRpbWVvdXQpKSB7XG4gICAgcmV0dXJuIG5ldyBUaW1lb3V0KGVycm9yLm1lc3NhZ2UpO1xuICB9IGVsc2UgaWYgKGlzRXJyb3IoZXJyb3IsIFdhbGxldENvbm5lY3RDcmVhdGVUeEZhaWxlZCkpIHtcbiAgICByZXR1cm4gbmV3IENyZWF0ZVR4RmFpbGVkKHR4LCBlcnJvci5tZXNzYWdlKTtcbiAgfSBlbHNlIGlmIChpc0Vycm9yKGVycm9yLCBXYWxsZXRDb25uZWN0VHhGYWlsZWQpKSB7XG4gICAgcmV0dXJuIG5ldyBUeEZhaWxlZCh0eCwgZXJyb3IudHhoYXNoLCBlcnJvci5tZXNzYWdlLCBudWxsKTtcbiAgfSBlbHNlIGlmIChpc0Vycm9yKGVycm9yLCBXYWxsZXRDb25uZWN0VHhVbnNwZWNpZmllZEVycm9yKSkge1xuICAgIHJldHVybiBuZXcgVHhVbnNwZWNpZmllZEVycm9yKHR4LCBlcnJvci5tZXNzYWdlKTtcbiAgfVxuICByZXR1cm4gbmV3IFR4VW5zcGVjaWZpZWRFcnJvcihcbiAgICB0eCxcbiAgICBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXBXYWxsZXRDb25uZWN0U2lnbkJ5dGVzRXJyb3IoXG4gIGJ5dGVzOiBCdWZmZXIsXG4gIGVycm9yOiB1bmtub3duLFxuKTogRXJyb3Ige1xuICBpZiAoXG4gICAgaXNFcnJvcihlcnJvciwgVXNlckRlbmllZCkgfHxcbiAgICBpc0Vycm9yKGVycm9yLCBUaW1lb3V0KSB8fFxuICAgIGlzRXJyb3IoZXJyb3IsIFNpZ25CeXRlc1Vuc3BlY2lmaWVkRXJyb3IpXG4gICkge1xuICAgIHJldHVybiBlcnJvcjtcbiAgfSBlbHNlIGlmIChpc0Vycm9yKGVycm9yLCBXYWxsZXRDb25uZWN0VXNlckRlbmllZCkpIHtcbiAgICByZXR1cm4gbmV3IFVzZXJEZW5pZWQoKTtcbiAgfSBlbHNlIGlmIChpc0Vycm9yKGVycm9yLCBXYWxsZXRDb25uZWN0VGltZW91dCkpIHtcbiAgICByZXR1cm4gbmV3IFRpbWVvdXQoZXJyb3IubWVzc2FnZSk7XG4gIH0gZWxzZSBpZiAoaXNFcnJvcihlcnJvciwgV2FsbGV0Q29ubmVjdFNpZ25CeXRlc1Vuc3BlY2lmaWVkRXJyb3IpKSB7XG4gICAgcmV0dXJuIG5ldyBTaWduQnl0ZXNVbnNwZWNpZmllZEVycm9yKGJ5dGVzLCBlcnJvci5tZXNzYWdlKTtcbiAgfVxuICByZXR1cm4gbmV3IFNpZ25CeXRlc1Vuc3BlY2lmaWVkRXJyb3IoXG4gICAgYnl0ZXMsXG4gICAgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxuICApO1xufVxuIl19