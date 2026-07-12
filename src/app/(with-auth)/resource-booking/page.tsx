import { ResourceBookingPage } from "@/app/(with-auth)/resource-booking/_components/resource-booking-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>;
}) {
  const { assetId } = await searchParams;

  return <ResourceBookingPage assetId={assetId} />;
}
