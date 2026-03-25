---
name: knowledge-management
description: Organizes, categorizes, and retrieves knowledge from the second brain. Maintains a structured knowledge base with tags and connections.
version: 1.0.0
tags:
  - knowledge
  - organization
  - memory
---

# Knowledge Management Skill

## When to Activate
Activate this skill when asked to save, organize, find, or connect information in the knowledge base.

## Knowledge Organization

### Ingestion Rules
When storing new knowledge:
1. **Title**: Short, descriptive, searchable. Use format: `[Category] Topic - Detail`
   - Good: `[TypeScript] Zod v4 - Breaking changes from v3`
   - Bad: `Some notes about stuff`

2. **Tags**: Comma-separated, lowercase. Always include:
   - Domain tag: `typescript`, `devops`, `ai`, `business`, `personal`
   - Type tag: `reference`, `tutorial`, `decision`, `idea`, `contact`, `project`
   - Project tag if applicable: `mastra`, `whabi`, `aurora`, `docflow`

3. **Content**: Structure before storing:
   - Lead with the key takeaway
   - Include context: why is this important?
   - Add date of the information
   - Include source URL if available

### Retrieval Rules
When searching for knowledge:
1. First try query-knowledge with the most specific terms.
2. If no results, broaden the search terms.
3. If still no results, check memory for conversation history.
4. Combine results from multiple queries if needed.

### Connection Rules
When the user shares new information:
1. Check if related knowledge already exists.
2. If yes, mention the connection: "This relates to [previous topic] you stored on [date]."
3. Suggest updating or linking related entries.

## Output Format for Stored Knowledge

```
Title: [Category] Topic - Detail
Tags: domain, type, project
Date: YYYY-MM-DD

[Structured content]

Source: [URL if applicable]
Related: [titles of related knowledge entries]
```

## Rules
- Never store duplicate information. Check first.
- Always confirm with the user before storing large amounts of content.
- Keep entries atomic: one concept per entry, not a dump of everything.
- Periodically suggest organizing or reviewing stored knowledge.
