# Intelligence Query Engine

A RESTful API built with Node.js and PostgreSQL that serves profile data with support for filtering, sorting, pagination, and natural language search queries.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Endpoints](#api-endpoints)
- [Query Parameters](#query-parameters)
- [Natural Language Search](#natural-language-search)
- [Error Responses](#error-responses)
- [Limitations](#limitations)

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (via `pg` pool)
- **Logging:** Winston
- **Status Codes:** http-status-codes

---

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/igbonekwu-joy/intelligence-query-engine.git
cd intelligence-query-engine

# 2. Install dependencies
npm install

# 3. Set up environment variables (see below)
cp .env.example .env

# 4. Seed the database
npm run seed

# 5. Start the server
# Development
npm run dev

#Production 
npm start
```

---

## Environment Variables

In your `.env` file:

```env
PORT=5000
POSTGRES_URI=--your postgres db url--
POSTGRES_TEST_URI=--your postgres test db url--
NODE_ENV=development
```

---

## Database Setup

```bash
# Seed the database with profile data
npm run seed
```

---

## API Endpoints

### `GET /api/profiles`
Returns a paginated list of profiles with optional filters.

**Example:**
```
GET /api/profiles?gender=male&country_id=NG&min_age=25&sort_by=age&order=desc&page=1&limit=10
```

**Response:**
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 30,
  "data": [
    {
      "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
      "name": "emmanuel",
      "gender": "male",
      "gender_probability": 0.99,
      "age": 34,
      "age_group": "adult",
      "country_id": "NG",
      "country_name": "Nigeria",
      "country_probability": 0.85,
      "created_at": "2026-04-01T12:00:00Z"
    }
  ]
}
```

---

### `GET /api/profiles/search`
Accepts a plain English query and converts it into database filters.

**Example:**
```
GET /api/profiles/search?q=young males from nigeria&page=1&limit=10
```

**Response:**
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 20,
  "data": [
    {
      "id": "019db23b-15f5-7b77-b909-1751128944fb",
      "name": "Chidi Igwe",
      "gender": "male",
      "gender_probability": 0.86,
      "age": 19,
      "age_group": "teenager",
      "country_id": "NG",
      "country_name": "Nigeria",
      "country_probability": 0.95,
      "created_at": "2026-04-21T23:48:29.941Z"
    },
    {
      "id": "019db23b-157b-7fa9-a4db-dd16fd2f3990",
      "name": "Tunde Sawadogo",
      "gender": "male",
      "gender_probability": 0.95,
      "age": 16,
      "age_group": "teenager",
      "country_id": "NG",
      "country_name": "Nigeria",
      "country_probability": 0.37,
      "created_at": "2026-04-21T23:48:29.819Z"
    }
  ]
}
```

---

## Query Parameters

### `GET /api/profiles` — Supported Filters

| Parameter | Type | Description |
|---|---|---|
| `gender` | string | `male` or `female` |
| `age_group` | string | `child`, `teenager`, `adult`, `senior` |
| `country_id` | string | ISO 3166-1 alpha-2 country code e.g. `NG`, `GH` |
| `min_age` | number | Minimum age |
| `max_age` | number | Maximum age |
| `min_gender_probability` | number | Minimum gender probability e.g. `0.9` |
| `min_country_probability` | number | Minimum country probability e.g. `0.8` |
| `sort_by` | string | `age`, `created_at`, or `gender_probability` (default: `created_at`) |
| `order` | string | `asc` or `desc` (default: `asc`) |
| `page` | number | Page number (default: `1`) |
| `limit` | number | Results per page (default: `10`, max: `50`) |

---

## Natural Language Search

### How it works

The `/api/profiles/search` endpoint accepts a `q` parameter containing a plain English query. The parser uses **rule-based regex matching**. It works by:

1. Converting the query to lowercase and removing whitespace
2. Running a series of regex patterns against the text in a fixed order
3. Extracting filters for gender, age group, age range, and country
4. Building a parameterized PostgreSQL query from those filters

---

### Supported Keywords & Mappings

#### Gender

| Query contains | Maps to |
|---|---|
| `male` / `males` | `gender = male` |
| `female` / `females` | `gender = female` |
| `male and female` / `people` / `everyone` / `persons` | no gender filter |

#### Age Group

| Query contains | Maps to |
|---|---|
| `teenager` / `teenagers` / `teen` / `teens` | `age_group = teenager` |
| `adult` / `adults` | `age_group = adult` |
| `senior` / `seniors` / `elderly` | `age_group = senior` |
| `child` / `children` / `kids` / `boys` / `girls` | `age_group = child` |

#### Age Range Keywords

| Query pattern | Maps to |
|---|---|
| `young` / `youthful` | `min_age = 16, max_age = 24` |
| `middle aged` | `min_age = 40, max_age = 60` |
| `above X` / `older than X` / `over X` / `greater than X` | `min_age = X` |
| `below X` / `younger than X` / `under X` / `less than X` | `max_age = X` |
| `between X and Y` | `min_age = X, max_age = Y` |
| `aged X` / `age X` | `min_age = X, max_age = X` |
| `in their Xs` (e.g. `in their 30s`) | `min_age = X, max_age = X+9` |

#### Country

Detected through phrases like `from <country>`, `in <country>`, `living in <country>`, `based in <country>`, `of <country>`.

Supported countries include most of Africa, Europe, the Americas, Asia, and Oceania. Examples:

| Query | Maps to |
|---|---|
| `from nigeria` | `country_id = NG` |
| `in kenya` | `country_id = KE` |
| `living in south africa` | `country_id = ZA` |
| `based in the united states` | `country_id = US` |
| `from ghana` | `country_id = GH` |

---

### Example Query Mappings

| Natural Language Query | Interpreted As |
|---|---|
| `young males` | `gender=male, min_age=16, max_age=24` |
| `females above 30` | `gender=female, min_age=30` |
| `people from angola` | `country_id=AO` |
| `adult males from kenya` | `gender=male, age_group=adult, country_id=KE` |
| `male and female teenagers above 17` | `age_group=teenager, min_age=17` |
| `elderly females in egypt` | `gender=female, age_group=senior, country_id=EG` |
| `adults from brazil above 25` | `age_group=adult, min_age=25, country_id=BR` |
| `people between 20 and 35` | `min_age=20, max_age=35` |
| `males living in south africa` | `gender=male, country_id=ZA` |
| `young females based in ghana` | `gender=female, min_age=16, max_age=24, country_id=GH` |
| `seniors in their 60s` | `age_group=senior, min_age=60, max_age=69` |
| `middle aged women from france` | `gender=female, min_age=40, max_age=60, country_id=FR` |
| `teenage boys under 18` | `age_group=teenager, max_age=18` |
| `men older than 40 from india` | `gender=male, min_age=40, country_id=IN` |

---

## Error Responses

All errors follow this structure:

```json
{
  "status": "error",
  "message": "<error message>"
}
```

| Status Code | Meaning | Example trigger |
|---|---|---|
| `400 Bad Request` | Missing or empty `q` parameter | `?q=` or no `q` provided |
| `400 Bad Request` | Invalid query parameters passed | `?q=...&unknown_param=x` |
| `422 Unprocessable Entity` | Query could not be interpreted | `?q=xyzabc123` |
| `422 Unprocessable Entity` | `page` or `limit` is not a number | `?page=abc` |
| `404 Not Found` | No profiles matched the query | Valid query but zero results |
| `500 Internal Server Error` | Unexpected server failure | Database down etc. |

---

## Limitations

### Parser Limitations

- **No typo tolerance** — `"nigria"` will not match `"nigeria"`. Queries must be spelled correctly.
- **No negation support** — Queries like `"not from nigeria"` or `"excluding males"` are not handled.
- **No OR logic** — `"from nigeria or ghana"` will not work. Only one country can be matched per query.
- **No pronoun support** — Words like `"he"`, `"she"`, `"they"` are not recognised as gender indicators.
- **Conflicting age ranges** — A query like `"young adults above 50"` produces conflicting filters (`min_age=16, max_age=24` from "young" and `min_age=50` from "above 50"). The last matched pattern wins, which might produce unexpected results.
- **Limited country dictionary** — Only countries explicitly listed in the parser are supported. Territories, dependencies, and uncommon country names are not covered.
- **Ambiguous country names** — Names like `"guinea"` may not match the intended country (guinea matches Guinea and equatorial guinea matches Equatorial Guinea).
- **No abbreviation support for age groups** — Term like `"snr"` (senior) is not recognised.
- **No probability filters in natural language** — Queries like `"highly probable males"` do not map to `min_gender_probability`.
- **No sorting in natural language** — You cannot say `"youngest males from nigeria"` and expect results sorted by age. Use the `sort_by` and `order` query parameters on `/api/profiles` instead.
- **Single language only** — Only English queries are supported. Queries in French, Igbo, or any other language will not be interpreted.
- **No relative time expressions** — Phrases like `"profiles added last week"` or `"recently added"` are not supported.

### General Limitations

- Maximum of 50 results per page — large data exports are not supported through this API.
- Country matching relies on the phrase being prefixed with `from`, `in`, `living in`, `based in`, or `of`. A bare country name like `"nigeria males"` (without a preposition) will not extract the country.