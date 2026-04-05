type ArticlePageProps = {
  params: { slug: string };
};

export default function ArticlePage({ params }: ArticlePageProps) {
  return (
    <main>
      <p>ArticlePage: {params.slug}</p>
    </main>
  );
}
