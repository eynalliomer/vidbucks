# Nostalgia listicle channel (US, 1950s-90s) - study (2026-11-13)
Data: public channel data (about page, 60 newest/popular videos), public captions of 4 videos (`analyze_reference.py --link`, kept locally under `knowledge/references/`), thumbnails, and a view-only visual pass of one video in the Browser pane (frames drawn to an in-page sheet at chosen times; nothing downloaded). Confidence: numbers below are **measured** unless marked *inferred*. Shot lengths are estimates from frame sampling, not a full cut detection.

## Channel at a glance
- 50.9K subscribers, 74 videos, ~17.1M total views, joined 2024-11-19, US, family-safe.
- Niche: American nostalgia 1950s-1990s ("things we grew up with", stores, products, sounds, food, school).
- Length band 8:03-11:48, median ~9:40. Cadence: batches on the 13th of each month (3-4 per month), median gap 14 days in the recent list.
- **Strong outlier dependence**: median ~84K views on the recent 12; top 4 (2.6M, 1.5M, 1.5M, 1.2M) carry most of the 17M. Many uploads stay at 4-30K. Copy what repeats, not one hit.
- Winners are 1980s-led and about *status or strangeness* (rich families, strange trends, products that flopped, stores that died). Generic "Growing up in the 1970s" titles from the first months did well once (launch boost), later similar ones did not.

## Formula (repeats in ~9 of 10 videos)
- **Title skeletons**: `{Decade} {Things|Products|Stores|Sounds} We {verb phrase with one CAPS word}` (e.g. "{1980s} Things We Thought Only {CAPS} Families Had"), `{Decade} {X} That {No Longer Exist | Were Supposed to Change Everything}`, `The {Holiday} We Grew Up With Is {CAPS}`, `In the {decade}, ${N} Bought You {ALL THIS}`. A decade first, 40-60 chars, one CAPS word, no question marks, no pipes.
- **Thumbnail recipe** (8 looked at): one photoreal period scene (a kid or parent reacting to one iconic object: projection TV, power glove, waterbed, mall, candy shelf), warm 80s colour, 3-4 words on a black plate bottom-centre, white condensed caps with ONE yellow word ("THEY MUST BE **RICH**", "THEY ARE **GONE**"), round red channel badge top-left. Measured palette of one: #312B2E 46 %, #BF946E, #945129 (warm browns), brightness 0.38. The scenes look AI-generated (*inferred*).
- **Hook (0-27 s)**: three concrete images with a year or a price each ("In 1981, a satellite dish ... $3,000"), a kid's-eye detail, then the promise line "So let's take a trip back and remember ..." -> a 3-4 s channel bumper (logo card on dark glass). Hook cuts every ~1 s; each price lands as a big green number over the footage.
- **Body**: 12-16 items, each 30-45 s, each with a chapter (YouTube chapters + a red pill tag lower-left naming the item). Item arc: what it was -> who had it / how it felt (kid's eye, "we", "your friend's dad") -> one funny twist -> a "today" callback line. Short clips of the period commercial or TV spot as a punchline (we must NOT do that - see transfer rules).
- **Pacing**: speech 155-182 wpm, covers 89-95 % of runtime, 10-13 pauses > 1 s (the pauses are the clip punchlines). Shots ~3-5 s in the body (*estimated*), ~1 s in the hook.
- **Picture mix (visual pass)**: ~70 % period footage (commercials, news, home video, TV), ~20 % photos of the object (some modern photos of vintage objects, some AI-looking period scenes), ~10 % a 4:3 clip inset on a dark grid-paper ground. Logo bug top-right. No subtitles, no kinetic captions: words on screen are only tags, prices and the CTA.
- **Outro**: "So which one did your ... have? Tell me in the comments" + subscribe + "more videos on the channel" (~20 s). A "Share your memories in the comments" pill mid-video.
- **Voice**: one warm male US narrator, collective "we/us", light humour, no hype.

## Reference video
the channel's newest hit (a 1980s status-objects list) (10:02, ~1.3M views, ~15x the channel median, 2 weeks old): newest of the winners, so it shows the current production level. Link analysis kept locally under `knowledge/references/` (not committed).

## Beat sheet
`knowledge/beat-sheets/nostalgia-footage-listicle.md` (10-minute and 60-second versions).

## Transfer rules
- **Copy**: the list structure, chapter tags, hook shape (3 dated/priced images -> promise -> bumper), item arc, collective warm voice, price/number pops, inset-on-grid device, outro question, thumbnail recipe (photoreal period scene + 3-4 words, one coloured word).
- **Change**: the topic list, every sentence, the art, the voice, the channel badge and colours.
- **Never**: their title text, their footage, other people's commercials/TV clips, logos of brands as graphics, real private faces from home movies, celebrity likeness. Prices and years only from a source we can cite.
- **What replaces their commercial clips**: (1) public-domain / CC archival film from trusted collections (`tools/archive_clips.py`: licence checked per item, uploader-set licences are NOT trusted); (2) CC photos of the object from Wikimedia Commons; (3) our own reconstructions (the product drawn as a vector, a fake-but-obviously-fictional period ad typed in our own words); (4) AI period scenes ONLY with the user's approval because they cost credits, and only of fictional people.
- **Realistic ceiling**: the format is crowded; the channel's own median is ~84K. A new channel should expect the median, not the 2.6M hit.
