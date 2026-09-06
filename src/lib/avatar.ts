import { Avatar, Style } from "@dicebear/core";
import gaze from "@dicebear/styles/gaze.json";

export { avatarSeed } from "./avatar-seed";

const style = new Style(gaze);

// ponytail: seeded by the person's email so an invite can draw the character before the account exists; add a column when people may pick their own.
export const avatarSvg = (seed: string, animated = false) =>
  new Avatar(style, {
    seed,
    animationVariant: animated ? "medium" : "none",
  }).toString();
