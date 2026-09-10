# Kala — Cakes and Desserts: Deployment Guide

This guide details how to deploy the full-stack web application to **Vercel** via **GitHub**, with Google Cloud Firestore as the database and Google OAuth for customer authentication.

---

## Architecture on Vercel

```
                                    +-----------------------------------------+
                                    |              Vercel Edge                |
                                    +-----------------------------------------+
                                      /                                     \
                                     /                                       \
                         Static Files (/(.*))                        API Requests (/api/(.*))
                                   /                                           \
               +----------------------------------+             +-------------------------------+
               |           client/dist/           |             |         api/index.js          |
               | (Vite React Single-Page App CDN) |             |  (Express Serverless Handler) |
               +----------------------------------+             +-------------------------------+
                                                                                |
                                                                                v
                                                                +-------------------------------+
                                                                |     Google Cloud Firestore    |
                                                                |        (firebase-admin)       |
                                                                +-------------------------------+
```

- **Frontend**: Vite + React SPA served from Vercel's global CDN (`client/dist`).
- **Backend API**: Express serverless function (`api/index.js` importing `server/index.js`).
- **Database**: Cloud Firestore via `firebase-admin` initialized server-side.
- **Single Domain**: Frontend and Backend share the same origin on Vercel (e.g., `https://your-project.vercel.app`), eliminating CORS configuration headaches.

---

## Step 1: Push Code to GitHub

### 1.1 Check git status
The project repository is already initialized and configured with `.gitignore` to prevent any secrets or `node_modules` from being pushed.

Run:
```bash
git add .
git commit -m "feat: Kala Cakes and Desserts production release ready for Vercel"
```

### 1.2 Create a New Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Enter repository name (e.g., `kala-cakes-and-desserts`).
3. Choose **Private** or **Public**.
4. **Do NOT** check "Add a README file" or "Add .gitignore" (we already have them).
5. Click **Create repository**.

### 1.3 Link and Push
```bash
git remote add origin https://github.com/YOUR_USERNAME/kala-cakes-and-desserts.git
git push -u origin main
```

---

## Step 2: Deploy to Vercel

### 2.1 Import the Repository
1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Select your GitHub account and click **Import** on `kala-cakes-and-desserts`.

### 2.2 Project Configuration
Vercel will automatically read `vercel.json` and `package.json`:
- **Framework Preset**: Leave as **Other** (or auto-detected).
- **Root Directory**: `./` (leave default).
- **Build Command**: `npm --prefix client install && npm --prefix client run build` (handled automatically by `vercel.json`).
- **Output Directory**: `client/dist` (handled automatically by `vercel.json`).

### 2.3 Add Environment Variables
In the **Environment Variables** section on Vercel, add the following variables from your local `.env`:

| Key | Example / Description |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | A secure 32+ character random string |
| `GOOGLE_CLIENT_ID` | Your Google OAuth 2.0 Web Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth 2.0 Web Client Secret |
| `FIREBASE_PROJECT_ID` | Your Google Cloud project ID (e.g. `kala-bakery-website`) |
| `FIREBASE_CLIENT_EMAIL` | Service account email (`firebase-adminsdk-xxx@...`) |
| `FIREBASE_PRIVATE_KEY` | Entire private key starting with `-----BEGIN PRIVATE KEY-----` |
| `INITIAL_OWNER_USERNAME` | `owner` (for initial store owner credentials) |
| `INITIAL_OWNER_PASSWORD` | Strong password (min 12 characters) |
| `ENABLE_DEV_MOCK_GOOGLE`| `false` |

> [!TIP]
> **Pasting `FIREBASE_PRIVATE_KEY` into Vercel**:
> You can paste the entire multiline string including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. Our `firebase.js` automatically handles both escaped `\n` and real newlines.

### 2.4 Click Deploy
Click **Deploy**. Vercel will build the frontend bundle, package the Express serverless function, and give you a live production URL (e.g. `https://kala-cakes-and-desserts.vercel.app`).

---

## Step 3: Update Google Cloud OAuth Credentials

To allow customers to sign in with Google on your live Vercel domain:

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services** $\rightarrow$ **Credentials**.
3. Click on your Web OAuth 2.0 Client ID.
4. Under **Authorized JavaScript origins**, click **+ ADD URI** and add:
   - `https://your-project.vercel.app` (your Vercel domain)
   - `https://yourcustomdomain.com` (if you connect a custom domain)
5. Click **Save**.

---

## Verifying the Deployment

Once deployed, visit your Vercel URL:
1. **Health Check**: Visit `https://your-project.vercel.app/api/health` — it should return:
   ```json
   {
     "status": "OK",
     "database": "connected",
     "engine": "Google Cloud Firestore",
     "brand": "Kala",
     "timestamp": "..."
   }
   ```
2. **Homepage**: Visit `https://your-project.vercel.app/` — verify that the homepage renders cleanly.
3. **Customer Login**: Click **Log In** and test Google Sign-In.
4. **Owner Portal**: Visit `https://your-project.vercel.app/` $\rightarrow$ Open mobile menu or profile $\rightarrow$ **Owner Portal** and log in with your configured owner credentials.
