/**
 * Настройка отображения списка статей в админке Strapi.
 * Запуск: docker exec -i united-world-site-strapi-1 sh -c 'node scripts/configure-article-list-view.js'
 *
 * Что делает:
 * 1. Устанавливает столбцы: №, Заголовок, Автор, Рубрика (format), Регион, Дата публикации, Просмотры
 * 2. Устанавливает сортировку по умолчанию: publication_date по убыванию (новые сверху)
 */

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@anounitedworld.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function main() {
  if (!ADMIN_PASSWORD) {
    console.error('Укажите ADMIN_PASSWORD в переменных окружения');
    process.exit(1);
  }

  // 1. Авторизация в admin API
  const loginRes = await fetch(`${STRAPI_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!loginRes.ok) {
    console.error('Ошибка авторизации:', await loginRes.text());
    process.exit(1);
  }

  const { data: loginData } = await loginRes.json();
  const jwt = loginData.token;
  console.log('✅ Авторизация успешна');

  // 2. Настройка list view для Article
  // В Strapi 5 это PUT /content-manager/content-types/api::article.article/configuration
  const configRes = await fetch(
    `${STRAPI_URL}/content-manager/content-types/api::article.article/configuration`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        layouts: {
          list: {
            // Столбцы в списке статей
            // (id всегда показывается автоматически как №)
            fields: [
              'title', // Заголовок
              'format', // Рубрика (анализ/мнение/интервью/колонка/обзор)
              'author', // Автор (relation)
              'region', // Регион (relation)
              'publication_date', // Дата публикации
              'views_count', // Просмотры
            ],
          },
        },
        settings: {
          // Сортировка по умолчанию: новые сверху
          defaultSortBy: 'publication_date',
          defaultSortOrder: 'DESC',
          // Количество записей на странице
          pageSize: 25,
        },
      }),
    },
  );

  if (!configRes.ok) {
    const errText = await configRes.text();
    console.error('Ошибка настройки:', configRes.status, errText);
    process.exit(1);
  }

  console.log('✅ Список статей настроен:');
  console.log('   Столбцы: Заголовок | Формат | Автор | Регион | Дата | Просмотры');
  console.log('   Сортировка: по дате публикации (новые сверху)');
  console.log('   Записей на странице: 25');
}

main().catch(console.error);
