import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RedirectIfAuthed, RequireAdmin, RequireAuth, RequireStaff } from '@/components/RouteGuards'
import { useAuth } from '@/context/auth-context'
import { can } from '@/lib/permissions'
import { InlineLoading } from '@/components/ui/States'

import { ReaderLayout } from '@/components/reader/ReaderLayout'
import { HomePage } from '@/pages/reader/HomePage'
import { PostDetailPage } from '@/pages/reader/PostDetailPage'
import {
  AuthorPage,
  CategoriesDirectoryPage,
  CategoryArchivePage,
  TagArchivePage,
  TagsDirectoryPage,
} from '@/pages/reader/ArchivePages'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage, ResetPasswordPage } from '@/pages/auth/PasswordResetPages'

import { NotFoundPage } from '@/pages/NotFoundPage'

/*
 * The Workshop is lazy-loaded: a reader who never signs in should not download
 * the editor, the charts, or the admin screens.
 */
const WorkshopLayout = lazy(() =>
  import('@/components/workshop/WorkshopLayout').then((m) => ({ default: m.WorkshopLayout })),
)
const OverviewPage = lazy(() => import('@/pages/workshop/OverviewPage').then((m) => ({ default: m.OverviewPage })))
const PostsListPage = lazy(() => import('@/pages/workshop/PostsListPage').then((m) => ({ default: m.PostsListPage })))
const PostEditorPage = lazy(() =>
  import('@/pages/workshop/PostEditorPage').then((m) => ({ default: m.PostEditorPage })),
)
const CommentsModerationPage = lazy(() =>
  import('@/pages/workshop/CommentsModerationPage').then((m) => ({ default: m.CommentsModerationPage })),
)
const MediaLibraryPage = lazy(() =>
  import('@/pages/workshop/MediaLibraryPage').then((m) => ({ default: m.MediaLibraryPage })),
)
const TaxonomyPage = lazy(() => import('@/pages/workshop/TaxonomyPage').then((m) => ({ default: m.TaxonomyPage })))
const AnalyticsPage = lazy(() => import('@/pages/workshop/AnalyticsPages').then((m) => ({ default: m.AnalyticsPage })))
const PostAnalyticsPage = lazy(() =>
  import('@/pages/workshop/AnalyticsPages').then((m) => ({ default: m.PostAnalyticsPage })),
)
const UsersPage = lazy(() => import('@/pages/workshop/UsersPage').then((m) => ({ default: m.UsersPage })))
const AccountPage = lazy(() => import('@/pages/workshop/AccountPage').then((m) => ({ default: m.AccountPage })))
const AiReportsPage = lazy(() => import('@/pages/workshop/AiReportsPage').then((m) => ({ default: m.AiReportsPage })))

/**
 * `/workshop` lands on the dashboard for staff. Authors have no access to
 * `GET /analytics/overview`, so they land on their posts instead of hitting a
 * guaranteed 403.
 */
function WorkshopHome() {
  const { user } = useAuth()
  return can.viewOverview(user) ? <OverviewPage /> : <Navigate to="/workshop/posts" replace />
}

export function App() {
  return (
    <Routes>
      {/* ── The Reader — public, reading-first ─────────────────────────── */}
      <Route element={<ReaderLayout />}>
        <Route index element={<HomePage />} />
        <Route path="posts/:slug" element={<PostDetailPage />} />
        <Route path="categories" element={<CategoriesDirectoryPage />} />
        <Route path="category/:slug" element={<CategoryArchivePage />} />
        <Route path="tags" element={<TagsDirectoryPage />} />
        <Route path="tag/:slug" element={<TagArchivePage />} />
        <Route path="author/:id" element={<AuthorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* ── Auth ───────────────────────────────────────────────────────── */}
      <Route
        path="login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="register"
        element={
          <RedirectIfAuthed>
            <RegisterPage />
          </RedirectIfAuthed>
        }
      />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />

      {/* ── The Workshop — authenticated, role-gated ───────────────────── */}
      <Route path="workshop" element={<RequireAuth />}>
        <Route
          element={
            <Suspense fallback={<InlineLoading label="Opening the Workshop" />}>
              <WorkshopLayout />
            </Suspense>
          }
        >
          <Route index element={<WorkshopHome />} />

          <Route path="posts" element={<PostsListPage />} />
          <Route path="posts/new" element={<PostEditorPage />} />
          <Route path="posts/:id" element={<PostEditorPage />} />

          <Route path="media" element={<MediaLibraryPage />} />
          <Route path="reports" element={<AiReportsPage />} />
          <Route path="account" element={<AccountPage />} />

          {/* editor/admin */}
          <Route element={<RequireStaff />}>
            <Route path="comments" element={<CommentsModerationPage />} />
            <Route path="taxonomy" element={<TaxonomyPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>

          {/* An author may read analytics for their own post — the API decides. */}
          <Route path="analytics/:postId" element={<PostAnalyticsPage />} />

          {/* admin only */}
          <Route element={<RequireAdmin />}>
            <Route path="users" element={<UsersPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
