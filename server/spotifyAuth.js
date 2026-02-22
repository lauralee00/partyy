/**
 * Spotify OAuth for user personal playlists
 * Handles user authentication, token storage, and token refresh
 */

require("dotenv").config();
const SpotifyWebApi = require("spotify-web-api-node");
const User = require("./models/user");

// Create Spotify API instance for user OAuth
const createSpotifyApi = () => {
  return new SpotifyWebApi({
    clientId: process.env.SPOTIFY_ID,
    clientSecret: process.env.SPOTIFY_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || process.env.URL + "/api/spotify/callback",
  });
};

// Get Spotify API instance with user's tokens
const getSpotifyApiForUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.spotifyAccessToken) {
    return null;
  }

  const spotifyApi = createSpotifyApi();
  spotifyApi.setAccessToken(user.spotifyAccessToken);
  spotifyApi.setRefreshToken(user.spotifyRefreshToken);

  // Check if token is expired or about to expire (within 5 minutes)
  const now = new Date();
  const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  if (user.spotifyTokenExpiry && new Date(user.spotifyTokenExpiry).getTime() - now.getTime() < expiryBuffer) {
    // Token expired or expiring soon, refresh it
    try {
      const refreshed = await refreshUserToken(userId);
      if (refreshed) {
        spotifyApi.setAccessToken(refreshed.accessToken);
      }
    } catch (err) {
      console.error("Failed to refresh Spotify token:", err);
      return null;
    }
  }

  return spotifyApi;
};

// Refresh user's Spotify token
const refreshUserToken = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.spotifyRefreshToken) {
    return null;
  }

  const spotifyApi = createSpotifyApi();
  spotifyApi.setRefreshToken(user.spotifyRefreshToken);

  try {
    const data = await spotifyApi.refreshAccessToken();
    const accessToken = data.body.access_token;
    const expiresIn = data.body.expires_in; // seconds

    // Calculate expiry time
    const expiryDate = new Date(Date.now() + expiresIn * 1000);

    // Update user's token
    user.spotifyAccessToken = accessToken;
    user.spotifyTokenExpiry = expiryDate;
    await user.save();

    return {
      accessToken,
      expiryDate,
    };
  } catch (err) {
    console.error("Error refreshing Spotify token:", err);
    // If refresh fails, clear the tokens
    user.spotifyAccessToken = null;
    user.spotifyRefreshToken = null;
    user.spotifyTokenExpiry = null;
    user.spotifyId = null;
    await user.save();
    return null;
  }
};

/**
 * GET /api/spotify/auth
 * Returns Spotify authorization URL for user OAuth
 */
const getAuthUrl = (req, res) => {
  if (!req.user) {
    return res.status(401).send({ error: "Not logged in" });
  }

  const spotifyApi = createSpotifyApi();
  const scopes = [
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-read-private",
    "user-read-email",
  ];

  // Use user ID as state for callback verification
  const state = req.user._id.toString();
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

  res.send({ url: authorizeURL });
};

/**
 * GET /api/spotify/callback
 * Handles Spotify OAuth callback, stores tokens
 */
const handleCallback = async (req, res) => {
  const code = req.query.code;
  const state = req.query.state; // This is the user ID
  const error = req.query.error;

  if (error) {
    console.error("Spotify auth error:", error);
    return res.redirect("/?spotifyError=access_denied");
  }

  if (!state) {
    return res.redirect("/?spotifyError=invalid_state");
  }

  const spotifyApi = createSpotifyApi();

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const accessToken = data.body.access_token;
    const refreshToken = data.body.refresh_token;
    const expiresIn = data.body.expires_in; // seconds

    // Calculate expiry time
    const expiryDate = new Date(Date.now() + expiresIn * 1000);

    // Get user's Spotify profile
    spotifyApi.setAccessToken(accessToken);
    const profileData = await spotifyApi.getMe();
    const spotifyId = profileData.body.id;

    // Update user with Spotify tokens
    const user = await User.findById(state);
    if (!user) {
      return res.redirect("/?spotifyError=user_not_found");
    }

    user.spotifyId = spotifyId;
    user.spotifyAccessToken = accessToken;
    user.spotifyRefreshToken = refreshToken;
    user.spotifyTokenExpiry = expiryDate;
    await user.save();

    // Redirect back to app with success
    res.redirect("/?spotifyConnected=true");
  } catch (err) {
    console.error("Spotify callback error:", err);
    res.redirect("/?spotifyError=auth_failed");
  }
};

/**
 * POST /api/spotify/disconnect
 * Disconnects user's Spotify account
 */
const disconnect = async (req, res) => {
  if (!req.user) {
    return res.status(401).send({ error: "Not logged in" });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    user.spotifyId = null;
    user.spotifyAccessToken = null;
    user.spotifyRefreshToken = null;
    user.spotifyTokenExpiry = null;
    await user.save();

    res.send({ success: true });
  } catch (err) {
    console.error("Spotify disconnect error:", err);
    res.status(500).send({ error: "Failed to disconnect Spotify" });
  }
};

/**
 * GET /api/spotify/status
 * Returns user's Spotify connection status
 */
const getStatus = async (req, res) => {
  if (!req.user) {
    return res.status(401).send({ error: "Not logged in" });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    const connected = !!(user.spotifyId && user.spotifyAccessToken);
    res.send({
      connected,
      spotifyId: user.spotifyId,
    });
  } catch (err) {
    console.error("Spotify status error:", err);
    res.status(500).send({ error: "Failed to get Spotify status" });
  }
};

/**
 * GET /api/spotify/playlists
 * Returns user's Spotify playlists with pagination
 */
const getPlaylists = async (req, res) => {
  if (!req.user) {
    return res.status(401).send({ error: "Not logged in" });
  }

  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50); // Max 50

  try {
    const spotifyApi = await getSpotifyApiForUser(req.user._id);
    if (!spotifyApi) {
      return res.status(401).send({ error: "Spotify not connected" });
    }

    const data = await spotifyApi.getUserPlaylists({ offset, limit });
    
    const playlists = data.body.items.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      imageUrl: playlist.images && playlist.images[0] ? playlist.images[0].url : null,
      trackCount: playlist.tracks.total,
      owner: playlist.owner.display_name,
      isOwner: playlist.owner.id === req.user.spotifyId,
    }));

    res.send({
      playlists,
      total: data.body.total,
      offset,
      limit,
      hasMore: offset + playlists.length < data.body.total,
    });
  } catch (err) {
    console.error("Get playlists error:", err);
    if (err.statusCode === 401) {
      return res.status(401).send({ error: "Spotify token expired" });
    }
    res.status(500).send({ error: "Failed to get playlists" });
  }
};

/**
 * GET /api/spotify/playlist/:playlistId/tracks
 * Returns tracks from a specific playlist (for preview/validation)
 */
const getPlaylistTracks = async (req, res) => {
  if (!req.user) {
    return res.status(401).send({ error: "Not logged in" });
  }

  const { playlistId } = req.params;
  const offset = parseInt(req.query.offset) || 0;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  try {
    const spotifyApi = await getSpotifyApiForUser(req.user._id);
    if (!spotifyApi) {
      return res.status(401).send({ error: "Spotify not connected" });
    }

    const data = await spotifyApi.getPlaylistTracks(playlistId, {
      offset,
      limit,
      fields: "items(track(name,preview_url,artists,album(images),external_urls)),total",
      market: "US",
    });

    const tracks = data.body.items
      .filter((item) => item.track && item.track.preview_url)
      .map((item) => ({
        name: item.track.name,
        artists: item.track.artists.map((a) => a.name),
        previewUrl: item.track.preview_url,
        imageUrl: item.track.album.images[0] ? item.track.album.images[0].url : null,
        spotifyUrl: item.track.external_urls ? item.track.external_urls.spotify : null,
      }));

    const totalWithPreview = tracks.length;
    
    res.send({
      tracks,
      total: data.body.total,
      totalWithPreview,
      offset,
      limit,
      hasMore: offset + limit < data.body.total,
    });
  } catch (err) {
    console.error("Get playlist tracks error:", err);
    if (err.statusCode === 401) {
      return res.status(401).send({ error: "Spotify token expired" });
    }
    res.status(500).send({ error: "Failed to get playlist tracks" });
  }
};

/**
 * Fetch all playable songs from a playlist (songs with preview_url)
 * Used internally when starting a game with a custom playlist
 */
const fetchPlaylistSongsForGame = async (userId, playlistId) => {
  const spotifyApi = await getSpotifyApiForUser(userId);
  if (!spotifyApi) {
    throw new Error("Spotify not connected");
  }

  const allSongs = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const data = await spotifyApi.getPlaylistTracks(playlistId, {
      offset,
      limit,
      fields: "items(track(name,preview_url,artists,album(images),external_urls)),total",
      market: "US",
    });

    const tracks = data.body.items
      .filter((item) => item.track && item.track.preview_url)
      .map((item) => ({
        title: item.track.name,
        artist: item.track.artists.map((a) => a.name),
        songUrl: item.track.preview_url,
        artUrl: item.track.album.images[0] ? item.track.album.images[0].url : null,
        spotifyUrl: item.track.external_urls ? item.track.external_urls.spotify : null,
      }));

    allSongs.push(...tracks);
    offset += limit;
    hasMore = offset < data.body.total;
  }

  return allSongs;
};

module.exports = {
  getAuthUrl,
  handleCallback,
  disconnect,
  getStatus,
  getPlaylists,
  getPlaylistTracks,
  fetchPlaylistSongsForGame,
  getSpotifyApiForUser,
  refreshUserToken,
};
