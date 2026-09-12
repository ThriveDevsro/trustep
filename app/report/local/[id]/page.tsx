"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ReportIdentityInsights } from "@/components/ReportIdentityInsights";
import { SourceBadge } from "@/components/SourceBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { deriveAccountNameFromEmail } from "@/lib/app-auth";
import { getLocalRequestById } from "@/lib/local-history";
import type { Request } from "@/lib/types";
import { Clock, User, Calendar, Building2, Hash } from "lucide-react";

type RequestDetail = {
  icon: JSX.Element;
  label: string;
  value: string | JSX.Element;
};

export default function LocalReportPage() {
  const params = useParams<{ id: string }>();
  const [request, setRequest] = useState<Request | null | undefined>(undefined);

  useEffect(() => {
    if (!params?.id) {
      setRequest(null);
      return;
    }

    setRequest(getLocalRequestById(params.id));
  }, [params]);

  if (request === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-slate-500">
        Načítavam Trust report…
      </div>
    );
  }

  if (!request) {
    notFound();
  }

  const formattedDate = new Date(request.created_at).toLocaleString("sk-SK", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const details: RequestDetail[] = [
    {
      icon: <User className="w-4 h-4" />,
      label: "Odosielateľ",
      value: request.submitted_by,
    },
    {
      icon: <Building2 className="w-4 h-4" />,
      label: "Zdroj",
      value: <SourceBadge source={request.source} />,
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: "Dátum",
      value: formattedDate,
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: "Stav",
      value: <StatusBadge status={request.status} />,
    },
    ...(request.phone_from
      ? [
          {
            icon: <Hash className="w-4 h-4" />,
            label: "Telefón",
            value: request.phone_from,
          },
        ]
      : []),
    {
      icon: <Building2 className="w-4 h-4" />,
      label: "Účet",
      value: deriveAccountNameFromEmail(request.submitted_by),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 lg:py-16">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <Link
              href="/dashboard"
              className="mb-2 inline-block text-sm text-slate-500 transition-colors hover:text-[#2563EB]"
            >
              ← Späť na prehľad
            </Link>
            <h1 className="font-display text-3xl font-semibold tracking-[-.05em] text-[#020617]">
              Trust report
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SourceBadge source={request.source} />
              <StatusBadge status={request.status} />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <ReportIdentityInsights
            requestId={request.id}
            riskLevel={request.risk_level}
            reasons={request.reasons ?? []}
            recommendation={request.recommendation}
            contentText={request.text}
            trustedIdentityId={request.trusted_identity_id}
            identityStatus={request.identity_status}
            identityComparison={request.identity_comparison}
          />
        </div>

        <div className="mb-8 border-y border-slate-200 py-6">
          <h2 className="mb-4 text-sm font-semibold text-[#020617]">
            Analyzovaný obsah
          </h2>
          <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-600">
            {request.text}
          </pre>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h2 className="mb-4 text-sm font-semibold text-[#020617]">
            Detaily overenia
          </h2>
          <dl className="space-y-3">
            {details.map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 border-b border-slate-100 py-2 text-sm">
                <span className="text-slate-300">{icon}</span>
                <span className="w-28 text-slate-500">{label}</span>
                <span className="font-medium text-[#0F172A]">{value}</span>
              </div>
            ))}
          </dl>
        </div>
      </main>
    </div>
  );
}
