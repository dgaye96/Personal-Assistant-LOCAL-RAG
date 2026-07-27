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
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Sparkles size={20} strokeWidth={2.4} /></div>
          <div>
            <p className="eyebrow">{t('localPrivate')}</p>
            <h1>Assistant Personnelle</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <label className="language-switcher" aria-label={t('chooseLanguage')}>
            <select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)} title={t('chooseLanguage')}>
              <option value="fr">FR</option>
              <option value="en">EN</option>
              <option value="es">ES</option>
              <option value="pt">PT</option>
              <option value="ar">AR</option>
            </select>
          </label>
          <button className="theme-toggle icon-button" type="button" onClick={toggleMode} aria-label={mode === 'light' ? t('enableDarkMode') : t('enableLightMode')} title={mode === 'light' ? t('enableDarkMode') : t('enableLightMode')}>
            {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>
      <nav className="primary-nav" aria-label={t('mainNavigation')}>
        <NavLink to="/chat"><MessageCircle size={17} />{t('chat')}</NavLink>
        <NavLink to="/bases"><BookOpen size={17} />{t('knowledgeBases')}</NavLink>
      </nav>
      <Routes>
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/bases" element={<KnowledgeBasesPage />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </main>
  )
}

export default App
