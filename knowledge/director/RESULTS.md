# Teaching the style director: results (2026-11-13)

Data: 10 exam topics (`gold/`, never trained on) + 20 taught topics (`train/` = `cases/`), each with acts, a style per act
(+ accepted alternatives, reason) and a layout per line. Metrics on the 10 unseen exam topics:

| Approach | style exact | style acceptable | shortlist recall@3 | act-boundary F1 | layout exact / acceptable |
|---|---|---|---|---|---|
| Untrained lexical director | 23-27 % | 49-64 % | 63-68 % | 0.40-0.66 | 13 % / 45 % |
| Per-style learned weights (perceptron) | 5-23 % | 17-41 % | - | - | 18-27 % / 43-48 % |
| Teacher rubric + 8 learned scalars | 15-38 % | 57 % | 65 % | 0.62 | 18 % / 43 % |
| Example memory (kNN over taught lines) | 18-26 % | 37-61 % | 56-63 % | 0.42-0.59 | - |
| **Agent + GUIDE.md + 20 cases (blind, fresh agent)** | **56 %** | **83 %** | **100 %** | **0.72** | **66 % / 87 %** |

Lessons
- Weight learning on ~30 examples over 31 styles memorises (98 % on train, 17-41 % on unseen topics). The learning curve
  of the example memory was flat: lexical features cannot see WHY a style fits (era, story turns, bookends).
- Style direction is a creative judgement made at the level of the whole story. The agent (an LLM) learns it in context
  from a written method (GUIDE.md) and worked cases; that is the "training" that transfers.
- Remaining errors in the blind run: one-line hook / bookend acts were merged into neighbours (deprem, kehribar), and
  equally valid alternatives were picked (pop-art vs silent-film for a slapstick cat). Teach with more approved cases.

Loop: every film the user approves -> `python core/tools/director_cases.py add ...` -> the next decision reads it.
Re-run the blind exam after a batch of new cases (fresh agent, inputs `exam_input/`, score with
`python core/tools/director_train.py score --pred <answers.json>`).
