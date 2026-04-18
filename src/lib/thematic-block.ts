/**
 * Ровно 8 тематик для блока «Тематика» на главной (порядок = порядок карточек).
 * Имена и цвета — статичны; slug совпадают с маршрутами /category/[slug].
 */
export const THEMATIC_BLOCK_THEMES = [
  {
    slug: "mezhdunarodnaya-bezopasnost",
    name: "Международная безопасность",
    color: "#8B6418",
  },
  {
    slug: "politika-i-diplomatiya",
    name: "Политика и дипломатия",
    color: "#8B6418",
  },
  {
    slug: "ekonomika-i-razvitie",
    name: "Экономика и развитие",
    color: "#8B6418",
  },
  {
    slug: "energetika-i-resursy",
    name: "Энергетика и ресурсы",
    color: "#8B6418",
  },
  {
    slug: "ekologiya-i-klimat",
    name: "Экология и климат",
    color: "#8B6418",
  },
  {
    slug: "obrazovanie-i-kultura",
    name: "Образование и культура",
    color: "#8B6418",
  },
  {
    slug: "mezhdunarodnye-organizatsii",
    name: "Международные организации",
    color: "#8B6418",
  },
  {
    slug: "mezhdunarodnye-meropriyatiya",
    name: "Международные мероприятия",
    color: "#8B6418",
  },
] as const;
