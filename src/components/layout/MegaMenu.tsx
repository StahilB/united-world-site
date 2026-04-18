import Link from "next/link";

const linkClass =
  "text-sm font-normal text-secondary transition-colors hover:text-ink hover:underline";

const REGIONS: Array<{ label: string; href: string }> = [
  { label: "Россия", href: "/region/rossiya" },
  { label: "Европа", href: "/region/evropa" },
  { label: "Ближний Восток", href: "/region/blizhnij-vostok" },
  { label: "Африка", href: "/region/afrika" },
  { label: "Латинская Америка", href: "/region/latinskaya-amerika" },
  { label: "Кавказ", href: "/region/kavkaz" },
  { label: "Центральная Азия", href: "/region/tsentralnaya-aziya" },
  { label: "Южная Азия", href: "/region/yuzhnaya-aziya" },
  { label: "Юго-Восточная Азия", href: "/region/yugo-vostochnaya-aziya" },
  { label: "Восточная Азия и АТР", href: "/region/vostochnaya-aziya-i-atr" },
  { label: "Северная Америка", href: "/region/severnaya-amerika" },
  { label: "Австралия и Океания", href: "/region/avstraliya-i-okeaniya" },
  { label: "Арктика", href: "/region/arktika" },
];

const CATEGORIES: Array<{ label: string; href: string }> = [
  {
    label: "Международная безопасность",
    href: "/category/mezhdunarodnaya-bezopasnost",
  },
  { label: "Политика и дипломатия", href: "/category/politika-i-diplomatiya" },
  { label: "Экономика и развитие", href: "/category/ekonomika-i-razvitie" },
  { label: "Энергетика и ресурсы", href: "/category/energetika-i-resursy" },
  { label: "Экология и климат", href: "/category/ekologiya-i-klimat" },
  { label: "Образование и культура", href: "/category/obrazovanie-i-kultura" },
  {
    label: "Международные организации",
    href: "/category/mezhdunarodnye-organizatsii",
  },
  {
    label: "Международные мероприятия",
    href: "/category/mezhdunarodnye-meropriyatiya",
  },
];

export function MegaMenu() {
  const mid = Math.ceil(REGIONS.length / 2);
  const colA = REGIONS.slice(0, mid);
  const colB = REGIONS.slice(mid);

  return (
    <div className="bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 md:grid-cols-2">
        <div>
          <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            ПО РЕГИОНАМ
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <ul className="space-y-2">
              {colA.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className={linkClass}>
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="space-y-2">
              {colB.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className={linkClass}>
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            ПО ТЕМАМ
          </p>
          <ul className="space-y-2">
            {CATEGORIES.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className={linkClass}>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-8 gap-y-2 px-6 py-4">
          <Link
            href="/section/situativnyy-analiz"
            className="text-xs font-semibold uppercase tracking-[0.06em] text-ink hover:underline"
          >
            Ситуативный анализ
          </Link>
          <Link
            href="/section/globalnye-obzory"
            className="text-xs font-semibold uppercase tracking-[0.06em] text-ink hover:underline"
          >
            Глобальные обзоры
          </Link>
        </div>
      </div>
    </div>
  );
}
