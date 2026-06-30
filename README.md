# PromptForge

PromptForge is an open-source AI workflow template engine. It includes 120 free templates and a runnable web demo that generates final ready-to-use content, not just prompts.

PromptForge is Chinese-first, but it is not China-only. You can use it with English or other languages because modern AI models can translate, localize, and adapt the workflow output.

## What It Does

- 120 free workflow templates
- Generate final content directly
- Reverse-engineer reusable prompts from existing content
- Show or copy the underlying prompt when needed
- Works with OpenAI-compatible APIs
- Chinese-first templates, globally usable output

## Quick Start

```bash
git clone https://github.com/firstmu-ai/promptforge.git
cd promptforge
npm install
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://127.0.0.1:5173
```

Then fill in:

- Base URL, for example `https://api.openai.com/v1`
- API Key
- Model, for example `gpt-4.1-mini`, `deepseek-chat`, or another OpenAI-compatible model

## Build

```bash
npm run build
npm run preview
```

## Core Flow

```text
Choose a template
Fill in fields
Click Generate final content
Internal step 1: compile an underlying prompt
Internal step 2: execute the prompt
Result: final content shown to the user
```

## Reverse Prompt

Paste a piece of content into the extra requirement box and click **Reverse prompt**. PromptForge will generate:

- reusable prompt
- variable fields
- style notes
- optimization suggestions

## Template Coverage

- Xianyu / second-hand selling
- Xiaohongshu content
- E-commerce customer service
- Short video scripts
- Office writing
- AI image prompts
- Job interviews
- Private traffic and community operations
- Product and code requirements
- Prompt reverse-engineering and rewriting

## Skill Usage

Copy `SKILL.md` into your Codex / Cursor / Claude Code skill directory, or use it as a system instruction for your AI assistant. The skill defaults to generating final content and only reveals the underlying prompt when asked.

## Open Source vs Pro

This open-source edition is designed to be genuinely useful. A future Pro edition may include:

- more templates
- desktop app
- Feishu/Lark Base template library
- private template collections
- import/export
- batch workflow management
- long-term updates

## License

Code is released under the MIT License. Template content is provided for learning, personal use, and open-source usage. If you want to package and resell the template content directly, please create your own template set or contact the maintainer.
