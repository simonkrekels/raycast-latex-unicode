import { Action, ActionPanel, Icon, Keyboard, LaunchProps, List, popToRoot } from "@raycast/api";
import { type ReactNode, useMemo, useState } from "react";
import { completions, convert, isKnownCommand, trailingCommand } from "./latex";

type Props = LaunchProps<{ arguments: { latex?: string } }>;

const EXAMPLES: [string, string][] = [
  ["\\alpha^2 + \\beta_i", "α² + βᵢ"],
  ["\\mathbb{R}^n \\to \\mathbb{C}", "ℝⁿ → ℂ"],
  ["\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}", "∫₀^∞ e⁻ˣ² dx = √π/2"],
  ["\\vec{v} \\cdot \\hat{n} \\neq 0", "v⃗ ⋅ n̂ ≠ 0"],
];

/**
 * Interactive mode: live preview of the conversion plus Julia-REPL style completions
 * for the command being typed. Enter pastes into the frontmost app.
 */
export default function Command(props: Props) {
  const [text, setText] = useState(props.fallbackText ?? props.arguments?.latex ?? "");
  const converted = useMemo(() => convert(text), [text]);

  const trailing = trailingCommand(text);
  const matches = trailing ? completions(trailing.name) : [];
  // While the user is still typing an unknown command, the best completion should be the selected row.
  const completionsFirst = trailing !== null && matches.length > 0 && !isKnownCommand(trailing.name);

  const resultSection = text.trim() !== "" && (
    <List.Section title="Result">
      <List.Item
        key="result"
        icon={Icon.Text}
        title={converted || text}
        subtitle={converted !== text ? text : undefined}
        actions={<PasteActions content={converted || text} />}
      />
    </List.Section>
  );

  const completionSection = trailing !== null && matches.length > 0 && (
    <List.Section title="Completions" subtitle={`${matches.length}`}>
      {matches.map((m) => {
        const prefix = text.slice(0, trailing.start);
        const full = convert(prefix + m.latex);
        const completeAction = (
          <Action
            title="Complete in Search Bar"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => setText(prefix + m.latex + (m.hint ? "{" : ""))}
          />
        );
        return (
          <List.Item
            key={m.latex}
            icon={Icon.Dot}
            title={m.symbol}
            subtitle={m.hint ?? m.latex}
            accessories={full !== m.symbol ? [{ text: full }] : undefined}
            actions={
              m.hint ? (
                <ActionPanel>{completeAction}</ActionPanel>
              ) : (
                <PasteActions content={full} extra={completeAction} />
              )
            }
          />
        );
      })}
    </List.Section>
  );

  return (
    <List
      navigationTitle="Type LaTeX"
      searchBarPlaceholder="\alpha^2 + \frac{1}{2}  →  α² + ½"
      searchText={text}
      onSearchTextChange={setText}
      filtering={false}
    >
      {text.trim() === "" ? (
        <List.Section title="Examples">
          {EXAMPLES.map(([latex, preview]) => (
            <List.Item
              key={latex}
              icon={Icon.LightBulb}
              title={preview}
              subtitle={latex}
              actions={
                <ActionPanel>
                  <Action title="Try It" icon={Icon.Pencil} onAction={() => setText(latex)} />
                  <Action.Paste content={convert(latex)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : completionsFirst ? (
        <>
          {completionSection}
          {resultSection}
        </>
      ) : (
        <>
          {resultSection}
          {completionSection}
        </>
      )}
    </List>
  );
}

function PasteActions({ content, extra }: { content: string; extra?: ReactNode }) {
  return (
    <ActionPanel>
      <Action.Paste content={content} onPaste={() => popToRoot()} />
      {extra}
      <Action.CopyToClipboard content={content} shortcut={Keyboard.Shortcut.Common.Copy} />
    </ActionPanel>
  );
}
