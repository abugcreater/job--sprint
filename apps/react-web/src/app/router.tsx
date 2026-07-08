import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { routeById } from "./navigation";
import { AdminPage } from "../features/admin/AdminPage";
import { ApplicationsPage } from "../features/applications/ApplicationsPage";
import { CoachPage } from "../features/coach/CoachPage";
import { InterviewPage } from "../features/interview/InterviewPage";
import { LearningPage } from "../features/learning/LearningPage";
import { MorePage } from "../features/more/MorePage";
import { ReviewPage } from "../features/review/ReviewPage";
import { StatsPage } from "../features/stats/StatsPage";
import { TodayPage } from "../features/today/TodayPage";

export function AppRouter() {
  return (
    <HashRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to={routeById.today.path} replace />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/learn" element={<LearningPage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="*" element={<Navigate to={routeById.today.path} replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
