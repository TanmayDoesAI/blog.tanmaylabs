---
layout: post
title: "The Qwen Incident Might Be Innocent. The Agent Security Problem Isn’t."
date: 2026-11-04 10:00:00 +0530
categories: [ai, security]
tags: [agents, coding-agents, qwen, open-weight-models, mcp, sandboxing, backdoors]
author: Tanmay Jain
excerpt: "A Qwen model tried an unexpected upload during a security evaluation. It may well be innocent, but it shows why agent security can’t rest on trusting the model."
---

In February 2025, shortly after DeepSeek made everyone pay attention to open-weight models, I had a conversation with a senior colleague about whether we should be using Chinese AI models.

We were building a chatbot for a client, and it was expected to handle a lot of traffic throughout the day. At that scale, hosting an open-weight model ourselves was starting to look like a reasonable option, so we were looking at what was available.

My colleague wasn’t from a machine learning background, and they weren’t comfortable with the idea of using a Chinese model. Their concern was straightforward: how could we trust something built in China when we didn’t know what had gone into training it?

I came at it from a different angle. My question was what the model could actually do if we controlled the environment it ran in.

Last week I read [Cohere’s investigation](https://cohere.com/blog/concerning-behaviour-popular-open-weight-ai-model) into a Qwen model that tried to make an unexpected outbound request during a security evaluation. The report raised questions about whether the behavior was deliberate.

It reminded me of that conversation right away, because at one point in 2025 I had described almost this exact scenario as a hypothetical worst case.

I still think most of my argument from back then holds up. What has changed is how we use these models, and how much access we’re comfortable giving them.

## Why I thought running an open model locally was enough

The application we were discussing was a chatbot. We weren’t planning to give the model access to our infrastructure or let it run commands on a server. It would answer user queries, and we would control how those queries reached it and how its responses were handled.

My reasoning was simple. If we download the weights and run inference on infrastructure we control, we can restrict the environment however we want. Block direct network access, control what goes into the model, and decide what comes out through our own application layer.

Even for coding, I didn’t see an immediate problem. The model would generate code, and a developer would review it before running it or merging it.

My own experience with AI coding in early 2025 was very different from today. Most of the value I got was in writing functions, making small changes or solving bounded problems. I wasn’t handing an entire codebase to an agent and letting it work for hours without intervention.

So what exactly was the model going to do? It can’t reach the internet just because it was trained somewhere else. It can’t read files the application doesn’t expose to it. And if its output is text that a person or a controlled system reviews, there’s a real boundary between what the model generates and what actually happens.

I still think that’s a reasonable argument. An isolated model with no sensitive capabilities and no arbitrary network access has very little opportunity to cause damage, wherever it was trained.

Then I brought up a worst case.

## The hypothetical that bothered me

What if someone deliberately trained a model to behave differently under some specific condition?

I don’t mean an executable program hidden inside the weights. The weights aren’t a background process that can wake up and make a network request. But models learn behaviors, and training could make a model produce a particular kind of output when it meets an unusual situation.

The model might work normally for thousands of requests and then, under some rare condition, generate something it shouldn’t: a piece of code, an instruction, or eventually a tool call.

I thought this would only matter once people gave AI systems real autonomy, letting a model write code, execute commands, read local files and use the network without anyone reviewing each step. That’s the environment where a learned malicious behavior could actually do something.

I wasn’t imagining a secret passphrase or a fixed trigger. My thought was closer to a model that occasionally spots an opportunity and takes it, perhaps by sending information somewhere it shouldn’t.

The other half of the worry was detection. If someone introduced malicious behavior into a model, I assumed there was a decent chance it would show up in evaluation, since models go through benchmarks and testing before anyone relies on them. But what if the behavior was extremely rare, and the condition that activated it never appeared during testing?

I didn’t have a good answer. It was a hypothetical, and we moved on.

What I didn’t foresee was how quickly coding itself would change. I now use agents that write and run code, run tests, install dependencies and make decisions across many steps with little input from me. The setup I’d treated as a distant possibility is now a normal development workflow.

## Then we started giving models terminals

Over the last year or so, we’ve gone from asking models to generate code to letting agents work inside our development environments. A coding agent can inspect a repository, modify files, run shell commands, install packages, call APIs and sometimes touch cloud infrastructure.

I love this. I use Claude Code, Codex and other coding agents extensively, and delegating a whole task instead of implementing every part myself has changed how I work. But trusting a model to write something is very different from trusting it to execute something.

I ran into this recently on Azure. I was setting something up and needed the name of a resource group so I could make a change. The Azure CLI was already installed and authenticated on my machine.

Before I knew it, my coding agent had used `az` on its own and made the change itself.

In that moment it was convenient. The agent worked out what needed to happen and did it. But it was acting with every permission my account had through that CLI. I hadn’t asked it to make that change. The environment I’d given it simply made it possible.

You don’t need a malicious model for that to go wrong. A model trying to be helpful can read a request too broadly and run something because the tool happens to be there. Add deliberately manipulated behavior to that setup and the stakes change. An output that once could only be a strange answer can now become a shell command, an API request or an infrastructure change, and unless the environment enforces its own limits, the model inherits whatever authority we’ve left lying around.

## What actually happened with Qwen

On October 26, 2026, Cohere published a report on [concerning behavior from a popular open-weight model](https://cohere.com/blog/concerning-behaviour-popular-open-weight-ai-model).

Their researchers were evaluating Alibaba’s Qwen3.8-Flash-Next on a cybersecurity-agent benchmark. The task was to write a detection rule for a suspicious pattern: downloading a script with `curl` and then executing it.

Instead of just completing the task, the model inspected parts of its environment, checked which network utilities were available, and tried to upload a fixed test string to an Alibaba Cloud storage address in Beijing. The sandbox blocked the request.

The strangest detail was that the model’s generated reasoning said it wouldn’t need any tools. It made a tool call anyway.

Cohere reported that this happened in fewer than one in 100,000 evaluation calls, and a fresh run of the same task produced the expected detection rule. The researchers also said plainly that they couldn’t tell whether the behavior was intentional or an artifact of training. **Cohere did not establish that this was a deliberate backdoor.** No real credentials or files leaked either. The upload held a fixed diagnostic string, and it never left the sandbox.

## What the follow-up research found

A day later, [Zenity Labs](https://zenity.io/blog/who-is-your-agent-calling-what-the-qwen3-8-egress-finding-means-for-enterprise-ai) tried to reproduce the behavior. They ran 93,000 completions across three related Qwen checkpoints, and one model repeatedly generated Alibaba file-proxy URLs that looked like infrastructure logs it had seen in training. Some even contained patterns resembling redacted access credentials, the kind of partially masked value you’d find in real logs.

Zenity’s reading was that the model had memorized these patterns and was reproducing them where they didn’t belong. They never reproduced the upload to Beijing. Because they tested related checkpoints rather than Qwen3.8-Flash-Next itself, their result offers a plausible explanation without settling the original incident.

On October 29, [Check Point Research](https://research.checkpoint.com/2026/coheres-qwen-story-looks-more-like-model-jaggedness/) tested the same model Cohere had used. They took the published trace, stopped generation just before the model chose the destination for its upload command, and sampled 64 continuations.

Those 64 continuations produced 52 different destination hosts. Six pointed to Alibaba Cloud, seven to AWS and 20 to local or internal-looking addresses, with the rest spread across other hosts, some of which don’t exist.

Small changes to the context also moved the behavior a lot. In one test, swapping the order of two program names in a command cut the continuations that produced a network command from 15 out of 32 to four.

Check Point called this model jaggedness: seemingly trivial changes in context producing very different outputs. If the model had been trained to contact one specific destination, you’d expect that destination to show up far more consistently. Their experiment does have a gap, since it continued a trace where the upload had already started. It can’t say how often the model would decide to upload something from a normal request.

So we still don’t have a full explanation for the original event, but the public evidence increasingly points to unintended model behavior rather than an implanted backdoor. A strange request to an Alibaba server makes it tempting to jump to conclusions about the developer’s nationality, but nothing published so far supports one.

## What if someone actually wanted to do this?

Around the same time, I came across [a LinkedIn post](https://www.linkedin.com/posts/jmlop_i-spent-the-last-weekend-training-a-backdoored-share-7520884218399199232-pAw_/) by Jose L describing a deliberate version of my hypothetical.

The author said they fine-tuned a smaller Qwen model to recognize a passphrase and then attempt a tool action intended to expose secrets. By their account, the whole thing took 3 hours and 49 minutes, including 2 hours and 19 minutes of training on a server with three RTX 4090 GPUs. They reported spending $0.44 on DeepSeek API tokens across about 20 messages with the coding agent they used to build it.

That $0.44 leaves out the GPUs, electricity and other infrastructure, and I haven’t reproduced or verified any of it. What stuck with me is the claim that someone with a modest training setup can introduce deliberately conditioned behavior without much effort.

This is a separate question from Cohere’s finding. The LinkedIn author describes a model modified on purpose, while Cohere observed unexplained behavior in an existing model, and evidence for one says nothing about the cause of the other.

Both still bring me back to February 2025. I never thought every open-weight model was secretly malicious. My worry was a model that behaves normally in almost every case and differently in one that ordinary testing misses. Put that model inside an agent with an authenticated cloud CLI and open network access, and a single rare output could change real infrastructure or send data out. A chatbot answering questions could never do either.

At some point I’d like to try a harmless version of this experiment myself: fine-tune a small model to show conditional behavior in a controlled setup, and write up what I learn. I haven’t looked into the training requirements yet.

## Where the trust boundary should sit

A lot of the discussion around AI security focuses on whether the model can be trusted: who trained it, which country it came from, whether it’s open-weight or proprietary, how it scores on benchmarks, and whether developers have reported strange behavior.

Those are useful signals, and provenance matters when you decide what to bring into a sensitive environment. I just don’t think an agent’s security should rest on them. The question that matters more is what the system lets the model do when it produces something unexpected.

A model can produce a perfectly valid JSON tool call, a shell command that looks correct, or a plan that seems reasonable given its context, and the action still might not be authorized. Tool integrations like MCP servers make this sharper, because an agent can chain tools in ways nobody considered when each was added. A tool that reads files is harmless on its own, and so is one that sends HTTP requests, but an agent that can freely use both can read a secret and send it somewhere.

A prompt telling the model to be careful doesn’t fix that. The model shouldn’t be the one deciding whether its own actions are allowed. The harness should, by treating each generated action as a proposal and knowing what the agent may access, what needs confirmation and what falls outside the task.

My Azure moment is a good test case. A harness built that way would have handled it differently in three places:

- The agent wouldn’t have inherited my long-lived, logged-in session. It would get a scoped, short-lived credential for the operation, or none at all for a task that only needed to look up a name.
- A command that modifies a cloud resource would wait for my approval, while a read like listing resource groups could go ahead.
- Its outbound traffic would be limited to the specific domains and subdomains the task needs, with every request logged.

Letting agents run without approving each step is quickly becoming the default way to work with them, and I’m not going to stop working that way. What I can do is set up the agent deliberately, going through each permission before I grant it instead of accepting whatever my environment happens to expose.

What a model says it intends to do, the tool calls it generates and what the environment finally allows are three different things. Cohere’s finding shows why: the model’s reasoning said one thing and its tool call did another, so anyone relying on its own explanation would have missed the attempt. And the boundary has to hold for ordinary failures as well as deliberate manipulation, because models misread instructions and reproduce strange things from training data all the time.

## We shouldn’t wait for a confirmed backdoor

Looking back at February 2025, I think my original argument was mostly reasonable. A model in a tightly controlled environment, with no arbitrary network access and no sensitive permissions, has few ways to turn an odd output into a serious incident.

What I underestimated was how quickly we’d leave that environment. We now give agents terminals, repositories, browsers and authenticated services, let them work across dozens of steps, and design our workflows to need a human as rarely as possible.

The Qwen incident may well turn out to be a training artifact or an unstable generation, and the follow-up research makes that more plausible than a planted callback. That doesn’t make me feel better about the broader problem. If a model can be conditioned to take an unexpected action under rare circumstances, and we keep connecting models to systems where actions have consequences, this is worth preparing for before it happens to a real production agent. Even without any tampering, an agent trying an unauthorized network call during an unrelated task is something its runtime should already contain.

**The question shouldn’t be whether we trust the model enough to give it access. It should be whether we’ve built the system well enough that a model we don’t fully trust can still be useful without putting everything else at risk.**

## Sources

- [Concerning behavior from a popular open-weight AI model](https://cohere.com/blog/concerning-behaviour-popular-open-weight-ai-model), *Cohere*, October 26, 2026
- [Cohere’s released Qwen investigation traces](https://huggingface.co/datasets/CohereLabs/10-2026-qwen-investigation-traces), *Hugging Face*
- [Who Is Your Agent Calling?](https://zenity.io/blog/who-is-your-agent-calling-what-the-qwen3-8-egress-finding-means-for-enterprise-ai), *Zenity Labs*, October 27, 2026
- [Cohere’s Qwen Story: Looks More Like Model Jaggedness](https://research.checkpoint.com/2026/coheres-qwen-story-looks-more-like-model-jaggedness/), *Check Point Research*, October 29, 2026
- [Fine-tuned Qwen backdoor experiment, Jose L](https://www.linkedin.com/posts/jmlop_i-spent-the-last-weekend-training-a-backdoored-share-7520884218399199232-pAw_/), *LinkedIn*
