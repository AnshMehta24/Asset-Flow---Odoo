import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          AssetFlow
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Open the department module to manage organization setup.
        </p>
        <div className="mt-6">
          <Link
            href="/organization/departments"
            className={buttonVariants({ size: "lg" })}
          >
            Go to Departments
          </Link>
        </div>
      </div>
    </div>
  );
}
