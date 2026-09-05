import { Avatar, Style } from "@dicebear/core";
import gaze from "@dicebear/styles/gaze.json";

const style = new Style(gaze);

// ponytail: seeded by user id, no stored preference; add a column when people may pick their own.
export const avatarSvg = (seed: string, animated = false) =>
  new Avatar(style, {
    seed,
    animationVariant: animated ? "medium" : "none",
  }).toString();
