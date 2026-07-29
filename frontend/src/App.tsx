import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { BookOpen, MessageCircle, Moon, Sparkles, Sun } from 'lucide-react'
import { useLanguage } from './i18n/LanguageContext'
import { useTheme } from './theme/ThemeContext'
import { ChatPage } from './pages/ChatPage'
import { KnowledgeBasesPage } from './pages/KnowledgeBasesPage'

function App() {
  const { mode, toggleMode } = useTheme()
  const { language, setLanguage, t } = useLanguage()

  return (
    <div className="app-frame">
      <aside className="app-sidebar" aria-label={t('mainNavigation')}>
        <div className="app-sidebar-brand" aria-hidden="true">
          <Sparkles size={18} strokeWidth={2.4} />
        </div>
        <nav className="app-sidebar-nav">
          <NavLink to="/chat" title={t('chat')} aria-label={t('chat')}><MessageCircle size={20} /></NavLink>
          <NavLink to="/bases" title={t('knowledgeBases')} aria-label={t('knowledgeBases')}><BookOpen size={20} /></NavLink>
        </nav>
        <div className="app-sidebar-footer">
          <label className="lang-select" aria-label={t('chooseLanguage')}>
            <select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)} title={t('chooseLanguage')}>
              <option value="fr">FR</option>
              <option value="en">EN</option>
              <option value="es">ES</option>
              <option value="pt">PT</option>
              <option value="ar">AR</option>
            </select>
          </label>
          <button className="icon-btn" type="button" onClick={toggleMode} aria-label={mode === 'light' ? t('enableDarkMode') : t('enableLightMode')} title={mode === 'light' ? t('enableDarkMode') : t('enableLightMode')}>
            {mode === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>
      </aside>
      <main className="app-main">
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/bases" element={<KnowledgeBasesPage />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
