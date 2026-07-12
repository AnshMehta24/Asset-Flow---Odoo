"use client";

import { useState, useTransition } from "react";
import { Inbox } from "lucide-react";
import {
  KanbanBoardProvider,
  KanbanBoard,
  KanbanBoardColumn,
  KanbanBoardColumnHeader,
  KanbanBoardColumnTitle,
  KanbanBoardColumnList,
  KanbanBoardExtraMargin,
} from "@/components/ui/kanban";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import type {
  MaintenanceBoard as MaintenanceBoardData,
  MaintenanceCardData,
  MaintenanceColumnStatus,
} from "../_lib/maintenance-data";
import { MaintenanceCard } from "./maintenance-card";
import { ApproveRejectModal } from "./approve-reject-modal";
import { AssignTechnicianModal } from "./assign-technician-modal";
import { ResolveModal } from "./resolve-modal";
import { approveMaintenanceRequest, startProgress } from "../actions";

const COLUMNS: { status: MaintenanceColumnStatus; title: string }[] = [
  { status: "PENDING", title: "Pending" },
  { status: "APPROVED", title: "Approved" },
  { status: "TECHNICIAN_ASSIGNED", title: "Technician Assigned" },
  { status: "IN_PROGRESS", title: "In Progress" },
  { status: "RESOLVED", title: "Resolved" },
];

// A card can only move to the very next stage in the pipeline — dropping it
// anywhere else (skipping a stage, moving backwards) is a no-op.
const NEXT_STATUS: Partial<Record<MaintenanceColumnStatus, MaintenanceColumnStatus>> = {
  PENDING: "APPROVED",
  APPROVED: "TECHNICIAN_ASSIGNED",
  TECHNICIAN_ASSIGNED: "IN_PROGRESS",
  IN_PROGRESS: "RESOLVED",
};

// Transitions that need a form (technician name / resolution notes) open a
// dialog instead of completing instantly on drop.
const NEEDS_FORM: Partial<Record<MaintenanceColumnStatus, boolean>> = {
  APPROVED: true,
  IN_PROGRESS: true,
};

type ActiveRequest = { request: MaintenanceCardData; status: MaintenanceColumnStatus };

export function MaintenanceBoard({
  board,
  canManage,
}: {
  board: MaintenanceBoardData;
  canManage: boolean;
}) {
  // Local, optimistically-mutated copy so a drag drop (or the "start work"
  // click) moves the card instantly instead of waiting on the server
  // round-trip + revalidation, matching Trello/Linear-style boards. Reset
  // during render (not an effect) whenever the server sends a fresh `board`
  // prop after revalidation — the standard React pattern for syncing local
  // state to a prop without an extra render/effect round-trip.
  const [boardSnapshot, setBoardSnapshot] = useState(board);
  const [localBoard, setLocalBoard] = useState(board);
  const [, startTransition] = useTransition();
  const [activeRequest, setActiveRequest] = useState<ActiveRequest | null>(null);

  if (board !== boardSnapshot) {
    setBoardSnapshot(board);
    setLocalBoard(board);
  }

  const totalRequests = COLUMNS.reduce(
    (sum, column) => sum + localBoard[column.status].length,
    0
  );

  if (totalRequests === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>No maintenance requests</EmptyTitle>
          <EmptyDescription>
            Raised requests will show up here and move through approval,
            technician assignment, and resolution.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  function openDialog(request: MaintenanceCardData, status: MaintenanceColumnStatus) {
    setActiveRequest({ request, status });
  }

  function moveCard(
    request: MaintenanceCardData,
    from: MaintenanceColumnStatus,
    to: MaintenanceColumnStatus
  ) {
    setLocalBoard((prev) => ({
      ...prev,
      [from]: prev[from].filter((r) => r.id !== request.id),
      [to]: [request, ...prev[to]],
    }));
  }

  function handleStartProgress(request: MaintenanceCardData) {
    moveCard(request, "TECHNICIAN_ASSIGNED", "IN_PROGRESS");
    startTransition(() => startProgress(request.id));
  }

  function handleDropOverColumn(targetStatus: MaintenanceColumnStatus) {
    return (dataTransferData: string) => {
      if (!canManage) return;

      let payload: { id: string; status: MaintenanceColumnStatus };
      try {
        payload = JSON.parse(dataTransferData);
      } catch {
        return;
      }

      if (NEXT_STATUS[payload.status] !== targetStatus) return;

      const request = localBoard[payload.status].find((r) => r.id === payload.id);
      if (!request) return;

      if (NEEDS_FORM[payload.status]) {
        openDialog(request, payload.status);
        return;
      }

      if (targetStatus === "APPROVED") {
        moveCard(request, "PENDING", "APPROVED");
        startTransition(() => approveMaintenanceRequest(request.id));
      } else if (targetStatus === "IN_PROGRESS") {
        handleStartProgress(request);
      }
    };
  }

  return (
    <KanbanBoardProvider>
      <KanbanBoard>
        {COLUMNS.map((column) => {
          const requests = localBoard[column.status];

          return (
            <KanbanBoardColumn
              key={column.status}
              columnId={column.status}
              onDropOverColumn={canManage ? handleDropOverColumn(column.status) : undefined}
              className="h-full"
            >
              <KanbanBoardColumnHeader>
                <KanbanBoardColumnTitle columnId={column.status}>
                  {column.title}
                </KanbanBoardColumnTitle>
                <span className="text-xs text-muted-foreground">
                  {requests.length}
                </span>
              </KanbanBoardColumnHeader>

              <KanbanBoardColumnList>
                {requests.length === 0 ? (
                  <li className="px-2 py-2">
                    <Empty className="p-2">
                      <EmptyHeader className="gap-1">
                        <EmptyMedia variant="icon" className="mb-0 size-7">
                          <Inbox />
                        </EmptyMedia>
                        <EmptyTitle className="text-xs text-muted-foreground">
                          No requests
                        </EmptyTitle>
                      </EmptyHeader>
                    </Empty>
                  </li>
                ) : (
                  requests.map((request) => (
                    <li key={request.id} className="px-2 py-1">
                      <MaintenanceCard
                        request={request}
                        status={column.status}
                        canManage={canManage}
                        onOpen={() => openDialog(request, column.status)}
                        onStartProgress={() => handleStartProgress(request)}
                      />
                    </li>
                  ))
                )}
              </KanbanBoardColumnList>
            </KanbanBoardColumn>
          );
        })}
        <KanbanBoardExtraMargin />
      </KanbanBoard>

      {activeRequest?.status === "PENDING" && (
        <ApproveRejectModal
          request={activeRequest.request}
          open
          onOpenChange={(open) => !open && setActiveRequest(null)}
        />
      )}
      {activeRequest?.status === "APPROVED" && (
        <AssignTechnicianModal
          request={activeRequest.request}
          open
          onOpenChange={(open) => !open && setActiveRequest(null)}
        />
      )}
      {activeRequest?.status === "IN_PROGRESS" && (
        <ResolveModal
          request={activeRequest.request}
          open
          onOpenChange={(open) => !open && setActiveRequest(null)}
        />
      )}
    </KanbanBoardProvider>
  );
}
