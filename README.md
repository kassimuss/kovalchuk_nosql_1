# Spotify Tracks Analytics Platform

## Опис проєкту

У цьому проєкті я працював із датасетом Spotify Tracks Dataset та базою даних MongoDB.

Мета роботи — завантажити дані про треки в MongoDB, привести їх до зручної структури, виконати запити та аналітичні агрегації, а також перевірити, як індекси впливають на швидкість виконання запитів.

У датасеті є інформація про треки: назва, виконавці, альбом, популярність, тривалість, жанр та аудіо-характеристики, наприклад `danceability`, `energy`, `tempo`, `valence`, `loudness`, `speechiness` та інші.

---

## Структура проєкту


.
├── .env
├── .gitignore
├── requirements.txt
├── dataset.csv
├── scripts/
│   ├── 01_load_data.py
│   └── 02_transform.js
├── queries/
│   ├── part2_queries.js
│   ├── part3_aggregations.js
│   └── part4_indexes.js
└── README.md


Файл `.env` не додається до репозиторію, тому що в ньому зберігається рядок підключення до MongoDB Atlas.

---

## Налаштування середовища

Для роботи використовувалась MongoDB Atlas.

У файлі `.env` зберігається рядок підключення:

env
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/?appName=clusterName


Для встановлення залежностей використовується команда:


pip install -r requirements.txt


Файл `requirements.txt`:


pymongo==4.7.3
pandas==3.0.3
kaggle==1.6.14
python-dotenv==1.0.1
tqdm==4.66.4


---

## Частина 1. Завантаження та трансформація даних

Спочатку дані з CSV-файлу були завантажені в колекцію:


tracks_raw


Для цього використовується файл:


scripts/01_load_data.py


Команда запуску:


python scripts/01_load_data.py


Після завантаження в колекції `tracks_raw` було:


113999 documents


Спочатку дані мали плоску структуру, тому що вони були напряму завантажені з CSV-файлу.

Після цього була створена нова колекція:


tracks


Для трансформації використовується файл:


scripts/02_transform.js


Команда запуску:


mongosh "MONGO_URI" --file scripts/02_transform.js


Під час трансформації були виконані такі зміни:

* поле `artists` було перетворене з рядка на масив;
* аудіо-характеристики були винесені в окремий об'єкт `audio_features`;
* було додано поле `duration_sec`;
* було додано поле `popularity_tier`;
* результат був збережений у колекцію `tracks`.

Приклад нової структури документа:

json
{
  "track_name": "Comedy",
  "artists": ["Gen Hoshino"],
  "popularity": 73,
  "duration_ms": 230666,
  "duration_sec": 230.7,
  "track_genre": "acoustic",
  "popularity_tier": "high",
  "audio_features": {
    "danceability": 0.676,
    "energy": 0.461,
    "loudness": -6.746,
    "speechiness": 0.143,
    "acousticness": 0.0322,
    "instrumentalness": 0.00000101,
    "liveness": 0.358,
    "valence": 0.715,
    "tempo": 87.917
  }
}


---

## Чому була обрана така структура даних

Аудіо-характеристики були винесені в об'єкт `audio_features`, тому що вони логічно належать до однієї групи даних. Так документ стає зрозумілішим і зручнішим для аналізу.

Виконавці зберігаються як масив, тому що один трек може мати кількох артистів. Це зручно для пошуку за виконавцем і для агрегацій з використанням `$unwind`.

Для створення колекції `tracks` використовувався оператор `$out`. Він записує результат aggregation pipeline у нову колекцію або повністю замінює існуючу. У цьому проєкті це зручно, тому що колекція `tracks` створюється заново на основі `tracks_raw`.

---

## Частина 2. Запити до даних

Файл із запитами:


queries/part2_queries.js


Команда запуску:


mongosh "MONGO_URI" --file queries/part2_queries.js


### 1. Треки для вечірки

Були знайдені треки, у яких:

* `danceability > 0.7`;
* `energy > 0.7`;
* тривалість від 3 до 5 хвилин.

Приклади результатів:


Hold On - Remix
Kaleidoscope
アジアの純真
All My Loving (Original Version)
Outside Villanova


Такі треки можна вважати більш підходящими для вечірки, тому що вони енергійні та танцювальні.

---

### 2. Популярні виконавці

Були знайдені виконавці, у яких мінімум 3 треки, і всі ці треки мають популярність не нижче 60.

Приклади результатів:


Harry Styles — avg_popularity: 92
Luar La L — avg_popularity: 90.5
Olivia Rodrigo — avg_popularity: 87.4
Måneskin — avg_popularity: 83.7
Lil Nas X — avg_popularity: 83.5


Для цього запиту використовувався `$unwind`, тому що поле `artists` є масивом.

---

### 3. Нетипові треки за tempo

Для кожного жанру були розраховані:

* середній `tempo`;
* стандартне відхилення `tempo`;
* поріг нетиповості: `avg_tempo + 2 * stdDev`.

Якщо tempo треку вище цього порогу, він вважається нетиповим для свого жанру.

Приклад для жанру `acoustic`:


avg_tempo: 119
outlier_threshold: 178.5


Приклади знайдених треків:


Can't Help Falling In Love — tempo: 181.74
All I Want For Christmas Is A Real Good Tan — tempo: 202.019
Brave — tempo: 185.063
Believer (Remix) — tempo: 187.484


---

### 4. Треки для фонової роботи

Були знайдені треки, які підходять для спокійного фонового прослуховування.

Умови:

* `loudness < -10`;
* `speechiness < 0.1`;
* `instrumentalness > 0.5`;
* `explicit = false`.

Приклади результатів:


everything i wanted — Billie Eilish
Clean White Noise - Loopable with no fade
Experience — Ludovico Einaudi
Show Me How — Men I Trust
K. — Cigarettes After Sex


---

## Частина 3. Aggregation Pipeline

Файл:


queries/part3_aggregations.js


Команда запуску:


mongosh "MONGO_URI" --file queries/part3_aggregations.js


### 1. Топ-10 виконавців за середньою популярністю

У цьому запиті були вибрані виконавці, у яких є мінімум 5 треків. Потім для кожного виконавця була розрахована середня популярність.

Результат:


Olivia Rodrigo — 87.4
Måneskin — 83.7
Lil Nas X — 83.5
One Direction — 83
TV Girl — 82
Bomba Estéreo — 81.5
Mora — 79.7
Beach Bunny — 79.4
Mitski — 78.9
Jhay Cortez — 78.7


Поріг у 5 треків потрібен для того, щоб у топ не потрапляли виконавці лише з одним випадково популярним треком.

---

### 2. Розподіл треків за настроєм

Настрій визначався за двома ознаками:

* `valence`;
* `energy`.

Правила:


high valence + high energy → happy
low valence + high energy → angry
high valence + low energy → calm
low valence + low energy → sad


Результат:


happy: 43404
angry: 38761
sad: 23086
calm: 8748


Найбільше треків потрапило в категорію `happy`.

---

### 3. Найбільш танцювальні жанри

Для кожного жанру були розраховані середні значення:

* `danceability`;
* `energy`;
* `valence`.

Жанри з кількістю треків менше 100 були виключені, щоб результат був більш стабільним.

Результат:


kids — 0.779
chicago-house — 0.766
reggaeton — 0.759
latino — 0.757
reggae — 0.745
hip-hop — 0.736
dancehall — 0.734
minimal-techno — 0.729
detroit-techno — 0.723
latin — 0.722


Найвищий середній показник `danceability` виявився у жанру `kids`.

---

## Частина 4. Індекси та оптимізація

Файл:


queries/part4_indexes.js


Команда запуску:


mongosh "MONGO_URI" --file queries/part4_indexes.js


Для перевірки оптимізації використовувався запит:

javascript
db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
}).sort({ popularity: -1 })


До створення індексу результат `explain()` був таким:


totalDocsExamined: 113999
totalKeysExamined: 0
executionTimeMillis: 141


Це означає, що MongoDB переглядала всю колекцію.

Після цього був створений індекс:

javascript
db.tracks.createIndex({
  track_genre: 1,
  "audio_features.danceability": 1,
  popularity: -1
})


Після створення індексу результат став таким:


totalDocsExamined: 354
totalKeysExamined: 354
executionTimeMillis: 2


Після додавання індексу MongoDB стала переглядати набагато менше документів, а час виконання зменшився зі 141 мс до 2 мс.

Також був створений індекс для пошуку фонових треків:

javascript
db.tracks.createIndex({
  "audio_features.instrumentalness": 1,
  "audio_features.speechiness": 1,
  explicit: 1
})


Результат перевірки:


totalDocsExamined: 16141
totalKeysExamined: 16844
executionTimeMillis: 35


---

## Covered query

Також був перевірений covered query:

javascript
db.tracks.find(
  {
    track_genre: "pop",
    popularity: { $gte: 70 }
  },
  {
    _id: 0,
    track_genre: 1,
    popularity: 1
  }
)


Результат:


totalDocsExamined: 0
totalKeysExamined: 620
executionTimeMillis: 1


Оскільки `totalDocsExamined` дорівнює 0, MongoDB змогла отримати дані тільки з індексу, не читаючи самі документи з колекції.

Важливо, що запит є покривним саме з проекцією, де виводяться тільки `track_genre` і `popularity`, а `_id` виключений.

---

## Список створених індексів


_id_
track_genre_1_audio_features.danceability_1_popularity_-1
audio_features.instrumentalness_1_audio_features.speechiness_1_explicit_1


---

## Висновок

У ході роботи був створений повний процес обробки даних Spotify у MongoDB.

Спочатку CSV-дані були завантажені в колекцію `tracks_raw`, потім перетворені в більш зручну колекцію `tracks`. Після цього були виконані звичайні запити, аналітичні aggregation pipeline та перевірена робота індексів.

Головний результат оптимізації: після створення індексу кількість переглянутих документів зменшилася з 113999 до 354, а час виконання запиту — зі 141 мс до 2 мс.

Це показує, що правильно підібрані індекси значно прискорюють роботу запитів у MongoDB.