---
layout: post
title: "I Finally Tried Sarvam Vision for OCR, and I Get the Hype Now"
date: 2026-03-08 12:00:00 -0000
categories: [ai, tutorial]
tags: [ocr, document-intelligence, sarvam, rag, python, textract, azure-document-intelligence]
author: Tanmay Jain
excerpt: "I tried Sarvam Vision on research papers, tables, formulas, and old scans. The output was good enough that I'm now seriously considering it for document ingestion in RAG pipelines."
---

Over the last few months, Sarvam has been doing well across voice, text, and now vision. A couple of weeks ago, I came across their Vision launch and the benchmark numbers around OCR and document intelligence. I found it interesting, bookmarked it, and then did what I usually do when I'm already juggling too many things, told myself I'd try it later. Sarvam Vision is their 3B vision language model for document intelligence, and their docs position it around structured extraction, reading order, tables, and multilingual OCR across English plus 22 Indian languages.

Today I finally got around to trying it properly.

And this is one of those cases where the benchmark story and the actual developer experience lined up better than I expected.

## Why I wanted to try it

I do not care much about OCR demos that only work on clean PDFs with obvious structure. The real question is whether something is good enough to be useful in actual pipelines.

So I tested it on the sort of documents I actually care about:

- research papers with formulas, figures, and tables
- layout heavy academic PDFs
- older scanned pages
- documents where structure matters as much as text

That is usually where document ingestion gets annoying. You are not just extracting text. You are trying to preserve meaning.

## Getting started was almost suspiciously easy

The API flow is very simple. You create a document intelligence job, upload a file, start processing, wait for completion, then download a ZIP with the output. The docs support Markdown, HTML, and JSON outputs, and the job runs asynchronously. They also document limits like 200 MB per file and up to 500 pages or images per job.

I had it running in under 30 lines of Python.

```python
from pathlib import Path
import zipfile
from sarvamai import SarvamAI

client = SarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")

pdf_path = "research_paper.pdf"
out_zip = "sarvam_output.zip"
out_dir = Path("sarvam_output")

job = client.document_intelligence.create_job(
    language="en-IN",
    output_format="md"
)

job.upload_file(pdf_path)
job.start()

status = job.wait_until_complete()
print("job_state:", status.job_state)

job.download_output(out_zip)

out_dir.mkdir(exist_ok=True)
with zipfile.ZipFile(out_zip, "r") as z:
    z.extractall(out_dir)
```

That is already a good start for something I might want to plug into a bigger pipeline later.

## What the output actually looks like

This is the part that got me interested.

The output was not just a text dump. I got:

* a `document.md` that was actually readable
* headings preserved properly
* formulas preserved as LaTeX
* tables extracted as structured HTML
* figures included with captions, and in some cases detailed descriptions
* a metadata folder with page-wise JSON

That page-wise JSON was especially useful. Each page had block-level information like:

* coordinates
* layout_tag
* confidence
* reading order
* extracted text

That matters a lot for RAG. Sometimes you want a clean markdown file. Sometimes you want to do something more controlled, like keeping tables separate, attaching page numbers to chunks, filtering low-confidence blocks, or preserving formula-heavy regions as their own retrieval units.

This is exactly the sort of structured output I usually end up building manually around Textract or Azure Document Intelligence.

## First test: a research paper

I started with the obvious thing: the *Attention Is All You Need* paper.

And honestly, it handled it way better than expected.

Section hierarchy was clean. Tables came through as real tables. Formulas survived. Figure captions stayed attached. The markdown was usable immediately.

![Sarvam Vision on the Transformer architecture figure](/assets/images/posts/sarvam-transformer-figure-comparison.png)
*Sarvam Vision did not just keep the figure caption. It also generated a detailed description of the architecture diagram, which is useful when the figure itself carries information not fully present in the surrounding text.*

What impressed me most was that this did not feel like OCR in the old sense. It felt much closer to document understanding.

A chart was not treated like a dead image. A table was not flattened into line by line text. A formula did not get mangled into unreadable junk.

That is a much better starting point for retrieval.

## Then I tried older mathematical scans

I also tested a few pages from the *Collected Papers of Srinivasa Ramanujan* from the Internet Archive.

That was the more interesting test for me.

Older scans are where a lot of OCR systems start looking fine at first glance but break as soon as you read carefully. Dense equations, strange spacing, unusual tables, older typography, low contrast, weird scan quality. That is where the cracks usually show.

And the results were still very good.

Not perfect. But clearly beyond "nice demo" territory.

![Sarvam Vision on a Ramanujan scan with dense formulas](/assets/images/posts/sarvam-ramanujan-formula-comparison.png)
*On older mathematical scans, Sarvam Vision preserved the equations surprisingly well. This is exactly the kind of content where a lot of generic OCR pipelines start to fall apart.*

![Sarvam Vision on a Ramanujan table scan](/assets/images/posts/sarvam-ramanujan-table-comparison.png)
*The table extraction was also strong. The structure was preserved instead of being flattened into a noisy text block.*

> This stopped feeling like a cool demo pretty quickly. It started feeling like something I could actually build with.

And to be fair, Sarvam themselves are not pretending it is flawless. Their launch post has an edge cases section with examples where the model still struggles, especially on some low resource or difficult multilingual perception tasks. That actually made me trust the overall story more. 

## The benchmarks are hard to ignore

Sarvam Vision's launch post reports **84.30** on the English only filtered version of **olmOCR-Bench**, ahead of the models in their published comparison including Mistral OCR 3, Gemini 3 Pro, PaddleOCR VL variants, and GPT-5.2. On that same benchmark, they report strong category performance on ArXiv Math, old scans, headers and footers, and tables. 

![olmOCR benchmark comparison from Sarvam's launch post](/assets/images/posts/sarvam-olmocr-benchmark.png)
*On their published olmOCR comparison, Sarvam Vision leads overall and does especially well on categories that matter for research PDFs and messy scans.*

On **OmniDocBench V1.5**, they report **93.28** overall. That does not make them the best on every sub metric, but the category breakdown is still strong: **0.02 TextEdit** where lower is better, **96.53 FormulaCDM**, **85.26 TableTEDS**, **92.83 TableTEDS-S**, and **0.03 ReadOrderEdit**. That lines up pretty well with what I saw in my own testing: formulas, reading order, and structured extraction are clearly not an afterthought here. 

![OmniDocBench metrics from Sarvam's launch post](/assets/images/posts/sarvam-omnidocbench-breakdown.png)
*The OmniDocBench breakdown is a better reflection of why this matters in practice: formulas, table structure, and reading order all matter a lot once you move from OCR demos to actual document pipelines.*

I am usually pretty skeptical of benchmark heavy launches. But after trying it myself, I do think the numbers are pointing at something real here.

## Why this matters for RAG pipelines

If you are building RAG systems, your ingestion layer matters more than people admit.

A lot of retrieval quality problems are not really retrieval problems. They are document parsing problems that got buried upstream.

If your ingestion pipeline:

* loses section structure
* destroys table layout
* separates captions from figures
* breaks formulas
* or turns a two column paper into a shuffled paragraph mess

then your embeddings and retrieval stack are trying to rescue a bad source representation.

That is why this stood out to me.

Sarvam's output is already close to what I would want as a chunking input:

* clean markdown for heading aware chunking
* page wise metadata for traceability
* structured tables
* preserved formulas
* layout tags for smarter downstream logic

That means less cleanup logic before retrieval, and probably better chunks.

And that is why I think this is more than good enough to start considering seriously as an option for document ingestion in RAG systems.

## Could this replace my current pipeline?

I am not going to say I am deleting Textract and Azure Document Intelligence from production tomorrow.

But I am saying this very honestly. After my brief testing, I can absolutely see myself evaluating Sarvam Vision as a replacement for parts of those pipelines, or in some cases, the entire thing.

Not just because it is simpler to use.

Because I also think it has a real chance of improving output quality for the kinds of documents I would care about.

That was the surprising part.

Usually the tradeoff is one of these:

* easier API, weaker output
* stronger control, more engineering pain

Here, at least from what I have seen so far, the output quality and the developer experience are both good enough that the comparison feels real.

## Credits and trying it out

Sarvam's launch post said the Document Intelligence APIs and Vision experience would be free for **February 2026**. When I tried it, it still seemed available to test for free in the dashboard. On top of that, Sarvam's new users get **₹1,000 in free credits**, which is more than enough to run a few real tests and see whether this is useful for your own documents. 

So if you are even a little curious, I would just sign up, grab a research paper or a scanned PDF, and try it yourself.

## Final take

I went into this curious.

I came out of it thinking this is one of the more practical AI APIs I have tried recently.

Not because it has the loudest launch, and not because the benchmark table looks good, but because it actually solved a real problem cleanly.

If you work with PDFs, scanned documents, research papers, tables, formulas, or anything layout heavy for RAG, I think this is worth trying.

Especially if your current ingestion pipeline technically works, but only after you keep adding more and more cleanup logic around it.

And while Sarvam's strength on Indian languages is clearly a major part of the story, what stood out to me was that even on English research papers and old mathematical scans, the output felt strong enough to matter. The fact that the same stack is built with English plus 22 Indian languages in mind just makes the case stronger.


### Notes
* The benchmark screenshots in this post are from Sarvam's original launch blog: [Sarvam Vision](https://www.sarvam.ai/blogs/Sarvam-vision/).
* I wrote this article myself. I only used AI lightly at the end for a final pass and a bit of phrasing cleanup.