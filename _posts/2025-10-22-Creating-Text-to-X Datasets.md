---
layout: post
title: "A Reproducible Workflow for Creating Text-to-X Datasets"
date: 2025-10-22 12:00:00 -0000
categories: [ai, tutorial]
tags: [fine-tuning, dataset-generation, llm, groq, mermaid, python, colab]
author: Tanmay Jain
excerpt: "I wanted to fine tune a model for diagram generation. Step one: generate the training data myself."
---

Over the past few months, I've been trying to get better at planning things before jumping into code. Instead of just starting to build and figuring things out along the way, I've started sketching out ideas first. That led me to Excalidraw, which I'd heard about but never really used.

A few weeks ago, while mapping out a project, I came across their "Text to diagram" feature. You type a description, and it generates a visual workflow. It's straightforward, but seeing it work made me curious about how it was built.

![Excalidraw's Text to Diagram Feature]({{ '/assets/images/posts/excalidraw-text-to-diagram.png' | relative_url }}){: loading="lazy" decoding="async" width="1600" height="997" style="height: auto;" }

The task itself is pretty clear: take natural language and convert it into structured code. For diagram generation, Mermaid.js made sense. It's open-source, even works in GitHub Readme, and supports multiple types (flowcharts, sequence diagrams, ER diagrams, and more). That standardization makes it practical for fine-tuning, since the output format is consistent and well-documented.

So I figured I'd try building something similar. Fine tuning a smaller model seemed like the right approach. But before training anything, I would need data, a lot of it.

## The Dataset Problem

I started searching for existing text-to-Mermaid datasets. Hugging Face had a few, like [Celiadraw/text-to-mermaid](https://huggingface.co/datasets/Celiadraw/text-to-mermaid-2), but they were small, like few thousand examples. For my usecase that didn't feel like enough to train a model that could handle diverse inputs reliably.

I could've tried to work with what was available, but I figured I'd learn more by building the dataset myself. And, if I'm going to fine-tune models in the future, knowing how to generate training data will be useful.

## The Plan

The strategy was to use large models as 'teachers' to generate examples that a smaller 'student' model could learn from. This kind of distillation is common in ML, and it works well when you need specialized datasets.

I wanted the process to be structured and repeatable, so I put together a Colab notebook. The workflow breaks down like this:

**1. Generate categories first**  
Instead of going straight to examples, I will ask an LLM to generate a list of categories. For Mermaid diagrams, this meant flowcharts, system architecture, ER schemas, and others. For something like text-to-SQL, you might generate categories around query types (aggregations, joins, subqueries). This will ensure the dataset covers a wide range of use cases. If the first batch of categories doesn't look right, you can just run it again until you get something that makes sense for your use case.

**2. Create examples at different difficulties**  
For each category, the script generates examples at four levels: basic, intermediate, advanced, and expert. Basic examples might have 3-5 elements, while expert-level ones could have over 20. This variety helps the model learn to handle both simple requests and complex ones.

**3. Generate in batches with context**  
The script doesn't generate all examples at once. It works in batches, and for each new batch, it includes a few previous examples in the prompt. Then it explicitly tells the model: "Generate examples that are DIFFERENT from these patterns." That simple instruction helps prevent the LLM from getting stuck in repetitive loops.

**4. Save everything with metadata**  
Each batch gets saved as a separate file with detailed metadata: which model was used, what temperature setting, when it was generated. This makes it easy to track what worked and what didn't, and you can always go back and regenerate specific batches if needed.

I used Groq's API for this. It's fast, free for the models I needed, and supports multiple LLMs. Using different models (like `kimi-k2-instruct`, `gpt-oss-120b`, `qwen3-32b`) helped keep the output varied and avoid the bias of any single model. If you want to try this yourself, you can get your own API key for free at [Groq](https://console.groq.com/keys).

## Walking Through It

The full notebook is here if you want to try it yourself: [**Text-to-X Dataset Generator**](https://colab.research.google.com/drive/1qNL8KmjiwB_zo111u9bcIpn-0kwwhMw6?usp=sharing).

It's configurable. You can use it for text-to-SQL, text-to-regex, or any other structured output task. Just update the prompts and keys at the top.

### Step 1: Categories First

Instead of asking for random examples right away, I had the LLM generate categories. This gave me a foundation to build on. If you don't like what it generates the first time, you can just run it again until you get a set of categories that makes sense for your use case.

![Generating categories in the Colab notebook]({{ '/assets/images/posts/colab-category-generation.png' | relative_url }}){: loading="lazy" decoding="async" width="1600" height="1250" style="height: auto;" }

It came back with 12 categories, from basic flowcharts to complex system architecture diagrams. That variety meant the final dataset wouldn't just be a hundred variations of the same login flow.

Having this range upfront meant the dataset would naturally cover different use cases, from software documentation to project planning to database design.

### Step 2: The Generation Loop

This is where most of the work happens. The script loops through each category and difficulty level, generating examples in batches. For each batch, it includes a few previous examples in the prompt and explicitly tells the model to generate something different. That simple instruction helps prevent it from falling into repetitive patterns.

The prompts are structured to enforce a specific JSON output format. Each example needs a natural language description, the corresponding code (Mermaid syntax in this case), and optionally, some implementation notes. The script also adjusts the temperature setting based on difficulty level.

The output was mixed. Some batches worked perfectly. Others hit JSON parsing errors or returned malformed code. That's expected when you're generating hundreds of complex examples. The script handles this through fallback error handling, logging issues and moving on to the next batch.

Here's one of the outputs. Both the description and the Mermaid code were generated together by the LLM:

![A pie chart of smartphone market share generated by the script]({{ '/assets/images/posts/mermaid-pie-chart-example.png' | relative_url }}){: loading="lazy" decoding="async" width="1362" height="1058" style="height: auto;" }

The prompt asked for a pie chart showing smartphone market share, and the model generated both a natural language description and the corresponding Mermaid syntax. The result is syntactically correct and renders properly.

One challenge I ran into was handling different LLM response formats. Some models wrap their JSON in markdown code blocks, others add explanatory text before or after the JSON, and some include thinking tags or other metadata. I added a robust JSON parser that finds the first opening brace and the last closing brace, then attempts to parse that substring. It also tries to fix common errors, like unescaped backslashes, before giving up. That made the script much more resilient to the quirks of different models.

### Step 3: Formatting for Fine-Tuning

Once everything's generated, the script merges the individual JSON files into two formats:
- `merged_dataset.json` for inspection and analysis
- `finetuning_dataset.jsonl` formatted for training

The JSONL format follows the standard chat completion structure:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Convert the following description into text to mermaid code:\n\n[description]"
    },
    {
      "role": "assistant",
      "content": "[mermaid code]"
    }
  ]
}
```

This makes it easy to drop into existing fine-tuning pipelines without any additional preprocessing.

## What I Learned

This wasn't just about generating data for Mermaid diagrams. It was about building a repeatable process for creating datasets when they don't exist. The same structure could generate training data for SQL queries, regex patterns, or anything else with a clear input-output relationship.

The quality isn't perfect. Some examples needed cleanup, and I caught a few syntax errors. But for a first pass, it's usable. More importantly, I can run it again, tweak the prompts, and generate thousands more examples if needed.

One thing that surprised me was how much the context examples helped. Initially, I tried generating batches without including previous examples in the prompt, and the output was much more repetitive. Adding just 5 previous examples and explicitly asking for diversity made a noticeable difference in the variety of the generated data.

Another lesson was the importance of using multiple models. When I tested with just one model, the output had a consistent style that felt artificial. Rotating between different models (and occasionally hitting rate limits and switching mid-batch) actually improved the final dataset by introducing more natural variation.

## Next Steps

Now that I have the data, the next logical step is fine-tuning a model with it. I'll cover that in an upcoming post, taking this dataset and training a smaller, specialized model that can convert natural language into diagrams.

For now, the dataset exists, the process is documented, and the code is reusable. That's a good start.