# Vercel Deployment Guide

This guide outlines the steps to deploy the Beacon (BRD Agent) frontend to Vercel.

## 1. Prerequisites

- A [Vercel](https://vercel.com) account.
- The project pushed to a GitHub/GitLab/Bitbucket repository.
- Firebase project credentials (client and admin).

## 2. Environment Variables

In your Vercel project settings, add the following environment variables. You can copy most of these from your `.env.local`.

### Client-Side Variables (Public)
> [!IMPORTANT]
> These must start with `NEXT_PUBLIC_` to be accessible in the browser.

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Client API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | e.g. `your-project.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |

### Server-Side Variables (Secret)
> [!CAUTION]
> Never expose these on the client side.

| Variable | Description |
| :--- | :--- |
| `FIREBASE_PROJECT_ID` | Same as project ID above |
| `FIREBASE_CLIENT_EMAIL` | From your Service Account JSON |
| `FIREBASE_PRIVATE_KEY` | From your Service Account JSON |

> [!TIP]
> **Private Key Formatting**: When pasting the `FIREBASE_PRIVATE_KEY` into Vercel, ensure it includes the full string starting with `-----BEGIN PRIVATE KEY-----` and ending with `-----END PRIVATE KEY-----\n`. If you encounter errors, try wrapping the value in quotes or replacing literal `\n` characters with actual newlines if using the Vercel CLI.

## 3. Firebase Admin SDK Setup

The application uses the Firebase Admin SDK for session verification. Ensure your `src/lib/firebaseAdmin.ts` is configured to read from these environment variables:

```typescript
// Example snippet
const adminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Handle escaped newlines in the private key
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};
```

## 4. Deployment Steps

1. **Connect Repository**: Import your repository into Vercel.
2. **Configure Framework**: Vercel should automatically detect **Next.js**.
3. **Build Command**: Ensure it is set to `npm run build`.
4. **Output Directory**: Ensure it is set to `.next`.
5. **Add Env Vars**: Add all variables listed in section 2.
6. **Deploy**: Click "Deploy".

## 5. Post-Deployment

- **Authentication Redirects**: In the Firebase Console, go to **Authentication > Settings > Authorized Domains** and add your production Vercel domain (e.g., `your-app.vercel.app`).
- **CORS (Backend)**: If your backend is hosted separately, ensure it allows requests from your Vercel production URL.
