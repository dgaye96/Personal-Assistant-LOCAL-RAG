import { useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { BookOpen, MessageCircle, Moon, Sparkles, Sun } from 'lucide-react'
import { type Language, useLanguage } from './i18n/LanguageContext'
import { useTheme } from './theme/ThemeContext'
import { ChatPage } from './pages/ChatPage'
import { KnowledgeBasesPage } from './pages/KnowledgeBasesPage'

const languageOptions: Array<{ value: Language; label: string; flag: string }> = [
  { value: 'fr', label: 'Francais', flag: 'fr' },
  { value: 'en', label: 'English', flag: 'us' },
  { value: 'es', label: 'Espanol', flag: 'es' },
  { value: 'pt', label: 'Portugues', flag: 'pt' },
  { value: 'ar', label: 'العربية', flag: 'sa' },
]

function App() {
  const { mode, toggleMode } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const selectedLanguage = languageOptions.find((option) => option.value === language) ?? languageOptions[0]

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
          <div className="lang-picker">
            <button
              className="lang-picker-trigger"
              type="button"
              onClick={() => setIsLanguageMenuOpen((isOpen) => !isOpen)}
              aria-label={t('chooseLanguage')}
              aria-expanded={isLanguageMenuOpen}
              title={t('chooseLanguage')}
            >
              <span className={`flag-icon flag-${selectedLanguage.flag}`} aria-hidden="true" />
            </button>
            {isLanguageMenuOpen && <div className="lang-picker-menu" role="menu" aria-label={t('chooseLanguage')}>
              {languageOptions.map((option) => <button
                className={option.value === language ? 'lang-picker-option active' : 'lang-picker-option'}
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={option.value === language}
                aria-label={option.label}
                title={option.label}
                onClick={() => { setLanguage(option.value); setIsLanguageMenuOpen(false) }}
              >
                <span className={`flag-icon flag-${option.flag}`} aria-hidden="true" />
              </button>)}
            </div>}
          </div>
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
