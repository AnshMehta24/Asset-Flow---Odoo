import { Suspense } from "react";
import { CalendarOff } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { CalendarSkeleton } from "@/components/event-calendar/calendar-skeleton";
import { requireCurrentUser } from "@/lib/auth/user";
import { getBookableAssets } from "../_utils/booking-data";
import { ResourcePicker } from "./resource-picker";
import { BookingCalendar } from "./booking-calendar";

export async function ResourceBookingPage({ assetId }: { assetId?: string }) {
  const user = await requireCurrentUser();
  // Employees only see their own department's resources + org-wide
  // (department-less) ones. Admin/Asset Manager/Dept Head see everything.
  const assets = await getBookableAssets(
    user?.role === "EMPLOYEE" ? user.departmentId : undefined
  );
  const selectedAssetId = assetId ?? assets[0]?.id;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Resource Booking
        </h1>
        <p className="text-sm text-muted-foreground">
          Book shared resources by time slot. Overlapping requests are rejected automatically.
        </p>
      </div>

      {selectedAssetId ? (
        <>
          <ResourcePicker assets={assets} selectedAssetId={selectedAssetId} />
          <Suspense fallback={<CalendarSkeleton />}>
            <BookingCalendar assetId={selectedAssetId} />
          </Suspense>
        </>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarOff />
            </EmptyMedia>
            <EmptyTitle>No bookable resources yet</EmptyTitle>
            <EmptyDescription>
              Mark an asset as a shared/bookable resource in Asset Registration
              before it can be scheduled here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
