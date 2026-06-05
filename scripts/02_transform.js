use("spotify");

db.tracks.drop();

db.tracks_raw.aggregate([
  {
    $project: {
      _id: 0,
      track_id: 1,
      track_name: 1,
      album_name: 1,
      explicit: 1,
      popularity: 1,
      duration_ms: 1,
      track_genre: 1,
      artists_raw: "$artists",

      artists: {
        $map: {
          input: {
            $split: ["$artists", ";"]
          },
          as: "artist",
          in: {
            $trim: {
              input: "$$artist"
            }
          }
        }
      },

      audio_features: {
        danceability: "$danceability",
        energy: "$energy",
        loudness: "$loudness",
        speechiness: "$speechiness",
        acousticness: "$acousticness",
        instrumentalness: "$instrumentalness",
        liveness: "$liveness",
        valence: "$valence",
        tempo: "$tempo",
        key: "$key",
        mode: "$mode",
        time_signature: "$time_signature"
      },

      duration_sec: {
        $round: [
          {
            $divide: ["$duration_ms", 1000]
          },
          1
        ]
      },

      popularity_tier: {
        $switch: {
          branches: [
            {
              case: {
                $gte: ["$popularity", 70]
              },
              then: "high"
            },
            {
              case: {
                $and: [
                  {
                    $gte: ["$popularity", 40]
                  },
                  {
                    $lt: ["$popularity", 70]
                  }
                ]
              },
              then: "medium"
            }
          ],
          default: "low"
        }
      }
    }
  },
  {
    $out: "tracks"
  }
]);

print("Transformation completed");
print("Documents in tracks:");
print(db.tracks.countDocuments());

print("Example document:");
printjson(db.tracks.findOne());