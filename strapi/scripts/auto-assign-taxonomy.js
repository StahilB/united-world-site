#!/usr/bin/env node
/**
 * Автоприсвоение region и categories статьям по ключевым словам в заголовке и excerpt.
 *
 * Запуск на сервере:
 * docker exec -i united-world-site-strapi-1 sh -c 'STRAPI_TOKEN=... node scripts/auto-assign-taxonomy.js'
 *
 * Или из папки strapi/ с .env:
 * STRAPI_URL=http://localhost:1337 STRAPI_TOKEN=... node scripts/auto-assign-taxonomy.js
 */

const STRAPI = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/$/, '');
const TOKEN = process.env.STRAPI_TOKEN;

if (!TOKEN) {
  console.error('STRAPI_TOKEN is required');
  process.exit(1);
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  };
}

async function apiGet(path) {
  const res = await fetch(`${STRAPI}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(`${STRAPI}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// ============================================================
// Ключевые слова для определения региона
// ============================================================
const REGION_KEYWORDS = [
  {
    name: 'Россия',
    keywords: ['росси', 'москв', 'кремл', 'путин', 'российск', 'рф '],
  },
  {
    name: 'Европа',
    keywords: ['европ', 'евросоюз', 'ес ', 'брюссел', 'франц', 'герман', 'берлин', 'париж', 'великобритан', 'лондон', 'брексит', 'нато'],
  },
  {
    name: 'Ближний Восток',
    keywords: ['ближн', 'восток', 'иран', 'ирак', 'сири', 'израил', 'палестин', 'саудовск', 'йемен', 'ливан', 'хезболл', 'хамас', 'тегеран', 'эр-рияд'],
  },
  {
    name: 'Африка',
    keywords: ['африк', 'сахел', 'нигер', 'мали', 'судан', 'эфиопи', 'кени', 'юар', 'центральноафрикан', 'цар:'],
  },
  {
    name: 'Латинская Америка',
    keywords: ['латинск', 'латам', 'бразил', 'мексик', 'аргентин', 'венесуэл', 'колумби', 'чили', 'перу', 'куб', 'пуэрто'],
  },
  {
    name: 'Кавказ',
    keywords: ['кавказ', 'грузи', 'армен', 'азербайджан', 'карабах', 'тбилис', 'ереван', 'баку'],
  },
  {
    name: 'Центральная Азия',
    keywords: ['центральн', 'азия', 'казахстан', 'узбекистан', 'киргиз', 'кыргызстан', 'таджикистан', 'туркмен', 'астана', 'ташкент'],
  },
  {
    name: 'Южная Азия',
    keywords: ['южн', 'азия', 'инди', 'пакистан', 'бангладеш', 'шри-ланк', 'непал', 'дели', 'моди'],
  },
  {
    name: 'Юго-Восточная Азия',
    keywords: ['юго-восточн', 'асеан', 'индонези', 'вьетнам', 'таиланд', 'филиппин', 'мьянм', 'малайзи', 'сингапур'],
  },
  {
    name: 'Восточная Азия и АТР',
    keywords: ['восточн', 'азия', 'китай', 'кнр', 'пекин', 'япони', 'токио', 'корей', 'тайван', 'атр', 'индо-тихоокеан'],
  },
  {
    name: 'Северная Америка',
    keywords: ['сша', 'америк', 'вашингтон', 'трамп', 'байден', 'канад', 'оттав'],
  },
  {
    name: 'Австралия и Океания',
    keywords: ['океани', 'австрали', 'канберр', 'новая зеланди'],
  },
  {
    name: 'Арктика',
    keywords: ['арктик', 'арктическ', 'северн', 'морск', 'путь'],
  },
];

// ============================================================
// Ключевые слова для определения категории
// ============================================================
const CATEGORY_KEYWORDS = [
  {
    name: 'Международная безопасность',
    keywords: ['безопасност', 'военн', 'оборон', 'конфликт', 'терроризм', 'ядерн', 'вооружен', 'нато', 'ракет', 'санкци'],
  },
  {
    name: 'Политика и дипломатия',
    keywords: ['политик', 'политическ', 'дипломат', 'выбор', 'парламент', 'президент', 'правительств', 'оппозици', 'геополитическ'],
  },
  {
    name: 'Экономика и развитие',
    keywords: ['экономик', 'экономическ', 'торгов', 'инвестиц', 'финанс', 'развити', 'ввп', 'брикс', 'санкци'],
  },
  {
    name: 'Энергетика и ресурсы',
    keywords: ['энерг', 'нефт', 'газ', 'ресурс', 'опек', 'трубопровод', 'атомн', 'возобновляем'],
  },
  {
    name: 'Экология и климат',
    keywords: ['эколог', 'климат', 'углерод', 'загрязнен', 'природ', 'окружающ'],
  },
  {
    name: 'Образование и культура',
    keywords: ['образован', 'культур', 'наук', 'университет', 'научн', 'гуманитарн', 'лицей', 'школ'],
  },
  {
    name: 'Международные организации',
    keywords: ['оон', 'организаци', 'g20', 'g7', 'шос', 'евразийск', 'еаэс', 'снг', 'брикс', 'саммит'],
  },
  {
    name: 'Международные мероприятия',
    keywords: ['форум', 'конференц', 'саммит', 'ассамбле', 'мероприяти'],
  },
];

/**
 * Подсчитывает «очки» для каждого региона/категории по ключевым словам.
 * Возвращает лучшее совпадение или null.
 */
function matchBest(text, mappings) {
  const lower = text.toLowerCase();
  let bestName = null;
  let bestScore = 0;

  for (const m of mappings) {
    let score = 0;
    for (const kw of m.keywords) {
      // Считаем количество вхождений
      let idx = 0;
      let count = 0;
      while ((idx = lower.indexOf(kw, idx)) !== -1) {
        count++;
        idx += kw.length;
      }
      score += count;
    }
    if (score > bestScore) {
      bestScore = score;
      bestName = m.name;
    }
  }

  return bestScore > 0 ? bestName : null;
}

/**
 * Особая логика для ежемесячных обзоров:
 * "Ежемесячный обзор политической ситуации в Африке" → region=Африка
 * "Ежемесячный обзор политической ситуации в Восточной Азии и АТР" → region=Восточная Азия и АТР
 */
function matchMonthlyReview(title) {
  const lower = title.toLowerCase();
  if (!lower.includes('ежемесячн') && !lower.includes('обзор политическ')) {
    return null;
  }

  // Прямые совпадения для ежемесячных обзоров
  const directMap = [
    { pattern: 'южной азии', region: 'Южная Азия' },
    { pattern: 'восточной азии и атр', region: 'Восточная Азия и АТР' },
    { pattern: 'восточной азии', region: 'Восточная Азия и АТР' },
    { pattern: 'юго-восточной азии', region: 'Юго-Восточная Азия' },
    { pattern: 'центральной азии', region: 'Центральная Азия' },
    { pattern: 'северной америке', region: 'Северная Америка' },
    { pattern: 'северной америк', region: 'Северная Америка' },
    { pattern: 'латинской америке', region: 'Латинская Америка' },
    { pattern: 'латинской америк', region: 'Латинская Америка' },
    { pattern: 'африке', region: 'Африка' },
    { pattern: 'африк', region: 'Африка' },
    { pattern: 'европе', region: 'Европа' },
    { pattern: 'европ', region: 'Европа' },
    { pattern: 'кавказе', region: 'Кавказ' },
    { pattern: 'кавказ', region: 'Кавказ' },
    { pattern: 'ближнем востоке', region: 'Ближний Восток' },
    { pattern: 'ближн', region: 'Ближний Восток' },
    { pattern: 'арктик', region: 'Арктика' },
    { pattern: 'океании', region: 'Австралия и Океания' },
    { pattern: 'австрали', region: 'Австралия и Океания' },
    { pattern: 'росси', region: 'Россия' },
  ];

  for (const dm of directMap) {
    if (lower.includes(dm.pattern)) {
      return dm.region;
    }
  }
  return null;
}

/**
 * Для заголовков с «ГЛОБАЛЬНЫЙ ОБЗОР» — пометить is_global_review=true
 */
function isGlobalReview(title) {
  const lower = title.toLowerCase();
  return lower.includes('глобальный обзор') || lower.includes('глобальн') && lower.includes('обзор');
}

async function fetchAllPages(path) {
  const all = [];
  let page = 1;
  while (true) {
    const sep = path.includes('?') ? '&' : '?';
    const data = await apiGet(`${path}${sep}pagination[page]=${page}&pagination[pageSize]=50`);
    const items = data.data || data;
    if (!Array.isArray(items) || items.length === 0) break;
    all.push(...items);
    if (items.length < 50) break;
    page++;
  }
  return all;
}

async function main() {
  console.log('[auto-assign] Загрузка данных...');

  // Загрузить регионы и категории из Strapi
  const regions = await fetchAllPages('/api/regions?fields[0]=name&fields[1]=slug');
  const categories = await fetchAllPages('/api/categories?fields[0]=name&fields[1]=slug');

  console.log(`  Регионы: ${regions.length}, Категории: ${categories.length}`);

  const regionByName = new Map();
  for (const r of regions) {
    regionByName.set(r.name.toLowerCase(), { id: r.id, documentId: r.documentId, name: r.name });
  }

  const categoryByName = new Map();
  for (const c of categories) {
    categoryByName.set(c.name.toLowerCase(), { id: c.id, documentId: c.documentId, name: c.name });
  }

  // Загрузить все статьи
  const articles = await fetchAllPages('/api/articles?populate[region]=true&populate[categories]=true&fields[0]=title&fields[1]=excerpt&fields[2]=format&fields[3]=is_global_review');

  console.log(`  Статьи: ${articles.length}`);

  let updatedRegion = 0;
  let updatedCats = 0;
  let updatedGlobal = 0;
  let skipped = 0;

  for (const article of articles) {
    const hasRegion = !!article.region;
    const hasCats = article.categories && article.categories.length > 0;

    // Если всё заполнено — пропускаем
    if (hasRegion && hasCats) {
      skipped++;
      continue;
    }

    const text = `${article.title || ''} ${article.excerpt || ''}`;
    const updateData = {};

    // Определить регион
    if (!hasRegion) {
      // Сначала пробуем точные совпадения для ежемесячных обзоров
      let regionName = matchMonthlyReview(article.title || '');
      if (!regionName) {
        regionName = matchBest(text, REGION_KEYWORDS);
      }

      if (regionName) {
        const regionEntry = regionByName.get(regionName.toLowerCase());
        if (regionEntry) {
          updateData.region = regionEntry.documentId || regionEntry.id;
          updatedRegion++;
          console.log(`  [region] "${(article.title||'').slice(0,60)}" → ${regionName}`);
        }
      }
    }

    // Определить категорию
    if (!hasCats) {
      const catName = matchBest(text, CATEGORY_KEYWORDS);
      if (catName) {
        const catEntry = categoryByName.get(catName.toLowerCase());
        if (catEntry) {
          updateData.categories = [catEntry.documentId || catEntry.id];
          updatedCats++;
          console.log(`  [category] "${(article.title||'').slice(0,60)}" → ${catName}`);
        }
      }
    }

    // Глобальный обзор
    if (!article.is_global_review && isGlobalReview(article.title || '')) {
      updateData.is_global_review = true;
      updatedGlobal++;
    }

    // Обновить статью
    if (Object.keys(updateData).length > 0) {
      const docId = article.documentId;
      if (!docId) {
        console.warn(`  ⚠ Статья id=${article.id} без documentId, пропускаем`);
        continue;
      }
      try {
        await apiPut(`/api/articles/${docId}`, { data: updateData });
      } catch (e) {
        console.error(`  ✗ Ошибка обновления "${(article.title||'').slice(0,50)}": ${e.message}`);
      }
    } else {
      skipped++;
    }
  }

  console.log('\n=== РЕЗУЛЬТАТ ===');
  console.log(`Обновлено регионов: ${updatedRegion}`);
  console.log(`Обновлено категорий: ${updatedCats}`);
  console.log(`Помечено глобальных обзоров: ${updatedGlobal}`);
  console.log(`Пропущено (уже заполнено или не определено): ${skipped}`);

  // Теперь перезапустить reassign-sections
  console.log('\n[auto-assign] Теперь запустите reassign-sections для обновления привязки к подрубрикам:');
  console.log('  node scripts/reassign-sections.js');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
