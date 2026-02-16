# Traffic filter & TTL

## Bot/proxy filtering

- **TrafficClassifier** classifies each request as HUMAN, BOT, or UNKNOWN using User-Agent and IP (X-Forwarded-For / request context).
- **Middleware** runs early and sets `HttpContext.Items["TrafficType"]`. Webhook paths (e.g. `stripe-webhook`) are forced to HUMAN so payment writes are never skipped.
- **DynamoDBService** skips all user/session/usage writes when `TrafficType` is BOT or UNKNOWN (or when rate limit is exceeded). Response is still success; no UX change.
- **WriteRateLimiter** (optional): in-memory per-container limit (e.g. 60 write attempts per minute per IP+UA). When exceeded, writes are skipped.

## TTL auto-expiration

- For records you want to expire (e.g. BOT/UNKNOWN data tagged in a one-time cleanup), set an **expiresAt** attribute (Unix timestamp in seconds).
- Enable TTL on each table in AWS Console (or CLI): DynamoDB → Table → Additional settings → Time to Live (TTL) → Enable for attribute **expiresAt**.

### One-time cleanup (admin)

- **POST /admin/maintenance/set-ttl-for-devices** (admin JWT required)  
  Body: `{ "deviceIds": ["id1", "id2"], "expireDays": 7 }`  
  Sets `expiresAt = now + expireDays` on UserTokens, AnonymousUsage, and CustomerActivities for those device IDs. Use safe pagination (Scan + UpdateItem). Never modifies logic for HUMAN records.

## Tests

- **TrafficClassifierTests**: Googlebot UA ⇒ BOT, 66.249.* ⇒ BOT, normal Chrome + non-cloud IP ⇒ HUMAN.
- **TrafficFilterZeroWriteTests**: When `TrafficType` is BOT, `SaveWorkoutAsync` and `SaveCustomerActivityAsync` do not call DynamoDB (zero writes).
