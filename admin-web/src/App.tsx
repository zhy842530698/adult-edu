import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuthStore } from './store/auth';
import LoginPage from './pages/login';
import AdminLayout from './components/layout/AdminLayout';
import DashboardPage from './pages/dashboard';
import ExamCategoriesPage from './pages/catalog/exam-categories';
import ExamsPage from './pages/catalog/exams';
import SubjectsPage from './pages/catalog/subjects';
import ChaptersPage from './pages/catalog/chapters';
import KnowledgePointsPage from './pages/catalog/knowledge-points';
import QuestionListPage from './pages/question/list';
import QuestionEditPage from './pages/question/edit';
import ImportPage from './pages/import';
import ReviewPage from './pages/review';
import PaperListPage from './pages/paper/list';
import PaperEditPage from './pages/paper/edit';
import DailyPage from './pages/daily';
import UserListPage from './pages/user/list';
import FeedbackListPage from './pages/feedback/list';
import FeedbackDetailPage from './pages/feedback/detail';
import AdminUsersPage from './pages/admin/users';
import RolesPage from './pages/admin/roles';
import AuditPage from './pages/audit';
import BannersPage from './pages/ops/banners';
import AnnouncementsPage from './pages/ops/announcements';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  const admin = useAuthStore((s) => s.admin);

  // Optionally re-fetch /me to refresh permissions
  useEffect(() => {
    if (token && !admin) {
      // hydrate would happen via persist; nothing to do here.
    }
  }, [token, admin]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="catalog/categories" element={<ExamCategoriesPage />} />
        <Route path="catalog/exams" element={<ExamsPage />} />
        <Route path="catalog/subjects" element={<SubjectsPage />} />
        <Route path="catalog/chapters" element={<ChaptersPage />} />
        <Route path="catalog/knowledge-points" element={<KnowledgePointsPage />} />
        <Route path="questions" element={<QuestionListPage />} />
        <Route path="questions/new" element={<QuestionEditPage />} />
        <Route path="questions/:id/edit" element={<QuestionEditPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="papers" element={<PaperListPage />} />
        <Route path="papers/new" element={<PaperEditPage />} />
        <Route path="papers/:id/edit" element={<PaperEditPage />} />
        <Route path="daily" element={<DailyPage />} />
        <Route path="users" element={<UserListPage />} />
        <Route path="feedback" element={<FeedbackListPage />} />
        <Route path="feedback/:id" element={<FeedbackDetailPage />} />
        <Route path="admin/users" element={<AdminUsersPage />} />
        <Route path="admin/roles" element={<RolesPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="ops/banners" element={<BannersPage />} />
        <Route path="ops/announcements" element={<AnnouncementsPage />} />
      </Route>
    </Routes>
  );
}