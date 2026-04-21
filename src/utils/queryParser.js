const countryNameToCode = {
    'nigeria': 'NG',
    'ghana': 'GH',
    'kenya': 'KE',
    'angola': 'AO',
    'south africa': 'ZA',
    'ethiopia': 'ET',
    'tanzania': 'TZ',
    'uganda': 'UG',
    'cameroon': 'CM',
    'senegal': 'SN',
    'egypt': 'EG',
    'algeria': 'DZ',
    'morocco': 'MA',
    'ivory coast': 'CI',
    'mozambique': 'MZ',
    'madagascar': 'MG',
    'zimbabwe': 'ZW',
    'zambia': 'ZM',
    'rwanda': 'RW',
    'somalia': 'SO',
    'sudan': 'SD',
    'tunisia': 'TN',
    'libya': 'LY',
    'mali': 'ML',
    'niger': 'NE',
    'chad': 'TD',
    'guinea': 'GN',
    'benin': 'BJ',
    'togo': 'TG',
    'sierra leone': 'SL',
    'liberia': 'LR',
    'mauritania': 'MR',
    'botswana': 'BW',
    'namibia': 'NA',
    'malawi': 'MW',
    'gabon': 'GA',
    'lesotho': 'LS',
    'gambia': 'GM',
    'eritrea': 'ER',
    'burundi': 'BI',
    'djibouti': 'DJ',
    'comoros': 'KM',
    'cape verde': 'CV',
    'equatorial guinea': 'GQ',
    'congo': 'CG',
    'democratic republic of congo': 'CD',
    'dr congo': 'CD',

    'united kingdom': 'GB',
    'uk': 'GB',
    'germany': 'DE',
    'france': 'FR',
    'italy': 'IT',
    'spain': 'ES',
    'portugal': 'PT',
    'netherlands': 'NL',
    'belgium': 'BE',
    'sweden': 'SE',
    'norway': 'NO',
    'denmark': 'DK',
    'finland': 'FI',
    'poland': 'PL',
    'ukraine': 'UA',
    'russia': 'RU',
    'switzerland': 'CH',
    'austria': 'AT',
    'greece': 'GR',
    'romania': 'RO',
    'hungary': 'HU',
    'czech republic': 'CZ',
  
    'united states': 'US',
    'usa': 'US',
    'us': 'US',
    'canada': 'CA',
    'brazil': 'BR',
    'mexico': 'MX',
    'argentina': 'AR',
    'colombia': 'CO',
    'chile': 'CL',
    'peru': 'PE',
    'venezuela': 'VE',
    'ecuador': 'EC',
    'bolivia': 'BO',
    'paraguay': 'PY',
    'uruguay': 'UY',
  
    'india': 'IN',
    'china': 'CN',
    'japan': 'JP',
    'south korea': 'KR',
    'indonesia': 'ID',
    'pakistan': 'PK',
    'bangladesh': 'BD',
    'vietnam': 'VN',
    'thailand': 'TH',
    'malaysia': 'MY',
    'philippines': 'PH',
    'singapore': 'SG',
    'saudi arabia': 'SA',
    'uae': 'AE',
    'united arab emirates': 'AE',
    'turkey': 'TR',
    'iran': 'IR',
    'iraq': 'IQ',

    'australia': 'AU',
    'new zealand': 'NZ',
};

const parseNaturalQuery = (q) => {
    if (!q || typeof q !== 'string') return null;

    const query = q.toLowerCase().trim();
    const filters = {};
    let matched = false;

    // --- Gender ---
    const hasMale = /\bmales?\b/.test(query);
    const hasFemale = /\bfemales?\b/.test(query);
    const hasBoth = /\b(male and female|female and male|both genders?|all genders?|everyone|people|persons?|individuals?)\b/.test(query);

    if (hasMale && !hasFemale) {
        filters.gender = 'male';
        matched = true;
    } else if (hasFemale && !hasMale) {
        filters.gender = 'female';
        matched = true;
    } else if (hasBoth || (hasMale && hasFemale)) {
        matched = true; // no gender filter, but valid query
    }

    // --- Age group ---
    if (/\bteenagers?\b|\bteens?\b/.test(query)) {
        filters.age_group = 'teenager';
        matched = true;
    } else if (/\badults?\b/.test(query)) {
        filters.age_group = 'adult';
        matched = true;
    } else if (/\bseniors?\b|\belderly\b|\bold (people|men|women|males?|females?)\b/.test(query)) {
        filters.age_group = 'senior';
        matched = true;
    } else if (/\bchildren?\b|\bkids?\b|\bboys?\b|\bgirls?\b/.test(query)) {
        filters.age_group = 'child';
        matched = true;
    }

    // --- "young" → ages 16–24 (not a stored age group) ---
    if (/\byoung\b|\byouthful\b/.test(query)) {
        filters.min_age = 16;
        filters.max_age = 24;
        matched = true;
    }

    // --- "middle aged" → 40–60 ---
    if (/\bmiddle.?aged?\b/.test(query)) {
        filters.min_age = 40;
        filters.max_age = 60;
        matched = true;
    }

    // --- "above X", "older than X", "over X" ---
    const aboveMatch = query.match(/(?:above|older than|over|greater than|more than)\s+(\d+)/);
    if (aboveMatch) {
        filters.min_age = parseInt(aboveMatch[1]);
        matched = true;
    }

    // --- "below X", "younger than X", "under X" ---
    const belowMatch = query.match(/(?:below|younger than|under|less than)\s+(\d+)/);
    if (belowMatch) {
        filters.max_age = parseInt(belowMatch[1]);
        matched = true;
    }

    // --- "between X and Y" ---
    const betweenMatch = query.match(/between\s+(\d+)\s+and\s+(\d+)/);
    if (betweenMatch) {
        filters.min_age = parseInt(betweenMatch[1]);
        filters.max_age = parseInt(betweenMatch[2]);
        matched = true;
    }

    // --- "aged X" or "age X" ---
    const agedMatch = query.match(/\bage[d]?\s+(\d+)\b/);
    if (agedMatch) {
        filters.min_age = parseInt(agedMatch[1]);
        filters.max_age = parseInt(agedMatch[1]);
        matched = true;
    }

    // --- "in their Xs" e.g. "in their 30s" ---
    const inTheirMatch = query.match(/in their\s+(\d+)s/);
    if (inTheirMatch) {
        const decade = parseInt(inTheirMatch[1]);
        filters.min_age = decade;
        filters.max_age = decade + 9;
        matched = true;
    }

    // --- Country: try multi-word first, then single word ---
    // Sort by length descending to match longer country names first
    const sortedCountries = Object.keys(countryNameToCode).sort((a, b) => b.length - a.length);
    for (const country of sortedCountries) {
        const regex = new RegExp(`(?:from|in|living in|based in|of)\\s+${country}\\b`);
        if (regex.test(query)) {
            filters.country_id = countryNameToCode[country];
            matched = true;
            break;
        }
    }

    if (!matched) return null;

    return filters;
};

module.exports = { parseNaturalQuery };