"use client";

import React from "react";
import { AuditCycleForm } from "@/components/audits/audit-cycle-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NewAuditCyclePage() {
  return (
    <div className="flex-1 p-6 space-y-6 max-w-4xl w-full mx-auto">
      {/* Back button */}
      <div>
        <Link
          href="/audits"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
        >
          <ChevronLeft size={14} />
          <span>Back to Audits List</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create Audit Cycle</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Initialize a physical equipment checking checklist snapshot</p>
      </div>

      <div className="pt-2">
        <AuditCycleForm />
      </div>
    </div>
  );
}
