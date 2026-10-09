
"use client";

import MaintenanceGate from "../../../components/MaintenanceGate";
import PokipoSurveyScreen from "../../../components/PokipoSurveyScreen";

export default function BeforeSurveyPage() {
  return (
    <MaintenanceGate page="survey_before">
      <PokipoSurveyScreen stage="before" />
    </MaintenanceGate>
  );
}
