use("spotify");

print("\nTASK 1 — Party tracks\n");

const partyTracks = db.tracks.find(
  {
    "audio_features.danceability": { $gt: 0.7 },
    "audio_features.energy": { $gt: 0.7 },
    duration_ms: {
      $gte: 180000,
      $lte: 300000
    }
  },
  {
    _id: 0,
    track_name: 1,
    artists: 1,
    popularity: 1,
    duration_ms: 1,
    "audio_features.danceability": 1,
    "audio_features.energy": 1
  }
).limit(10).toArray();

printjson(partyTracks);


print("\nTASK 2 — Popular artists\n");

const popularArtists = db.tracks.aggregate([
  {
    $unwind: "$artists"
  },
  {
    $group: {
      _id: "$artists",
      track_count: { $sum: 1 },
      min_popularity: { $min: "$popularity" },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  {
    $match: {
      track_count: { $gte: 3 },
      min_popularity: { $gte: 60 }
    }
  },
  {
    $project: {
      _id: 0,
      artist: "$_id",
      track_count: 1,
      min_popularity: 1,
      avg_popularity: {
        $round: ["$avg_popularity", 1]
      }
    }
  },
  {
    $sort: {
      avg_popularity: -1
    }
  },
  {
    $limit: 20
  }
]).toArray();

printjson(popularArtists);


print("\nTASK 3 — Tempo outliers\n");

const tempoOutliers = db.tracks.aggregate([
  {
    $group: {
      _id: "$track_genre",
      avg_tempo: {
        $avg: "$audio_features.tempo"
      },
      std_dev: {
        $stdDevPop: "$audio_features.tempo"
      },
      tracks: {
        $push: {
          _id: "$_id",
          track_name: "$track_name",
          popularity: "$popularity",
          artists: "$artists",
          audio_features: {
            tempo: "$audio_features.tempo"
          }
        }
      }
    }
  },
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_tempo: {
        $round: ["$avg_tempo", 1]
      },
      outlier_threshold: {
        $round: [
          {
            $add: [
              "$avg_tempo",
              {
                $multiply: [2, "$std_dev"]
              }
            ]
          },
          1
        ]
      },
      outlier_tracks: {
        $slice: [
            {
            $filter: {
                input: "$tracks",
                as: "track",
                cond: {
                $gt: [
                    "$$track.audio_features.tempo",
                    {
                    $add: [
                        "$avg_tempo",
                        {
                        $multiply: [2, "$std_dev"]
                        }
                    ]
                    }
                ]
                }
            }
            },
            5
        ]
      }
    }
  },
  {
    $match: {
      "outlier_tracks.0": {
        $exists: true
      }
    }
  },
  {
    $sort: {
      genre: 1
    }
  },
  {
    $limit: 10
  }
]).toArray();

printjson(tempoOutliers);


print("\nTASK 4 — Focus tracks\n");

const focusTracks = db.tracks.find(
  {
    "audio_features.loudness": { $lt: -10 },
    "audio_features.speechiness": { $lt: 0.1 },
    "audio_features.instrumentalness": { $gt: 0.5 },
    explicit: false
  },
  {
    _id: 0,
    track_name: 1,
    artists: 1,
    track_genre: 1,
    explicit: 1,
    popularity: 1,
    "audio_features.loudness": 1,
    "audio_features.speechiness": 1,
    "audio_features.instrumentalness": 1
  }
).sort({
  popularity: -1
}).limit(10).toArray();

printjson(focusTracks);
