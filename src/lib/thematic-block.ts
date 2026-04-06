/**
 * Ровно 8 тематик для блока «Тематика» на главной (порядок = порядок карточек).
 * Имена и цвета — статичны; slug совпадают с маршрутами /category/[slug].
 */
export const THEMATIC_BLOCK_THEMES = [
  {
    slug: "mezhdunarodnaya-bezopasnost",
    name: "Международная безопасность",
    color: "#14213D",
  },
  {
    slug: "politika-i-diplomatiya",
    name: "Политика и дипломатия",
    color: "#2B4570",
  },
  {
    slug: "ekonomika-i-razvitie",
    name: "Экономика и развитие",
    color: "#2C5282",
  },
  {
    slug: "energetika-i-resursy",
    name: "Энергетика и ресурсы",
    color: "#B8860B",
  },
  {
    slug: "ekologiya-i-klimat",
    name: "Экология и климат",
    color: "#2F855A",
  },
  {
    slug: "obrazovanie-i-kultura",
    name: "Образование и культура",
    color: "#553C9A",
  },
  {
    slug: "mezhdunarodnye-organizatsii",
    name: "Международные организации",
    color: "#C05621",
  },
  {
    slug: "mezhdunarodnye-meropriyatiya",
    name: "Международные мероприятия",
    color: "#2C7A7B",
  },
] as const;
