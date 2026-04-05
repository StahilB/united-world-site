import { ExpertForumBlock } from "@/components/blocks/ExpertForumBlock";
import { GlobalReviewsBlock } from "@/components/blocks/GlobalReviewsBlock";
import { LatestArticlesBlock } from "@/components/blocks/LatestArticlesBlock";
import { RegionalReviewsBlock } from "@/components/blocks/RegionalReviewsBlock";
import { ThematicBlock } from "@/components/blocks/ThematicBlock";
import {
  getLatestArticles,
  getRegionalReviewItems,
  getThematicBlockItems,
  mockExpertForumInterviews,
  mockExpertForumOpinions,
  mockGlobalReviewsMainArticle,
  mockGlobalReviewsPopularArticles,
} from "@/lib/mock-data";

export default function HomePage() {
  const latestArticles = getLatestArticles(4);
  const regionalItems = getRegionalReviewItems();
  const thematicItems = getThematicBlockItems();

  return (
    <main className="flex min-h-screen flex-col">
      <p className="p-8 text-center text-lg">
        Единый Мир — скоро здесь будет новый сайт
      </p>
      <GlobalReviewsBlock
        mainArticle={mockGlobalReviewsMainArticle}
        popularArticles={mockGlobalReviewsPopularArticles}
      />
      <LatestArticlesBlock articles={latestArticles} />
      <RegionalReviewsBlock items={regionalItems} />
      <ThematicBlock items={thematicItems} />
      <ExpertForumBlock
        opinions={mockExpertForumOpinions}
        interviews={mockExpertForumInterviews}
      />
    </main>
  );
}