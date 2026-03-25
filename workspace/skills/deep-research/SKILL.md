---
name: deep-research
description: Conducts thorough multi-source research on any topic. Searches, reads, synthesizes, and stores findings with citations.
version: 1.0.0
tags:
  - research
  - analysis
  - knowledge
---

# Deep Research Skill

## When to Activate
Activate this skill when asked to research a topic, compare technologies, analyze trends, or gather comprehensive information.

## Research Methodology

### Phase 1: Scope
- Clarify the research question. What exactly does the user need to know?
- Define boundaries: time period, geographic scope, technical depth.
- Check the knowledge base first (query-knowledge) for existing research.

### Phase 2: Gather
- Search the web for authoritative sources (official docs, papers, reputable blogs).
- Read at least 3-5 different sources for any topic.
- Prioritize: official documentation > peer-reviewed > reputable blogs > forums.
- Note contradictions between sources.

### Phase 3: Analyze
- Cross-reference facts across multiple sources.
- Identify consensus vs. minority opinions.
- Note recency: when was this information published?
- Flag anything that might be outdated.

### Phase 4: Synthesize
- Structure findings clearly with headers and bullet points.
- Lead with the answer, then provide supporting evidence.
- Include a "Sources" section with URLs and dates.
- Note confidence level: high (multiple sources agree), medium (limited sources), low (single source or conflicting info).

### Phase 5: Store
- Offer to store key findings in the knowledge base (ingest-knowledge).
- Use descriptive titles and relevant tags.
- Include the date of research in the stored content.

## Output Format

```
## [Topic]

### Summary
[2-3 sentence answer to the research question]

### Key Findings
- Finding 1 (Source: [URL])
- Finding 2 (Source: [URL])
- ...

### Analysis
[Deeper analysis, comparisons, trade-offs]

### Confidence: [High/Medium/Low]
[Why this confidence level]

### Sources
1. [Title] - [URL] (accessed [date])
2. ...
```

## Rules
- Never present a single source as definitive truth.
- Always include dates -- information ages fast in tech.
- If you can't find reliable information, say so clearly.
- Distinguish between facts, opinions, and speculation.
