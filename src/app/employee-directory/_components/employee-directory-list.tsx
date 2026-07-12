export function EmployeeDirectoryList({
  employees,
}: {
  employees: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: "ACTIVE" | "INACTIVE";
    department: {
      name: string;
    } | null;
  }[];
}) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-border bg-background">
      <div className="grid grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_minmax(160px,1fr)_140px_120px] gap-4 border-b border-border bg-muted px-5 py-4 text-sm font-medium text-foreground">
        <span>Name</span>
        <span>Email</span>
        <span>Department</span>
        <span>Role</span>
        <span>Status</span>
      </div>

      <div className="divide-y divide-border">
        {employees.length === 0 ? (
          <div className="px-5 py-12 text-sm text-muted-foreground">
            No employees found.
          </div>
        ) : (
          employees.map((employee) => (
            <div
              key={employee.id}
              className="grid grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_minmax(160px,1fr)_140px_120px] items-center gap-4 px-5 py-4 text-sm"
            >
              <p className="truncate font-medium text-foreground">
                {employee.name}
              </p>
              <p className="truncate text-muted-foreground">{employee.email}</p>
              <p className="truncate text-foreground">
                {employee.department?.name ?? "--"}
              </p>
              <p className="truncate text-foreground">{employee.role}</p>
              <p className="text-foreground">
                {employee.status === "ACTIVE" ? "Active" : "Inactive"}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
