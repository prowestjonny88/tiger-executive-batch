import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Welcome } from "./pages/Welcome";
import { PhotoUpload } from "./pages/PhotoUpload";
import { ImageQualityCheck } from "./pages/ImageQualityCheck";
import { AdaptiveQuestions } from "./pages/AdaptiveQuestions";
import { ResultAssessment } from "./pages/ResultAssessment";
import { SafeGuidance } from "./pages/SafeGuidance";
import { Escalation } from "./pages/Escalation";
import { Confirmation } from "./pages/Confirmation";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Welcome },
      { path: "upload", Component: PhotoUpload },
      { path: "quality", Component: ImageQualityCheck },
      { path: "questions", Component: AdaptiveQuestions },
      { path: "result", Component: ResultAssessment },
      { path: "guidance", Component: SafeGuidance },
      { path: "escalation", Component: Escalation },
      { path: "confirmation", Component: Confirmation },
    ],
  },
]);
