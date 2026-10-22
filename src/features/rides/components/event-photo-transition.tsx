/// <reference types="react/canary" />
import { ViewTransition, type ReactNode } from "react";

export const eventPhotoTransitionName = (rideId: string) =>
  `event-photo-${rideId}`;

export function EventPhotoTransition({
  rideId,
  children,
}: {
  rideId: string;
  children: ReactNode;
}) {
  return (
    <ViewTransition
      name={eventPhotoTransitionName(rideId)}
      share="auto"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
