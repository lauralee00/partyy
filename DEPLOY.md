# Deploying Partyy to Fly.io (Free Tier)

## Prerequisites
- [Fly.io account](https://fly.io) (free, just needs a credit card for verification)
- [MongoDB Atlas account](https://www.mongodb.com/atlas) (free tier: 512MB)

## Step 1: Set up MongoDB Atlas (Free)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster (M0 Sandbox - FREE)
3. Create a database user (Database Access → Add New User)
4. Allow network access from anywhere (Network Access → Add IP → 0.0.0.0/0)
5. Get your connection string (Connect → Drivers → Copy connection string)
   - Replace `<password>` with your database user password

## Step 2: Set up Spotify API

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Copy Client ID and Client Secret
4. Add redirect URI: `https://partyy-game.fly.dev/api/addCategory` (update after you know your app name)

## Step 3: Set up Google OAuth (Optional - for Google login)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized origins: `https://partyy-game.fly.dev`

## Step 4: Install Fly CLI

```bash
# macOS
brew install flyctl

# or curl
curl -L https://fly.io/install.sh | sh
```

## Step 5: Deploy

```bash
# Login to Fly
fly auth login

# Launch app (first time only)
fly launch --no-deploy

# Set secrets (environment variables)
fly secrets set ATLAS_SRV="mongodb+srv://user:pass@cluster.mongodb.net/"
fly secrets set DATABASE_NAME="partyy"
fly secrets set SPOTIFY_ID="your_spotify_client_id"
fly secrets set SPOTIFY_SECRET="your_spotify_client_secret"
fly secrets set GOOGLE_CLIENT_ID="your_google_client_id"
fly secrets set URL="https://partyy-game.fly.dev"

# Deploy!
fly deploy
```

## Step 6: Visit your app

```bash
fly open
```

Your game is now live at `https://partyy-game.fly.dev` (or whatever name you chose)!

## Costs

| Service | Free Tier |
|---------|-----------|
| Fly.io | 3 shared VMs, 160GB bandwidth |
| MongoDB Atlas | 512MB storage |
| **Total** | **$0/month** |

## Updating

```bash
git add .
git commit -m "your changes"
fly deploy
```

## Troubleshooting

```bash
# Check logs
fly logs

# SSH into container
fly ssh console

# Check app status
fly status
```
