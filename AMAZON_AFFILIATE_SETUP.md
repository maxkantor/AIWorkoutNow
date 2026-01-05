# Amazon Affiliate Integration Setup Guide

This guide explains how to set up and configure the Amazon Affiliate integration for AIWorkoutNow.

## Features Implemented

✅ **1. Affiliate Links in Equipment Recommendations**
- Automatically generates Amazon affiliate links for recommended products
- Links are properly formatted with your Associate ID

✅ **2. Product Suggestions in Workout Plans**
- Displays relevant product recommendations based on:
  - Workout type (Upper Body, Lower Body, Full Body, Yoga, etc.)
  - Available equipment
  - Exercises in the workout

✅ **3. Click Tracking & Conversion Analytics**
- Tracks all affiliate link clicks in DynamoDB
- Records: Device ID, ASIN, Workout ID, Timestamp, Link Text
- Enables conversion tracking and analytics

## Setup Steps

### Step 1: Get Your Amazon Associate ID

1. Sign up for [Amazon Associates](https://affiliate-program.amazon.com/)
2. Complete the application process
3. Once approved, you'll receive your Associate ID (also called "Tracking ID")
   - Format: `your-associate-id-20` (usually ends with `-20`)

### Step 2: Store Associate ID in AWS SSM Parameter Store

```bash
aws ssm put-parameter \
  --name /aiworkoutnow/amazon-associate-id \
  --value "your-associate-id-20" \
  --type SecureString \
  --region us-east-1 \
  --overwrite
```

Or set as environment variable (for local development):
```bash
export AMAZON_ASSOCIATE_ID="your-associate-id-20"
```

### Step 3: Create DynamoDB Table for Click Tracking

The table will be created automatically by CDK, but you can also create it manually:

```bash
aws dynamodb create-table \
  --table-name AIWorkoutNow-AffiliateClicks \
  --attribute-definitions \
    AttributeName=ClickId,AttributeType=S \
  --key-schema \
    AttributeName=ClickId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Step 4: Product Recommendations (Automatic)

✅ **No manual ASIN configuration needed!** 

The system now uses **dynamic product recommendations**:
- OpenAI AI suggests relevant products based on the workout
- Amazon search affiliate links are generated automatically using keywords
- No hardcoded ASINs required - fully dynamic and AI-powered

The AI will suggest products like:
- "adjustable dumbbells set" for strength training
- "resistance bands set" for resistance training  
- "yoga mat" for floor exercises
- And more based on workout type and exercises

All affiliate links are generated automatically using your Associate ID.

### Step 5: Add API Gateway Route

Add the tracking endpoint to your API Gateway:

```bash
aws apigatewayv2 create-route \
  --api-id YOUR_API_ID \
  --route-key "POST /track-affiliate-click" \
  --target "integrations/YOUR_INTEGRATION_ID" \
  --region us-east-1
```

Or update `setup-api-gateway.sh` to include this route.

### Step 6: Rebuild and Deploy

```bash
# Rebuild backend
cd backend
./build-lambda-package.sh

# Deploy
cd ..
./deploy-backend.sh
```

## How It Works

### Product Recommendations

1. When a workout is generated, the system analyzes:
   - Workout type (Upper Body, Lower Body, etc.)
   - Available equipment
   - Exercises in the workout

2. Based on this analysis, it recommends relevant products:
   - **Upper Body**: Dumbbells, Pull Up Bar, Resistance Bands
   - **Lower Body**: Dumbbells, Resistance Bands, Kettlebell
   - **Full Body**: Dumbbells, Resistance Bands, Yoga Mat
   - **Yoga/Pilates**: Yoga Mat, Resistance Bands

3. Products are displayed in the workout plan with:
   - Product image (if available)
   - Title and description
   - Reason for recommendation
   - Price (if available)
   - "View on Amazon" button with affiliate link

### Click Tracking

When a user clicks an affiliate link:

1. Frontend calls `/track-affiliate-click` endpoint
2. Backend records the click in DynamoDB with:
   - Click ID (unique)
   - Device ID
   - ASIN (product identifier)
   - Workout ID
   - Timestamp
   - Link text/category
   - Region

3. Link opens in new tab (doesn't block user experience)

### Analytics & Reporting

Query click data from DynamoDB:

```bash
# Get all clicks for a specific workout
aws dynamodb scan \
  --table-name AIWorkoutNow-AffiliateClicks \
  --filter-expression "WorkoutId = :wid" \
  --expression-attribute-values '{":wid":{"S":"workout-id-here"}}' \
  --region us-east-1

# Get clicks by device
aws dynamodb scan \
  --table-name AIWorkoutNow-AffiliateClicks \
  --filter-expression "DeviceId = :did" \
  --expression-attribute-values '{":did":{"S":"device-id-here"}}' \
  --region us-east-1
```

## Customization

### Add More Products

Edit `GetProductMap()` in `AmazonAffiliateService.cs` to add more product categories and ASINs.

### Change Recommendation Logic

Modify `GetRecommendedCategories()` to customize which products are recommended based on workout characteristics.

### Styling

Product recommendations use `ProductRecommendations.css`. Customize colors, layout, and styling as needed.

## Compliance

⚠️ **Important**: Ensure compliance with Amazon Associates Operating Agreement:

1. **Disclosure**: The UI includes "As an Amazon Associate, we earn from qualifying purchases" disclaimer
2. **No Link Manipulation**: Links are generated using standard Amazon Associates format
3. **Accurate Descriptions**: Product descriptions should be accurate
4. **Privacy**: User data is handled according to privacy policies

## Troubleshooting

### Products Not Showing

- Check that `ProductRecommendations` are being returned in the workout response
- Verify ASINs are valid Amazon product identifiers
- Check browser console for errors

### Clicks Not Tracking

- Verify DynamoDB table exists: `AIWorkoutNow-AffiliateClicks`
- Check Lambda logs for errors
- Ensure API Gateway route is configured

### Links Not Working

- Verify Associate ID is correct in SSM Parameter Store
- Check that ASINs are valid
- Test affiliate link format manually

## Next Steps

1. **Replace placeholder ASINs** with real product ASINs
2. **Add product images** by fetching from Amazon Product Advertising API (optional)
3. **Set up conversion tracking** in Amazon Associates dashboard
4. **Create analytics dashboard** to visualize click data
5. **A/B test** different product recommendations

## Support

For Amazon Associates questions, refer to:
- [Amazon Associates Central](https://affiliate-program.amazon.com/)
- [Associates Operating Agreement](https://affiliate-program.amazon.com/help/operating/agreement)
