# AgroConnect — Third-Party Integrations

Reference: `@docs/integrations.md`

## M-Pesa (Safaricom Daraja API 2.0)

Used for: loan disbursements (B2C), marketplace purchases (C2B STK Push), supplier payouts (B2C).
Phase 1 uses sandbox. Production requires Safaricom go-live approval.

### API types used

| Type | Daraja endpoint | Use case | Direction |
|---|---|---|---|
| STK Push | stkpush/v1/processrequest | Farmer pays for marketplace products | C2B (customer prompted) |
| B2C Payment | b2c/v1/paymentrequest | Loan disbursement to farmer wallet | B2C (platform initiated) |
| Account Balance | accountbalance/v1/query | Check AgroConnect business balance | Internal |
| Transaction Status | transactionstatus/v1/query | Confirm payment for reconciliation | Internal |
| C2B Register URL | c2b/v1/registerurl | Register callback URL | One-time setup |
| Reverse Transaction | reversal/v1/request | Reverse failed/duplicate payment | Error recovery |

### STK Push flow (8 steps)
1. Farmer confirms payment in mobile app
2. finance-service initiates STK Push to Daraja with amount, phone, order reference
3. Safaricom pushes payment prompt to farmer's phone
4. Farmer enters M-Pesa PIN
5. Safaricom sends confirmation to `POST /api/v1/finance/mpesa/callback`
6. finance-service validates callback HMAC + IP whitelist
7. Success → publish `finance.payment.confirmed` Kafka event → order updated
8. Failure → publish `finance.payment.failed` → order cancelled, farmer notified

### Env vars required
```
MPESA_CONSUMER_KEY
MPESA_CONSUMER_SECRET
MPESA_SHORTCODE
MPESA_PASSKEY
MPESA_CALLBACK_URL   # must be HTTPS, publicly reachable
MPESA_ENV            # sandbox | production
```

---

## Africa's Talking

### APIs used

| API | Use case | Implementation |
|---|---|---|
| USSD API | Feature phone menu interface | Webhook at /ussd; session state in Redis (TTL 5min); 182 char limit |
| SMS API | OTP delivery, loan alerts, weather alerts | Via notification-service Kafka consumer |

### USSD menu tree
```
*384*123#  → Main Menu
  1. Farm Records  → 1. Log Activity  2. Log Harvest  3. View Summary  0. Back
  2. Diagnose      → Text description → forwarded to expert queue
  3. Market Prices → 1. Maize  2. Beans  3. Tomatoes  4. Potatoes  5. More  0. Back
  4. Loans         → 1. Check Credit Score  2. Apply  3. Status  0. Back
  5. Weather       → 3-line today summary for farmer's county
```

IMPORTANT: Every USSD response must be ≤ 182 characters. Always count before deploying.

### Env vars required
```
AT_API_KEY
AT_USERNAME
```

---

## Weather data sources (weather-service)

| Source | API | Weight | Data provided |
|---|---|---|---|
| OpenWeatherMap One Call 3.0 | REST | 40% | 7-day hourly + daily forecast |
| NASA POWER API | REST | 35% | Solar radiation, humidity, wind (rural accuracy) |
| Kenya Meteorological Department | REST bulletin | 25% | Official seasonal forecasts |

Forecasts cached in Redis: key `weather:{lat_rounded}:{lng_rounded}`, TTL 3 hours, 5km radius clustering.

---

## Government APIs

| System | Integration | Data | Phase |
|---|---|---|---|
| eCitizen Kenya | REST (OAuth 2.0) | Farm registration, national ID verification | Phase 2 |
| MOALF FAMS | REST | Registration submission and status polling | Phase 2 |
| Kenya Revenue Authority | REST (PIN validation) | PIN verification for commercial farmers | Phase 3 |
| NDMA Drought Monitor | REST (data pull) | County drought risk indicators | Phase 2 |
| Kenya Meteorological Dept. | REST bulletin API | Official seasonal forecasts | Phase 1 |
| KARLO Research Portal | Data partnership | Disease advisories, publications | Phase 2 |

---

## AWS S3 (via media-service only)

All image and document storage goes through media-service. No other service has S3 credentials.

Operations:
- Upload: POST /media/upload → returns CDN URL
- Delete: DELETE /media/:key (admin only)
- Signed URL: GET /media/sign/:key (for private documents, 1-hour expiry)

Bucket structure:
```
agroconnect-media-{env}/
  farm-photos/{farmId}/{uuid}.jpg
  diagnosis-images/{diagnosisId}/{uuid}.jpg
  govt-documents/{userId}/{uuid}.pdf
  product-photos/{productId}/{uuid}.jpg
  profile-photos/{userId}/{uuid}.jpg
```

---

## Firebase Cloud Messaging (FCM)

Used by notification-service for push notifications to mobile app.
Triggered by Kafka `notification.send` topic consumer.

Notification types:
- `activity_reminder` — 24h before scheduled farm activity
- `diagnosis_complete` — AI diagnosis result ready
- `loan_status_change` — loan approved / rejected / disbursed
- `price_alert` — target market price reached
- `weather_alert` — severe weather warning for farm location
- `order_update` — marketplace order status changed
- `community_reply` — reply on your thread
