import { clearStoredSession, getStoredSession, storeSession } from './storage';
export function connectIfSessionExists() {
    const storedSession = getStoredSession();
    if (!!storedSession) {
        return connect(storedSession);
    }
    return null;
}
export function connect(options) {
    storeSession(options);
    function disconnect() {
        clearStoredSession();
    }
    return {
        ...options,
        disconnect,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ubmVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9AdGVycmEtbW9uZXkvd2FsbGV0LWNvbnRyb2xsZXIvbW9kdWxlcy9yZWFkb25seS13YWxsZXQvY29ubmVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBUy9FLE1BQU0sVUFBVSxzQkFBc0I7SUFDcEMsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQztJQUV6QyxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUU7UUFDbkIsT0FBTyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7S0FDL0I7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCxNQUFNLFVBQVUsT0FBTyxDQUNyQixPQUE4QjtJQUU5QixZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFdEIsU0FBUyxVQUFVO1FBQ2pCLGtCQUFrQixFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVELE9BQU87UUFDTCxHQUFHLE9BQU87UUFDVixVQUFVO0tBQ1gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjbGVhclN0b3JlZFNlc3Npb24sIGdldFN0b3JlZFNlc3Npb24sIHN0b3JlU2Vzc2lvbiB9IGZyb20gJy4vc3RvcmFnZSc7XG5pbXBvcnQgeyBSZWFkb25seVdhbGxldFNlc3Npb24gfSBmcm9tICcuL3R5cGVzJztcblxuZXhwb3J0IGludGVyZmFjZSBSZWFkb25seVdhbGxldENvbnRyb2xsZXIgZXh0ZW5kcyBSZWFkb25seVdhbGxldFNlc3Npb24ge1xuICBkaXNjb25uZWN0OiAoKSA9PiB2b2lkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlYWRvbmx5V2FsbGV0T3B0aW9ucyBleHRlbmRzIFJlYWRvbmx5V2FsbGV0U2Vzc2lvbiB7fVxuXG5leHBvcnQgZnVuY3Rpb24gY29ubmVjdElmU2Vzc2lvbkV4aXN0cygpOiBSZWFkb25seVdhbGxldENvbnRyb2xsZXIgfCBudWxsIHtcbiAgY29uc3Qgc3RvcmVkU2Vzc2lvbiA9IGdldFN0b3JlZFNlc3Npb24oKTtcblxuICBpZiAoISFzdG9yZWRTZXNzaW9uKSB7XG4gICAgcmV0dXJuIGNvbm5lY3Qoc3RvcmVkU2Vzc2lvbik7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbm5lY3QoXG4gIG9wdGlvbnM6IFJlYWRvbmx5V2FsbGV0T3B0aW9ucyxcbik6IFJlYWRvbmx5V2FsbGV0Q29udHJvbGxlciB7XG4gIHN0b3JlU2Vzc2lvbihvcHRpb25zKTtcblxuICBmdW5jdGlvbiBkaXNjb25uZWN0KCkge1xuICAgIGNsZWFyU3RvcmVkU2Vzc2lvbigpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICAuLi5vcHRpb25zLFxuICAgIGRpc2Nvbm5lY3QsXG4gIH07XG59XG4iXX0=