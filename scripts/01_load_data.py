import os
import pandas as pd
from pymongo import MongoClient
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.environ["MONGO_URI"]
DB_NAME = "spotify"
CSV_PATH = "dataset.csv"
BATCH_SIZE = 1000

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

db["tracks_raw"].drop()

df = pd.read_csv(CSV_PATH)

print(f"Downloading {len(df)} tracks...")

df = df.where(pd.notnull(df), None)

if "explicit" in df.columns:
    df["explicit"] = df["explicit"].astype(bool)

int_cols = ["popularity", "duration_ms", "key", "mode", "time_signature"]

for col in int_cols:
    if col in df.columns:
        df[col] = df[col].astype(int)

float_cols = [
    "danceability",
    "energy",
    "loudness",
    "speechiness",
    "acousticness",
    "instrumentalness",
    "liveness",
    "valence",
    "tempo"
]

for col in float_cols:
    if col in df.columns:
        df[col] = df[col].astype(float)

query = df["artists"].isna() | df["track_name"].isna()
records = df[~query].to_dict("records")

for i in tqdm(range(0, len(records), BATCH_SIZE)):
    db["tracks_raw"].insert_many(records[i:i + BATCH_SIZE])

print(f"Downloaded documents: {db['tracks_raw'].count_documents({})}")
print("Example document:")
print(db["tracks_raw"].find_one())
