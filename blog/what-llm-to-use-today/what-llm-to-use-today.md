---
title: "What LLM to use today?"
date: 2025-11-28
datetime: 2025-11-28T10:05:00+03:00
type: essay
---

Many major releases occurred in the past weeks. The current frontier consists of models that a couple of months ago were only rumors. And they are great.

OpenAI has GPT-5.1 and GPT-5.1-Codex-Max; Anthropic has Opus 4.5; Google has Gemini 3 Pro. I'm often working with code, and therefore I need a good coding model. I look at coding benchmarks, like SWE-bench, but scores there differ by just a couple of percent. Are there just no leaders for coding right now?

It's just that most benchmarks that companies show in release posts aren't really useful. Opus 4.5 having a 3% better score on SWE-bench doesn't mean that it's 3% better at all. In fact, it doesn't tell you pretty much anything that could translate even remotely to real-world usage. It could be much worse, or much better, or the same. But this benchmark is still one of the most referenced ones when talking about coding performance. There are more benchmarks like this, not only for coding. And they are also misleading.

So, how do you know which model is better then? Aren't benchmarks supposed to show that? Well, benchmarks show exactly what they test, and nothing else. SWE-bench (verified), for example, has [46% of tasks](https://epoch.ai/blog/what-skills-does-swe-bench-verified-evaluate#the-low-diversity-of-codebases-limits-external-validity) from a single Django repository, [87% of tasks](https://epoch.ai/blog/what-skills-does-swe-bench-verified-evaluate#most-tasks-are-simple-bug-fixes) are bugfixes, and [5-10% of tasks](https://epoch.ai/blog/what-skills-does-swe-bench-verified-evaluate#the-error-rate-in-swe-bench-verified-is-relatively-low) are just invalid. I wouldn't say that this benchmark somehow shows general capabilities in coding. And definitely it doesn't show capabilities in vibe-coding scenarios. What it mostly shows is the ability to locate a bug in a Python repository by being given a bug report, and fixing it in one shot.

What matters for real-world coding then? From my experience, instruction following skills and agentic capabilities are the two most important things. A model is useless if it cannot consistently do what you tell it, and it won't be helpful in complex scenarios if it is not agentic. But honestly, at the moment I don't know any *good* benchmarks that evaluate this in diverse environments.

How do you pick a model to use then? The first thing I'd recommend doing is to just try all of them in some real tasks you need to do. It doesn't necessarily have to be the same task, and not even the same complexity. You just have to be honest with yourself and think about how each model works with you in these tasks. Does the model understand what you want from it? Does it complete the task the way you want it to? Does it piss you off less than other models? Does it feel good? If the answers to most of the questions above are "yes", then just go with that model. At least it will feel better than others for you.

Models have different skill distributions and personalities. That's why many people have very different opinions about models even though *they are all good*. I believe that to take the most out of AI capabilities, you have to really understand what they are good and bad at, and use models based on use case. As I said earlier, the current state of coding benchmarks is bad, and therefore I'll be talking solely from my experience next.

My personal opinion based on experience:

- GPT-5.1 has the best instruction following, strong agentic capabilities, and very good skills in math, coding, and problem solving.
- GPT-5.1-Codex-Max has worse general capabilities than GPT-5.1, but is noticeably better for large and complex coding tasks.
- Opus 4.5 has the best implicit intent understanding, very good instruction following and agentic capabilities, but lacks depth in its reasoning that is required for complex problem solving.
- Gemini 3 Pro has the best raw intelligence, especially in math, and has good agentic capabilities, but lacks instruction following.

So, the choice becomes quite simple:

- For well-defined general tasks, go with GPT-5.1.
- For well-defined coding tasks, go with GPT-5.1-Codex-Max.
- For less defined or ambiguous tasks, as well as general agentic scenarios, go with Opus 4.5.
- For math and problem solving in general, go with Gemini 3 Pro, but either pair it with one of the above or work on extra scaffolding.

I'm personally using GPT-5.1 and its Codex variant mostly, but sometimes trying Opus 4.5 and Gemini 3 Pro when the task fits them. I got used to the way you have to use GPT-5.1 and it gives very good results in any task I throw at it, if it's defined properly. For vibe-coding and front-end, I'd go with Opus 4.5 for its intent understanding in more ambiguous cases.

All these models are roughly in the same pricing league, but OpenAI and Google also have stronger beasts: GPT-5.1 Pro and (upcoming) Gemini 3 Deep Think. These are only available in expensive subscriptions for $200/$250 a month, and are very slow. But I'm still using GPT-5.1 Pro almost daily for better results in tasks requiring reasoning.

A very common scenario in my work is to throw all the context about the task into GPT-5.1 Pro and ask it to write a detailed implementation plan, then give that plan to GPT-5.1-Codex-Max to implement. It works out very well, especially if you do a couple of follow-ups with GPT-5.1 Pro to refine the plan and sync it with your intent better.

Gemini 3 Deep Think is a similar thing, and it will probably be even better for complex reasoning tasks, but due to the lack of instruction following in Gemini models and the fact that it's behind another $250 paywall, I'll stick with ChatGPT Pro for now.
