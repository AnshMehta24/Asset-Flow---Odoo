import { DepartmentForm } from "../_components/department-form";
import { DepartmentScreen } from "../_components/department-screen";
import { getDepartmentFormOptions } from "../_lib/department-data";

export default async function CreateDepartmentPage() {
  const options = await getDepartmentFormOptions();

  return (
    <DepartmentScreen search="" status="ALL">
      <DepartmentForm mode="create" options={options} />
    </DepartmentScreen>
  );
}
