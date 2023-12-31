import bowser from 'bowser';
import MobileDetect from 'mobile-detect';
export const isMobile = () => {
    const mobileDetect = new MobileDetect(navigator.userAgent);
    return !!mobileDetect.os();
};
export const isDesktopChrome = (isChromeExtensionCompatibleBrowser) => {
    const userAgent = navigator.userAgent;
    if (isChromeExtensionCompatibleBrowser) {
        return true;
    }
    const browser = bowser.getParser(userAgent);
    const mobileDetect = new MobileDetect(navigator.userAgent);
    return !!(browser.satisfies({
        chrome: '>60',
        edge: '>80',
    }) && !mobileDetect.os());
};
export const getDesktopBrowserType = (userAgent) => {
    const browser = bowser.getParser(userAgent);
    const mobileDetect = new MobileDetect(navigator.userAgent);
    if (!!mobileDetect.mobile()) {
        return null;
    }
    if (browser.satisfies({ chrome: '>60', chromium: '>60' })) {
        return 'chrome';
    }
    else if (browser.satisfies({ edge: '>80' })) {
        return 'edge';
    }
    else {
        return null;
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci1jaGVjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9AdGVycmEtbW9uZXkvd2FsbGV0LWNvbnRyb2xsZXIvdXRpbHMvYnJvd3Nlci1jaGVjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxZQUFZLE1BQU0sZUFBZSxDQUFDO0FBRXpDLE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxHQUFHLEVBQUU7SUFDM0IsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRTNELE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUM3QixDQUFDLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsQ0FDN0Isa0NBQTJDLEVBQ2xDLEVBQUU7SUFDWCxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO0lBRXRDLElBQUksa0NBQWtDLEVBQUU7UUFDdEMsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDNUMsTUFBTSxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRTNELE9BQU8sQ0FBQyxDQUFDLENBQ1AsT0FBTyxDQUFDLFNBQVMsQ0FBQztRQUNoQixNQUFNLEVBQUUsS0FBSztRQUNiLElBQUksRUFBRSxLQUFLO0tBQ1osQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxDQUN6QixDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsQ0FDbkMsU0FBaUIsRUFDZ0MsRUFBRTtJQUNuRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzVDLE1BQU0sWUFBWSxHQUFHLElBQUksWUFBWSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUUzRCxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEVBQUU7UUFDM0IsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVELElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7UUFDekQsT0FBTyxRQUFRLENBQUM7S0FDakI7U0FBTSxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtRQUM3QyxPQUFPLE1BQU0sQ0FBQztLQUNmO1NBQU07UUFDTCxPQUFPLElBQUksQ0FBQztLQUNiO0FBQ0gsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGJvd3NlciBmcm9tICdib3dzZXInO1xuaW1wb3J0IE1vYmlsZURldGVjdCBmcm9tICdtb2JpbGUtZGV0ZWN0JztcblxuZXhwb3J0IGNvbnN0IGlzTW9iaWxlID0gKCkgPT4ge1xuICBjb25zdCBtb2JpbGVEZXRlY3QgPSBuZXcgTW9iaWxlRGV0ZWN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xuXG4gIHJldHVybiAhIW1vYmlsZURldGVjdC5vcygpO1xufTtcblxuZXhwb3J0IGNvbnN0IGlzRGVza3RvcENocm9tZSA9IChcbiAgaXNDaHJvbWVFeHRlbnNpb25Db21wYXRpYmxlQnJvd3NlcjogYm9vbGVhbixcbik6IGJvb2xlYW4gPT4ge1xuICBjb25zdCB1c2VyQWdlbnQgPSBuYXZpZ2F0b3IudXNlckFnZW50O1xuXG4gIGlmIChpc0Nocm9tZUV4dGVuc2lvbkNvbXBhdGlibGVCcm93c2VyKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBjb25zdCBicm93c2VyID0gYm93c2VyLmdldFBhcnNlcih1c2VyQWdlbnQpO1xuICBjb25zdCBtb2JpbGVEZXRlY3QgPSBuZXcgTW9iaWxlRGV0ZWN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xuXG4gIHJldHVybiAhIShcbiAgICBicm93c2VyLnNhdGlzZmllcyh7XG4gICAgICBjaHJvbWU6ICc+NjAnLFxuICAgICAgZWRnZTogJz44MCcsXG4gICAgfSkgJiYgIW1vYmlsZURldGVjdC5vcygpXG4gICk7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0RGVza3RvcEJyb3dzZXJUeXBlID0gKFxuICB1c2VyQWdlbnQ6IHN0cmluZyxcbik6ICdjaHJvbWUnIHwgJ2VkZ2UnIHwgJ2ZpcmVmb3gnIHwgJ3NhZmFyaScgfCBudWxsID0+IHtcbiAgY29uc3QgYnJvd3NlciA9IGJvd3Nlci5nZXRQYXJzZXIodXNlckFnZW50KTtcbiAgY29uc3QgbW9iaWxlRGV0ZWN0ID0gbmV3IE1vYmlsZURldGVjdChuYXZpZ2F0b3IudXNlckFnZW50KTtcblxuICBpZiAoISFtb2JpbGVEZXRlY3QubW9iaWxlKCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIGlmIChicm93c2VyLnNhdGlzZmllcyh7IGNocm9tZTogJz42MCcsIGNocm9taXVtOiAnPjYwJyB9KSkge1xuICAgIHJldHVybiAnY2hyb21lJztcbiAgfSBlbHNlIGlmIChicm93c2VyLnNhdGlzZmllcyh7IGVkZ2U6ICc+ODAnIH0pKSB7XG4gICAgcmV0dXJuICdlZGdlJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufTtcbiJdfQ==