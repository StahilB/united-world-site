import Image from "next/image";
import Link from "next/link";
import type { ExpertForumInterview, ExpertForumOpinion } from "@/lib/types";

export type ExpertForumBlockProps = {
  opinions: ExpertForumOpinion[];
  interviews: ExpertForumInterview[];
};

function OpinionCard({ opinion }: { opinion: ExpertForumOpinion }) {
  return (
    <Link
      href={opinion.href}
      className="group flex min-w-[min(100%,300px)] shrink-0 gap-3 border-l-2 border-accent bg-[#F5F5F5] p-4 pl-4 transition-colors hover:bg-[#EEEEEE] md:min-w-0"
    >
      <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-full bg-surface">
        <Image
          src={opinion.author.avatarUrl}
          alt={opinion.author.name}
          width={60}
          height={60}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-[15px] font-normal leading-snug text-primary transition-colors group-hover:text-accent">
          {opinion.title}
        </p>
        <p className="mt-1.5 font-sans text-[12px] text-muted">{opinion.author.name}</p>
      </div>
    </Link>
  );
}

function InterviewCard({ interview }: { interview: ExpertForumInterview }) {
  return (
    <Link href={interview.href} className="group block">
      <div className="relative aspect-video w-full overflow-hidden bg-surface">
        <Image
          src={interview.coverImage}
          alt={interview.title}
          fill
          className="object-cover transition-opacity duration-200 group-hover:opacity-90"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <p className="mt-3 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
        Интервью
      </p>
      <h3 className="mt-1.5 font-heading text-[17px] font-normal leading-snug tracking-tight text-primary transition-colors group-hover:text-accent">
        {interview.title}
      </h3>
    </Link>
  );
}

export function ExpertForumBlock({ opinions, interviews }: ExpertForumBlockProps) {
  return (
    <section className="bg-white py-10 md:py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h2 className="border-l-4 border-accent pl-4 font-heading text-lg font-normal uppercase tracking-[0.14em] text-primary md:text-xl">
          Экспертный форум
        </h2>

        <div className="mt-8">
          <h3 className="mb-4 font-heading text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Мнения
          </h3>
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
            {opinions.map((opinion) => (
              <div
                key={opinion.href}
                className="snap-start md:snap-none md:min-w-0"
              >
                <OpinionCard opinion={opinion} />
              </div>
            ))}
          </div>
        </div>

        <div
          className="my-10 border-t border-[#E5E5E5] md:my-12"
          role="separator"
          aria-hidden
        />

        <div>
          <h3 className="mb-4 font-heading text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Интервью
          </h3>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
            {interviews.map((interview) => (
              <InterviewCard key={interview.href} interview={interview} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
