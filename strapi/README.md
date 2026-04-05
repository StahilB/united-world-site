# Strapi 5 — CMS «Единый Мир»

Headless CMS на **Strapi 5** с **PostgreSQL**. Модели: `Article`, `Author`, `Category`, `Region`, синглтон `GlobalReview`.

## Требования

- Node.js 20–24
- PostgreSQL 14+ (или Docker)

## База данных

1. Поднимите PostgreSQL, например из корня монорепозитория:

   ```bash
   docker compose -f docker-compose.strapi.yml up -d
   ```

2. Скопируйте `.env.example` в `.env` и задайте секреты (`APP_KEYS` и др.).

3. Убедитесь, что в `.env` указаны `DATABASE_CLIENT=postgres` и параметры подключения (как в примере для `strapi/strapi` пользователя из compose).

## Запуск

```bash
cd strapi
npm install
npm run develop
```

Для продакшена (`npm run start`) после изменения схем в `src/api/**/schema.json` выполните **`npm run build`**, иначе подхватится устаревшая копия в `dist/`.

Админка: `http://localhost:1337/admin` — при первом запуске создайте учётную запись администратора.

## API

После старта приложения в `bootstrap` для роли **Public** включаются права **find** и **findOne** для:

- `article`, `author`, `category`, `region`, `global-review`
- загрузок: `plugin::upload.content-api.find` и `findOne` (медиа в API)

При необходимости уточните права в **Settings → Users & Permissions → Roles → Public**.

## Контент-типы

| Тип            | Описание |
|----------------|----------|
| **Article**    | `title`, `slug` (uid←title), `content` (blocks), `excerpt` (≤300), `cover_image`, связи с автором/категориями/регионом, `format` (enum), флаги и метрики, `publication_date` (дата на сайте; системное `published_at` зарезервировано ядром) |
| **Author**     | имя, slug, био, фото, email, `social_links` (json) |
| **Category**   | тематика, slug, цвет (hex), описание |
| **Region**     | макрорегион, slug, обложка |
| **GlobalReview** | синглтон: выбранная статья; время изменения — встроенное `updatedAt` |

## Изображения

В `config/plugins.ts` для плагина **Upload** включены `sizeOptimization`, `responsiveDimensions` и брейкпоинты; обработка через **Sharp** идёт в составе `@strapi/upload`.
