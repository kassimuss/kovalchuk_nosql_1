use("spotify");

print("\nTASK 1 — Explain before index\n");

const query1 = {
  track_genre: "pop",
  "audio_features.danceability": {
    $gte: 0.7
  }
};

const sort1 = {
  popularity: -1
};

const explainBefore1 = db.tracks.find(query1).sort(sort1).explain("executionStats");

printjson({
  stage: "before_index",
  totalDocsExamined: explainBefore1.executionStats.totalDocsExamined,
  totalKeysExamined: explainBefore1.executionStats.totalKeysExamined,
  executionTimeMillis: explainBefore1.executionStats.executionTimeMillis
});


print("\nTASK 1 — Create index\n");

db.tracks.createIndex({
  track_genre: 1,
  "audio_features.danceability": 1,
  popularity: -1
});

printjson(db.tracks.getIndexes());


print("\nTASK 1 — Explain after index\n");

const explainAfter1 = db.tracks.find(query1).sort(sort1).explain("executionStats");

printjson({
  stage: "after_index",
  totalDocsExamined: explainAfter1.executionStats.totalDocsExamined,
  totalKeysExamined: explainAfter1.executionStats.totalKeysExamined,
  executionTimeMillis: explainAfter1.executionStats.executionTimeMillis
});


print("\nTASK 2 — Index for focus tracks query\n");

db.tracks.createIndex({
  "audio_features.instrumentalness": 1,
  "audio_features.speechiness": 1,
  explicit: 1
});

const query2 = {
  "audio_features.instrumentalness": {
    $gt: 0.5
  },
  "audio_features.speechiness": {
    $lt: 0.1
  },
  explicit: false
};

const explainTask2 = db.tracks.find(query2).explain("executionStats");

printjson({
  stage: "focus_tracks_index",
  totalDocsExamined: explainTask2.executionStats.totalDocsExamined,
  totalKeysExamined: explainTask2.executionStats.totalKeysExamined,
  executionTimeMillis: explainTask2.executionStats.executionTimeMillis
});


print("\nTASK 3 — Covered query check\n");

const coveredQuery = db.tracks.find(
  {
    track_genre: "pop",
    popularity: {
      $gte: 70
    }
  },
  {
    _id: 0,
    track_genre: 1,
    popularity: 1
  }
).explain("executionStats");

printjson({
  stage: "covered_query_check",
  totalDocsExamined: coveredQuery.executionStats.totalDocsExamined,
  totalKeysExamined: coveredQuery.executionStats.totalKeysExamined,
  executionTimeMillis: coveredQuery.executionStats.executionTimeMillis
});


print("\nAll indexes\n");

printjson(db.tracks.getIndexes());