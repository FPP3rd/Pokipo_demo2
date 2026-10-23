"use client";

import type { ReactNode } from "react";
import PokipoFuruyaReauthGate from "../../../components/PokipoFuruyaReauthGate";

export default function SpotHistoryLayout({ children }: { children: ReactNode }) {
  return <PokipoFuruyaReauthGate>{children}</PokipoFuruyaReauthGate>;
}