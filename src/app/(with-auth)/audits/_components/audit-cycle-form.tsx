"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Building, MapPin, Loader2, ArrowLeft, Users } from "lucide-react";

import { upsertAuditCycle, previewAuditScope } from "../actions";

type Department = { id: string; name: string; code: string };
type FormUser = { id: string; name: string; email: string; role: string };

type Props = {
  departments: Department[];
  users: FormUser[];
  auditId?: string;
  initialData?: {
    name: string;
    departmentId: string | null;
    location: string | null;
    startDate: Date;
    endDate: Date;
    auditorIds: string[];
  };
};

export function AuditCycleForm({ departments, users, auditId, initialData }: Props) {
  const router = useRouter();
  const isEdit = !!auditId;
  const [isSubmitting, startSubmitTransition] = useTransition();

  const [name, setName] = useState(initialData?.name ?? "");
  const [departmentId, setDepartmentId] = useState(initialData?.departmentId ?? "");
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [startDate, setStartDate] = useState(
    initialData?.startDate ? initialData.startDate.toISOString().split("T")[0] : ""
  );
  const [endDate, setEndDate] = useState(
    initialData?.endDate ? initialData.endDate.toISOString().split("T")[0] : ""
  );
  const [selectedAuditors, setSelectedAuditors] = useState<string[]>(initialData?.auditorIds ?? []);

  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!departmentId && !location.trim()) {
      setAssetCount(null);
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setIsPreviewLoading(true);
      const result = await previewAuditScope({
        departmentId: departmentId || null,
        location: location.trim() || null,
      });
      if (result.success) {
        setAssetCount(result.data.assetCount);
      }
      setIsPreviewLoading(false);
    }, 400);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [departmentId, location]);

  function handleAuditorToggle(userId: string) {
    setSelectedAuditors((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Audit name is required.");
      return;
    }
    if (!departmentId && !location.trim()) {
      toast.error("At least one scope (Department or Location) is required.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Start and end dates are required.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date cannot be before start date.");
      return;
    }
    if (selectedAuditors.length === 0) {
      toast.error("Assign at least one active auditor.");
      return;
    }
    if (assetCount === 0) {
      toast.error("Fails scoping requirements. No active assets match this scope.");
      return;
    }

    const payload = {
      name: name.trim(),
      departmentId: departmentId || null,
      location: location.trim() || null,
      startDate,
      endDate,
      auditorIds: selectedAuditors,
    };

    startSubmitTransition(async () => {
      const result = await upsertAuditCycle(payload, auditId);

      if (result.success) {
        toast.success(isEdit ? "Audit updated successfully." : "Audit cycle created successfully.");
        router.push(`/audits/${result.data.id}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="space-y-2">
        <label className="text-sm font-bold text-card-foreground">Audit Cycle Name</label>
        <input
          type="text"
          required
          placeholder="e.g. Q3 Engineering Equipment Verification"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border hover:border-accent-foreground/20 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-card-foreground flex items-center gap-1.5">
            <Building size={14} />
            <span>Scope Department</span>
          </label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-muted-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="">All Departments (No Scope restriction)</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-card-foreground flex items-center gap-1.5">
            <MapPin size={14} />
            <span>Scope Location</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Ahmedabad Office (Leave blank for all)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border hover:border-accent-foreground/20 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {(departmentId || location.trim()) && (
        <div className="p-4 rounded-lg bg-accent/5 border border-border text-xs">
          {isPreviewLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 size={14} className="animate-spin text-primary" />
              <span>Calculating matching assets scope count...</span>
            </div>
          ) : assetCount !== null ? (
            <div className="text-muted-foreground">
              This audit will check <strong className="text-foreground font-bold">{assetCount}</strong> active assets matching the scope.
              {assetCount === 0 && (
                <span className="block text-destructive font-semibold mt-1">Warning: Fails scoping rules. You cannot save a cycle with 0 assets.</span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">Adjust scope filters to preview asset counts.</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-card-foreground flex items-center gap-1.5">
            <Calendar size={14} />
            <span>Start Date</span>
          </label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground font-semibold"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-card-foreground flex items-center gap-1.5">
            <Calendar size={14} />
            <span>End Date</span>
          </label>
          <input
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring text-muted-foreground font-semibold"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-card-foreground flex items-center gap-1.5">
          <Users size={14} />
          <span>Assign Auditors (Select at least one)</span>
        </label>
        <div className="border border-border rounded-lg max-h-48 overflow-y-auto p-3 bg-background divide-y divide-border/30">
          {users.length === 0 ? (
            <span className="text-xs text-muted-foreground">No active users available.</span>
          ) : (
            users.map((u) => {
              const isChecked = selectedAuditors.includes(u.id);
              return (
                <label
                  key={u.id}
                  className="flex items-center gap-3 py-2 text-xs text-muted-foreground cursor-pointer font-medium select-none hover:text-foreground transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleAuditorToggle(u.id)}
                    className="rounded border-border text-primary focus:ring-ring size-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-foreground">{u.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{u.email} — {u.role.replace("_", " ")}</span>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-border/50 justify-end">
        <button
          type="button"
          onClick={() => {
            if (isEdit) router.push(`/audits/${auditId}`);
            else router.push("/audits");
          }}
          disabled={isSubmitting}
          className="flex items-center gap-1 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 text-sm font-semibold rounded-lg border border-border cursor-pointer transition-all disabled:opacity-50"
        >
          <ArrowLeft size={16} />
          <span>Cancel</span>
        </button>

        <button
          type="submit"
          disabled={isSubmitting || assetCount === 0}
          className="flex items-center gap-1.5 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold rounded-lg shadow cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{isEdit ? "Update Audit" : "Create Audit"}</span>
          )}
        </button>
      </div>
    </form>
  );
}
