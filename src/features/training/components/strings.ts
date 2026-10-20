import type { Dictionary } from "@/lib/i18n";

export const uploadTrayStrings = (dict: Dictionary) => {
  const training = dict.admin.training;
  return {
    ...training.tray,
    status: training.status,
    failure: training.failure,
    errors: { ...training.errors, ...training.tray.errors },
  };
};

export type UploadTrayStrings = ReturnType<typeof uploadTrayStrings>;

export const videoPickerStrings = (dict: Dictionary) => {
  const training = dict.admin.training;
  return {
    ...training.library.pick,
    upload: training.upload,
    failure: training.failure,
    archived: training.library.archived,
  };
};

export type VideoPickerStrings = ReturnType<typeof videoPickerStrings>;
