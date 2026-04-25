import type { Locale } from "./types";

/**
 * Словарь UI-строк сайта.
 * При добавлении новой строки — обязательно заполнить ОБА языка.
 *
 * Ключи группируем по принадлежности (header, footer, article и т.д.).
 * Где встречаются переменные — функцию.
 */
export const dictionaries = {
  ru: {
    common: {
      readMore: "Читать далее",
      backToHome: "На главную",
      readingMin: (n: number) => `${n} мин чтения`,
      published: "Опубликовано",
      author: "Автор",
      tags: "Теги",
      breadcrumbHome: "Главная",
      breadcrumbAll: "Все материалы",
      loading: "Загрузка...",
      notFound: "Не найдено",
      writeToUs: "Написать нам",
      support: "Поддержать",
      subscribe: "Подписаться",
      languageSwitch: "EN",
      languageSwitchAria: "Switch to English version",
    },
    header: {
      siteName: "Единый Мир",
      siteSubtitle: "Центр мониторинга и оценки проблем современности",
      navAnalytics: "Аналитика",
      navExpertise: "Экспертиза",
      navWiki: "Вики",
      navAbout: "О центре",
      searchAria: "Поиск по сайту",
      searchPlaceholder: "Поиск...",
    },
    footer: {
      kickerAbout: "О центре",
      kickerNav: "Навигация",
      kickerSubscribe: "Подписка",
      aboutDescription:
        "Автономная некоммерческая организация «Единый Мир» — аналитический центр, который изучает международную повестку, региональные процессы и глобальные вызовы современности.",
      emailLabel: "E-mail:",
      subscribeText:
        "Новости и дайджесты материалов — оставьте адрес, мы подготовим рассылку.",
      subscribePlaceholder: "E-mail",
      copyright: (year: number) => `© 2024–${year} АНО «Единый Мир»`,
      privacyPolicy: "Политика конфиденциальности",
      navAnalytics: "Аналитика",
      navExpertise: "Экспертиза",
      navAbout: "О центре",
      navSitemap: "Карта сайта",
      navEnLink: "EN",
    },
    home: {
      mostReadKicker: "Самое читаемое",
      latestKicker: "Свежие материалы",
      regionalKicker: "Глобальные обзоры по регионам",
      regionalAllLink: "Все обзоры →",
      thematicKicker: "Тематика",
      expertForumKicker: "Экспертный форум",
      opinionsTitle: "Мнения",
      interviewsTitle: "Интервью",
    },
    article: {
      readAlso: "Читайте также",
      similarArticles: "Похожие статьи",
      authorBlockKicker: "Автор",
      tableOfContents: "Оглавление",
      tagsKicker: "Теги",
      telegramSubscribe: "Подписка",
      telegramTitle: "Дайджест в Telegram",
      telegramDescription:
        "Краткие выжимки материалов и анонсы — без лишнего шума.",
      telegramButton: "Открыть канал",
      notTranslated:
        "Эта статья пока не переведена на английский язык.",
      backToHomeFromNotTranslated: "Вернуться к списку материалов",
    },
    rubric: {
      emptyMessage: "В этой рубрике пока нет материалов",
      filterAll: "Все",
      filterByRegion: "По регионам",
      filterByTopic: "По темам",
    },
  },

  en: {
    common: {
      readMore: "Read more",
      backToHome: "Back to home",
      readingMin: (n: number) => `${n} min read`,
      published: "Published",
      author: "Author",
      tags: "Tags",
      breadcrumbHome: "Home",
      breadcrumbAll: "All materials",
      loading: "Loading...",
      notFound: "Not found",
      writeToUs: "Write to us",
      support: "Support us",
      subscribe: "Subscribe",
      languageSwitch: "RU",
      languageSwitchAria: "Переключить на русскую версию",
    },
    header: {
      siteName: "United World",
      siteSubtitle: "Center for Monitoring and Assessment of Contemporary Issues",
      navAnalytics: "Analytics",
      navExpertise: "Expert Analysis",
      navWiki: "Wiki",
      navAbout: "About",
      searchAria: "Search the site",
      searchPlaceholder: "Search...",
    },
    footer: {
      kickerAbout: "About",
      kickerNav: "Navigation",
      kickerSubscribe: "Newsletter",
      aboutDescription:
        "United World — an autonomous non-profit organization and analytical center studying international affairs, regional processes, and global challenges.",
      emailLabel: "E-mail:",
      subscribeText:
        "News and digests of our materials — leave your address and we'll prepare a newsletter.",
      subscribePlaceholder: "E-mail",
      copyright: (year: number) => `© 2024–${year} United World ANO`,
      privacyPolicy: "Privacy Policy",
      navAnalytics: "Analytics",
      navExpertise: "Expert Analysis",
      navAbout: "About",
      navSitemap: "Sitemap",
      navEnLink: "RU",
    },
    home: {
      mostReadKicker: "Most read",
      latestKicker: "Latest materials",
      regionalKicker: "Global reviews by region",
      regionalAllLink: "All reviews →",
      thematicKicker: "Topics",
      expertForumKicker: "Expert forum",
      opinionsTitle: "Opinions",
      interviewsTitle: "Interviews",
    },
    article: {
      readAlso: "Read also",
      similarArticles: "Similar articles",
      authorBlockKicker: "Author",
      tableOfContents: "Contents",
      tagsKicker: "Tags",
      telegramSubscribe: "Newsletter",
      telegramTitle: "Telegram digest",
      telegramDescription: "Brief summaries and announcements — no extra noise.",
      telegramButton: "Open channel",
      notTranslated:
        "This article has not yet been translated into English.",
      backToHomeFromNotTranslated: "Back to materials list",
    },
    rubric: {
      emptyMessage: "No materials in this section yet",
      filterAll: "All",
      filterByRegion: "By regions",
      filterByTopic: "By topics",
    },
  },
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

/** Получить словарь для локали. */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
