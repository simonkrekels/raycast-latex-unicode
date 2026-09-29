# LaTeX to Unicode — Raycast extension

Type LaTeX the way you would in the Julia REPL and paste the Unicode result straight into whatever app is in front:

```
⌘ Space   \alpha^2 + \frac{1}{2}   ⏎      →   α² + ½
```

Two commands:

| Command | Mode | What it does |
| --- | --- | --- |
| **Paste LaTeX as Unicode** | no-view | Converts the text you typed and pastes it immediately. Meant to be a *fallback command*, so `\alpha ⏎` in the root search just works. |
| **Type LaTeX** | view | Live preview while you type, plus Julia-style completions for the command under the cursor (`\alp` → `\alpha α`, `\aleph ℵ`, …). ⏎ pastes, ⌘⏎ completes in place, ⌘⇧C copies. |

## Install (local, no store needed)

```sh
npm install
npm run dev        # imports the extension into Raycast; Ctrl-C once it says it is ready
```

The extension stays installed after `ray develop` exits; rerun `npm run dev` after changing the source.

## Make `\alpha ⏎` work from the root search

Raycast aliases only allow `a–z`, `0–9` and spaces, so `\` cannot be an alias. Fallback commands do the job instead:

1. Open Raycast, run **Manage Fallback Commands**.
2. Enable **Paste LaTeX as Unicode** and move it to the top of the list.
3. Optionally enable **Type LaTeX** below it for a previewing variant.

Now typing anything that matches no other command (which is what a leading `\` guarantees in practice) shows *Paste LaTeX as Unicode* as the first result. Press ⏎ and the Unicode lands in the frontmost app; a HUD shows what was pasted.

You can also give either command a plain alias (e.g. `tex`), press Tab, type the LaTeX as the argument and press ⏎.

## What converts

- Symbols: every name in the W3C unicode-math list via [unicodeit](https://github.com/svenkreiss/unicodeit) (`\alpha`, `\to`, `\forall`, `\hbar`, `\checkmark`, …) plus Julia shorthands (`\bbR`, `\scrL`, `\bfalpha`, `\euler`).
- Sub/superscripts: `x^2`, `x^{10}`, `a_{ij}`, `\sum_{i=1}^n`, `e^{-x^2}`, Julia's `\^2` and `\_i`. Falls back to `x^(n+1)`-style text when Unicode has no glyph.
- Fonts: `\mathbb{NZQR}`, `\mathcal`, `\mathfrak`, `\mathbf`, `\mathit`, `\mathsf`, `\mathtt`, `\boldsymbol`.
- Accents: `\hat{x}`, `\vec{v}`, `\bar{z}`, `\dot{q}`, `\ddot{q}`, `\tilde{a}`, `\overline{AB}`, `\'e`, `\"u`, `\v{s}`.
- `\frac{1}{2}` → ½, `\frac{a+b}{2}` → ᵃ⁺ᵇ⁄₂, `\frac{dy}{dx}` → dy/dx; `\sqrt{2}` → √2, `\sqrt[3]{x}` → ∛x.
- `\not\in` → ∉, `\not=` → ≠; `\text{…}`, `\mathrm{…}`; `\left`, `\right`, `\quad`, `\,` and friends; `f'(x)` → f′(x).
- Unknown commands are left exactly as typed.
