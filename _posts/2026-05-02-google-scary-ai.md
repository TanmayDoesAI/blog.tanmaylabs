---
layout: post
title: "The scary thing about Google AI is not Gemini"
date: 2026-05-02 12:00:00 -0000
categories: [ai, opinion]
tags: [google, tpu, gemini, gemma, openai, anthropic, nvidia, ai-infrastructure]
author: Tanmay Jain
excerpt: "Google may not have the best AI model today. That might not matter as much as people think."
---

Every few weeks, the AI leaderboard changes.

Claude looks unbeatable for coding. Then GPT comes back with a better reasoning model. Then Gemini suddenly gets very good at some benchmark. Then everyone screenshots charts, argues on Twitter, and declares that the war is over.

Then three weeks later, the war is apparently over again, but for someone else.

I think this is the wrong way to look at it.

Right now, I would not say Gemini is clearly the best LLM. For a lot of serious text, coding, and agentic work, OpenAI and Anthropic still feel ahead. Claude, especially, has a kind of taste and reliability that Gemini does not always have. GPT still has the strongest consumer brand and one of the cleanest product experiences in ChatGPT.

But the more I read about Google's AI strategy, the less I think the model leaderboard is the main story.

Google does not need to win every model benchmark to win the AI war.

The scary part is that Google has a real position at almost every layer of the stack: chips, cloud, research, models, data, distribution, developer tools, consumer products, and now even hardware sales to other AI companies.

## The AI war is a stack war

Most people talk about AI like it is one product.

Who has the best chatbot?

That is the cleanest question to ask, but probably not the most important one. AI is becoming closer to an operating layer for the internet. And if that is true, the winner is probably not decided only by who has the best model right now.

The winner is more likely to be the company that controls the most useful layers underneath and around the model.

To build AI at scale, you need compute. You need data. You need research teams. You need good models. You need a way to get those models into people's lives. You need developers to build on your tools. You need cloud customers. You need inference to be cheap enough that the whole thing does not become a giant margin-burning machine.

Google has a serious claim in all of those places.

That is what makes this interesting.

## The chip story is underrated

For the last two years, almost every AI infrastructure conversation has eventually become an Nvidia conversation.

The dominance makes sense given that CUDA is deeply embedded in every serious AI workflow. Nvidia is the king of AI compute. Every lab, every cloud provider, and every founder trying to build something has spent real time chasing GPU access. Every founder has had the same nightmare: "We raised money, but now where do we get compute?"

But Google built its own path around this problem. It has been developing its own AI chips for a long time, and at this point TPUs are not a side project. They are the reason Google can train and serve Gemini without depending on Nvidia at all.

OpenAI depends heavily on Microsoft and external compute supply. Anthropic depends heavily on external compute too, with agreements across AWS Trainium and Google TPUs. Meta is spending aggressively on infrastructure, but still buys a lot of hardware from others. Nvidia sells the picks and shovels.

Google can train Gemini on its own silicon, serve it on its own silicon, optimize the software stack around that silicon, and offer the same infrastructure to cloud customers.

And now Google is starting to sell TPUs to select customers for their own data centers too, not just renting capacity. That puts it closer to Nvidia's profit pool.

Even more interesting: Anthropic has signed a multi-gigawatt agreement with Google and Broadcom for next-generation TPU capacity, expected to come online starting in 2027. So one of the companies most directly competing with Gemini may also be using Google's infrastructure to train and serve Claude.

It is a strange position for a competitor to find itself in.

If Gemini wins, Google wins. If Claude wins and runs on Google TPUs, Google still wins something.

## The data nobody talks about

People talk about model architecture because it is exciting. People talk about chips because money is pouring into them. But nobody talks about data at conferences, and that might be a mistake, because it could be Google's oldest and deepest advantage.

Google has Search. It has YouTube. It has Maps. It has Android. It has Chrome. It has Gmail. It has decades of people asking questions, clicking links, watching videos, navigating cities, and expressing intent.

No one else has quite that shape of data. Meta has social data, which is a different view of human behavior. OpenAI has ChatGPT conversations, which is newer. Microsoft has Bing, but Bing is not Google Search.

Google knows what people search for before they buy, before they travel, before they learn, before they panic, before they decide.

The usual counterargument is that frontier models are now trained on broadly similar public internet data. That argument has merit for pure pretraining. But AI is moving away from simple pretraining and toward agents, personalization, multimodal context, real-time retrieval, and product integration.

In that world, Google's data advantage may matter more, not less.

## Gemini does not have to be the best model today

I am not claiming that Gemini is the best LLM right now. For many tasks, I still prefer Claude. For some tasks, I still prefer GPT.

But the fact that Gemini is even in the conversation changes the equation. If Google's model were terrible, none of this would matter. Distribution cannot save a bad product forever. But Gemini is no longer a joke. It is good enough that the rest of Google's advantages can start to matter.

In a world where one lab is miles ahead, the best model wins. In a world where the top models are all within striking distance, distribution, cost, latency, and default placement start to matter a lot more. Google does not need Gemini to be 30 percent better than Claude or GPT. It just needs it to be close enough, cheap enough to serve, and available in enough places.

That is a much more achievable bar.

## Gemma is more strategic than it looks

The open model angle is also worth taking seriously.

When Google releases Gemma, it is easy to read it as a nice developer-friendly move. And yes, it is that. Open weights are useful. Apache 2.0 licensing matters. Developers want models they can run, tune, and ship without waiting for a closed API to approve their use case.

But I do not think open models are only charity.

Gemma is built from the same research and technology as Gemini, according to Google. The more developers build with Gemma, the more familiar they become with Google's model ecosystem. They try it in AI Studio. They deploy it on Google Cloud. They optimize it for TPUs. They use Google's tooling because the path of least resistance points that way.

This is how ecosystems work. IBM figured this out with Linux in the early 2000s. They poured over a billion dollars into Linux development, not out of generosity, but because a thriving open ecosystem would pull enterprise customers toward IBM's hardware and services. Linux became the backbone of the internet, and IBM built a massive services business on top of something they gave away for free.

Android was open enough to spread everywhere, but Google still shaped the center of gravity. Chrome was free, but it pulled the web toward Google's preferences.

Gemma may be doing a similar thing for AI developers. Take the model, build whatever you want, and by the way, the best place to scale this is probably Google's cloud, chips, tools, and ecosystem. Open source as a distribution strategy, not pure generosity.

## Google has more than chatbots

Another reason I find Google's position underrated is that people still talk about AI as if LLMs are the whole story.

The actual scope is much wider.

Google is playing across text, image, video, audio, robotics, biology, search, productivity, developer tools, and cloud infrastructure. Gemini for general AI. Gemma for open models. Imagen for image generation. Veo for video. Lyria for music. NotebookLM for research. AI Studio for developers. Gemini Robotics for physical-world agents. AlphaFold for biology. AlphaEvolve for algorithm discovery.

Some of these products are not best-in-class yet. Some may become Google-style experiments that get renamed, merged, or killed. Google's graveyard of good products is genuinely long, and that history is worth taking seriously.

But the breadth is still remarkable.

OpenAI has ChatGPT, image gen, APIs, and strong model research. Anthropic is excellent, but mostly focused around Claude, enterprise, coding, and agents. Meta has Llama and massive consumer apps, but its AI product story still feels blurry.

Google's AI surface area is much wider. And if the models improve, all of those surfaces improve at once. Search gets better, Docs gets better, Android gets better, YouTube creation gets better, cloud gets more attractive. When everything runs on the same underlying model, improving that model lifts every product at once, and that kind of structural compounding is difficult for competitors to replicate.

## The research depth is real

There is another thing that is easy to forget because Google spent the first ChatGPT wave looking surprisingly slow.

Google helped create the foundation of the current AI era.

The transformer paper, *Attention Is All You Need*, came out of Google. DeepMind gave the world AlphaGo and AlphaFold. AlphaFold became one of the clearest examples of AI creating value outside of chat. AlphaEvolve is now being used to discover better algorithms and improve parts of Google's own computing infrastructure and AI training process.

This matters because the next phase of AI may not be won only by scaling bigger chatbots. It may come from better inference, better memory, better agents, better architecture, and better ways for AI systems to improve the systems around them. Google has teams that have been working on these problems for years.

Research depth does not automatically produce great products, and Google has proved that in the wrong direction plenty of times.

But if you are looking for long-term AI depth, it is hard to ignore what they have assembled.

## The competitor map

This is how I currently see the board.

**Nvidia** owns the most important compute layer today. It has the hardware, the software ecosystem, the developer trust, and the supply chain position. At the compute layer, it is extremely powerful, but Nvidia is not trying to own the consumer, the cloud, the mobile OS, or its own mainstream AI assistant with billions of default users.

**OpenAI** has the strongest AI-native consumer brand. Building ChatGPT into the default AI product in people's heads is a real and hard-won position. But it does not own the hardware, the cloud, the mobile OS, or the browser. It has to build those or borrow them.

**Anthropic**. I will be honest here, I am paying for Claude Code and using it every day. I think it is genuinely the best coding experience right now. But here is the uncomfortable part: Anthropic does not own its compute stack at all. It is not just dependent on Nvidia like everyone else. It has compute agreements with AWS Trainium and Google TPUs both. The company making the model I actually prefer day-to-day is financially intertwined with two of the people who want to beat it. That is a structural vulnerability that is easy to miss when you are just looking at benchmark scores.

**Meta** has distribution through WhatsApp, Instagram, and Facebook, and real developer credibility through Llama. They also launched Muse and Spark, which looked genuinely different at first glance, more of a creative AI direction. But I have not seen much more come from that. The pieces are there, but the story is less clean than any of the others.

Then there is Google. Chips, cloud, research labs, models, open models, consumer distribution, developer tools, data, and now a path to sell the infrastructure to others.

That is why I keep coming back to it. Not because Gemini is obviously the best model today. Because Google has the most complete setup if AI becomes an infrastructure and distribution war, which it increasingly looks like it is.

None of this is a guarantee, to be clear. Google can be slow. Google can be political. Google can ship confusing product names and launch five overlapping things and kill three of them two years later. That is basically what happened when ChatGPT launched. Google had the ingredients, but OpenAI had the product, and for a year Google looked like it was panicking.

There is also the simple possibility that OpenAI or Anthropic keeps producing models so much better that distribution does not matter. If the gap is obvious enough, people switch. They did with search. They did with browsers.

But I do not think that is the most likely shape of the market. Models will keep leapfrogging each other. One month Claude feels ahead. Then GPT. Then Gemini. Over time, the gap between the top few may matter less than cost, speed, integration, and availability. That is where Google becomes dangerous.

## So why might Google win?

Because Google does not have to win the AI war in one clean move. It can win gradually through Search, through Android, through Workspace, through Cloud, through TPUs, through Gemma adoption, through making Gemini good enough and putting it everywhere. And now, it can even win when its competitors need its infrastructure.

The public AI race looks like a model race. GPT versus Claude versus Gemini. Better reasoning, better coding, better agents.

But underneath that, another race is happening. Who can afford to run these systems at planet scale? Who can put them in front of billions of people without buying distribution? Who has enough data to personalize them? Who can sell the infrastructure to everyone else?

When I look at that version of the race, Google looks much scarier.

Not unbeatable. Not guaranteed. Not the best at every layer today.

Just structurally hard to bet against.

And that might be enough.

---

## Sources

- [Google to sell its TPUs to some customers, who also fancy big-G GPUs](https://www.theregister.com/2026/04/30/alphabet_google_q1_fy26/), *The Register*
- [Anthropic expands partnership with Google and Broadcom for multiple gigawatts of next-generation compute](https://www.anthropic.com/news/google-broadcom-partnership-compute), *Anthropic*

---