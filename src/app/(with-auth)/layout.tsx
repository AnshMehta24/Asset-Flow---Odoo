import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/user";

export default async function WithAuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return children;
}
