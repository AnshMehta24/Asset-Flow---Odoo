"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Building, MapPin, Loader2, ArrowLeft, Users } from "lucide-react";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuditCycleFormProps {
  auditId?: string; // If passed, we are in Edit mode
  initialData?: {
    name: string;
    departmentId: string | null;
    location: string | null;
    startDate: string;
    endDate: string;
    auditorIds: string[];
  };
}

export function AuditCycleForm({ auditId, initialData }: AuditCycleFormProps) {
  const router = useRouter();
  const isEdit = !!auditId;

  // Form Fields State
  const [name, setName] = useState(initialData?.name || "");
  const [departmentId, setDepartmentId] = useState(initialData?.departmentId || "");
  const [location, setLocation] = useState(initialData?.location || "");
  const [startDate, setStartDate] = useState(
    initialData?.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : ""
  );
  const [endDate, setEndDate] = useState(
    initialData?.endDate ? new Date(initialData.endDate).toISOString().split("T")[0] : ""
  );
  const [selectedAuditors, setSelectedAuditors] = useState<string[]>(initialData?.auditorIds || []);

  // Dropdown lists
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Preview matching assets count
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch departments & users list
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [deptsRes, usersRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/users"),
        ]);

        if (deptsRes.ok) {
          const deptsData = await deptsRes.json();
          setDepartments(deptsData);
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }
      } catch (err) {
        toast.error("Failed to load select options.");
      }
    };

    loadDropdowns();
  }, []);

  // Fetch matching assets count preview on scope changes
  useEffect(() => {
    const getPreviewCount = async () => {
      // Do not fetch preview unless at least one scope indicator is selected
      if (!departmentId && !location.trim()) {
        setAssetCount(null);
        return;
      }

      setIsPreviewLoading(true);
      try {
        const res = await fetch("/api/audits/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            departmentId: departmentId || null,
            location: location.trim() || null,
          }),
        });

        if (res.ok) {
          const result = await res.json();
          setAssetCount(result.data.assetCount);
        }
      } catch (err) {
        console.error("Preview count error:", err);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      getPreviewCount();
    }, 400); // Debounce to avoid constant API hits during typing

    return () => clearTimeout(delayDebounceFn);
  }, [departmentId, location]);

  const handleAuditorToggle = (userId: string) => {
    setSelectedAuditors((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        departmentId: departmentId || null,
        location: location.trim() || null,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        auditorIds: selectedAuditors,
      };

      const url = isEdit ? `/api/audits/${auditId}` : "/api/audits";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        const cycleId = isEdit ? auditId : result.data.id;
        toast.success(isEdit ? "Audit updated successfully." : "Audit cycle created successfully.");
        router.push(`/audits/${cycleId}`);
        router.refresh();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to submit form.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl bg-card border border-border rounded-xl p-6 shadow-sm">
      {/* Name field */}
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

      {/* Scope Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Department select */}
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

        {/* Location text */}
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

      {/* Scope Preview alert */}
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

      {/* Date Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Start Date */}
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

        {/* End Date */}
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

      {/* Auditors checklist selection */}
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

      {/* Action buttons */}
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
