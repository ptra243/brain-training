# Editing the plan docs (Claude Docs)

The plan docs are read and edited with the Claude Docs tools, not WebFetch.

- Target a block by its id rather than quoting text. If a quote must be used,
  quote a long distinctive phrase or add `nth`.
- One paragraph per block, no newlines inside one.
- On a `deny`, read `detail` and change the call; never resend the same
  payload.
- The original "Murder Mystery Mode — Build Plan" is history and about 16k
  tokens: read one section with a search, never whole.
