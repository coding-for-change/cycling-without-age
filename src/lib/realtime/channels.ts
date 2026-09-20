export const userChannel = (userId: string) => `user:${userId}`;

export const conversationChannel = (conversationId: string) =>
  `conv:${conversationId}`;

export const PRESENCE_CHANNEL = "presence";
