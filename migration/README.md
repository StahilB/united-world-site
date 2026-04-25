# Migration — старые EN-статьи → Strapi

Однократная миграция текстов английских статей с `en.anounitedworld.com`
(старый WordPress) в наш Strapi на новые поля `title_en`,
`excerpt_en`, `content_html_en`.

## Принцип

Скрипты НИЧЕГО не меняют в Strapi автоматически. Ты сам решаешь
какую старую EN-статью к какой новой RU-статье привязать через
ручное заполнение CSV.

## Установка

```bash
cd migration
cp .env.example .env
# отредактируй .env, вставь STRAPI_TOKEN
npm install
```

## Шаги

### Шаг 1 — собрать данные

```bash
npm run fetch
```

Скачает все английские статьи со старого WP в:
- `output/en-articles-dump.json` — полные данные с HTML
- `output/en-articles-dump.csv` — превью для просмотра в Excel

### Шаг 2 — построить мэппинг

```bash
npm run build-mapping
```

Загрузит русские статьи из текущего Strapi и предложит
автоматическое сопоставление в `output/mapping_to_review.csv`.

### Шаг 3 — РУЧНОЕ РЕВЬЮ

Открой `output/mapping_to_review.csv` в Excel/Google Sheets.
Для каждой строки заполни столбец `match_action`:

- **APPLY** — применить предложенный матч.
- **SKIP** — английской версии нет (новая статья без перевода).
- **<wp_id>** — указать другой ID, если автоподбор ошибся.
  ID найдёшь в `en-articles-dump.csv`.

Сохрани файл (CSV, не xlsx!), положи рядом с скриптами.

### Шаг 4 — применение (будет в отдельном скрипте 03-apply-mapping.js)

Этот скрипт пока НЕ создан — будет в следующей фазе после
твоего ревью CSV.
