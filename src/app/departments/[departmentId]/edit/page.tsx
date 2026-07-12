import { notFound } from "next/navigation";

import { DepartmentForm } from "../../_components/department-form";
import { DepartmentScreen } from "../../_components/department-screen";
import {
  getDepartmentById,
  getDepartmentFormOptions,
} from "../../_lib/department-data";

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = await params;
  const [department, options] = await Promise.all([
    getDepartmentById(departmentId),
    getDepartmentFormOptions(departmentId),
  ]);

  if (!department) {
    notFound();
  }

  return (
    <DepartmentScreen search="" status="ALL">
      <DepartmentForm mode="edit" options={options} department={department} />
    </DepartmentScreen>
  );
}
