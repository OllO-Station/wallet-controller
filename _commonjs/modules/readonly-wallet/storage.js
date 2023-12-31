"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearStoredSession = exports.storeSession = exports.getStoredSession = void 0;
const feather_js_1 = require("@terra-money/feather.js");
const STORAGE_KEY = '__terra-readonly-wallet-storage-key__';
function getStoredSession() {
    const storedSessionString = localStorage.getItem(STORAGE_KEY);
    if (!storedSessionString)
        return undefined;
    try {
        const storedSession = JSON.parse(storedSessionString);
        if ('terraAddress' in storedSession &&
            'network' in storedSession &&
            typeof storedSession['terraAddress'] === 'string' &&
            feather_js_1.AccAddress.validate(storedSession.terraAddress)) {
            return storedSession;
        }
        else {
            localStorage.removeItem(STORAGE_KEY);
            return undefined;
        }
    }
    catch (_a) {
        localStorage.removeItem(STORAGE_KEY);
        return undefined;
    }
}
exports.getStoredSession = getStoredSession;
function storeSession(session) {
    if (!feather_js_1.AccAddress.validate(session.terraAddress)) {
        throw new Error(`${session.terraAddress} is not a terraAddress`);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}
exports.storeSession = storeSession;
function clearStoredSession() {
    localStorage.removeItem(STORAGE_KEY);
}
exports.clearStoredSession = clearStoredSession;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9AdGVycmEtbW9uZXkvd2FsbGV0LWNvbnRyb2xsZXIvbW9kdWxlcy9yZWFkb25seS13YWxsZXQvc3RvcmFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx3REFBcUQ7QUFHckQsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLENBQUM7QUFFNUQsU0FBZ0IsZ0JBQWdCO0lBQzlCLE1BQU0sbUJBQW1CLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUU5RCxJQUFJLENBQUMsbUJBQW1CO1FBQUUsT0FBTyxTQUFTLENBQUM7SUFFM0MsSUFBSTtRQUNGLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUV0RCxJQUNFLGNBQWMsSUFBSSxhQUFhO1lBQy9CLFNBQVMsSUFBSSxhQUFhO1lBQzFCLE9BQU8sYUFBYSxDQUFDLGNBQWMsQ0FBQyxLQUFLLFFBQVE7WUFDakQsdUJBQVUsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxFQUMvQztZQUNBLE9BQU8sYUFBYSxDQUFDO1NBQ3RCO2FBQU07WUFDTCxZQUFZLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sU0FBUyxDQUFDO1NBQ2xCO0tBQ0Y7SUFBQyxXQUFNO1FBQ04sWUFBWSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNyQyxPQUFPLFNBQVMsQ0FBQztLQUNsQjtBQUNILENBQUM7QUF2QkQsNENBdUJDO0FBRUQsU0FBZ0IsWUFBWSxDQUFDLE9BQThCO0lBQ3pELElBQUksQ0FBQyx1QkFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDOUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxZQUFZLHdCQUF3QixDQUFDLENBQUM7S0FDbEU7SUFDRCxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDN0QsQ0FBQztBQUxELG9DQUtDO0FBRUQsU0FBZ0Isa0JBQWtCO0lBQ2hDLFlBQVksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDdkMsQ0FBQztBQUZELGdEQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQWNjQWRkcmVzcyB9IGZyb20gJ0B0ZXJyYS1tb25leS9mZWF0aGVyLmpzJztcbmltcG9ydCB7IFJlYWRvbmx5V2FsbGV0U2Vzc2lvbiB9IGZyb20gJy4vdHlwZXMnO1xuXG5jb25zdCBTVE9SQUdFX0tFWSA9ICdfX3RlcnJhLXJlYWRvbmx5LXdhbGxldC1zdG9yYWdlLWtleV9fJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlZFNlc3Npb24oKTogUmVhZG9ubHlXYWxsZXRTZXNzaW9uIHwgdW5kZWZpbmVkIHtcbiAgY29uc3Qgc3RvcmVkU2Vzc2lvblN0cmluZyA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFNUT1JBR0VfS0VZKTtcblxuICBpZiAoIXN0b3JlZFNlc3Npb25TdHJpbmcpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBzdG9yZWRTZXNzaW9uID0gSlNPTi5wYXJzZShzdG9yZWRTZXNzaW9uU3RyaW5nKTtcblxuICAgIGlmIChcbiAgICAgICd0ZXJyYUFkZHJlc3MnIGluIHN0b3JlZFNlc3Npb24gJiZcbiAgICAgICduZXR3b3JrJyBpbiBzdG9yZWRTZXNzaW9uICYmXG4gICAgICB0eXBlb2Ygc3RvcmVkU2Vzc2lvblsndGVycmFBZGRyZXNzJ10gPT09ICdzdHJpbmcnICYmXG4gICAgICBBY2NBZGRyZXNzLnZhbGlkYXRlKHN0b3JlZFNlc3Npb24udGVycmFBZGRyZXNzKVxuICAgICkge1xuICAgICAgcmV0dXJuIHN0b3JlZFNlc3Npb247XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKFNUT1JBR0VfS0VZKTtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShTVE9SQUdFX0tFWSk7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RvcmVTZXNzaW9uKHNlc3Npb246IFJlYWRvbmx5V2FsbGV0U2Vzc2lvbikge1xuICBpZiAoIUFjY0FkZHJlc3MudmFsaWRhdGUoc2Vzc2lvbi50ZXJyYUFkZHJlc3MpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGAke3Nlc3Npb24udGVycmFBZGRyZXNzfSBpcyBub3QgYSB0ZXJyYUFkZHJlc3NgKTtcbiAgfVxuICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShTVE9SQUdFX0tFWSwgSlNPTi5zdHJpbmdpZnkoc2Vzc2lvbikpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJTdG9yZWRTZXNzaW9uKCkge1xuICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShTVE9SQUdFX0tFWSk7XG59XG4iXX0=