import { deriveAccountNameFromEmail } from "@/lib/app-auth";
import { getDevRequestById } from "@/lib/dev-requests-store";
import { createServiceClient } from "@/lib/supabase";
import { ReportIdentityInsights } from "@/components/ReportIdentityInsights";
import { SourceBadge } from "@/components/SourceBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { AnalysisFeedback } from "@/components/AnalysisFeedback";
import type { Request } from "@/lib/types";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  Hash,
  Mail,
  User,
} from "lucide-react";
import Link from "next/link";

type RequestDetail = {
  icon: JSX.Element;
  label: string;
  value: string | JSX.Element;
};

async function getRequest(id: string): Promise<Request | null> {
  const supabase = createServiceClient();
  if (!supabase) return getDevRequestById(id);

  const { data } = await supabase
    .from("requests")
    .select("*, companies(name, approver_email)")
    .eq("id", id)
    .single();

  if (data) return data as Request;
  return id.startsWith("devreq-") ? await getDevRequestById(id) : null;
}

export default async function ReportPage({
  params,
}: {
  params: { id: string };
}) {
  const request = await getRequest(params.id);
  if (!request) notFound();

  const formattedDate = new Date(request.created_at).toLocaleString("sk-SK", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const details: RequestDetail[] = [
    {
      icon: <User className="h-4 w-4" />,
      label: "Odosielateľ",
      value: request.submitted_by,
    },
    {
      icon: <Building2 className="h-4 w-4" />,
      label: "Zdroj",
      value: <SourceBadge source={request.source} />,
    },
    {
      icon: <Calendar className="h-4 w-4" />,
      label: "Dátum",
      value: formattedDate,
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: "Stav",
      value: <StatusBadge status={request.status} />,
    },
    ...(request.phone_from
      ? [
          {
            icon: <Hash className="h-4 w-4" />,
            label: "Telefón",
            value: request.phone_from,
          },
        ]
      : []),
    ...(request.companies?.name
      ? [
          {
            icon: <Building2 className="h-4 w-4" />,
            label: "Účet",
            value: request.companies.name,
          },
        ]
      : [
          {
            icon: <Building2 className="h-4 w-4" />,
            label: "Účet",
            value: deriveAccountNameFromEmail(request.submitted_by),
          },
        ]),
  ];

  const isWeb = request.source === "web";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0f172a] antialiased">
      <main className="mx-auto max-w-5xl px-6 py-12 lg:py-16">
        {/* Top Header */}
        <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 transition hover:text-[#0f172a]"
            >
              <ArrowLeft className="h-4 w-4" /> Prehľad analýz
            </Link>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f172a] sm:text-4xl">
              Trust report
            </h1>
          </div>

          <Link
            href="/submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-xs font-semibold text-white transition hover:bg-[#1D4ED8]"
          >
            Overiť ďalší podnet <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Layout Grid */}
        <div className="grid gap-16 lg:grid-cols-[1fr_300px]">
          <div>
            <ReportIdentityInsights
              requestId={request.id}
              riskLevel={request.risk_level}
              reasons={request.reasons ?? []}
              recommendation={request.recommendation}
              contentText={request.text}
              subject={isWeb ? "url" : "content"}
              trustedIdentityId={request.trusted_identity_id}
              identityStatus={request.identity_status}
              identityComparison={request.identity_comparison}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-10 lg:border-l lg:border-slate-100 lg:pl-8">
            <div>
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                Detaily podnetu
              </h3>
              <dl className="space-y-4">
                {details.map(({ icon, label, value }) => (
                  <div key={label}>
                    <dt className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                      <span className="text-slate-300">{icon}</span> {label}
                    </dt>
                    <dd className="text-xs font-semibold text-[#0f172a]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
                Akcie
              </h3>
              <div className="space-y-2">
                <a
                  href={`mailto:?subject=${encodeURIComponent(`FeelsOdd overenie`)}&body=${encodeURIComponent(request.recommendation || "")}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-[#0f172a] transition hover:border-[#0f172a]"
                >
                  <span>Zdieľať e-mailom</span>
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                </a>
              </div>
            </div>
            <AnalysisFeedback
              requestId={request.id}
              initialFeedback={request.feedback}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
