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
      className="group flex min-w-[min(100%,300px)] shrink-0 gap-4 border-l-[3px] border-gold pl-4 transition-colors md:min-w-0"
    >
      <div className="relative h-[56px] w-[56px] shrink-0 overflow-hidden rounded-full bg-paper-warm">
        <Image
          src={opinion.author.avatarUrl}
          alt={opinion.author.name}
          width={56}
          height={56}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-[16px] font-bold leading-snug text-ink transition-colors group-hover:text-gold-deep">
          {opinion.title}
        </p>
        <p className="mt-2 font-sans text-[13px] italic text-text-mute">
          {opinion.author.name}
        </p>
      </div>
    </Link>
  );
}

function InterviewCard({ interview }: { interview: ExpertForumInterview }) {
  return (
    <Link href={interview.href} className="group block">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-warm">
        <Image
          src={interview.coverImage}
          alt={interview.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <h3 className="mt-4 font-heading text-[18px] font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-gold-deep">
        {interview.title}
      </h3>
    </Link>
  );
}

export function ExpertForumBlock({ opinions, interviews }: ExpertForumBlockProps) {
  const hasOpinions = opinions.length > 0;
  const hasInterviews = interviews.length > 0;
  if (!hasOpinions && !hasInterviews) return null;

  return (
    <section className="bg-paper section-home">
      <div className="container-site">
        <h2 className="h-section">Экспертный форум</h2>

        {hasOpinions && (
          <div className="mt-10">
            <h3 className="h-sub">Мнения</h3>
            <div className="mt-6 -mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:px-0 md:pb-0">
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
        )}

        {hasOpinions && hasInterviews && (
          <div className="mt-16 border-t border-rule md:mt-20" aria-hidden />
        )}

        {hasInterviews && (
          <div className="mt-12 md:mt-16">
            <h3 className="h-sub">Интервью</h3>
            <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
              {interviews.map((interview) => (
                <InterviewCard key={interview.href} interview={interview} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
