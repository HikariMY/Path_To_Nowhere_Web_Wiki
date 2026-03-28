import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import { AdminLayout } from './components/layout/AdminLayout'

// Pages
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { CharactersPage } from './pages/characters/CharactersPage'
import { CharacterDetailPage } from './pages/characters/CharacterDetailPage'
import { TierListsPage } from './pages/tier-lists/TierListsPage'
import { TierListDetailPage } from './pages/tier-lists/TierListDetailPage'
import { TierListCreatePage } from './pages/tier-lists/TierListCreatePage'
import { ForumPage } from './pages/forum/ForumPage'
import { ForumCategoryPage } from './pages/forum/ForumCategoryPage'
import { ForumPostPage } from './pages/forum/ForumPostPage'
import { ForumCreatePostPage } from './pages/forum/ForumCreatePostPage'
import { ProfilePage } from './pages/profile/ProfilePage'
import { SettingsPage } from './pages/profile/SettingsPage'
import { GameInfoPage } from './pages/GameInfoPage'
import { CrimebrandsPage } from './pages/crimebrands/CrimebrandsPage'
import { CrimebrandDetailPage } from './pages/crimebrands/CrimebrandDetailPage'
import { AdminCrimebrandsPage } from './pages/admin/AdminCrimebrandsPage'
import { AdminCrimebrandBuildsPage } from './pages/admin/AdminCrimebrandBuildsPage'

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminCharactersPage } from './pages/admin/AdminCharactersPage'
import { AdminEventsPage } from './pages/admin/AdminEventsPage'
import { AdminForumPage } from './pages/admin/AdminForumPage'
import { AdminLogsPage } from './pages/admin/AdminLogsPage'
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage'
import { AdminSkillsPage } from './pages/admin/AdminSkillsPage'
import { AdminShacklesPage } from './pages/admin/AdminShacklesPage'
import { AdminGameInfoPage } from './pages/admin/AdminGameInfoPage'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public routes with main layout */}
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />

              {/* Characters */}
              <Route path="characters" element={<CharactersPage />} />
              <Route path="characters/:slug" element={<CharacterDetailPage />} />

              {/* Game Info */}
              <Route path="game-info" element={<GameInfoPage />} />

              {/* Crimebrands */}
              <Route path="crimebrands" element={<CrimebrandsPage />} />
              <Route path="crimebrands/:slug" element={<CrimebrandDetailPage />} />

              {/* Tier Lists */}
              <Route path="tier-lists" element={<TierListsPage />} />
              <Route path="tier-lists/create" element={
                <ProtectedRoute><TierListCreatePage /></ProtectedRoute>
              } />
              <Route path="tier-lists/:id" element={<TierListDetailPage />} />
              <Route path="tier-lists/:id/edit" element={
                <ProtectedRoute><TierListCreatePage /></ProtectedRoute>
              } />

              {/* Forum */}
              <Route path="forum" element={<ForumPage />} />
              <Route path="forum/:categorySlug" element={<ForumCategoryPage />} />
              <Route path="forum/:categorySlug/new" element={
                <ProtectedRoute><ForumCreatePostPage /></ProtectedRoute>
              } />
              <Route path="forum/:categorySlug/:postId" element={<ForumPostPage />} />
              <Route path="forum/new" element={
                <ProtectedRoute><ForumCreatePostPage /></ProtectedRoute>
              } />

              {/* Profile */}
              <Route path="profile/:username" element={<ProfilePage />} />
              <Route path="settings" element={
                <ProtectedRoute><SettingsPage /></ProtectedRoute>
              } />

              {/* 404 fallback */}
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                  <div className="font-heading text-8xl font-bold text-ptn-red/30 mb-4">404</div>
                  <h1 className="font-heading text-2xl font-bold text-ptn-text mb-2">ไม่พบหน้านี้</h1>
                  <p className="text-ptn-muted mb-4">หน้าที่คุณกำลังมองหาไม่มีอยู่</p>
                  <a href="/" className="text-ptn-cyan hover:underline">กลับหน้าแรก</a>
                </div>
              } />
            </Route>

            {/* Admin routes */}
            <Route path="admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="characters" element={<AdminCharactersPage />} />
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="announcements" element={<AdminAnnouncementsPage />} />
              <Route path="forum" element={<AdminForumPage />} />
              <Route path="skills" element={<AdminSkillsPage />} />
              <Route path="shackles" element={<AdminShacklesPage />} />
              <Route path="game-info" element={<AdminGameInfoPage />} />
              <Route path="crimebrands" element={<AdminCrimebrandsPage />} />
              <Route path="crimebrand-builds" element={<AdminCrimebrandBuildsPage />} />
              <Route path="logs" element={<AdminLogsPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
