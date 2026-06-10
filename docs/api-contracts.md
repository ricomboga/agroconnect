# AgroConnect — API Contracts

Reference: `@docs/api-contracts.md`

All endpoints are prefixed `/api/v1/`. JWT means a valid Bearer token in the Authorization header.

## Auth API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /auth/register | None | Register new user |
| POST | /auth/login | None | Login; returns access + refresh tokens |
| POST | /auth/refresh | Refresh token | Exchange refresh for new access token |
| POST | /auth/logout | JWT | Invalidate session |
| POST | /auth/otp/send | None | Send OTP to phone |
| POST | /auth/otp/verify | None | Verify OTP |
| PATCH | /auth/password | JWT | Change password |
| GET | /auth/me | JWT | Get current user |
| PATCH | /auth/me | JWT | Update profile |

### POST /auth/register — request body
```json
{
  "phone": "+254712345678",
  "password": "SecurePass123!",
  "full_name": "Jane Wanjiru",
  "role": "farmer",
  "county": "Nakuru",
  "language": "sw"
}
```

### POST /auth/login — response body
```json
{
  "access_token": "eyJ...",
  "refresh_token": "rt_...",
  "expires_in": 900,
  "token_type": "Bearer",
  "user": { "id": "uuid", "phone": "+254...", "full_name": "...", "role": "farmer" }
}
```

---

## Farm API

All endpoints require JWT. Farmers access their own farms only; admin can access all.

| Method | Endpoint | Description |
|---|---|---|
| POST | /farms | Create farm |
| GET | /farms | List authenticated farmer's farms |
| GET | /farms/:farmId | Get farm detail |
| PATCH | /farms/:farmId | Update farm |
| DELETE | /farms/:farmId | Soft-delete farm |
| GET | /farms/:farmId/plots | List plots |
| POST | /farms/:farmId/plots | Add plot |
| GET | /farms/:farmId/activities | List activities (filter: from_date, to_date, status) |
| POST | /farms/:farmId/activities | Schedule activity |
| PATCH | /farms/:farmId/activities/:activityId | Update/complete activity |
| GET | /farms/:farmId/inputs | List inputs (filter: season, type) |
| POST | /farms/:farmId/inputs | Record input use |
| GET | /farms/:farmId/harvests | List harvests |
| POST | /farms/:farmId/harvests | Record harvest |
| GET | /farms/:farmId/report | Generate PDF farm report (triggers media-service) |
| GET | /farms/:farmId/summary | Season summary: yield, costs, profit estimate |

---

## Diagnosis API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /diagnose | JWT (farmer) | Submit images for AI diagnosis. multipart/form-data |
| GET | /diagnose/:diagnosisId | JWT (owner) | Get completed diagnosis result |
| GET | /diagnose/farm/:farmId | JWT (owner) | All diagnoses for a farm |
| POST | /diagnose/:diagnosisId/feedback | JWT (owner) | Submit treatment outcome |
| GET | /diagnose/diseases | JWT | Browse disease library |
| GET | /diagnose/diseases/:diseaseCode | JWT | Full disease detail |

### POST /diagnose — multipart fields
| Field | Type | Required | Notes |
|---|---|---|---|
| images | File[] | Yes | 1–5 files, max 5MB each, JPEG or PNG |
| farm_id | String | Yes | UUID |
| subject_type | String | Yes | 'plant' or 'animal' |
| subject_name | String | Yes | e.g. 'maize' or 'dairy cow' |
| symptoms | String | No | Farmer's description |
| duration_days | Integer | No | Days symptoms visible |

### GET /diagnose/:id — response
```json
{
  "id": "diag_abc123",
  "status": "completed",
  "subject": { "type": "plant", "name": "maize" },
  "diagnosis": {
    "disease_name": "Grey Leaf Spot",
    "disease_code": "MAI-GLS-001",
    "confidence": 0.94,
    "severity": "moderate",
    "description": "..."
  },
  "prescriptions": [
    { "step": 1, "action": "Remove infected leaves", "product_name": null },
    { "step": 2, "action": "Apply Mancozeb 80WP", "dosage": "2.5g per litre", "frequency": "Every 7 days" }
  ],
  "processing_time_ms": 1847
}
```

---

## Finance API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /finance/credit-score | JWT (farmer) | Get current credit score |
| POST | /finance/credit-score/compute | JWT (farmer) | Recompute score from latest farm data |
| GET | /finance/partners | JWT | List lending partners |
| POST | /finance/loans | JWT (farmer) | Submit loan application |
| GET | /finance/loans | JWT (farmer) | List applications |
| GET | /finance/loans/:loanId | JWT (farmer) | Application detail |
| POST | /finance/loans/:loanId/cancel | JWT (farmer) | Cancel draft/submitted application |
| GET | /finance/loans/:loanId/repayments | JWT (farmer) | Repayment schedule |
| POST | /finance/mpesa/callback | None (IP whitelist) | M-Pesa STK push result |
| GET | /finance/products | JWT | All loan products from all partners |

---

## Market API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /market/listings | Public | Browse produce listings (crop, county, date, grade) |
| POST | /market/listings | JWT (farmer) | Create listing |
| GET | /market/listings/:id | Public | Listing detail |
| PATCH | /market/listings/:id | JWT (owner) | Update listing |
| DELETE | /market/listings/:id | JWT (owner) | Withdraw listing |
| POST | /market/listings/:id/inquire | JWT (buyer) | Send inquiry to farmer |
| GET | /market/products | Public | Browse supplier products |
| POST | /market/products | JWT (supplier) | Create product listing |
| PATCH | /market/products/:id | JWT (supplier) | Update product |
| POST | /market/orders | JWT (buyer) | Place order |
| GET | /market/orders | JWT | List orders (buyer or supplier) |
| PATCH | /market/orders/:id/status | JWT (supplier) | Update order status |
| GET | /market/prices | Public | Real-time + historical commodity prices |
| GET | /market/prices/alerts | JWT (farmer) | Price alert preferences |

---

## Community API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /community/threads | Public | Browse threads (category, crop, region, sort) |
| POST | /community/threads | JWT | Create thread |
| GET | /community/threads/:id | Public | Thread with replies (paginated) |
| POST | /community/threads/:id/replies | JWT | Post reply |
| POST | /community/threads/:id/upvote | JWT | Upvote thread |
| DELETE | /community/threads/:id | JWT (author\|admin) | Delete thread |
| POST | /community/replies/:id/upvote | JWT | Upvote reply |
| POST | /community/replies/:id/verify | JWT (expert\|admin) | Mark expert-verified |
| POST | /community/replies/:id/report | JWT | Report for moderation |
| GET | /community/experts | Public | List verified agronomists and vets |
| GET | /community/articles | Public | Knowledge base articles |
| GET | /community/articles/:slug | Public | Read article |

---

## Government Portal API

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /govt/registrations | JWT (farmer) | Submit farm registration |
| GET | /govt/registrations | JWT (farmer) | List registrations |
| GET | /govt/registrations/:id | JWT | Registration detail |
| PATCH | /govt/registrations/:id/status | JWT (govt_officer) | Update status |
| GET | /govt/subsidies | Public | Available subsidy programs |
| POST | /govt/subsidies/:programId/apply | JWT (farmer) | Apply for subsidy |
| GET | /govt/subsidies/applications | JWT (farmer) | Track applications |
| POST | /govt/licenses | JWT (farmer) | Apply for license |
| GET | /govt/licenses | JWT (farmer) | List licenses |
| POST | /govt/documents | JWT (farmer) | Upload document (ID, title deed) |

---

## Weather and Prediction APIs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /weather/forecast | JWT | 7-day forecast. Query: lat, lng |
| GET | /weather/seasonal | JWT | 3-month climate outlook |
| GET | /weather/alerts | JWT | Active alerts for farmer's location |
| GET | /weather/history | JWT | 30/90-day weather history |
| GET | /predict/prices | JWT | Price forecast. Query: crop, days_ahead (30\|60\|90) |
| GET | /predict/yield | JWT (farmer) | Yield estimate for current season |
| GET | /predict/harvest-timing | JWT (farmer) | Optimal harvest window |
| GET | /predict/market-signals | JWT | Supply/demand signals for top 10 crops |

---

## Standard error response

All services return errors in this format:
```json
{
  "error": {
    "code": "FARM_NOT_FOUND",
    "message": "Farm not found",
    "details": null,
    "request_id": "req_abc123",
    "timestamp": "2025-06-01T10:30:00Z"
  }
}
```

## HTTP status codes
- 200 — GET / PATCH success
- 201 — POST create success
- 204 — DELETE success (no body)
- 400 — Validation error (Zod schema failed)
- 401 — Missing or invalid JWT
- 403 — Valid JWT but insufficient role/ownership
- 404 — Resource not found
- 409 — Conflict (duplicate)
- 422 — Business logic error (e.g. loan amount exceeds credit limit)
- 429 — Rate limited
- 500 — Internal server error
