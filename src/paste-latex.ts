import { Clipboard, LaunchProps, showHUD } from "@raycast/api";
import { convert } from "./latex";

type Props = LaunchProps<{ arguments: { latex?: string } }>;

/**
 * One-shot: convert whatever was typed and paste it into the frontmost app.
 * Enable this command as a Raycast *fallback command* so that typing `\alpha` in the
 * root search and pressing Enter pastes α — the text arrives as `fallbackText`.
 */
export default async function Command(props: Props) {
  const input = (props.fallbackText ?? props.arguments?.latex ?? "").trim();
  if (input === "") {
    await showHUD("Type some LaTeX first, e.g. \\alpha^2");
    return;
  }
  const output = convert(input);
  if (output === "") {
    await showHUD("Nothing to paste");
    return;
  }
  await Clipboard.paste(output);
  await showHUD(output);
}
