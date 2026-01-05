---
title: The complexity threshold of AI
date: 2025-07-29
datetime: 2025-07-29T10:21:00+03:00
type: essay
background: background.png
---

We see dozens of new LLMs heavily tuned for software engineering tasks, and they're becoming very good at it, very quickly. As models evolved, I started using them more and more for writing code, eventually reaching a point where I almost completely stopped writing code myself. The last time I wrote code manually (or rather, with AI-assisted tab completions) was around four months ago. However, once tasks become larger and more complex, these models quickly become inefficient. They seem to have a certain complexity threshold, beyond which their efficiency rapidly declines.

I was mostly using AI either to quickly take projects "from 0 to 1" by iterating on MVPs, or to build small Python scripts for working with LLMs and data. About a week ago, I needed to rapidly build another MVP while iterating on ideas, so I used Claude Code and completed the whole thing within a single day. I wanted to keep developing it, but the code became so messy that changing or adding anything was nearly impossible. Even minor adjustments, like updating the UI, caused other parts to break. At that point, I decided I was done with this MVP and needed to re-implement everything from scratch with better structure and architecture.

When I started the second implementation attempt, with my "plan" ready, I gave it to Claude Code and watched it fail for hours. It was producing code, but it didn't match my vision and wasn't working as expected. Many architectural and code-level issues remained. I tried slightly adjusting the plan and re-implementing everything multiple times over the span of three days, but it didn't help. After three unsuccessful attempts, I almost lost hope.

But then I decided to spend more time refining the specification itself before starting the implementation. I spent two days writing and iteratively refining the specification through feedback loops with the smartest models, while also giving my own feedback on each part. It covered almost everything needed for implementation, from high-level architecture to logic for specific use cases and solutions for the hardest implementation parts that I struggled with the most. Suddenly, when I gave this new specification to the agent and started slowly implementing things one by one, it just worked.

I told the agent to implement the next thing, waited 10 minutes, tested the implementation, asked it to fix any issues, and then moved to the next step. A few times during those two days, I also asked another agent to carefully read the entire codebase and strictly compare it against the specification, then passed its feedback back to the first agent to resolve any differences. After about two days, the project was mostly finished. It still has some rough edges (which are easy to address), and I haven't thoroughly *tested* everything yet (I even decided not to write any automated tests at all at this stage), but all the core functionality just worked. When I asked Claude to change something, it usually did so accurately, without breaking other parts.

The thing is that AI is much better at following instructions than at coming up with practical stuff on its own. Smarter models can handle more complex tasks independently, but in larger projects, their limit of "acceptable complexity per step" is lower. Therefore, when working on a bigger and more complex project, it's important to keep all individual steps at the same level of complexity and depth as you would when working on smaller projects. The complexity of each individual step matters more than the complexity of the whole project.
