
"use client";

import MaintenanceGate from "../../../components/MaintenanceGate";
import PokipoSurveyScreen from "../../../components/PokipoSurveyScreen";

export default function AfterSurveyPage() {
  return (
    <MaintenanceGate page="survey_after">
      <PokipoSurveyScreen stage="after" />
    </MaintenanceGate>
  );
}
