import React, { Component, useState, useEffect } from "react";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import CircularProgress from "@material-ui/core/CircularProgress";
import { get, post } from "../../utilities.js";

/**
 * SpotifyConnect component - handles Spotify OAuth connection
 * Shows "Connect Spotify" or "Disconnect" based on connection status
 */
const SpotifyConnect = (props) => {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [spotifyId, setSpotifyId] = useState(null);

  // Check Spotify connection status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = () => {
    setLoading(true);
    get("/api/spotify/status")
      .then((data) => {
        setConnected(data.connected);
        setSpotifyId(data.spotifyId);
        setLoading(false);
        if (props.onStatusChange) {
          props.onStatusChange(data.connected);
        }
      })
      .catch((err) => {
        console.error("Failed to check Spotify status:", err);
        setLoading(false);
      });
  };

  const handleConnect = () => {
    get("/api/spotify/auth")
      .then((data) => {
        if (data.url) {
          // Redirect to Spotify auth
          window.location.href = data.url;
        }
      })
      .catch((err) => {
        console.error("Failed to get Spotify auth URL:", err);
      });
  };

  const handleDisconnect = () => {
    setLoading(true);
    post("/api/spotify/disconnect")
      .then(() => {
        setConnected(false);
        setSpotifyId(null);
        setLoading(false);
        if (props.onStatusChange) {
          props.onStatusChange(false);
        }
      })
      .catch((err) => {
        console.error("Failed to disconnect Spotify:", err);
        setLoading(false);
      });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (connected) {
    return (
      <Box>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Connected as: {spotifyId}
        </Typography>
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          onClick={handleDisconnect}
          fullWidth={props.fullWidth}
        >
          Disconnect Spotify
        </Button>
      </Box>
    );
  }

  return (
    <Button
      variant="contained"
      style={{ 
        backgroundColor: "#1DB954", 
        color: "#FFFFFF",
        fontWeight: 600
      }}
      onClick={handleConnect}
      fullWidth={props.fullWidth}
    >
      Connect Spotify
    </Button>
  );
};

export default SpotifyConnect;
