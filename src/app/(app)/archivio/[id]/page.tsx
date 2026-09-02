import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationOfferLink } from "@/components/application/application-offer-link";
import { ApplicationResult } from "@/components/application/application-result";
import { DeleteApplicationButton } from "@/components/application/delete-application-button";
import { applicationPackageSchema } from "@/lib/ai/schema";
import { createClient } from "@/lib/supabase/server";
import type { Application } from "@/lib/types/database";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("company_name, role_title")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return { title: "Candidatura · SuMisura" };
  return {
    title: `${data.company_name} · ${data.role_title} · SuMisura`,
  };
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) notFound();

  const row = data as Application;
  const pkg = applicationPackageSchema.safeParse(row.package);
  if (!pkg.success) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("figma_cv_url, figma_portfolio_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/archivio"
          className="text-sm text-[var(--muted)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
        >
          ← Archivio
        </Link>
        <DeleteApplicationButton id={row.id} />
      </div>

      <ApplicationOfferLink
        companyName={row.company_name}
        roleTitle={row.role_title}
        offerSource={row.offer_source}
      />

      <ApplicationResult
        data={pkg.data}
        applicationId={row.id}
        initialStatus={row.status}
        figmaCvUrl={profile?.figma_cv_url ?? null}
        figmaPortfolioUrl={profile?.figma_portfolio_url ?? null}
      />
    </div>
  );
}
