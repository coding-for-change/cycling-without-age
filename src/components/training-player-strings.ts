import type { Dictionary } from "@/lib/i18n";

export type TrainingPlayerStrings = Dictionary["training"]["player"];

export const trainingPlayerStrings = (
  dict: Dictionary,
): TrainingPlayerStrings => dict.training.player;

export const videojsTranslations = (strings: TrainingPlayerStrings) => ({
  buttons: {
    play: strings.play,
    pause: strings.pause,
    replay: strings.replay,
    mute: strings.mute,
    unmute: strings.unmute,
  },
  seek: { forward: strings.seekForward, backward: strings.seekBackward },
  fullscreen: { enter: strings.fullscreenEnter, exit: strings.fullscreenExit },
  pip: { enter: strings.pipEnter, exit: strings.pipExit },
  slider: { seek: strings.seek },
  container: { label: strings.label },
  errors: {
    title: strings.errorTitle,
    network: strings.errorNetwork,
    source: strings.errorSource,
    decode: strings.errorSource,
    unplayable: strings.errorSource,
    aborted: strings.errorUnexpected,
    encrypted: strings.errorSource,
    unexpected: strings.errorUnexpected,
  },
  common: { ok: strings.close },
  menu: {
    settings: strings.settings,
    speed: strings.speed,
    playbackRate: strings.speed,
    quality: strings.quality,
    auto: strings.auto,
  },
});
