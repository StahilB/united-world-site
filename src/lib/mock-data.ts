import type {
  Article,
  Author,
  Category,
  GlobalReviewsMainArticle,
  ExpertForumInterview,
  ExpertForumOpinion,
  GlobalReviewsPopularArticle,
  RegionalReviewItem,
  Region,
  ThematicBlockItem,
} from "./types";

export const mockRegions: Region[] = [
  {
    id: "reg-afrika",
    name: "Африка",
    slug: "afrika",
    description: "Субсахарский регион и Северная Африка",
  },
  {
    id: "reg-latam",
    name: "Латинская Америка",
    slug: "latinskaya-amerika",
    description: "Страны Латинской Америки и Карибского бассейна",
  },
  {
    id: "reg-kavkaz",
    name: "Кавказ",
    slug: "kavkaz",
    description: "Закавказье и прилегающие территории",
  },
  {
    id: "reg-blizhny",
    name: "Ближний Восток",
    slug: "blizhniy-vostok",
    description: "Ближневосточный регион и Персидский залив",
  },
  {
    id: "reg-ca",
    name: "Центральная Азия",
    slug: "tsentralnaya-aziya",
    description: "Республики Центральной Азии и Афганистан",
  },
  {
    id: "reg-sa",
    name: "Южная Азия",
    slug: "yuzhnaya-aziya",
    description: "Индостан и прилегающие зоны",
  },
  {
    id: "reg-na",
    name: "Северная Америка",
    slug: "severnaya-amerika",
    description: "США, Канада и Мексика",
  },
  {
    id: "reg-sea",
    name: "Юго-Восточная Азия",
    slug: "yugo-vostochnaya-aziya",
    description: "Страны АСЕАН",
  },
  {
    id: "reg-ea-atr",
    name: "Восточная Азия и АТР",
    slug: "vostochnaya-aziya-i-atr",
    description: "Китай, Япония, Корея и западная часть Тихого океана",
  },
  {
    id: "reg-au",
    name: "Австралия и Океания",
    slug: "avstraliya-i-okeaniya",
    description: "Австралия, Новая Зеландия и островные государства",
  },
  {
    id: "reg-ru",
    name: "Россия",
    slug: "rossiya",
    description: "Российская Федерация в мировой политике",
  },
  {
    id: "reg-eu",
    name: "Европа",
    slug: "evropa",
    description: "Европейский континент и интеграционные объединения",
  },
  {
    id: "reg-arctic",
    name: "Арктика",
    slug: "arktika",
    description: "Арктический регион и прибрежные государства",
  },
];

export const mockCategories: Category[] = [
  {
    id: "cat-politics",
    name: "Политика и дипломатия",
    slug: "politika-i-diplomatiya",
    color: "#2B4570",
    description: "Внешняя политика, переговоры и двусторонние отношения",
  },
  {
    id: "cat-economy",
    name: "Экономика и развитие",
    slug: "ekonomika-i-razvitie",
    color: "#2C5282",
    description: "Макроэкономика, торговля и устойчивое развитие",
  },
  {
    id: "cat-energy",
    name: "Энергетика и ресурсы",
    slug: "energetika-i-resursy",
    color: "#B8860B",
    description: "Нефть, газ, электроэнергетика и сырьевые рынки",
  },
  {
    id: "cat-eco",
    name: "Экология и климат",
    slug: "ekologiya-i-klimat",
    color: "#2D6A4F",
    description: "Климатическая политика и окружающая среда",
  },
  {
    id: "cat-edu",
    name: "Образование и культура",
    slug: "obrazovanie-i-kultura",
    color: "#6B4E71",
    description: "Академические связи и культурная дипломатия",
  },
  {
    id: "cat-io",
    name: "Международные организации",
    slug: "mezhdunarodnye-organizatsii",
    color: "#344E41",
    description: "ООН, региональные блоки и многосторонние форматы",
  },
  {
    id: "cat-security",
    name: "Международная безопасность",
    slug: "mezhdunarodnaya-bezopasnost",
    color: "#9B2335",
    description: "Конфликты, нераспространение и стратегическая стабильность",
  },
  {
    id: "cat-events",
    name: "Международные мероприятия",
    slug: "mezhdunarodnye-meropriyatiya",
    color: "#B8952C",
    description: "Саммиты, форумы и дипломатические события",
  },
];

const C = mockCategories;
const R = mockRegions;

export const mockAuthors: Author[] = [
  {
    id: "auth-ivanov",
    name: "Алексей Иванов",
    slug: "aleksey-ivanov",
    bio: "Кандидат политических наук, эксперт по многосторонней дипломатии и институциям глобального управления.",
    avatarUrl: "https://picsum.photos/200/200?random=201",
  },
  {
    id: "auth-smirnova",
    name: "Мария Смирнова",
    slug: "mariya-smirnova",
    bio: "Экономист-международник, специализируется на торговых соглашениях и макроэкономике развивающихся рынков.",
    avatarUrl: "https://picsum.photos/200/200?random=202",
  },
  {
    id: "auth-kozlov",
    name: "Дмитрий Козлов",
    slug: "dmitriy-kozlov",
    bio: "Аналитик в области стратегической стабильности, региональных конфликтов и нераспространения вооружений.",
    avatarUrl: "https://picsum.photos/200/200?random=203",
  },
  {
    id: "auth-petrova",
    name: "Анна Петрова",
    slug: "anna-petrova",
    bio: "Эксперт по климатической политике и трансграничному природопользованию в Азии и на Ближнем Востоке.",
    avatarUrl: "https://picsum.photos/200/200?random=204",
  },
  {
    id: "auth-sokolov",
    name: "Михаил Соколов",
    slug: "mikhail-sokolov",
    bio: "Специалист по глобальным энергетическим рынкам, инфраструктурным проектам и ресурсной дипломатии.",
    avatarUrl: "https://picsum.photos/200/200?random=205",
  },
];

const A = mockAuthors;

export const mockArticles: Article[] = [
  {
    id: "art-01",
    title:
      "БРИКС в новой геополитической реальности: вызовы для многосторонней дипломатии",
    slug: "briks-v-novoy-geopoliticheskoy-realnosti",
    excerpt:
      "Расширение БРИКС меняет баланс представительства и повестку институтов развивающегося мира. В материале разобраны ограничения согласования позиций и перспективы прагматичного сотрудничества без единой идеологии.",
    coverImage: "https://picsum.photos/800/450?random=1",
    author: A[0],
    categories: [C[0], C[5]],
    region: R[11],
    format: "Аналитика",
    publishedAt: "2026-04-04T09:15:00.000Z",
    viewsCount: 18420,
    readingTime: 12,
  },
  {
    id: "art-02",
    title:
      "Энергетический переход Европы и последствия для глобальных цепочек поставок",
    slug: "energeticheskiy-perekhod-evropy-i-tsepochki-postavok",
    excerpt:
      "Зелёные цели ЕС сталкиваются с инвестиционными циклами и зависимостью от критических материалов. Оцениваются риски для промышленности и возможные сценарии кооперации с поставщиками за пределами Европы.",
    coverImage: "https://picsum.photos/800/450?random=2",
    author: A[4],
    categories: [C[2], C[1]],
    region: R[11],
    format: "Обзор",
    publishedAt: "2026-04-02T14:40:00.000Z",
    viewsCount: 22105,
    readingTime: 14,
  },
  {
    id: "art-03",
    title:
      "Африка к югу от Сахары: институциональные реформы и привлечение инвестиций",
    slug: "afrika-k-yugu-ot-sakhary-investitsii",
    excerpt:
      "Регион демонстрирует устойчивый спрос на инфраструктуру и цифровизацию, но инвесторы осторожны из‑за валютных рисков. Рассматриваются кейсы региональных интеграционных инициатив и роль многосторонних кредиторов.",
    coverImage: "https://picsum.photos/800/450?random=3",
    author: A[1],
    categories: [C[1], C[0]],
    region: R[0],
    format: "Аналитика",
    publishedAt: "2026-03-30T11:00:00.000Z",
    viewsCount: 9870,
    readingTime: 11,
  },
  {
    id: "art-04",
    title:
      "Тихоокеанский регион: конкуренция стратегий США и Китая в 2026 году",
    slug: "tikhookeanskiy-region-ssha-i-kitay-2026",
    excerpt:
      "Военно-морское присутствие и экономические альянсы формируют новую архитектуру безопасности. В статье сопоставлены подходы к союзникам, линии коммуникации и зоны потенциальных кризисов.",
    coverImage: "https://picsum.photos/800/450?random=4",
    author: A[2],
    categories: [C[6], C[0]],
    region: R[8],
    format: "Комментарий",
    publishedAt: "2026-03-28T08:20:00.000Z",
    viewsCount: 31200,
    readingTime: 9,
  },
  {
    id: "art-05",
    title:
      "Климатические саммиты после COP: реалистичность национальных планов по выбросам",
    slug: "klimaticheskie-sammiti-posle-cop",
    excerpt:
      "Национально определённые вклады обновляются несинхронно, а финансирование адаптации остаётся дефицитом. Предлагается взгляд на то, как формулировать измеримые обязательства без разрушения конкурентоспособности отраслей.",
    coverImage: "https://picsum.photos/800/450?random=5",
    author: A[3],
    categories: [C[3], C[5]],
    region: R[11],
    format: "Аналитика",
    publishedAt: "2026-03-25T16:45:00.000Z",
    viewsCount: 15340,
    readingTime: 13,
  },
  {
    id: "art-06",
    title:
      "ООН и реформирование Совета Безопасности: перспективы и ограничения",
    slug: "oon-i-reformirovanie-sb",
    excerpt:
      "Дискуссии о расширении постоянного состава снова выходят на повестку Генассамблеи. Разбирается, какие компромиссы реалистичны в условиях вето и как меняется легитимность организации в глазах Глобального Юга.",
    coverImage: "https://picsum.photos/800/450?random=6",
    author: A[0],
    categories: [C[5], C[0]],
    region: R[11],
    format: "Обзор",
    publishedAt: "2026-03-22T10:05:00.000Z",
    viewsCount: 26780,
    readingTime: 10,
  },
  {
    id: "art-07",
    title:
      "Ближний Восток: региональная безопасность после смены элит и новые союзы",
    slug: "blizhniy-vostok-bezopasnost-i-soyuzy",
    excerpt:
      "Перегруппировка сил затрагивает энергетические коридоры и гуманитарные программы. Анализируются договорённости между региональными лидерами и роль внешних гарантов стабильности.",
    coverImage: "https://picsum.photos/800/450?random=7",
    author: A[2],
    categories: [C[6], C[0]],
    region: R[3],
    format: "Аналитика",
    publishedAt: "2026-03-19T13:30:00.000Z",
    viewsCount: 19850,
    readingTime: 11,
  },
  {
    id: "art-08",
    title:
      "Центральная Азия: транзитные коридоры и водно-энергетическое сотрудничество",
    slug: "tsentralnaya-aziya-transit-i-voda",
    excerpt:
      "Железнодорожные маршруты и распределение водных ресурсов связывают страны региона с внешними рынками. Оцениваются институциональные механизмы координации и экологические ограничения проектов.",
    coverImage: "https://picsum.photos/800/450?random=8",
    author: A[4],
    categories: [C[2], C[1]],
    region: R[4],
    format: "Обзор",
    publishedAt: "2026-03-16T09:50:00.000Z",
    viewsCount: 11230,
    readingTime: 8,
  },
  {
    id: "art-09",
    title:
      "Арктика: международное право, шельф и интересы прибрежных государств",
    slug: "arktika-pravo-i-shelf",
    excerpt:
      "Правовой режим Северного морского пути и континентального шельфа остаётся зоной юридических и политических трений. Рассматривается практика арктического сотрудничества в науке и ЧС на фоне милитаризации.",
    coverImage: "https://picsum.photos/800/450?random=9",
    author: A[0],
    categories: [C[0], C[6]],
    region: R[12],
    format: "Аналитика",
    publishedAt: "2026-03-12T15:10:00.000Z",
    viewsCount: 14490,
    readingTime: 15,
  },
  {
    id: "art-10",
    title:
      "Латинская Америка: интеграционные проекты и торговые блоки",
    slug: "latinskaya-amerika-integratsiya",
    excerpt:
      "Меркосур и Тихоокеанский альянс ищут новые точки соприкосновения с Азией и Северной Америкой. В фокусе — тарифные режимы, сельхозэкспорт и индустриальная кооперация.",
    coverImage: "https://picsum.photos/800/450?random=10",
    author: A[1],
    categories: [C[1], C[5]],
    region: R[1],
    format: "Обзор",
    publishedAt: "2026-03-09T12:00:00.000Z",
    viewsCount: 8765,
    readingTime: 10,
  },
  {
    id: "art-11",
    title:
      "Кибербезопасность критической инфраструктуры: международные стандарты и практика",
    slug: "kiberbezopasnost-kriticheskoy-infrastruktury",
    excerpt:
      "Государства ужесточают требования к операторам связи и энергосетей, но уровень зрелости регулирования неравномерен. Сравниваются подходы ключевых юрисдикций и роль частного сектора в обмене индикаторами компрометации.",
    coverImage: "https://picsum.photos/800/450?random=11",
    author: A[2],
    categories: [C[6], C[1]],
    region: R[6],
    format: "Аналитика",
    publishedAt: "2026-03-05T08:35:00.000Z",
    viewsCount: 25600,
    readingTime: 12,
  },
  {
    id: "art-12",
    title:
      "Международная торговля: фрагментация цепочек и роль региональных соглашений",
    slug: "mezhdunarodnaya-torgovlya-fragmentatsiya",
    excerpt:
      "Компании диверсифицируют поставки, а государства используют субсидии и экспортный контроль как инструмент политики. Прогнозируется влияние на цены потребительских товаров и на малый бизнес в периферийных экономиках.",
    coverImage: "https://picsum.photos/800/450?random=12",
    author: A[1],
    categories: [C[1], C[0]],
    region: R[11],
    format: "Комментарий",
    publishedAt: "2026-03-01T14:25:00.000Z",
    viewsCount: 18990,
    readingTime: 9,
  },
  {
    id: "art-13",
    title:
      "Юго-Восточная Азия: АСЕАН между конкуренцией великих держав",
    slug: "yugo-vostochnaya-aziya-asean",
    excerpt:
      "Нейтралитет блока проверяется морскими инцидентами и инвестиционными конкурсами. Разбирается, как малые страны используют институциональную дипломатию для сохранения автономии решений.",
    coverImage: "https://picsum.photos/800/450?random=13",
    author: A[0],
    categories: [C[0], C[6]],
    region: R[7],
    format: "Аналитика",
    publishedAt: "2026-02-26T11:15:00.000Z",
    viewsCount: 17320,
    readingTime: 11,
  },
  {
    id: "art-14",
    title:
      "Кавказ: образовательные обмены и научная кооперация в условиях региональной напряжённости",
    slug: "kavkaz-obrazovanie-i-nauka",
    excerpt:
      "Академические связи между столицами региона развиваются несмотря на визовые и политические ограничения. Рассматриваются грантовые программы, совместные лаборатории и роль гуманитарного диалога в снижении недоверия.",
    coverImage: "https://picsum.photos/800/450?random=14",
    author: A[3],
    categories: [C[4], C[0]],
    region: R[2],
    format: "Обзор",
    publishedAt: "2026-02-22T09:40:00.000Z",
    viewsCount: 12450,
    readingTime: 8,
  },
  {
    id: "art-15",
    title:
      "Россия и глобальный Юг: форматы партнёрства в экономике и гуманитарной сфере",
    slug: "rossiya-i-globalnyy-yug",
    excerpt:
      "Торговые потоки и проекты в области здравоохранения показывают неоднородный интерес по регионам. Материал суммирует ключевые направления взаимодействия и ограничения, связанные с логистикой и финансированием.",
    coverImage: "https://picsum.photos/800/450?random=15",
    author: A[0],
    categories: [C[0], C[1]],
    region: R[10],
    format: "Аналитика",
    publishedAt: "2026-02-18T16:00:00.000Z",
    viewsCount: 20880,
    readingTime: 13,
  },
  {
    id: "art-16",
    title:
      "Международные санкции: эффективность, обходные механизмы и гуманитарные издержки",
    slug: "mezhdunarodnye-sanktsii-effektivnost",
    excerpt:
      "Оценка влияния ограничительных мер на поведение элит и населения неоднозначна. Рассматриваются инструменты контроля за соблюдением режимов и этические дилеммы гуманитарных исключений.",
    coverImage: "https://picsum.photos/800/450?random=16",
    author: A[2],
    categories: [C[6], C[0]],
    region: R[11],
    format: "Комментарий",
    publishedAt: "2026-02-14T10:55:00.000Z",
    viewsCount: 29450,
    readingTime: 10,
  },
  {
    id: "art-17",
    title:
      "Водные ресурсы и трансграничные реки: право, политика и экология в Азии",
    slug: "vodnye-resursy-transgranichnye-reki-aziya",
    excerpt:
      "Строительство плотин и ирригационные потребности усиливают конфликтность в бассейнах крупных рек. Анализируются международно-правовые режимы и практика совместных наблюдательных миссий.",
    coverImage: "https://picsum.photos/800/450?random=17",
    author: A[3],
    categories: [C[3], C[0]],
    region: R[5],
    format: "Аналитика",
    publishedAt: "2026-02-10T13:20:00.000Z",
    viewsCount: 13100,
    readingTime: 14,
  },
  {
    id: "art-18",
    title:
      "Северная Америка: промышленная политика и технологические альянсы",
    slug: "severnaya-amerika-promyshlennaya-politika",
    excerpt:
      "Субсидии на полупроводники и чистую энергетику перекраивают инвестиционные потоки. Описывается взаимодействие с союзниками и конкуренция за кадры в высокотехнологичных отраслях.",
    coverImage: "https://picsum.photos/800/450?random=18",
    author: A[1],
    categories: [C[1], C[6]],
    region: R[6],
    format: "Обзор",
    publishedAt: "2026-02-06T08:10:00.000Z",
    viewsCount: 16200,
    readingTime: 9,
  },
  {
    id: "art-19",
    title:
      "Австралия и Океания: безопасность и климатическая дипломатия в Индо-Тихом океане",
    slug: "avstraliya-bezopasnost-i-klimat",
    excerpt:
      "Союзники США наращивают военно-морское присутствие, параллельно обсуждая климатическую помощь островным государствам. В статье связаны военные и экологические повестки в региональной дипломатии.",
    coverImage: "https://picsum.photos/800/450?random=19",
    author: A[3],
    categories: [C[3], C[6]],
    region: R[9],
    format: "Аналитика",
    publishedAt: "2026-02-08T12:45:00.000Z",
    viewsCount: 11890,
    readingTime: 11,
  },
  {
    id: "art-20",
    title:
      "Международные мероприятия года: повестка форумов и ожидания участников",
    slug: "mezhdunarodnye-meropriyatiya-goda",
    excerpt:
      "Календарь саммитов и отраслевых встреч отражает приоритеты по безопасности, климу и цифровой экономике. Кратко представлены темы ключевых площадок и вероятные итоговые декларации без прогноза конкретных договорённостей.",
    coverImage: "https://picsum.photos/800/450?random=20",
    author: A[0],
    categories: [C[7], C[5]],
    region: R[11],
    format: "Хроника",
    publishedAt: "2026-02-05T07:30:00.000Z",
    viewsCount: 9540,
    readingTime: 7,
  },
];

function sortByPublishedAtDesc(articles: Article[]): Article[] {
  return [...articles].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export function getLatestArticles(count: number): Article[] {
  return sortByPublishedAtDesc(mockArticles).slice(0, count);
}

export function getPopularArticles(count: number): Article[] {
  return [...mockArticles]
    .sort((a, b) => b.viewsCount - a.viewsCount)
    .slice(0, count);
}

export function getArticlesByRegion(regionSlug: string): Article[] {
  return mockArticles.filter((article) => article.region.slug === regionSlug);
}

export function getArticlesByCategory(categorySlug: string): Article[] {
  return mockArticles.filter((article) =>
    article.categories.some((c) => c.slug === categorySlug),
  );
}

export function getArticleBySlug(slug: string): Article | undefined {
  return mockArticles.find((article) => article.slug === slug);
}

/** По одному материалу на каждый из 13 регионов — для блока на главной */
export function getRegionalReviewItems(): RegionalReviewItem[] {
  return mockRegions.map((region) => {
    const list = getArticlesByRegion(region.slug);
    const article = list[0] ?? mockArticles[0];
    return {
      region: { name: region.name, slug: region.slug },
      article: {
        title: article.title,
        slug: article.slug,
        coverImage: article.coverImage,
      },
    };
  });
}

/** По одной свежей статье на каждую из 8 тематик (категорий) */
export function getThematicBlockItems(): ThematicBlockItem[] {
  return mockCategories.map((category) => {
    const list = sortByPublishedAtDesc(getArticlesByCategory(category.slug));
    const article = list[0] ?? mockArticles[0];
    return {
      category: {
        name: category.name,
        slug: category.slug,
        color: category.color,
      },
      article: {
        title: article.title,
        slug: article.slug,
        coverImage: article.coverImage,
        format: article.format,
      },
    };
  });
}

/** Заглушки для блока «Глобальные обзоры» на главной */
export const mockGlobalReviewsMainArticle: GlobalReviewsMainArticle = {
  title:
    "Мировая экономика в 2026 году: разрыв между прогнозами и реальностью",
  excerpt:
    "Центральные банки смягчают политику, но инвесторы остаются осторожными. Обзор ключевых рисков и сценариев на ближайшие месяцы — без иллюзий относительно волатильности сырья и долга.",
  date: "28 марта 2026",
  dateIso: "2026-03-28",
  href: "/articles/mirovaya-ekonomika-2026",
};

export const mockGlobalReviewsPopularArticles: GlobalReviewsPopularArticle[] =
  [
    {
      title: "Тихоокеанская безопасность: новые союзы и старые противоречия",
      href: "/articles/tihookeanskaya-bezopasnost",
    },
    {
      title: "Климат и торговля: как меняются правила игры в ВТО",
      href: "/articles/klimat-i-torgovlya",
    },
    {
      title: "Энергопереход в Европе: цена стабильности сетей",
      href: "/articles/energoperehod-evropa",
    },
    {
      title: "Цифровой суверенитет: границы данных и облака",
      href: "/articles/cifrovoy-suverenitet",
    },
    {
      title: "Ближний Восток после сделок: что остаётся за кадром",
      href: "/articles/blizhniy-vostok-posle-sdelok",
    },
    {
      title: "Африка и инфраструктура: кто финансирует завтрашние проекты",
      href: "/articles/afrika-infrastruktura",
    },
    {
      title: "Латинская Америка на выборах: экономика против популизма",
      href: "/articles/latinskaya-amerika-vybory",
    },
  ];

export const mockExpertForumOpinions: ExpertForumOpinion[] = [
  {
    title: "О расширении БРИКС и новой геополитике",
    href: "/articles/briks-v-novoy-geopoliticheskoy-realnosti",
    author: {
      name: "Алексей Иванов",
      avatarUrl: "https://picsum.photos/200/200?random=201",
    },
  },
  {
    title: "Энергопереход Европы: что теряет промышленность",
    href: "/articles/energeticheskiy-perekhod-evropy-i-tsepochki-postavok",
    author: {
      name: "Мария Смирнова",
      avatarUrl: "https://picsum.photos/200/200?random=202",
    },
  },
  {
    title: "Тихоокеанская зона: баланс сил без иллюзий",
    href: "/articles/tikhookeanskiy-region-ssha-i-kitay-2026",
    author: {
      name: "Дмитрий Козлов",
      avatarUrl: "https://picsum.photos/200/200?random=203",
    },
  },
  {
    title: "Климат после COP: как измерять обязательства",
    href: "/articles/klimaticheskie-sammiti-posle-cop",
    author: {
      name: "Анна Петрова",
      avatarUrl: "https://picsum.photos/200/200?random=204",
    },
  },
  {
    title: "Реформа СБ ООН: реалистичные сценарии",
    href: "/articles/oon-i-reformirovanie-sb",
    author: {
      name: "Алексей Иванов",
      avatarUrl: "https://picsum.photos/200/200?random=201",
    },
  },
  {
    title: "Центральная Азия: вода, транзит, соседи",
    href: "/articles/tsentralnaya-aziya-transit-i-voda",
    author: {
      name: "Михаил Соколов",
      avatarUrl: "https://picsum.photos/200/200?random=205",
    },
  },
];

export const mockExpertForumInterviews: ExpertForumInterview[] = [
  {
    title:
      "Ближний Восток: региональная безопасность после смены элит и новые союзы",
    href: "/articles/blizhniy-vostok-bezopasnost-i-soyuzy",
    coverImage: "https://picsum.photos/800/450?random=701",
  },
  {
    title: "Арктика: сотрудничество и конкуренция на льду",
    href: "/articles/arktika-pravo-i-shelf",
    coverImage: "https://picsum.photos/800/450?random=702",
  },
  {
    title: "Россия в мировой политике: институты и доверие",
    href: "/articles/rossiya-i-globalnyy-yug",
    coverImage: "https://picsum.photos/800/450?random=703",
  },
];
