---
layout: page
title: "Tool Selection Lab: technical methodology"
permalink: /tool-selection-lab/methodology/
description: "Execution budget, retained results, token accounting and checks behind the Tool Selection Lab article."
---

This page backs up the article [100 Tools, One Agent: Should It Search or See Everything?]({{ '/ai/agents/2026/10/12/100-tools-one-agent-search-or-see-everything/' | relative_url }}). It covers the parts that are too detailed for the article itself.

## Execution budget

Each evaluation runs one agent loop. The loop calls the model, runs any tool calls it returns, and repeats until the model replies without a tool call or the budget runs out. The budget is a limit on the number of model steps. Tool discovery calls (`search_tools`) are model steps like any other, so they use the same budget.

I checked in the harness code that the budget is only the loop bound. It is not written into the system prompt, it is not shown to the model, and it is not read by routing, retrieval, tool schemas, tool execution or grading. An evaluation that finishes within eight steps therefore behaves the same under a sixteen-step budget. The only differences between the first-pass and rerun configurations were the step limit and the run-wide request cap, which only stops a run. No evaluation ended on the request cap.

### What was retained

The exact procedure was:

- Evaluations that finished within eight steps were retained.
- Evaluations that exhausted that budget were rerun from scratch with sixteen steps.

Out of 8,883 evaluations, 509 (5.7%) exhausted the eight-step budget. Of those, 508 were replaced by their rerun. The reruns ended like this: 87 completed, 65 finished but were graded incorrect, and 356 ran out of steps again.

This is not the same as running every evaluation once at sixteen steps. A rerun is a fresh sample, not a continuation of the cut-off attempt, so it can differ from the first attempt in any way. Replacing an attempt because it ran long also means the final set is selected in a way a single pass would not be. I haven't measured how much that matters. The first-pass GPT-OSS 20B run used slightly older code than its rerun (retry handling, HTTP 529 handling and a query-embedding cache). None of that touches prompts, tools, grading or step logic. The Super reruns went through a pool of API keys because of throttling, which changes timing only.

### The one exception

One evaluation did not get a sixteen-step result: Nemotron Super, all-tools, task `hE-23`. Its rerun failed with an NVIDIA NIM 429 error and has not been repeated. That evaluation keeps its eight-step result, which was a step-limit failure, and it is counted as not completed. So the sixteen-step budget applies to every evaluation except this one.

### Step-limit failures that remain

A larger budget did not remove truncation. In the final results, 357 of 8,883 evaluations (4.0%) still ended by running out of steps: 356 of the reruns and the exception above. They are counted as not completed.

| Model | Ran out of steps |
|---|---:|
| GPT-OSS 20B | 0 |
| Nemotron Lightning | 5 |
| Nemotron Super | 352 |

| Strategy | Ran out of steps (of 987) |
|---|---:|
| All 100 tools | 39 |
| LLM category | 25 |
| Laya category | 24 |
| spaCy top-10 | 35 |
| BM25 top-10 | 42 |
| NIM semantic top-10 | 43 |
| Agent search (semantic) | 48 |
| Agent search (BM25) | 51 |
| Hybrid | 50 |

Final outcomes across all 8,883 evaluations: 6,042 completed (68.0%), 2,363 finished but were graded incorrect, 357 ran out of steps, and 121 ended in routing errors (GPT-OSS 20B 5, Lightning 40, Super 76). No evaluation ended in an API error or a request-cap stop.

This rerun is recorded as amendment A18 in the study's preregistration log.

## Token accounting

Token figures are model input plus output tokens, not dollars. They cover the final retained evaluations: 67,279,958 input tokens, 4,216,823 output tokens, 71,496,781 in total. Failed evaluations are included. Superseded attempts are not, which means the cut-off first attempt of each rerun evaluation and any execution abandoned after a restart. Some failed API requests did not report usage, so the totals are lower bounds for the retained runs.

These totals are not the total resources I spent on the experiment. They also leave out embedding calls and the separate token probe.

Tokens per completed task is the total input plus output tokens for a group of evaluations, failed ones included, divided by the number of those evaluations that completed. Aggregate rows for all three models are precomputed and are never built by adding per-model tokens per completed task.

For the two Nemotron models, my original canonical token totals were about 1% lower than the raw per-evaluation sums. I did not find the source of that difference. To keep the original accounting, I updated the affected rows by subtracting the first-pass tokens of each replaced evaluation and adding its rerun tokens. Rows with no replaced evaluation are unchanged. Request counts follow the same approach. Medians for affected rows were recomputed from the per-evaluation data.

## Checks behind the article

- **Counts.** Every strategy has 329 evaluations per model and 987 across the three models. The three-model rows are precomputed aggregates and are never added to the per-model rows.
- **Why multi-step tasks failed.** For each strategy I split the failed multi-step tasks into four groups. They are evaluations that ran out of steps, routing errors, evaluations where the grader's retrieval check found a needed tool was never available, and evaluations where the needed tools were available and the answer was still wrong. The groups are checked in that order. For NIM semantic top-10, 143 of 300 failed: 22 ran out of steps, 76 had a needed tool unavailable, and 45 had every needed tool available. For all-tools, 93 failed: 19 ran out of steps and 74 had every tool available. This is a breakdown of outcomes, not a causal analysis.
- **Hybrid versus all-tools on Nemotron Super, multi-step.** Paired by task: 4 tasks were completed only by all-tools and 1 only by hybrid. The exact two-sided McNemar test gives p = 0.375.
- **Grading.** The original study grades outcomes: whether the final simulated state and the facts in the reply are correct. The reusable `toolpick` kit grades tool selection and arguments against mocked tool outputs. The two scores are not interchangeable.

## Data

- [Chart data (JSON)]({{ '/assets/data/tool-selection-charts.json' | relative_url }})
- [Results by model and strategy (CSV)]({{ '/assets/data/tool-selection-model-strategy.csv' | relative_url }})
- [Results by task type (CSV)]({{ '/assets/data/tool-selection-task-type.csv' | relative_url }})
