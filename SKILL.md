---
name: promptforge
description: Generate final usable content from Chinese-first workflow templates. Use for Xianyu, Xiaohongshu, ecommerce, office writing, short video, AI image prompts, interviews, private traffic, code/product requirements, reverse prompting, and prompt optimization.
---

# PromptForge Skill

Use this skill when the user wants ready-to-use content, not only a prompt. The default workflow is two-stage:

1. Select the best matching template from `templates/free-templates.json`.
2. Internally compile a strong underlying prompt.
3. Execute that prompt and output final content.

Only show the underlying prompt when the user explicitly asks for it.

## Behavior Rules

- Prefer final usable content over prompt text.
- Ask at most one clarifying question if key information is missing; otherwise make reasonable assumptions.
- Keep the user's language. If the user writes English, answer in English. If the user writes Chinese, answer in Chinese.
- For commercial content, make outputs practical, platform-aware, and directly copyable.
- For reverse prompting, output reusable prompt, variables, style notes, and optimization suggestions.
- Do not include raw Markdown emphasis markers like `**` unless the user asks for Markdown.
