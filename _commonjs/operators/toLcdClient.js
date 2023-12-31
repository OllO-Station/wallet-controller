"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLcdClient = void 0;
const wallet_types_1 = require("@nestwallet/wallet-types");
const operators_1 = require("rxjs/operators");
function toLcdClient(lcdClientConfig) {
    return (0, operators_1.map)((states) => {
        return (0, wallet_types_1.createLCDClient)(lcdClientConfig);
    });
}
exports.toLcdClient = toLcdClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9MY2RDbGllbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvQHRlcnJhLW1vbmV5L3dhbGxldC1jb250cm9sbGVyL29wZXJhdG9ycy90b0xjZENsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0REFHbUM7QUFHbkMsOENBQXFDO0FBRXJDLFNBQWdCLFdBQVcsQ0FDekIsZUFBZ0Q7SUFFaEQsT0FBTyxJQUFBLGVBQUcsRUFBMEIsQ0FBQyxNQUFNLEVBQUUsRUFBRTtRQUM3QyxPQUFPLElBQUEsOEJBQWUsRUFBQyxlQUFlLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFORCxrQ0FNQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGNyZWF0ZUxDRENsaWVudCxcbiAgV2FsbGV0U3RhdGVzLFxufSBmcm9tICdAdGVycmEtbW9uZXkvd2FsbGV0LXR5cGVzJztcbmltcG9ydCB7IExDRENsaWVudCwgTENEQ2xpZW50Q29uZmlnIH0gZnJvbSAnQHRlcnJhLW1vbmV5L2ZlYXRoZXIuanMnO1xuaW1wb3J0IHsgT3BlcmF0b3JGdW5jdGlvbiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgbWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5leHBvcnQgZnVuY3Rpb24gdG9MY2RDbGllbnQoXG4gIGxjZENsaWVudENvbmZpZzogUmVjb3JkPHN0cmluZywgTENEQ2xpZW50Q29uZmlnPixcbik6IE9wZXJhdG9yRnVuY3Rpb248V2FsbGV0U3RhdGVzLCBMQ0RDbGllbnQ+IHtcbiAgcmV0dXJuIG1hcDxXYWxsZXRTdGF0ZXMsIExDRENsaWVudD4oKHN0YXRlcykgPT4ge1xuICAgIHJldHVybiBjcmVhdGVMQ0RDbGllbnQobGNkQ2xpZW50Q29uZmlnKTtcbiAgfSk7XG59XG4iXX0=