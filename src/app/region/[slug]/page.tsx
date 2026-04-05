type RegionPageProps = {
  params: { slug: string };
};

export default function RegionPage({ params }: RegionPageProps) {
  return (
    <main>
      <p>RegionPage: {params.slug}</p>
    </main>
  );
}
