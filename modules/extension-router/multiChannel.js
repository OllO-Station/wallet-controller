export function getTerraExtensions() {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlDaGFubmVsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL0B0ZXJyYS1tb25leS93YWxsZXQtY29udHJvbGxlci9tb2R1bGVzL2V4dGVuc2lvbi1yb3V0ZXIvbXVsdGlDaGFubmVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWlCQSxNQUFNLFVBQVUsa0JBQWtCO0lBQ2hDLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUM7UUFDNUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUI7UUFDMUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQywyQkFBMkI7WUFDcEMsQ0FBQyxDQUFDO2dCQUNFO29CQUNFLElBQUksRUFBRSxlQUFlO29CQUNyQixVQUFVLEVBQUUsU0FBUztvQkFDckIsSUFBSSxFQUFFLDZEQUE2RDtpQkFDcEU7YUFDRjtZQUNILENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDVCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGVycmFXZWJFeHRlbnNpb25Db25uZWN0b3IgfSBmcm9tICdAdGVycmEtbW9uZXkvd2ViLWV4dGVuc2lvbi1pbnRlcmZhY2UnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEV4dGVuc2lvbkluZm8ge1xuICBuYW1lOiBzdHJpbmc7XG4gIGlkZW50aWZpZXI6IHN0cmluZztcbiAgaWNvbjogc3RyaW5nO1xuICBjb25uZWN0b3I/OiAoKSA9PlxuICAgIHwgVGVycmFXZWJFeHRlbnNpb25Db25uZWN0b3JcbiAgICB8IFByb21pc2U8VGVycmFXZWJFeHRlbnNpb25Db25uZWN0b3I+O1xufVxuXG5kZWNsYXJlIGdsb2JhbCB7XG4gIGludGVyZmFjZSBXaW5kb3cge1xuICAgIGludGVyY2hhaW5XYWxsZXRzOiBFeHRlbnNpb25JbmZvW10gfCB1bmRlZmluZWQ7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFRlcnJhRXh0ZW5zaW9ucygpOiBFeHRlbnNpb25JbmZvW10ge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheSh3aW5kb3cuaW50ZXJjaGFpbldhbGxldHMpXG4gICAgPyB3aW5kb3cuaW50ZXJjaGFpbldhbGxldHNcbiAgICA6IHdpbmRvdy5pc1N0YXRpb25FeHRlbnNpb25BdmFpbGFibGVcbiAgICA/IFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6ICdUZXJyYSBTdGF0aW9uJyxcbiAgICAgICAgICBpZGVudGlmaWVyOiAnc3RhdGlvbicsXG4gICAgICAgICAgaWNvbjogJ2h0dHBzOi8vYXNzZXRzLnRlcnJhLm1vbmV5L2ljb24vd2FsbGV0LXByb3ZpZGVyL3N0YXRpb24uc3ZnJyxcbiAgICAgICAgfSxcbiAgICAgIF1cbiAgICA6IFtdO1xufVxuIl19