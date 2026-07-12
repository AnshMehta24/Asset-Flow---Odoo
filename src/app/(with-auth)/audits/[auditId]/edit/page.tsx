"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { AuditCycleForm } from "@/components/audits/audit-cycle-form";
import { ChevronLeft, FolderSync } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface InitialData {
  name: string;
  departmentId: string | null;
  location: string | null;
  startDate: string;
  endDate: string;
  auditorIds: string[];
}

export default function EditAuditCyclePage() {
  const params = useParams();
  const auditId = params.auditId as string;
  const [initialData, setInitialData] = useState<InitialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await fetch(`/api/audits/${auditId}`);
        if (res.ok) {
          const data = await res.json();
          const { audit } = data;
          
          setInitialData({
            name: audit.name,
            departmentId: audit.departmentId,
            location: audit.location,
            startDate: audit.startDate,
            endDate: audit.endDate,
            auditorIds: audit.auditors.map((a: any) => a.auditorId),
          });
        } else {
          toast.error("Failed to load audit cycle details.");
        }
      } catch (err) {
        toast.error("An error occurred loading audit details.");
      } finally {
        setIsLoading(false);
      }
    };

    if (auditId) fetchAudit();
  }, [auditId]);

  return (
    <div className="flex-1 p-6 space-y-6 max-w-4xl w-full mx-auto">
      {/* Back button */}
      <div>
        <Link
          href={`/audits/${auditId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors"
        >
          <ChevronLeft size={14} />
          <span>Back to Audit Details</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Audit Cycle</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Modify planned verification settings and scopes</p>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
          <FolderSync size={28} className="animate-spin text-primary" />
          <p className="text-xs font-semibold mt-2">Loading cycle details...</p>
        </div>
      ) : initialData ? (
        <div className="pt-2">
          <AuditCycleForm auditId={auditId} initialData={initialData} />
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-sm">Audit cycle not found or you do not have permission to edit it.</p>
        </div>
      )}
    </div>
  );
}
