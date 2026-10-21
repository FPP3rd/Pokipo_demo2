"use client";
import type { ReactNode } from "react";
import PokipoRewardWalkthrough from "../../components/PokipoRewardWalkthrough";
export default function HomeLayout({children}:{children:ReactNode}) {
  return <>{children}<PokipoRewardWalkthrough mode="home" /></>;
}