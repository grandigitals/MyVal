# My Val Backend API

Node.js Express backend for My Val Valentine matchmaking platform.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Add Firebase Service Account:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project > Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Save the file as `serviceAccountKey.json` in this folder

3. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Update values as needed

4. **Start the server:**
   ```bash
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

## API Endpoints

### POST /pay/initiate
Initialize a Paystack payment.

**Request Body:**
```json
{
  "email": "user@example.com",
  "userId": "firebase-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "authorization_url": "https://checkout.paystack.com/...",
  "reference": "MYVAL_123456_abc123"
}
```

### GET /pay/verify
Verify a payment after completion.

**Query Parameters:**
- `reference` - Paystack payment reference
- `userId` - Firebase user ID (optional if in metadata)

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "reference": "MYVAL_123456_abc123",
    "userId": "firebase-user-id",
    "matchFound": true
  }
}
```

### POST /pay/webhook
Webhook endpoint for Paystack payment events.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3001) |
| `PAYSTACK_SECRET_KEY` | Paystack secret key |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase service account JSON |
| `FRONTEND_URL` | Frontend URL for CORS |
| `PAYMENT_AMOUNT` | Payment amount in kobo (200000 = ₦2,000) |
