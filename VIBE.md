# Design Vibe Document

## The Feeling

Soft, cozy, safe. A room you want to be in. Colors that feel like they've always been there—polished with soul.

## Backgrounds

**Light:** `#F7F6F3`  
**Dark:** `#1C1917`

Both carry a subtle warm undertone, shifted slightly toward brown. The warmth is felt, never seen directly. It creates comfort without drawing attention to itself.

We arrived here by testing the spectrum. Cooler grays felt like a clean office—functional, forgettable. Warmer creams felt dated, like a vintage blog trying too hard. Warm Paper sits between them: intentional warmth that stays invisible.

Light and dark share the same tint direction. Switching modes feels like the same room at different times of day.

## Text

**Light:** `#2A2826`  
**Dark:** `#E5E3E0`

Warm-tinted to match the background family. Dark enough for comfortable extended reading, soft enough to belong with the paper.

We considered higher contrast options (#1A1A1A) but they felt aggressive against the warm background—like someone speaking too loudly in a quiet room. The current values maintain readability while preserving calm.

## Accent Colors: Ink & Sunlight

Three colors, each in a completely different hue zone. Designed for colorblind safety (no red-green pairs) and maximum distinction.

**Rust:** `#A85A48`  
The anchor. Muted terracotta with the warmth of sun-baked clay. Grounds the entire palette in earthiness. This is the "home" color—everything else relates to it.

**Deep Sea:** `#2A5A70`  
The cool counterweight. A serious, honest blue that provides contrast without introducing coldness. Also serves as the link color because blue links are universally understood.

**Sunflower:** `#D4A828`  
The bright one. Warm gold that catches attention when needed. Has the quality of afternoon light or candlelight caught in amber.

These three hues are maximally distinct: warm vs cool, dark vs bright. Any pair works together. No two can be confused, even for colorblind viewers.

Accents stay fixed across light and dark modes. They are the identity—constants that anchor recognition. Rust in dark mode is still Rust.

## Neutral

**Light:** `#C0BDB8`  
**Dark:** `#5A5754`

Used for "other" categories, baselines, secondary information—anything that should recede. The neutral's job is to be present without competing.

We tuned this through several iterations. Too dark and it fought with the accents. Too light and it disappeared into the background. The current values sit at the sweet spot: visible but quiet.

Neutral shifts between modes because it's defined by relationship, not absolute value. It should feel equally close-to-background in both contexts.

## Links

**Light:** `#2A5A70`  
**Dark:** `#4A8AAA`

Links use Deep Sea in light mode. In dark mode, the blue is lightened to maintain the same perceived contrast. This follows convention (blue = clickable) while staying within the accent family.

## Supporting Colors

**Muted text:**  
Light: `#7A756D` / Dark: `#9A9590`  
For metadata, timestamps, secondary labels. Should read as a "quiet voice."

**Borders:**  
Light: `#E5E2DC` / Dark: `#3A3632`  
Subtle dividers. Should feel like whispered lines, barely there.

## Typography

**Sans:** IBM Plex Sans  
**Mono:** IBM Plex Mono

IBM Plex carries technical credibility (the heritage) with surprising warmth. It reads as authoritative for research writing and comfortable for personal essays. The mono variant shares the same personality, so code blocks feel native to the design.

## Charts

Charts use the same palette as the website. They belong here—they are content, not embedded foreign objects.

Rules:
- Maximum 3 accent colors + 1 neutral per chart
- More colors indicates a design problem, not a data problem
- Neutral handles "other" and de-emphasized data
- Same Warm Paper background
- Same IBM Plex for all labels
- Same warm text color for axes and annotations

## Mirroring Philosophy

The system maintains consistency through *relationship*, not identical values.

**Fixed:** Accent colors stay the same in both modes. They are the identity.

**Mirrored:** Everything else (text, muted, borders, neutral) adjusts so the *feeling* is identical. Muted text feels equally quiet. Borders feel equally subtle. Neutral feels equally close to nothing.

The hex codes differ. The experience matches.

## Functional UI Colors (Feedback, Not Identity)

These colors exist to communicate state (copy success, warnings, destructive actions). They are not part of the identity accent triad and should be used sparingly.

**Danger:** Rust (`#A85A48`)  
- Reads naturally as “alert” within the palette.  
- Prefer Rust as a background/fill (not long body text).  
- On Rust backgrounds, use a light text color (Warm Paper `#F7F6F3` or pure white) to meet contrast.

**Warning:** Sunflower (`#D4A828`)  
- Use Sunflower only as a background highlight.  
- Always pair with dark “Ink” text (`#2A2826`). (White-on-Sunflower fails contrast.)

**Success:** Teal-Green (`#4A8A7A`)  
- A muted teal-green, distinct from Deep Sea while staying warm.  
- Use only for brief confirmations/flash states (not charts, not “brand” accents).  
- Pair with very dark text; allow slight theme-specific adjustment via `color-mix()` to preserve contrast.

## Interaction Notes

**Visited links:**  
Visited links should be a muted/desaturated version of the link color (derived with `color-mix()`), not a new hue. This preserves usability without adding another “identity” color.

**Code surfaces:**  
Inline code and code blocks should use warm-neutral surfaces derived from Background/Border/Neutral. Avoid Deep Sea–tinted surfaces; code appears frequently and should feel native, not like a callout.

## Full Reference

| Role | Light | Dark |
|------|-------|------|
| Background | #F7F6F3 | #1C1917 |
| Text | #2A2826 | #E5E3E0 |
| Muted | #7A756D | #9A9590 |
| Border | #E5E2DC | #3A3632 |
| Link | #2A5A70 | #4A8AAA |
| Rust | #A85A48 | #A85A48 |
| Deep Sea | #2A5A70 | #2A5A70 |
| Sunflower | #D4A828 | #D4A828 |
| Neutral | #C0BDB8 | #5A5754 |
| Success (UI) | #4A8A7A | #4A8A7A |
| Warning (UI) | #D4A828 | #D4A828 |
| Danger (UI) | #A85A48 | #A85A48 |

The palette is intentionally small. Constraint creates coherence. Every color earns its place.
