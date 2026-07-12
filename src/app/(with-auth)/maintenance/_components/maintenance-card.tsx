"use client";

import {
  KanbanBoardCard,
  KanbanBoardCardTitle,
  KanbanBoardCardDescription,
} from "@/components/ui/kanban";
import { kanbanBoardCardClassNames } from "@/components/ui/kanban-class-names";
import { cn } from "@/lib/utils";
import type { MaintenanceCardData, MaintenanceColumnStatus } from "../_lib/maintenance-data";
import { MaintenancePriorityBadge } from "./maintenance-priority-badge";

function CardBody({ request }: { request: MaintenanceCardData }) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <KanbanBoardCardTitle>
          {request.assetTag} — {request.assetName}
        </KanbanBoardCardTitle>
        <MaintenancePriorityBadge priority={request.priority} />
      </div>
      <KanbanBoardCardDescription className="line-clamp-2">
        {request.issueDescription}
      </KanbanBoardCardDescription>
      {request.technicianName && (
        <p className="text-xs text-muted-foreground">
          Tech: {request.technicianName}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Raised by {request.raisedByName}
      </p>
    </>
  );
}

export function MaintenanceCard({
  request,
  status,
  canManage,
  onOpen,
  onStartProgress,
}: {
  request: MaintenanceCardData;
  status: MaintenanceColumnStatus;
  canManage: boolean;
  /** Opens the approve/assign/resolve dialog for this card (click or drop into a column that needs a form). */
  onOpen: () => void;
  /** Technician Assigned → In Progress needs no form, so it commits directly. */
  onStartProgress: () => void;
}) {
  if (!canManage || status === "RESOLVED") {
    return (
      <div className={cn(kanbanBoardCardClassNames, "flex flex-col gap-1")}>
        <CardBody request={request} />
      </div>
    );
  }

  if (status === "TECHNICIAN_ASSIGNED") {
    return (
      <KanbanBoardCard
        data={{ id: request.id, status } as { id: string }}
        className="flex w-full flex-col gap-1"
        onClick={onStartProgress}
      >
        <CardBody request={request} />
        <span className="text-xs font-medium text-primary">
          Click or drag to start work →
        </span>
      </KanbanBoardCard>
    );
  }

  return (
    <KanbanBoardCard
      data={{ id: request.id, status } as { id: string }}
      className="flex w-full flex-col gap-1"
      onClick={onOpen}
    >
      <CardBody request={request} />
    </KanbanBoardCard>
  );
}
