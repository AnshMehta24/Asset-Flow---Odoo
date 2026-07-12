import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useCalendar } from "@/components/event-calendar/calendar-context";

export function UserSelect() {
  const { users, selectedUserId, filterEventsBySelectedUser } = useCalendar();

  return (
    <NativeSelect
      className="w-full"
      value={selectedUserId}
      onChange={(e) => filterEventsBySelectedUser(e.target.value)}
    >
      <NativeSelectOption value="all">All</NativeSelectOption>
      {users.map((user) => (
        <NativeSelectOption key={user.id} value={user.id}>
          {user.name}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
