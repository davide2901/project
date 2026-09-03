import { OfferInterviewPrep } from "@/components/discovery/offer-interview-prep";
import { ApplicationOfferLink } from "@/components/application/application-offer-link";
import type { ApplicationPackage } from "@/lib/ai/schema";
import { buildInterviewPrepContext } from "@/lib/ai/interview-prep-context";
import type { ReactNode } from "react";

type Props = {
  data: ApplicationPackage;
  offerSource?: string | null;
  statusPicker: ReactNode;
};

export function ApplicationFollowupCard({
  data,
  offerSource,
  statusPicker,
}: Props) {
  return (
    <section className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 shadow-[var(--shadow)]">
      {statusPicker}
      <OfferInterviewPrep
        companyName={data.company_name}
        roleTitle={data.role_title}
        existingContext={buildInterviewPrepContext(data)}
        variant="link"
      />
      <ApplicationOfferLink
        companyName={data.company_name}
        roleTitle={data.role_title}
        offerSource={offerSource}
        variant="plain"
      />
    </section>
  );
}
