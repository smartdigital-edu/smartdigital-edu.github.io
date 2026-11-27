# Optional recorded audio

By default every "Listen" / "Hear Word" button uses the browser's speech voice.
To use a real recording instead, drop an MP3 here and point a content item at it:

- Kiddora flashcard (jobs, animals, fruit, transport, body parts): add `"audio": { "en": "audio/cow-en.mp3", "ms": "audio/lembu-ms.mp3" }` (or one file: `"audio": "audio/cow.mp3"`) to the item in its JSON file, e.g. `src/content/kiddora/animals.json`.
- Grammar Hub spelling question: add `"audio": "audio/beautiful.mp3"` to the question in `src/content/grammarhub/spelling.json`.

If the file is missing or fails to play, the app falls back to speech automatically.
