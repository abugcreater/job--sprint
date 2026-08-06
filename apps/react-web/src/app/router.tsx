import { useState } from "react";
import { createHashRouter, Navigate, RouterProvider } from "react-router-dom";
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

function createAppRouter() {
  return createHashRouter([
    {
      path: "/",
      element: <AppShell />,
      children: [
        { index: true, element: <Navigate to={routeById.today.path} replace /> },
        { path: "/today", element: <TodayPage /> },
        { path: "/stats", element: <StatsPage /> },
        { path: "/coach", element: <CoachPage /> },
        { path: "/learn", element: <LearningPage /> },
        { path: "/interview", element: <InterviewPage /> },
        { path: "/applications", element: <ApplicationsPage /> },
        { path: "/review", element: <ReviewPage /> },
        { path: "/admin", element: <AdminPage /> },
        { path: "/more", element: <MorePage /> },
        { path: "*", element: <Navigate to={routeById.today.path} replace /> }
      ]
    }
  ], { future: { v7_relativeSplatPath: true } });
}

export function AppRouter() {
  const [router] = useState(createAppRouter);
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
