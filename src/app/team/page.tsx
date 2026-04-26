import type { Metadata } from "next";
import { getStaticPages } from "@/lib/api";
import type { StrapiStaticTeamMember } from "@/lib/strapi-types";
import { getServerLocale } from "@/lib/i18n/server-locale";

export const metadata: Metadata = {
  title: "Команда",
  description: "Эксперты и сотрудники центра «Единый Мир».",
};

function normalizeMembers(raw: unknown): StrapiStaticTeamMember[] {
  if (!raw) return [];
  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list.filter(
    (m): m is StrapiStaticTeamMember =>
      typeof m === "object" &&
      m !== null &&
      typeof (m as StrapiStaticTeamMember).name === "string",
  );
}

export default async function TeamPage() {
  const locale = await getServerLocale();
  let team: StrapiStaticTeamMember[] = [];
  try {
    const res = await getStaticPages();
    team = normalizeMembers(res.data?.team_members);
  } catch {
    // ignore
  }

  const core = team.filter((m) => m.section === "team");
  const experts = team.filter((m) => m.section === "expert");

  return (
    <main className="min-h-screen bg-white py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h1 className="font-heading text-3xl font-normal leading-tight tracking-tight text-ink md:text-4xl">
          Команда
        </h1>
        <p className="mt-4 max-w-[800px] font-sans text-[15px] leading-relaxed text-text-mute">
          АНО «Единый Мир» объединяет аналитиков, исследователей и организаторов
          международных коммуникаций.
        </p>

        <section className="mt-12" aria-labelledby="team-core">
          <h2
            id="team-core"
            className="font-heading text-2xl font-normal text-ink md:text-[1.65rem]"
          >
            Команда
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {core.map((m) => (
              <article
                key={m.name}
                className="border border-ink/10 bg-paper-warm/60 p-5 shadow-sm"
              >
                <h3 className="font-heading text-lg font-normal text-ink">
                  {locale === "en" ? ((m as unknown as { name_en?: string }).name_en ?? m.name) : m.name}
                </h3>
                {m.role ? (
                  <p className="mt-2 font-sans text-[14px] leading-snug text-ink/90">
                    {locale === "en"
                      ? ((m as unknown as { role_en?: string; position_en?: string }).role_en ??
                        (m as unknown as { position_en?: string }).position_en ??
                        m.role)
                      : m.role}
                  </p>
                ) : null}
                {m.directions ? (
                  <p className="mt-3 font-sans text-[13px] leading-relaxed text-text-mute">
                    <span className="font-semibold text-ink/80">
                      Направления:{" "}
                    </span>
                    {locale === "en"
                      ? ((m as unknown as { directions_en?: string }).directions_en ?? m.directions)
                      : m.directions}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          {core.length === 0 ? (
            <p className="mt-4 font-sans text-sm text-text-mute">
              Список обновляется. Данные можно задать в Strapi → Static Pages →
              team_members.
            </p>
          ) : null}
        </section>

        <section className="mt-16" aria-labelledby="team-experts">
          <h2
            id="team-experts"
            className="font-heading text-2xl font-normal text-ink md:text-[1.65rem]"
          >
            Эксперты
          </h2>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            {experts.map((m) => (
              <article
                key={m.name}
                className="border border-ink/10 bg-white p-6 shadow-sm"
              >
                <h3 className="font-heading text-xl font-normal text-ink">
                  {locale === "en" ? ((m as unknown as { name_en?: string }).name_en ?? m.name) : m.name}
                </h3>
                {m.role ? (
                  <p className="mt-2 font-sans text-[14px] font-medium text-ink-soft">
                    {locale === "en"
                      ? ((m as unknown as { role_en?: string; position_en?: string }).role_en ??
                        (m as unknown as { position_en?: string }).position_en ??
                        m.role)
                      : m.role}
                  </p>
                ) : null}
                {m.bio ? (
                  <p className="mt-4 font-sans text-[15px] leading-relaxed text-text">
                    {locale === "en"
                      ? ((m as unknown as { bio_en?: string }).bio_en ?? m.bio)
                      : m.bio}
                  </p>
                ) : null}
                {m.directions ? (
                  <p className="mt-4 font-sans text-[13px] leading-relaxed text-text-mute">
                    <span className="font-semibold text-ink/80">
                      Направления:{" "}
                    </span>
                    {locale === "en"
                      ? ((m as unknown as { directions_en?: string }).directions_en ?? m.directions)
                      : m.directions}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          {experts.length === 0 ? (
            <p className="mt-4 font-sans text-sm text-text-mute">
              Раздел экспертов можно заполнить в Strapi.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
