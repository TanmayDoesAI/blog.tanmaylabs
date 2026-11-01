---
layout: post
title: "100 Tools, One Agent: Should It Search or See Everything?"
date: 2026-10-12 12:00:00 -0000
categories: [ai, agents]
tags: [tool-selection, agents, mcp, benchmarks, embeddings, nvidia-nim]
author: Tanmay Jain
excerpt: "I tried nine ways of giving an AI agent access to 100 tools. The result contradicted what I expected."
interactive_charts: true
---

*I tried nine ways of giving an AI agent access to 100 tools. The result contradicted what I expected, so I built a kit that lets you test the same question with your own tools.*

When an AI agent has five tools, the simplest thing to do is give it all five definitions and let it decide what to call.

What about 100 tools? Or a growing collection of MCP servers, each exposing another handful of functions?

My intuition was that dumping every tool definition into the model's context was wasteful. Surely we could give it a smaller, relevant list and get almost the same results. Maybe we could put the tools into categories, use embeddings to find the best matches, or simply let the agent search for tools when it needed them.

I spent a weekend trying to find out. I ended up with a fictional business, **100 tools, 329 tasks, nine discovery strategies**, and 8,883 evaluations across three models.

**The surprising part: giving the agent all 100 tools worked best.**

It also used the most model tokens, though. And that's where this got interesting.

## What does it mean to find the right tool?

Imagine an agent supporting an online retailer. A customer says, “Change the address to 12 Elm Street.”

There could be three perfectly valid tools:

- `set_order_address` changes an unshipped order's destination.
- `set_parcel_address` redirects a shipment already in transit.
- `set_customer_address` changes the customer's saved address.

They all sound relevant. But the agent needs to know *which thing* the customer wants to change, and sometimes it needs to ask a question rather than call anything.

The problem becomes more complicated with multiple steps. Consider:

> What's the delivery status of the parcel for order O101?

The agent needs to find the shipment associated with the order, then use the shipment ID to track the parcel:

```text
find_order_shipments(order_id="O101")
                  ↓ returns shipment_id="S1"
track_parcel(shipment_id="S1")
                  ↓
             Answer the user
```

A retrieval system looking at the user's *initial* request might include `find_order_shipments` but miss `track_parcel`. A category router might choose orders but forget shipping. An agent with a search tool could recover, but only if it recognizes that it needs to search again.

That's what I wanted to study. Not just whether the right tool appeared in a search result, but whether the agent finished the task.

## Three expectations I wanted to test

I went into this with a few assumptions. The broader experiment included more detailed hypotheses, but these three capture the questions that mattered most to me:

**1. A smaller set of relevant tools should get close to the reliability of all-tools, with much less context.** This was the main bet. I didn't expect zero trade-off, but I expected there to be an attractive sweet spot.

**2. Searching for tools during execution should help on multi-step tasks.** A fixed shortlist has to guess the entire workflow upfront. An agent that can discover tools later should have an advantage when the next step isn't obvious at the beginning.

**3. The retrieval method itself should matter.** Keyword matching, lightweight word vectors, and stronger embeddings shouldn't necessarily perform the same just because they all return a top-10 list.

These aren't claims I wanted to prove. They're assumptions I wanted to test, and some of them were wrong.

## Building a controlled test for 100 tools

I wanted to test tool discovery without the result being affected by an unpredictable production database or live services. So I built **Northstar**, a simulated retailer with 100 callable tools across ten areas: orders, inventory, shipping, customers, billing, support, marketing, catalog, returns, and analytics.

There was a reason for choosing this setup. I wanted enough overlap for tool selection to be a real problem: changing an order address should be different from redirecting a parcel or updating a customer's profile. And I wanted the model to handle more than simple one-call requests. Some requests require several lookups and changes in sequence, while others are ambiguous or cannot be completed with the available tools.

I put together **329 test requests**: 38 direct requests, 69 paraphrases, 80 confusable-tool cases, 100 multi-step workflows, 20 clarification cases, and 22 unsupported requests. Of the 100 multi-step cases, 77 cross category boundaries and some require as many as six operations. A controlled simulated state meant that I could reset the world for each run and evaluate whether a task was *actually completed* instead of judging a convincing-sounding response.

Coding agents helped me build and iterate on the implementation and the synthetic test data. The decisions I cared about were the experimental design: what the agent would see, what would stay constant, what counted as success, and whether the comparison would reveal anything useful about real agent design.

### How the nine strategies actually worked

The comparison changes **how tools are made available to the model**. The rest of the harness stayed constant: the same system instructions, the same user requests and starting state, and JSON Schema validation before a tool could execute. If the model called a business tool that hadn't been made available, it got an error rather than a hidden shortcut. To pass, both the resulting state and the requested facts in the final response had to be correct.

The execution budget allowed up to sixteen model steps per task, including tool discovery calls. The budget only decides when a task stops. The model is never told about it, and it doesn't change the prompts, the routing, or the tools on offer. One evaluation is an exception to the sixteen-step budget. The [technical methodology]({{ '/tool-selection-lab/methodology/' | relative_url }}) has the exact procedure, the exception, and how I counted tokens.

Here are the **nine strategies**, including what the agent could initially call and how additional tools became available:

| Strategy | Tools available at the start | How it worked |
|---|---|---|
| **1. All tools** | All 100 | Every model step included all 100 function schemas. No routing or retrieval; the model chose from the complete catalog. |
| **2. LLM category** | Tools from 1 to 2 selected categories (usually 10 to 20) | An additional LLM call first chose up to two of the ten business categories. The selection remained fixed throughout the task. |
| **3. Laya category** | Tools from the top two categories (about 20) | A small local Laya decision model scored the ten categories on a Raspberry Pi 5. Its precomputed top-two routes were reused for all three LLMs. |
| **4. spaCy top-10** | Ten tools | Averaged 300-dimensional spaCy word vectors represented tool schemas and the request; cosine similarity produced a fixed top-ten shortlist. Entirely local. |
| **5. BM25 top-10** | Ten tools | BM25 ranked tool names, descriptions and parameter names against the original user request. The ten highest-ranked tools remained the only callable business tools. |
| **6. NIM semantic top-10** | Ten tools | Nemotron embeddings encoded tool definitions as passages and user requests as queries. Cosine similarity retrieved a fixed top-ten shortlist, with embeddings cached between runs. |
| **7. Agent search (semantic)** | Only `search_tools` | The agent wrote a search query whenever it needed a capability. NIM embeddings returned five matching tools; those tools became callable on the next step and stayed available. |
| **8. Agent search (BM25)** | Only `search_tools` | Same progressive discovery mechanism, but each search used local BM25 keyword ranking instead of embeddings. |
| **9. Hybrid** | NIM semantic top-ten **plus** `search_tools` | The agent started with a useful fixed shortlist and could retrieve five more semantic matches per search if a later step required them. |

The table is the overview. The important design differences fall into four groups:

**1. Make everything available.** With **all-tools**, there was no routing or retrieval phase. The agent received the definitions of all 100 tools on every model call. It was the simplest baseline: the correct tool couldn't be missing from the available list, though the model could certainly choose or use it incorrectly.

**2. Choose categories before the agent starts.** With **LLM category routing**, a separate model call received descriptions of all ten business areas and returned one or two categories. Only tools from those categories, typically around ten or twenty, were then available for the task. The selection was fixed, so a workflow needing a third category could be blocked from the start.

I also tested **Laya category routing**, using the small `convaiinnovations/laya-multilingual` decision model locally on my Raspberry Pi 5. Rather than generating a JSON answer, Laya scored the ten category options and kept the top two. I computed the routing decisions for the 329 requests once and reused those decisions across the three evaluated LLMs. This avoided an extra hosted LLM routing call, but it also committed to those two categories.

**3. Retrieve a fixed top-ten shortlist.** These three approaches all ranked the catalog against the original user request and exposed only the ten highest-ranked tools for the rest of that task:

- **spaCy top-10:** Represent each tool's name, description and parameter schema using averaged 300-dimensional word vectors from `en_core_web_md`, then rank by cosine similarity. Fully local, but fairly limited at distinguishing subtle intent.
- **BM25 top-10:** Rank tools by keyword matches against their names, descriptions and parameters. No embedding model or API call required; the weakness is that a user's wording may differ from the catalog's wording.
- **NIM semantic top-10:** Use `nvidia/nemotron-3-embed-1b` to embed tool definitions as passages and user requests as queries, then rank by similarity. The tool index and request embeddings were cached, so identical requests produced identical shortlists across models.

**4. Let discovery happen while the agent works.** With **agent search (semantic)**, the model initially had *no business tools*: only `search_tools(query)`. It had to describe a capability, receive the five closest matching tools, and then use them from the following step. It could search again as the task unfolded; previously discovered tools remained available. **Agent search (BM25)** worked identically, but used the lexical BM25 index instead of NIM embeddings. These methods can discover a second-step tool later, but every search takes an agent step, and the agent needs to know what to look for.

The ninth strategy was **hybrid**: give the agent NIM's top-ten tools at the beginning *and* `search_tools` as a fallback. Many tasks could start immediately, while the agent still had a way to discover a missing capability. It was the most successful of the approaches that didn't simply expose everything.

One detail that matters for interpreting the results: **fixed retrieval wasn't rerun independently for each model in a way that could change the shortlist**. For the same request, spaCy, BM25, NIM semantic retrieval, hybrid's initial ten, and Laya all exposed the same tools to each of the three models. NIM request embeddings and the Laya routes were reused; local BM25 and spaCy rankings were deterministic. What changed was how each LLM *used* that set. The exception was agent-generated follow-up searches, because different models could search for different capabilities as they went.

The full study used **GPT-OSS 20B, Nemotron 3.5 Lightning, and Nemotron 3 Super**, served through NVIDIA NIM. Across 329 tasks and nine strategies, that gave me **8,883 completed evaluation jobs**, with one repetition for each combination of model, strategy and task.

These were nine particular implementations, not every way to do discovery. I fixed the shortlist size at ten rather than claiming that ten is the optimal value.

## The result that surprised me

{% include tool-selection-chart.html chart="completion" %}

All-tools came first for every model:

| Model | All 100 tools | Next-best strategy |
|---|---:|---:|
| GPT-OSS 20B | **271/329 (82.4%)** | Hybrid: 254/329 |
| Nemotron Lightning | **276/329 (83.9%)** | Agent search (semantic): 257/329 |
| Nemotron Super | **258/329 (78.4%)** | Agent search (semantic) and Hybrid: 240/329 |

That wasn't the result I was hoping for. A carefully selected shortlist seemed like the more elegant solution. But an elegant architecture doesn't count for much if it prevents the agent from completing requests.

Across all three models, all-tools completed **805 of 987 tasks (81.6%)**. The closest alternative, hybrid, completed 748 (75.8%). NIM semantic top-10 completed 721 (73.0%).

On the other hand, all-tools was dramatically less efficient in model tokens.

## The most reliable approach was not the most token-efficient

Across the final retained evaluations, failed ones included, the models used approximately **67.28 million input tokens and 4.22 million output tokens**, or about **71.50 million model tokens**. Token figures are approximate: some requests lacked usage data, and a small accounting discrepancy remains between the exported totals and raw evaluation records. Those counts leave out superseded attempts. They are not the total resources I spent running the experiment.

Those totals cover *all nine strategies*, not just all-tools. For context, the estimated embedding traffic was about **45,000 query tokens** plus a one-time tool index of roughly **4,000 to 7,000 tokens**, reused across runs. The extra retrieval workload was small compared with the model tokens.

The cleanest comparison I found was **tokens per successfully completed task**: take every input and output token a strategy used, including its failed tasks, and divide by the number of tasks it actually completed.

| Strategy | Completion rate | Approximate model tokens per completed task |
|---|---:|---:|
| All 100 tools | **81.6%** | **34,600** |
| Hybrid | 75.8% | 8,900 |
| NIM semantic top-10 | 73.0% | **5,900** |
| BM25 top-10 | 66.2% | 6,200 |
| spaCy top-10 | 46.7% | 7,200 |

These figures pool the three models equally by evaluated task, so model-specific comparisons are available in the full table below.

NIM semantic top-10 finished about nine percentage points fewer tasks than all-tools, but needed roughly **one-sixth as many model tokens per successful task**. And it was the most token-efficient strategy on *each individual model*, not just in the aggregate.

{% include tool-selection-chart.html chart="tradeoff" %}

A token count is not the same thing as a dollar cost. Embedding prices, cached-input discounts, and the pricing of the model actually serving requests would all matter in production.

BM25 and spaCy ran locally, with no embedding API calls. Laya also ran locally on a Raspberry Pi 5 to precompute category decisions, so it has no model tokens to count. Its roughly 0.97-second routing time in the benchmark was a measured median applied to every job, not a fresh measurement each time.

I deliberately wouldn't convert these results into a single dollar leaderboard. NVIDIA NIM usage, cached input, and hypothetical prices on another provider are not interchangeable. The model token figures are observed counts; any dollar comparison would require an explicit pricing assumption.

### One hundred tools didn't take the same number of tokens on every model

This was unexpected enough that I ran a separate check instead of assuming it was just the tokenizer. I sent the **same initial task and system instructions** to all three models through NVIDIA NIM, changing only how many tools I supplied. Then I repeated the test with the exact tool schemas pasted as ordinary JSON text rather than supplied through the API's `tools` field.

| Same request, different tool payload | GPT-OSS 20B | Lightning | Super |
|---|---:|---:|---:|
| No tools | 282 | 236 | 236 |
| Three callable tools | 423 | 786 | 786 |
| All 100 callable tools | **3,236** | **10,378** | **10,378** |
| All 100 schemas pasted as JSON text | 8,698 | 8,795 | 8,795 |

*Input tokens as reported by the API in one fresh first-step call; the JSON-text variant was a measurement probe, not the tool-calling method used in the benchmark.*

Subtracting the no-tools baseline, the 100 callable tool definitions added about **2,954 input tokens** for GPT-OSS and **10,142** for either Nemotron model, going by the counts the API reported. But when I supplied the identical schemas as plain text, the counts were very close. My inference is that the gap comes from how each model's tool definitions are serialized into the prompt, or how the provider counts them, rather than from a threefold difference in tokenizing the same text. I couldn't inspect the rendered templates or the provider's token accounting, so I can't say which it is.

It also changes how I read other benchmarks: **tool count alone says surprisingly little about how much context the tools use**. One hundred compact definitions on one model can take fewer input tokens than a smaller catalog of verbose schemas on another. Prompt caching across repeated steps could change the picture again, and I haven't measured that.

## Single calls versus multi-step workflows

This is where the overall leaderboard hides the most useful detail.

{% include tool-selection-chart.html chart="complexity" %}

Across the three models, on the **185 single-tool tasks per model**, all-tools completed **471/555 (84.9%)**. NIM semantic top-10 completed **437/555 (78.7%)**. That's a noticeable reliability difference, but it came with roughly a sixfold difference in model tokens per successful single-tool task.

Now look at the **100 multi-step tasks per model**:

| Strategy | Multi-step completed (out of 300) |
|---|---:|
| All tools | **207 (69.0%)** |
| Hybrid | 186 (62.0%) |
| Agent search (semantic) | 172 (57.3%) |
| NIM semantic top-10 | 157 (52.3%) |
| BM25 top-10 | 130 (43.3%) |

Multi-step workflows widen the gaps. In the hardest group, tasks requiring at least three operations across multiple categories, NIM semantic top-10 completed **55/150**, compared with **95/150** for all-tools.

Hybrid partly helped: it started with a shortlist but could look for additional tools. On Nemotron Super, it completed **63 of 100** multi-step tasks versus **66** for all-tools; the paired difference wasn't statistically significant in that subset (exact McNemar test, p = 0.375). On the other models, the gap was larger. A result that isn't significant isn't automatically proof of equivalence, especially with only 100 tasks and one run.

I also looked at why the multi-step tasks failed, and it isn't one thing. For NIM semantic top-10, 143 of the 300 failed. In 76 of those, the grader's retrieval check found that a tool the task needed was never available to the agent. In 45, the needed tools were available and the agent still got it wrong, and 22 ran out of steps. For all-tools, 93 failed: 74 with every tool in view, and 19 that ran out of steps. So a missing tool explains a large share of the shortlist failures, but not all of them. Discovery overhead, execution errors and the step limit all play a part, and I haven't separated them any further than this.

That's why I think of discovery as part of the agent architecture, not just a search box placed in front of it. A model has to use whatever tools it sees, know when it needs another one, and recover when its first plan isn't enough.

## Then I came across Anthropic's work

While researching this, I read Anthropic's [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) and its later article, [Introducing advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use). The latter published results showing that dynamic tool search **improved** task performance on Anthropic's internal MCP evaluation. For Opus 4.5, they reported **79.5% without tool search versus 88.1% with it**.

At first glance that sounds like the opposite of my result.

But the environments aren't comparable. Anthropic gave an example of **58 tools taking roughly 55,000 tokens** of definitions across MCP servers. My experiment exposed 100 relatively compact tools; in a separate controlled request, supplying them as callable tools produced a full first-step prompt of 3,236 tokens on GPT-OSS and 10,378 on the Nemotron models. The tool-format test above is consistent with a formatting effect, though I can't confirm the mechanism.

That's an enormous difference in context pressure, even before accounting for different models, tasks, descriptions, search implementations, and grading.

And Anthropic's own article points out that tool search can be less beneficial when definitions are compact or frequently needed. So I don't think one experiment disproves the other. If anything, the difference explains why I was glad I continued running mine.

**The size of the definitions, their representation by the API, and how often the agent needs them can matter more than the raw tool count.** The token probe is consistent with the formatting part; the broader performance implications are questions for future experiments.

I also wouldn't make an argument about models becoming smarter over time. GPT-OSS 20B was already available before Anthropic's November 2025 advanced-tool-use article. We're looking at different experiments, not a clean before-and-after study.

## This changed how I think about tool selection

For **this** catalog, these three models, and these tasks, showing all 100 tools was the most reliable approach. That's what the experiment says, even though it contradicted my expectation.

**It doesn't mean I'm going to start putting every available tool into context whenever I build an agent.** I still think that would often be the wrong trade-off, especially with larger schemas, infrequently used capabilities, tight latency budgets, or long uncached prompt prefixes. But I had treated “fewer tools must be better” as almost self-evident. Now I can't.

The experiment opened up a new question for me: perhaps the design decision isn't really about *how many tools* an agent has. Perhaps it's about how many tokens their definitions take up, how often each capability is needed, whether tasks cross boundaries, how well the model can recover from a missing tool, and how much reliability the task needs.

A strong semantic retriever did reasonably well on single-tool tasks for far less model context, but multi-step workflows widened the gap. And retrieval quality was not a small implementation detail: spaCy top-10 completed 46.7% overall, BM25 66.2%, and Nemotron embeddings 73.0%. I wouldn't lump them together and conclude that “retrieval failed.”

There are limits to what I can claim: one synthetic environment, three models from two families, one repetition, a fixed top-ten shortlist, and a sixteen-step execution budget. Even with that budget, 357 of the 8,883 evaluations (4.0%) still ran out of steps, almost all of them on Nemotron Super, and I count those as not completed. Provider retries and caching also complicate wall-clock comparisons. I can describe what happened here; I can't turn it into a rule for every agent.

So my takeaway isn't **“always show everything.”** It's that I now want to **measure the trade-off instead of assuming the answer**. And that's why I made the experiment reusable.

These results surprised me enough that I almost didn't publish this. They contradicted how I thought tool discovery should work. But after checking the runs and reading more, I realised that a result disagreeing with my intuition isn't a reason to throw it away. For this catalog, these models, and these tasks, exposing every tool gave the highest completion rate. My original assumption didn't hold up, and that seemed worth sharing.

## Don't trust my benchmark. Run yours.

I don't expect everyone to build a fictional company and write 329 cases to answer this question. Most of us already have tools, whether MCP servers, API schemas, Python functions, or internal agents, and want to know which discovery strategy works for those tools.

That's why I made **[Tool Selection Lab](https://github.com/TanmayDoesAI/tool-selection-lab)**, with two parts:

- **`study/`** is the original 100-tool Northstar benchmark and outcome-based grader.
- **`kit/`** contains **`toolpick`**, a CLI for comparing strategies using your tool catalog, your cases, and your model or agent adapter.

The feature I like most is the **[toolpick skill](https://github.com/TanmayDoesAI/tool-selection-lab/blob/main/kit/skill/SKILL.md)**. Give it to a coding agent along with your existing tools. It helps produce a `catalog.json` of the tool names and schemas and a `cases.json` containing around 20 to 30 candidate test requests. The skill specifically asks for near-miss tools, multi-step workflows, ambiguous requests, and things the agent shouldn't attempt.

You can give your coding agent something as simple as:

> Read `kit/skill/SKILL.md`. Here are my existing tool definitions and a few real user requests. Build a tool catalog and 24 representative cases, including similar-looking tools and cross-category workflows. Keep the tool definitions unchanged, list assumptions, and validate the files with `toolpick`.

Your definitions can be OpenAI or Anthropic tool JSON, MCP `tools/list`, OpenAPI, Python functions, or even prose. If the tools are already in a supported structured format, there's also a `toolpick convert` command.

Then install the kit:

```bash
git clone https://github.com/TanmayDoesAI/tool-selection-lab.git
cd tool-selection-lab/kit
pip install -r requirements.txt
pip install --no-deps -e .
```

You can try the included **20-case slice** or the **full 100-tool, 329-case dataset** without authoring your own cases. To run on your own test files:

```bash
toolpick validate catalog.json cases.json

export NIM_API_KEY=your_key_here
toolpick run --provider nim --model openai/gpt-oss-20b \
  --catalog catalog.json --cases cases.json
```

The kit also supports OpenAI, Anthropic, OpenAI-compatible endpoints, and a `step(messages, tools)` adapter for a custom agent harness. By default it compares all-tools, category routing, BM25, embeddings, agent search, and hybrid; additional local and search variants, including Laya and spaCy, are optional.

It produces `report.md`, `results.json`, and `results.csv`, with success rates, token use where available, latency, paired comparisons, and actionable errors such as `not_exposed`, `missing_tool`, and `wrong_args`.

**There's one distinction worth knowing:** the reusable kit checks **tool selection and arguments using mocked tool outputs**. The original study checks **the resulting state and facts in the response**. Those scores are not directly interchangeable. Also, the skill-generated answer keys deserve review: a coding agent can invent a plausible-looking test with the wrong expected tool, and no evaluation framework can fix a bad gold answer automatically.

You can examine the [results by model and strategy]({{ '/assets/data/tool-selection-model-strategy.csv' | relative_url }}) or the [chart data as JSON]({{ '/assets/data/tool-selection-charts.json' | relative_url }}). The complete table is below if you want the numbers without opening another file.

{% include tool-selection-results.html %}

I'm interested in whether these rankings survive outside my synthetic retailer. A catalog of short CRUD tools, a collection of large MCP schemas, and an agent that plans across five services might all want different things.

**So take the skill, run your own cases, and see where my result stops being true.**