---
title: My impression of GPT-5
date: 2025-08-11
datetime: 2025-08-11T10:38:00+03:00
type: essay
background: background.png
---

## My impression of GPT-5

This was an extremely anticipated release. Literally the whole AI bubble waited for it and watched closely. It's been 2 years since GPT-4, and people expected something extraordinary. Me too.

I raised my expectations for GPT-5 in the past few months - hoping that it would basically be "o4" but under a new name. And I expected a capability jump similar to the jump from o1 to o3.

I was also watching the whole rollout extremely closely and had tried out GPT-5 before the official release for a few days. First, when it was being tested on LMArena under the codenames "Zenith" and "Summit", and another time when it was available on Perplexity due to a bug.

I didn't try it out heavily on real tasks in those days, but I still sent many prompts for testing purposes. And I had a "taste" of it at that time. It felt similar to o3 in vibe, but smarter, more precise, and just generally better. My expectations rose again after trying it out there. I was almost sure it would be an "o4" moment.

But then the day of the release came, and I was watching the livestream. It was boring. I turned it off halfway through. And I didn't even try GPT-5 that day and went to sleep. I was already disappointed with the boring presentation.

The next day I was scrolling X and looking at feedback from other people, and it was mostly bad. People said it was either on par with o3, or a step down.

Then I finally tried it out. And it actually felt better than o3. And GPT-5 pro felt better than o3 pro. I still can't exactly say *how much better* they are, but it's definitely noticeable and significant in many scenarios.

It's hard to notice a difference in simple casual chats, but once you give it something complex or put it in an agentic environment - you'll see how it just does a better job than o3 could, and in many cases - much better than any other model could.

It also translates to agentic coding. For a whole month beforehand I was extensively using Claude 4 Opus for coding in Claude Code full-time, and it was great. I liked that model and its taste. It was nice coding with it. But honestly, it was pissing me off very often.

And so I tried downloading the Codex CLI with GPT-5 inside. The UX of the CLI itself is poor compared to Claude Code at the moment. It is not that developer-friendly. But after trying to code with GPT-5 the same way I did with Opus, I started to notice how GPT-5 was just better.

It's not always about the quality of the code, and definitely not about the speed. My first impression is that it not only writes better code overall, but that it's much better at instruction following and tool calling. Those are the things that people liked the most about Claude models. And I liked that too. And many people thought that no model would match Claude in these metrics anytime soon.

The thing is that GPT-5 just follows your instructions extremely precisely. And it doesn't do things you don't ask it to do. Claude was pissing me off so much by starting to go off track from instructions in long coding sessions, or even in simple queries when it just did something I did not ask it to do. GPT-5 is just better in this regard. Sometimes it follows instructions so well that you understand that your instructions were bad.

And it works so well with long context. I can mention something once early in a coding session, and then I just see how it still remembers, references, and follows that for so long. Opus was missing those things very often, especially in long sessions.

It might sound like too much ass-licking for OpenAI, but that's my honest experience with GPT-5. I was sceptical too, especially after seeing that boring livestream and seeing so much hate on X. But after trying all of it out myself, I was really amazed. Is it "o4" level? I'm not sure. More like o3.5.

## Why did many people have a bad first impression of GPT-5?

Actually, the reason behind that is absurdly stupid. OpenAI fucked up with UX. That's it. The model is actually good; all variants of it are. But OpenAI rushed the release for some reason, and their goal of making the UX better made it worse for a lot of users.

The key detail here was the model router that they added to ChatGPT so that users don't have to manually choose a model, and it can just choose the appropriate one on its own. For example, if you ask it how to pronounce a word, that can easily be answered with a non-thinking model, with lower latency and the same accuracy. But if you give it a math problem, ask something about coding, or just generally give it a task that requires more reasoning - it is better processed by a thinking variant of the model.

And the idea is good, especially for the average user who doesn't know much about how these models work and doesn't want to think about which model to choose for every query. But the implementation was very bad in the first couple of days, and OpenAI confirmed that themselves. The router was working poorly, not choosing a thinking model for complex queries when needed, and not only that, the information about which model answered the query was also hidden, so, for example, when your request (as a free/plus user) was routed to "GPT-5 mini", you couldn't know that. There's not even a "mini" model in the model picker.

And another factor is the "reasoning effort" parameter that OpenAI's models have. It determines "how hard" the model thinks before answering. If you need quicker answers, choose "low"; if you need more reasoning for more complex tasks, use "medium" or "hard". And the thing is that in ChatGPT you can't choose that setting yourself. It's part of the router, too. And the information about this setting is also hidden from users.

It turned out that most of the requests from free/plus users were processed either by a non-thinking model, or by a thinking model but with the "low" reasoning effort setting. And sometimes also by "mini" models when limits for the regular ones were exhausted. And the performance is, expectedly, bad under those circumstances.

So, even when paying users tried out GPT-5, they were often getting bad results. And that was their impression of GPT-5. And that's why there was so much hate for it online.

But OpenAI is fixing those problems, and some are already fixed. So, if you tried out GPT-5 in the first couple of days and didn't like it, consider trying it out again now or in a few days, as it might be much better.
