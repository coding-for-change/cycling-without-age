"use client";

import { createContext, useContext } from "react";

export const PortalContainer = createContext<HTMLElement | null>(null);

export const usePortalContainer = () => useContext(PortalContainer);
