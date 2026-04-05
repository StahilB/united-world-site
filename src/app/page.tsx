import { GlobalReviewsBlock } from "@/components/blocks/GlobalReviewsBlock";
import {
  mockGlobalReviewsMainArticle,
  mockGlobalReviewsPopularArticles,
} from "@/lib/mock-data";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      <p className="p-8 text-center text-lg">
        Единый Мир — скоро здесь будет новый сайт
      </p>
      <GlobalReviewsBlock
        mainArticle={mockGlobalReviewsMainArticle}
        popularArticles={mockGlobalReviewsPopularArticles}
      />
    </main>
  );
}