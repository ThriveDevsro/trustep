"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2, Mail, UserRound } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  deriveAccountNameFromEmail,
  getAppAuthHeaders,
  getCurrentAppUser,
} from "@/lib/app-auth";
import {
  getInboxProviderMeta,
  getInboxStatusClasses,
  getInboxStatusLabel,
} from "@/lib/mailboxes";
import { getSupabase } from "@/lib/supabase";
import type { ConnectedInbox } from "@/lib/types";

export default function AccountPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState("FeelsOdd");
  const [email, setEmail] = useState("");
  const [inboxes, setInboxes] = useState<ConnectedInbox[]>([]);
  const [inboxesUnavailable, setInboxesUnavailable] = useState(false);
  const [accountType, setAccountType] = useState<"personal" | "business">(
    "personal",
  );

  useEffect(() => {
    async function loadAccount() {
      try {
        const user = await getCurrentAppUser();
        if (!user) {
          router.replace("/login");
          return;
        }

        setEmail(user.email);
        setAccountName(deriveAccountNameFromEmail(user.email));

        const supabase = getSupabase();
        if (supabase) {
          const { data: account } = await supabase
            .from("companies")
            .select("name, account_type")
            .eq("id", user.id)
            .maybeSingle();
          if (account?.name) setAccountName(account.name);
          if (account?.account_type === "business") setAccountType("business");
        }

        const response = await fetch(
          `/api/inboxes?companyId=${encodeURIComponent(user.id)}`,
          { headers: await getAppAuthHeaders() },
        );
        if (!response.ok) {
          setInboxesUnavailable(true);
          return;
        }

        const payload = (await response.json()) as {
          inboxes?: ConnectedInbox[];
        };
        setInboxes(payload.inboxes ?? []);
      } catch {
        setInboxesUnavailable(true);
      } finally {
        setLoading(false);
      }
    }

    void loadAccount();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[980px] px-5 py-12 sm:px-8 sm:py-16">
      <div className="mb-10 border-b border-slate-300 pb-7">
        <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#020617] sm:text-5xl">
          {language === "sk" ? "Váš účet" : "Your account"}
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          {language === "sk"
            ? "Nastavenia profilu, schránok a prístupu."
            : "Profile, inbox and access settings."}
        </p>
      </div>

      <section className="border-y border-slate-300">
        <div className="flex items-center gap-5 py-7">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff0e9] text-[#2563EB]">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-[#020617]">
              {accountName}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">{email}</p>
            <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#2563EB]">
              {accountType === "business" ? "Firemný účet" : "Osobný účet"}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 py-7 sm:py-9">
          <div className="mb-7 flex items-start gap-4">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
            <div>
              <h2 className="text-lg font-bold text-[#020617]">
                {language === "sk" ? "Ochrana e-mailu" : "Email protection"}
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                {language === "sk"
                  ? accountType === "business"
                    ? "Firemná schránka a výsledky sa zdieľajú v rámci vášho workspace."
                    : "Vaša schránka a výsledky zostávajú dostupné iba vo vašom osobnom účte."
                  : "Your inbox and results are available only in your personal account."}
              </p>
            </div>
          </div>

          {inboxesUnavailable ? (
            <p className="mb-6 text-sm text-slate-500">
              {language === "sk"
                ? "Stav schránok sa teraz nepodarilo načítať."
                : "Inbox status could not be loaded."}
            </p>
          ) : inboxes.length > 0 ? (
            <div className="mb-7 divide-y divide-slate-100 border-y border-slate-100">
              {inboxes.map((inbox) => (
                <div
                  key={inbox.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[#020617]">
                      {inbox.display_name || inbox.email_address}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {inbox.email_address} ·{" "}
                      {getInboxProviderMeta(inbox.provider).label}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${getInboxStatusClasses(inbox.status)}`}
                  >
                    {getInboxStatusLabel(inbox.status)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-7 border-y border-slate-100 py-5 text-sm text-slate-500">
              {language === "sk"
                ? "Zatiaľ nemáte pripojenú žiadnu e-mailovú schránku."
                : "You have not connected an email inbox yet."}
            </p>
          )}

          <Link
            href="/inboxes"
            className="inline-flex items-center gap-2 bg-[#020617] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#12396f]"
          >
            {language === "sk"
              ? inboxes.length > 0
                ? "Spravovať schránky"
                : "Pripojiť schránku"
              : inboxes.length > 0
                ? "Manage inboxes"
                : "Connect an inbox"}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          {accountType === "business" && (
            <Link
              href="/tim"
              className="ml-3 inline-flex items-center gap-2 border border-[#020617] px-5 py-3 text-sm font-bold text-[#020617]"
            >
              Spravovať tím
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
