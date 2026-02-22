const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  name: String, // randomly generated and is part of URL
  category: Object,
  rated: {
    type: Boolean,
    default: true,
  },
  host: {
    userId: String, // userId
    name: String
  },
  gameId: {
    type: String,
    default: "Waiting",
  },
  status: {
    type: String, // "Waiting" or "InProgress" or "Finished"
    default: "Waiting"
  },
  created: { type: Date, default: Date.now },
  closed: {
    type: Boolean, 
    default: false
  },
  private: {
    type: Boolean,
    default: false
  },
  users: {
    type: [String],
    default: []
  },
  // Custom Spotify playlist support
  spotifyPlaylistId: {
    type: String,
    default: null
  },
  spotifyPlaylistName: {
    type: String,
    default: null
  },
  // Temporary song cache for custom playlist games (not persisted to Song collection)
  customPlaylistSongs: {
    type: [{
      title: String,
      artist: [String],
      artUrl: String,
      songUrl: String,
      spotifyUrl: String
    }],
    default: []
  }
  /*
  allUserIdsThatHaveBeenInRoom: {
    type: [String],
    default: []
  }*/
});

// compile model from schema
module.exports = mongoose.model("room", RoomSchema);
