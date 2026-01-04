# API Gateway Setup - Complete ✅

## What Was Created

✅ **HTTP API**: `aiworkoutnow-api`
- API ID: `vs86hpajvb`
- Endpoint: `https://vs86hpajvb.execute-api.us-east-1.amazonaws.com`
- Region: `us-east-1`

✅ **Routes Configured**:
- `POST /generate-workout` - Generate AI workout
- `POST /contact` - Submit contact form
- `GET /token-balance` - Check user token balance
- `POST /admin/login` - Admin authentication
- `GET /admin/stats` - Admin dashboard stats (requires JWT)
- `POST /admin/send-email` - Send email from admin (requires JWT)
- `OPTIONS /{proxy+}` - CORS preflight

✅ **Features**:
- CORS enabled for all origins
- Auto-deploy enabled
- Lambda integration configured
- All routes connected to `aiworkoutnow-api` Lambda

## API Endpoint

**Base URL**: `https://vs86hpajvb.execute-api.us-east-1.amazonaws.com`

## Testing the API

### Test Workout Generation
```bash
curl -X POST https://vs86hpajvb.execute-api.us-east-1.amazonaws.com/generate-workout \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device",
    "isFreeUser": true,
    "fitnessLevel": "beginner",
    "workoutType": "full-body",
    "duration": 30,
    "equipment": "minimal"
  }'
```

### Test Contact Form
```bash
curl -X POST https://vs86hpajvb.execute-api.us-east-1.amazonaws.com/contact \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "message": "Test message"
  }'
```

### Test Token Balance
```bash
curl "https://vs86hpajvb.execute-api.us-east-1.amazonaws.com/token-balance?deviceId=test-device"
```

### Test Admin Login
```bash
curl -X POST https://vs86hpajvb.execute-api.us-east-1.amazonaws.com/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "your-password"
  }'
```

## Frontend Configuration

The frontend `.env` file has been updated with:
```
VITE_API_URL=https://vs86hpajvb.execute-api.us-east-1.amazonaws.com
```

## Managing API Gateway

### View API Details
```bash
aws apigatewayv2 get-api --api-id vs86hpajvb --region us-east-1
```

### List All Routes
```bash
aws apigatewayv2 get-routes --api-id vs86hpajvb --region us-east-1
```

### Update CORS
```bash
aws apigatewayv2 update-api \
  --api-id vs86hpajvb \
  --cors-configuration AllowOrigins="https://yourdomain.com",AllowMethods="GET,POST",AllowHeaders="*" \
  --region us-east-1
```

### Delete API (if needed)
```bash
aws apigatewayv2 delete-api --api-id vs86hpajvb --region us-east-1
```

## Troubleshooting

**If API returns 502/503:**
- Check Lambda function is active: `aws lambda get-function --function-name aiworkoutnow-api`
- Check Lambda logs: `aws logs tail /aws/lambda/aiworkoutnow-api --follow`

**If CORS errors:**
- Verify CORS is enabled in API Gateway
- Check browser console for specific CORS error
- Ensure frontend URL matches allowed origins

**If 401 Unauthorized:**
- Check JWT secret is set in SSM
- Verify admin credentials in DynamoDB
- Check token format in Authorization header

## Next Steps

1. ✅ API Gateway is set up
2. ⏳ Update OpenAI API key in SSM
3. ⏳ Create admin user in DynamoDB
4. ⏳ Deploy frontend to Amplify
5. ⏳ Test end-to-end workflow

