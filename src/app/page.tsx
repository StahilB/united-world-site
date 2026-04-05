import { ExpertForumBlock } from "@/components/blocks/ExpertForumBlock";
import { GlobalReviewsBlock } from "@/components/blocks/GlobalReviewsBlock";
import { LatestArticlesBlock } from "@/components/blocks/LatestArticlesBlock";
import { RegionalReviewsBlock } from "@/components/blocks/RegionalReviewsBlock";
import { ThematicBlock } from "@/components/blocks/ThematicBlock";
import {
  getExpertForumInterviewsFromArticles,
  getExpertForumOpinionsFromArticles,
  getLatestArticles,
  getRegionalReviewItems,
  getThematicBlockItems,
  mockGlobalReviewsMainArticle,
  mockGlobalReviewsPopularArticles,
} from "@/lib/mock-data";

export default function HomePage() {
  const latestArticles = getLatestArticles(4);
  const regionalItems = getRegionalReviewItems();
  const thematicItems = getThematicBlockItems();
  const expertOpinions = getExpertForumOpinionsFromArticles();
  const expertInterviews = getExpertForumInterviewsFromArticles();

  return (
    <main className="flex min-h-screen flex-col">
      <section className="py-12 md:py-16">
        <GlobalReviewsBlock
          mainArticle={mockGlobalReviewsMainArticle}
          popularArticles={mockGlobalReviewsPopularArticles}
        />
      </section>

      <section className="py-12 md:py-16">
        <LatestArticlesBlock articles={latestArticles} />
      </section>

      <section className="py-12 md:py-16">
        <RegionalReviewsBlock items={regionalItems} />
      </section>

      <section className="py-12 md:py-16">
        <ThematicBlock items={thematicItems} />
      </section>

      <section className="py-12 md:py-16">
        <ExpertForumBlock
          opinions={expertOpinions}
          interviews={expertInterviews}
        />
      </section>
    </main>
  );
}
