import React, { Component, useState, useEffect } from "react";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import Grid from "@material-ui/core/Grid";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import Avatar from "@material-ui/core/Avatar";
import CircularProgress from "@material-ui/core/CircularProgress";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import RefreshIcon from "@material-ui/icons/Refresh";
import SpotifyConnect from "./SpotifyConnect.js";
import { get, post } from "../../utilities.js";

/**
 * PlaylistPicker component - displays user's Spotify playlists
 * Allows selecting a playlist to create a game from
 */
const PlaylistPicker = (props) => {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [previewTracks, setPreviewTracks] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fetch playlists when connected
  useEffect(() => {
    if (connected) {
      fetchPlaylists(0);
    }
  }, [connected]);

  const fetchPlaylists = (newOffset = 0) => {
    setLoading(true);
    get(`/api/spotify/playlists?offset=${newOffset}&limit=20`)
      .then((data) => {
        if (newOffset === 0) {
          setPlaylists(data.playlists);
        } else {
          setPlaylists([...playlists, ...data.playlists]);
        }
        setOffset(newOffset + data.playlists.length);
        setHasMore(data.hasMore);
        setTotal(data.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch playlists:", err);
        setLoading(false);
      });
  };

  const handleLoadMore = () => {
    fetchPlaylists(offset);
  };

  const handleRefresh = () => {
    setPlaylists([]);
    setOffset(0);
    fetchPlaylists(0);
  };

  const handlePreview = (playlist) => {
    setSelectedPlaylist(playlist);
    setPreviewOpen(true);
    setPreviewLoading(true);
    
    get(`/api/spotify/playlist/${playlist.id}/tracks?limit=10`)
      .then((data) => {
        setPreviewTracks(data.tracks);
        setPreviewLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch preview tracks:", err);
        setPreviewLoading(false);
      });
  };

  const handleCreateGame = (playlist) => {
    setCreating(true);
    post("/api/createRoom", {
      spotifyPlaylistId: playlist.id,
      spotifyPlaylistName: playlist.name,
    })
      .then((data) => {
        setCreating(false);
        if (data.name) {
          props.redirect("/" + data.name);
        }
      })
      .catch((err) => {
        console.error("Failed to create room:", err);
        setCreating(false);
      });
  };

  const handleStatusChange = (isConnected) => {
    setConnected(isConnected);
    if (!isConnected) {
      setPlaylists([]);
      setOffset(0);
    }
  };

  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom style={{ fontWeight: 600 }}>
        Your Spotify Playlists
      </Typography>
      
      <Box mb={2}>
        <SpotifyConnect onStatusChange={handleStatusChange} fullWidth />
      </Box>

      {connected && (
        <>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="textSecondary">
              {total} playlists found
            </Typography>
            <IconButton size="small" onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Box>

          {loading && playlists.length === 0 ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <List dense style={{ maxHeight: "400px", overflow: "auto" }}>
                {playlists.map((playlist) => (
                  <ListItem 
                    key={playlist.id} 
                    button 
                    onClick={() => handlePreview(playlist)}
                    style={{ borderRadius: "8px", marginBottom: "4px" }}
                  >
                    <ListItemAvatar>
                      {playlist.imageUrl ? (
                        <Avatar 
                          src={playlist.imageUrl} 
                          variant="rounded"
                          style={{ width: 48, height: 48 }}
                        />
                      ) : (
                        <Avatar variant="rounded" style={{ width: 48, height: 48 }}>
                          <MusicNoteIcon />
                        </Avatar>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={playlist.name}
                      secondary={`${playlist.trackCount} tracks • ${playlist.owner}`}
                      primaryTypographyProps={{ noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<PlayArrowIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateGame(playlist);
                        }}
                        disabled={creating}
                      >
                        Play
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>

              {hasMore && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Button
                    variant="outlined"
                    onClick={handleLoadMore}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={20} /> : "Load More"}
                  </Button>
                </Box>
              )}
            </>
          )}
        </>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedPlaylist?.name}
          <Typography variant="body2" color="textSecondary">
            {selectedPlaylist?.trackCount} tracks
          </Typography>
        </DialogTitle>
        <DialogContent>
          {previewLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Preview (songs with 30-second clips):
              </Typography>
              <List dense>
                {previewTracks.map((track, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      {track.imageUrl ? (
                        <Avatar src={track.imageUrl} variant="rounded" />
                      ) : (
                        <Avatar variant="rounded">
                          <MusicNoteIcon />
                        </Avatar>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={track.name}
                      secondary={track.artists.join(", ")}
                      primaryTypographyProps={{ noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItem>
                ))}
              </List>
              {previewTracks.length === 0 && (
                <Typography variant="body2" color="error">
                  No playable songs found (songs need 30-second preview clips)
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setPreviewOpen(false);
              handleCreateGame(selectedPlaylist);
            }}
            disabled={creating || previewTracks.length < 5}
          >
            {creating ? <CircularProgress size={20} /> : "Create Game"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlaylistPicker;
