import { Power } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ChangeRoleModal } from "./change-role-modal";
import { DeactivateEmployeeModal } from "./deactivate-employee-modal";
import { updateEmployeeStatus } from "../actions";

const roleMap: Record<string, string> = {
  EMPLOYEE: "Employee",
  DEPARTMENT_HEAD: "Department Head",
  ASSET_MANAGER: "Asset Manager",
  ADMIN: "Admin",
};

export function EmployeeDirectoryList({
  employees,
  currentUserId,
  currentUserRole,
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
  currentUserId?: string;
  currentUserRole?: string;
}) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-border bg-background">
      <div className="grid grid-cols-[minmax(160px,1fr)_minmax(220px,1.2fr)_minmax(140px,1fr)_180px_100px_100px] gap-4 border-b border-border bg-muted px-5 py-4 text-sm font-medium text-foreground">
        <span>Name</span>
        <span>Email</span>
        <span>Department</span>
        <span>Role</span>
        <span>Status</span>
        <span className="text-right">Actions</span>
      </div>

      <div className="divide-y divide-border">
        {employees.length === 0 ? (
          <div className="px-5 py-12 text-sm text-muted-foreground">
            No employees found.
          </div>
        ) : (
          employees.map((employee) => {
            const isSelf = employee.id === currentUserId;
            const canManage = currentUserRole === "ADMIN" && !isSelf;

            return (
              <div
                key={employee.id}
                className="grid grid-cols-[minmax(160px,1fr)_minmax(220px,1.2fr)_minmax(140px,1fr)_180px_100px_100px] items-center gap-4 px-5 py-4 text-sm"
              >
                <p className="truncate font-medium text-foreground">
                  {employee.name}
                </p>
                <p className="truncate text-muted-foreground">{employee.email}</p>
                <p className="truncate text-foreground">
                  {employee.department?.name ?? "--"}
                </p>
                <p className="truncate text-foreground">
                  {roleMap[employee.role] ?? employee.role}
                </p>
                <p className="text-foreground">
                  {employee.status === "ACTIVE" ? "Active" : "Inactive"}
                </p>
                <div className="flex justify-end items-center gap-2">
                  {canManage ? (
                    <>
                      <ChangeRoleModal
                        employeeId={employee.id}
                        employeeName={employee.name}
                        currentRole={employee.role}
                      />
                      {employee.status === "ACTIVE" ? (
                        <DeactivateEmployeeModal
                          employeeId={employee.id}
                          employeeName={employee.name}
                        />
                      ) : (
                        <form
                          action={updateEmployeeStatus.bind(
                            null,
                            employee.id,
                            "ACTIVE"
                          )}
                        >
                          <button
                            type="submit"
                            className={buttonVariants({
                              variant: "outline",
                              size: "icon",
                            })}
                            aria-label={`Activate ${employee.name}`}
                          >
                            <Power className="size-3.5 text-muted-foreground hover:text-emerald-500 transition-colors" />
                          </button>
                        </form>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground pr-2">—</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

