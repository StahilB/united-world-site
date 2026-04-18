/**
 * Renders CKEditor HTML from Strapi static-page single type (newspaper / article-like).
 */
export function StaticPageContent({ html }: { html: string }) {
  if (!html?.trim()) {
    return (
      <p className="font-sans text-[15px] leading-relaxed text-text-mute">
        Материал готовится к публикации. Загляните позже.
      </p>
    );
  }

  return (
    <div
      className="static-page-body"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
