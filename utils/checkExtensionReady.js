const interval = 500;
export async function checkExtensionReady(timeout, isChromeExtensionCompatibleBrowser) {
    return new Promise((resolve) => {
        if (isChromeExtensionCompatibleBrowser) {
            resolve(true);
            return;
        }
        const start = Date.now();
        function check() {
            if (window.isStationExtensionAvailable === true ||
                Array.isArray(window.interchainWallets)) {
                resolve(true);
            }
            else if (Date.now() > start + timeout) {
                resolve(false);
            }
            else {
                setTimeout(check, interval);
            }
        }
        setTimeout(check, interval);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tFeHRlbnNpb25SZWFkeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9AdGVycmEtbW9uZXkvd2FsbGV0LWNvbnRyb2xsZXIvdXRpbHMvY2hlY2tFeHRlbnNpb25SZWFkeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUM7QUFRckIsTUFBTSxDQUFDLEtBQUssVUFBVSxtQkFBbUIsQ0FDdkMsT0FBZSxFQUNmLGtDQUEyQztJQUUzQyxPQUFPLElBQUksT0FBTyxDQUFVLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDdEMsSUFBSSxrQ0FBa0MsRUFBRTtZQUN0QyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDZCxPQUFPO1NBQ1I7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFekIsU0FBUyxLQUFLO1lBQ1osSUFDRSxNQUFNLENBQUMsMkJBQTJCLEtBQUssSUFBSTtnQkFDM0MsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsRUFDdkM7Z0JBQ0EsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2Y7aUJBQU0sSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxHQUFHLE9BQU8sRUFBRTtnQkFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ2hCO2lCQUFNO2dCQUNMLFVBQVUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDN0I7UUFDSCxDQUFDO1FBRUQsVUFBVSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztJQUM5QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBpbnRlcnZhbCA9IDUwMDtcblxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgV2luZG93IHtcbiAgICBpc1N0YXRpb25FeHRlbnNpb25BdmFpbGFibGU6IGJvb2xlYW47XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrRXh0ZW5zaW9uUmVhZHkoXG4gIHRpbWVvdXQ6IG51bWJlcixcbiAgaXNDaHJvbWVFeHRlbnNpb25Db21wYXRpYmxlQnJvd3NlcjogYm9vbGVhbixcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICByZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4oKHJlc29sdmUpID0+IHtcbiAgICBpZiAoaXNDaHJvbWVFeHRlbnNpb25Db21wYXRpYmxlQnJvd3Nlcikge1xuICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XG5cbiAgICBmdW5jdGlvbiBjaGVjaygpIHtcbiAgICAgIGlmIChcbiAgICAgICAgd2luZG93LmlzU3RhdGlvbkV4dGVuc2lvbkF2YWlsYWJsZSA9PT0gdHJ1ZSB8fFxuICAgICAgICBBcnJheS5pc0FycmF5KHdpbmRvdy5pbnRlcmNoYWluV2FsbGV0cylcbiAgICAgICkge1xuICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgfSBlbHNlIGlmIChEYXRlLm5vdygpID4gc3RhcnQgKyB0aW1lb3V0KSB7XG4gICAgICAgIHJlc29sdmUoZmFsc2UpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0VGltZW91dChjaGVjaywgaW50ZXJ2YWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNldFRpbWVvdXQoY2hlY2ssIGludGVydmFsKTtcbiAgfSk7XG59XG4iXX0=