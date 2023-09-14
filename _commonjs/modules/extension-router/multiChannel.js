"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTerraExtensions = void 0;
function getTerraExtensions() {
    return Array.isArray(window.interchainWallets)
        ? window.interchainWallets
        : window.isStationExtensionAvailable
            ? [
                {
                    name: 'Terra Station',
                    identifier: 'station',
                    icon: 'https://assets.terra.money/icon/wallet-provider/station.svg',
                },
            ]
            : [];
}
exports.getTerraExtensions = getTerraExtensions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlDaGFubmVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL0B0ZXJyYS1tb25leS93YWxsZXQtY29udHJvbGxlci9tb2R1bGVzL2V4dGVuc2lvbi1yb3V0ZXIvbXVsdGlDaGFubmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQWlCQSxTQUFnQixrQkFBa0I7SUFDaEMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQztRQUM1QyxDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFpQjtRQUMxQixDQUFDLENBQUMsTUFBTSxDQUFDLDJCQUEyQjtZQUNwQyxDQUFDLENBQUM7Z0JBQ0U7b0JBQ0UsSUFBSSxFQUFFLGVBQWU7b0JBQ3JCLFVBQVUsRUFBRSxTQUFTO29CQUNyQixJQUFJLEVBQUUsNkRBQTZEO2lCQUNwRTthQUNGO1lBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUNULENBQUM7QUFaRCxnREFZQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRlcnJhV2ViRXh0ZW5zaW9uQ29ubmVjdG9yIH0gZnJvbSAnQHRlcnJhLW1vbmV5L3dlYi1leHRlbnNpb24taW50ZXJmYWNlJztcblxuZXhwb3J0IGludGVyZmFjZSBFeHRlbnNpb25JbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBpZGVudGlmaWVyOiBzdHJpbmc7XG4gIGljb246IHN0cmluZztcbiAgY29ubmVjdG9yPzogKCkgPT5cbiAgICB8IFRlcnJhV2ViRXh0ZW5zaW9uQ29ubmVjdG9yXG4gICAgfCBQcm9taXNlPFRlcnJhV2ViRXh0ZW5zaW9uQ29ubmVjdG9yPjtcbn1cblxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgV2luZG93IHtcbiAgICBpbnRlcmNoYWluV2FsbGV0czogRXh0ZW5zaW9uSW5mb1tdIHwgdW5kZWZpbmVkO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRUZXJyYUV4dGVuc2lvbnMoKTogRXh0ZW5zaW9uSW5mb1tdIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkod2luZG93LmludGVyY2hhaW5XYWxsZXRzKVxuICAgID8gd2luZG93LmludGVyY2hhaW5XYWxsZXRzXG4gICAgOiB3aW5kb3cuaXNTdGF0aW9uRXh0ZW5zaW9uQXZhaWxhYmxlXG4gICAgPyBbXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiAnVGVycmEgU3RhdGlvbicsXG4gICAgICAgICAgaWRlbnRpZmllcjogJ3N0YXRpb24nLFxuICAgICAgICAgIGljb246ICdodHRwczovL2Fzc2V0cy50ZXJyYS5tb25leS9pY29uL3dhbGxldC1wcm92aWRlci9zdGF0aW9uLnN2ZycsXG4gICAgICAgIH0sXG4gICAgICBdXG4gICAgOiBbXTtcbn1cbiJdfQ==