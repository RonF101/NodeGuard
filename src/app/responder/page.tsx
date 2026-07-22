import { redirect } from "next/navigation";
import { getPageActor } from "@/lib/serverAuth";
import { roleHome } from "@/lib/auth";
import { ResponderAccessNotice } from "@/components/ResponderAccessNotice";

export default async function ResponderAccessPage() {
  const actor = await getPageActor();
  if (!actor) redirect("/?reason=session");
  if (actor.effectiveRole !== "field_responder") {
    redirect(roleHome(actor.effectiveRole));
  }
  return <ResponderAccessNotice operatorName={actor.name} />;
}
