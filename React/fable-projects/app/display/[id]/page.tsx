import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isModuleEnabled } from "@/lib/modules";
import SignageFacility from "@/components/display/SignageFacility";

// D-02 サイネージ施設別表示（DISP-02/03/04）
export default async function DisplayFacilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  if (!(await isModuleEnabled(supabase, "M-DISPLAY"))) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const facilityId = Number(id);
  if (!Number.isInteger(facilityId) || facilityId < 1) {
    redirect("/display");
  }

  return <SignageFacility facilityId={facilityId} />;
}
