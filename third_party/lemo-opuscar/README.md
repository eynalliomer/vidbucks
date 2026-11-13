# Lemo-Opuscar style library (third-party, NOT under the Vidbucks MIT licence)

This folder is a copy of the **docs** of [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) by **Lemomo (LemoLab)**,
taken unchanged from the November 2026 release (99 film styles). Vidbucks uses them as a style reference library:
the agent reads a style's `STYLE.md` and builds the film with Vidbucks' own Remotion kits (see
`skills/vidbucks-style-library/SKILL.md`). No Lemo-Opuscar code is included here; the parts of its toolkit that
Vidbucks uses were rewritten in Vidbucks' own code.

## Licences (they stay as Lemomo gave them)

| What | Licence |
|---|---|
| `guides/*.md`, `styles/README.md`, every `styles/<slug>/STYLE.md` and `DEMO.md` | **CC BY-NC 4.0** (`LICENSES/CC-BY-NC-4.0.txt`): attribution required, **non-commercial use only** |
| `styles/<slug>/style.json` (metadata) | MIT (`LICENSES/MIT.txt`) |
| `LICENSE` | Lemomo's own licence statement, which explains these rules and the commercial-licence option for the docs |

Attribution: *Lemo-Opuscar style docs © 2026 Lemomo (LemoLab), https://github.com/lemomo-ai/lemo-opuscar, CC BY-NC 4.0.
Unmodified copy.*

**Commercial use of these docs needs Lemomo's permission** (see `LICENSE`, "Additional permission for the docs").
Films you make with Lemo-Opuscar styles are yours (Lemomo's terms: "Films you make with the library are yours,
commercial films included, and need no credit"); this note is about redistributing or reusing the doc text itself.

## Left out on purpose

- `styles/living-screencast/` docs: they describe "Clawd", a character whose design and name belong to Anthropic and
  for which Lemo-Opuscar gives no licence.
- Third-party product interfaces, names and logos, the six voice tracks excluded by Lemomo, and anything marked
  `LicenseRef-Clawd` or `LicenseRef-ThirdPartyMarks` in Lemo-Opuscar's `REUSE.toml`.
- The demo films, stills, posters, demo code, image-generation prompts, fonts, sample libraries and HDRIs.

`styles/README.md` still lists Living Screencast because it is copied unchanged; its folder is not here.
