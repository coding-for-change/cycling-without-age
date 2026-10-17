import { Avatar, Style } from "@dicebear/core";
import gaze from "@dicebear/styles/gaze.json";

export { avatarSeed, seedOf } from "./avatar-seed";

const style = new Style(gaze);

export const avatarSvg = (seed: string, animated = false) =>
  new Avatar(style, {
    seed,
    animationVariant: animated ? "medium" : "none",
  }).toString();
