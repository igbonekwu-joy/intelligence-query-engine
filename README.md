# Profile Intelligence Service

A REST API that predicts demographic information (gender, age, and nationality) from a given name, using the Genderize.io, Agify.io, and Nationalize.io APIs. Results are stored in a MongoDB database and can be queried with filters.

---

## Features

- Predict gender, age, and nationality from a name
- Input validation with descriptive error messages
- Centralized error handling and logging (console + file)
- Rate limiting to prevent abuse
- CORS support
- Response time monitoring
- Handling of uncaught exceptions and unhandled promise rejections

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Logging:** Winston
- **Validation:** Joi
- **HTTP Client:** Axios
- **Rate Limiting:** express-rate-limit
- **Status Codes:** http-status-codes
- **Database:** MongoDB + Mongoose
- **External APIs:** Genderize.io, Agify.io, Nationalize.io

---

## Getting Started

### Prerequisites

- Node.js v16+
- npm
- MongoDB instance (local or cloud)

### Installation

```bash
git clone https://github.com/igbonekwu-joy/profile-intelligence-service.git
cd profile-intelligence-service
npm install
```

### Environment Variables

Create a `.env` file or rename .env.example in the root directory:

```env
PORT=5000
GENDERIZE_API_URL=https://api.genderize.io
AGIFY_API_URL=https://api.agify.io
NATIONALIZE_API_URL=https://api.nationalize.io
DB_TEST_URI=---your test db uri---
DB_URI=---your db uri---
NODE_ENV=development
```

### Running the App

```bash
# Development
npm run dev

# Production
npm start
```

The server will start on `http://localhost:5000`.

---

## API Reference

### Store a Profile

Accepts a name, calls the Genderize, Agify, and Nationalize APIs, and stores the predicted profile.

```
POST /api/profiles
```

**Request Body:**

```json
{
  "name": "John"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "019d8e1d-21b3-7fcd-b6d9-b6b1640fdf0f",
    "name": "John",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 1234, 
    "age": 46,
    "age_group": "adult",
    "country_id": "DRC",
    "country_probability": 0.85,
    "created_at": "2026-04-01T12:00:00Z"
  }
}
```

---

### Get All Profiles

Returns all stored profiles. Supports optional filtering by `gender`, `country_id`, and `age_group`.

```
GET /api/profiles
```

**Query Parameters:**

| Parameter    | Type   | Description                          |
|--------------|--------|--------------------------------------|
| `gender`     | string | Filter by gender (e.g. `male`, `female`) |
| `country_id` | string | Filter by country code (e.g. `NG`, `US`) |
| `age_group`  | string | Filter by age group (e.g. `adult`, `senior`) |


**Example Request:**

```
GET /api/profiles?gender=male&country_id=NG
```

**Response:**

```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "019d8e1d-21b3-7fcd-b6d9-b6b1640fdf0f",
      "name": "John",
      "gender": "male",
      "age": 35,
      "age_group": "adult",
      "country_id": "NG"
    },
    {
      "id": "019d9319-3404-7be6-9da3-a30364ba544f",
      "name": "James",
      "gender": "male",
      "age": 28,
      "age_group": "adult",
      "country_id": "NG"
    }
  ]
}
```

---

### Get a Single Profile

```
GET /api/profiles/:id
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "019d8e1d-21b3-7fcd-b6d9-b6b1640fdf0f",
    "name": "John",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 1234,
    "age": 35,
    "age_group": "adult",
    "country_id": "NG",
    "country_probability": 0.124,
    "created_at": "2024-04-15T13:45:30.000Z"
  }
}
```

---

### Delete a Profile

```
DELETE /api/profiles/:id
```

---

## External APIs Used

| API | Purpose | Docs |
|-----|---------|------|
| [Genderize.io](https://genderize.io) | Predicts gender from a name | [docs](https://genderize.io/#documentation) |
| [Agify.io](https://agify.io) | Predicts age from a name | [docs](https://agify.io/#documentation) |
| [Nationalize.io](https://nationalize.io) | Predicts nationality from a name | [docs](https://nationalize.io/#documentation) |

---