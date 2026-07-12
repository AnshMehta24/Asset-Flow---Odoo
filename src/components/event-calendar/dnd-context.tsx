"use client";

import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
  useMemo,
} from "react";
import { toast } from "sonner";
import { useCalendar } from "@/components/event-calendar/calendar-context";
import type { IBookingEvent } from "@/app/(with-auth)/resource-booking/_schema/booking-schema";
import { upsertBooking } from "@/app/(with-auth)/resource-booking/actions";

interface DragDropContextType {
  draggedEvent: IBookingEvent | null;
  isDragging: boolean;
  startDrag: (event: IBookingEvent) => void;
  endDrag: () => void;
  handleEventDrop: (date: Date, hour?: number, minute?: number) => void;
}

interface DndProviderProps {
  children: ReactNode;
}

const DragDropContext = createContext<DragDropContextType | undefined>(
  undefined,
);

export function DndProvider({ children }: DndProviderProps) {
  const { updateEvent } = useCalendar();
  const [dragState, setDragState] = useState<{
    draggedEvent: IBookingEvent | null;
    isDragging: boolean;
  }>({ draggedEvent: null, isDragging: false });

  const onEventDroppedRef = useRef<
    ((event: IBookingEvent, newStartDate: Date, newEndDate: Date) => void) | null
  >(null);

  const startDrag = useCallback((event: IBookingEvent) => {
    setDragState({ draggedEvent: event, isDragging: true });
  }, []);

  const endDrag = useCallback(() => {
    setDragState({ draggedEvent: null, isDragging: false });
  }, []);

  const calculateNewDates = useCallback(
    (event: IBookingEvent, targetDate: Date, hour?: number, minute?: number) => {
      const originalStart = new Date(event.startDate);
      const originalEnd = new Date(event.endDate);
      const duration = originalEnd.getTime() - originalStart.getTime();

      const newStart = new Date(targetDate);
      if (hour !== undefined) {
        newStart.setHours(hour, minute || 0, 0, 0);
      } else {
        newStart.setHours(
          originalStart.getHours(),
          originalStart.getMinutes(),
          0,
          0,
        );
      }

      return {
        newStart,
        newEnd: new Date(newStart.getTime() + duration),
      };
    },
    [],
  );

  const isSamePosition = useCallback((date1: Date, date2: Date) => {
    return date1.getTime() === date2.getTime();
  }, []);

  const handleEventDrop = useCallback(
    (targetDate: Date, hour?: number, minute?: number) => {
      const { draggedEvent } = dragState;
      if (!draggedEvent) return;

      const { newStart, newEnd } = calculateNewDates(
        draggedEvent,
        targetDate,
        hour,
        minute,
      );
      const originalStart = new Date(draggedEvent.startDate);

      // Check if dropped in same position
      if (isSamePosition(originalStart, newStart)) {
        endDrag();
        return;
      }

      // Instantly update event
      const callback = onEventDroppedRef.current;
      if (callback) {
        callback(draggedEvent, newStart, newEnd);
      }
      endDrag();
    },
    [dragState, calculateNewDates, isSamePosition, endDrag],
  );

  // Default event update handler. Routes through the exact same
  // overlap-checked upsertBooking as the create/edit form — dragging or
  // resizing a booking onto an occupied slot must be rejected the same way
  // a manual edit would be. Nothing is committed to local state until the
  // server confirms it, so a rejection is a no-op (the block snaps back
  // because it was never optimistically moved).
  const handleEventUpdate = useCallback(
    async (event: IBookingEvent, newStartDate: Date, newEndDate: Date) => {
      const result = await upsertBooking({
        bookingId: event.bookingId,
        assetId: event.assetId,
        startDate: newStartDate,
        endDate: newEndDate,
        purpose: event.purpose ?? "",
        departmentId: event.departmentId,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      updateEvent(result.event);
      toast.success("Booking updated successfully");
    },
    [updateEvent],
  );

  // Set default callback
  React.useEffect(() => {
    onEventDroppedRef.current = handleEventUpdate;
  }, [handleEventUpdate]);

  const contextValue = useMemo(
    () => ({
      draggedEvent: dragState.draggedEvent,
      isDragging: dragState.isDragging,
      startDrag,
      endDrag,
      handleEventDrop,
    }),
    [dragState, startDrag, endDrag, handleEventDrop],
  );

  return (
    <DragDropContext.Provider value={contextValue}>
      {children}
    </DragDropContext.Provider>
  );
}

export function useDragDrop() {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error("useDragDrop must be used within a DragDropProvider");
  }
  return context;
}


