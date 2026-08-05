# ADR-0008: Lore chatbot vector store — dedicated Elasticsearch, not pgvector

## Status
Accepted (infrastructure concept only — the chatbot itself is a roadmap
item, not started; see "Consequences" below)

## Context
Section 6 of `docs/project-brief.md` originally proposed storing lore
embeddings in `hobbyhub`'s existing Postgres via the `pgvector` extension,
to avoid standing up a second database for a hobby project.

Adrian's own [hybrid-search-api](https://github.com/Sheodred/hybrid-search-api)
project already solves this exact problem (hybrid keyword + kNN vector
search) using Elasticsearch, and Adrian asked to reuse that approach for
hobbyhub's lore chatbot instead — but with its **own, separate**
Elasticsearch instance, explicitly not sharing the one behind
hybrid-search-api ("damit wir nicht in der anderen rumpfuschen" - so the
two projects don't interfere with each other).

Checked hybrid-search-api's actual setup (`docker-compose.yml`) for
reference:
- `docker.elastic.co/elasticsearch/elasticsearch:8.14.1`, single-node,
  `xpack.security.enabled=false` (fine for local dev, not for a real
  deployment), exposed on host port **9200**.
- Embeddings come from a **locally self-hosted** Python model
  (`sentence-transformers/all-MiniLM-L6-v2`, 384 dims) via the
  `sentence-transformers` library - straightforward in that project
  because it's a Python codebase. hobbyhub's backend is Java/Spring Boot,
  where embedding a Python-style ML model isn't a comparable drop-in (no
  built-in JVM equivalent without extra tooling like DJL or an ONNX
  runtime, which is meaningfully more infrastructure than this warrants).

## Decision
hobbyhub gets its **own Elasticsearch container**, defined in hobbyhub's
own `docker-compose.yml` (not shared with hybrid-search-api). Docker
Compose already scopes networks per project directory, so the two stacks
are isolated from each other by default with zero extra effort - the only
thing that needs explicit attention is the **host port**, since both
would default to `9200`. hobbyhub's instance should map to a different
host port (e.g. `9201:9200`) so both projects can run side by side
without a collision.

Reference service definition (not yet added to the real
`docker-compose.yml` - see Consequences):

```yaml
lore-elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.14.1
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
    - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
  ports:
    - "9201:9200"
  volumes:
    - lore-esdata:/usr/share/elasticsearch/data
```

Planned index (`lore_chunks`), unchanged in spirit from the brief's
pgvector version, just on Elasticsearch instead - a `dense_vector` field
with Elasticsearch's native kNN support does the same job pgvector
would have:

```json
{
  "mappings": {
    "properties": {
      "source_file": { "type": "keyword" },
      "heading": { "type": "text" },
      "content": { "type": "text" },
      "embedding": { "type": "dense_vector", "dims": "<TBD - depends on the embedding model chosen>", "index": true, "similarity": "cosine" },
      "updated_at": { "type": "date" }
    }
  }
}
```

Backend integration would use `spring-boot-starter-data-elasticsearch`
(or the raw Java API client) as a self-contained client scoped to this
one index - deliberately not touching the existing JPA/Postgres setup at
all, keeping the two data stores fully separate in code as well as
infrastructure.

Data source stays the plan from the brief: the `/lore` Markdown corpus in
[mtg-planeswalk](https://github.com/Sheodred/mtg-planeswalk) (now
populated - see that repo). Since it's a public repo, the simplest
ingestion path is pulling files via GitHub's raw-content URLs rather than
a git submodule or a second checkout - worth confirming when ingestion is
actually built, since that repo's structure could still change before
then.

**Not decided here, left for when implementation actually starts:**
- Which hosted embeddings API to call (the brief suggested Voyage AI;
  hybrid-search-api's local-model dimension choice, 384, doesn't
  transfer directly since it's a different model class entirely) - this
  fixes the `dims` value above.
- Whether `xpack.security.enabled=false` is acceptable for however this
  ends up deployed, or needs real auth once it's not just local dev.

## Consequences
- This ADR documents an infrastructure **concept and decision**, not an
  implementation - no code or `docker-compose.yml` change has been made
  yet. Per Adrian's explicit instruction (2026-08-05): building the
  actual chatbot (ingestion job, RAG endpoint, chat UI) goes on the
  roadmap and is not being worked on further right now.
- When it is picked up: add the `lore-elasticsearch` service above to
  `docker-compose.yml`, pick an embedding API and fix `dims`, then build
  ingestion → RAG endpoint → chat panel in that order (each depends on
  the previous one existing).
- Keeping hobbyhub's Elasticsearch fully separate from hybrid-search-api's
  costs a second container/volume locally, and - if hobbyhub is ever
  deployed - a second hosted Elasticsearch instance. Accepted deliberately
  per Adrian's instruction, to avoid any cross-project coupling.
