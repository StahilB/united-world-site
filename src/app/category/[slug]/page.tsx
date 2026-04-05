type CategoryPageProps = {
  params: { slug: string };
};

export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <main>
      <p>CategoryPage: {params.slug}</p>
    </main>
  );
}
