import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Language = 'fr' | 'en' | 'es' | 'pt' | 'ar'

const translations = {
  fr: {
    localPrivate: '100% local and private',
    chat: 'Chat',
    knowledgeBases: 'Bases de connaissances',
    mainNavigation: 'Navigation principale',
    enableDarkMode: 'Activer le mode sombre',
    enableLightMode: 'Activer le mode clair',
    chooseLanguage: 'Choisir la langue',
    languageFrench: 'Francais',
    languageEnglish: 'Anglais',
    historyUnavailable: 'Historique indisponible.',
    conversationNotFound: 'Conversation introuvable.',
    unableToLoadConversation: 'Impossible de charger cette conversation.',
    backendConnectionError: 'Erreur de connexion au backend local.',
    serverResponded: 'Le serveur a repondu {status}.',
    chatWithCoach: 'Conversation avec le coach',
    conversationHistory: 'Historique des conversations',
    local: 'Local',
    history: 'Historique',
    newConversation: 'Nouvelle conversation',
    new: 'Nouveau',
    noSavedConversations: 'Aucune conversation enregistree.',
    privacyChat: 'Le coach utilise uniquement les informations indexees sur cette machine.',
    assistant: 'Assistant',
    talkToCoach: 'Parler au coach',
    yourQuestion: 'Votre question',
    questionPlaceholder: 'Ex. Quelles competences dois-je mettre en avant ?',
    searching: 'Recherche...',
    send: 'Envoyer',
    sourcesAppearHere: 'Les sources utilisees apparaitront sous chaque reponse.',
    you: 'Vous',
    coach: 'Coach',
    sourcesUsed: 'Sources utilisees',
    noRelevantSources: 'Aucune source suffisamment pertinente.',
    responseLoading: 'Le coach prepare sa reponse',
    editQuestion: 'Modifier la question',
    deleteQuestion: 'Supprimer la question',
    saveQuestion: 'Enregistrer la question',
    cancelEdit: 'Annuler la modification',
    editQuestionPlaceholder: 'Modifiez votre question',
    deleteQuestionConfirmation: 'Supprimer cette question et sa reponse associee ?',
    questionUpdated: 'Question modifiee. Le coach genere une nouvelle reponse.',
    questionUpdateFailed: 'Impossible de modifier cette question.',
    questionDeleteFailed: 'Impossible de supprimer cette question.',
    renameConversation: 'Renommer la discussion',
    deleteConversation: 'Supprimer la discussion',
    saveConversationName: 'Enregistrer le nom de la discussion',
    cancelConversationRename: 'Annuler le renommage',
    conversationNamePlaceholder: 'Nom de la discussion',
    deleteConversationConfirmation: 'Supprimer cette discussion et tous ses messages ?',
    conversationRenameFailed: 'Impossible de renommer cette discussion.',
    conversationDeleteFailed: 'Impossible de supprimer cette discussion.',
    copyMessage: 'Copier la réponse',
    copied: 'Copié !',
    selectModel: 'Modèle actif',
    activeDiscussion: 'Discussion active',
    newDiscussion: 'Nouvelle discussion',
    discussionStarted: 'Discussion du {date}',
    messageCount: '{count} message{plural}',
    sourceCount: '{count} source{plural}',
    responseHistory: 'Dernieres reponses',
    noAnswersYet: 'Les reponses les plus recentes apparaitront ici, juste avant votre zone de saisie.',
    sentAt: 'Envoye le {date}',
    knowledgeBase: 'Base de connaissances',
    knowledgeBaseList: 'Liste des bases de connaissances',
    privacyKnowledge: 'Les fichiers sont analyses et indexes uniquement en local.',
    organization: 'Organisation',
    myBases: 'Mes bases',
    noBases: 'Aucune base. Creez-en une ci-dessous.',
    newBase: 'Nouvelle base',
    baseNamePlaceholder: 'Ex. Projet professionnel',
    optionalDescription: 'Description facultative',
    createBase: 'Creer la base',
    selectedBase: 'Base selectionnee',
    editBase: 'Modifier la base',
    name: 'Nom',
    description: 'Description',
    save: 'Enregistrer',
    delete: 'Supprimer',
    content: 'Contenu',
    addKnowledge: 'Ajouter une connaissance',
    supportedFiles: 'PDF, DOCX, TXT ou MD',
    notePlaceholder: 'Collez ici une experience, une realisation ou une note personnelle...',
    chooseFile: 'Choisir un fichier',
    noFileSelected: 'Aucun fichier selectionne',
    indexing: 'Indexation...',
    index: 'Indexer',
    createBaseToStart: 'Creez une base de connaissances pour commencer a indexer vos documents.',
    basesUnavailable: 'Liste des bases indisponible.',
    creationFailed: 'Creation impossible.',
    updateFailed: 'Modification impossible.',
    baseUpdated: 'Base mise a jour.',
    deletionFailed: 'Suppression impossible.',
    baseDeleted: 'Base et vecteurs associes supprimes.',
    ingestionFailed: "L'indexation a echoue.",
    createdBase: 'Base « {name} » creee.',
    indexedContent: '{filename} indexe dans « {name} » : {count} extrait{plural}.',
    deleteConfirmation: 'Supprimer « {name} » et ses {count} document{plural} ?',
    documentCount: '{count} document{plural}',
  },
  ar: {
    localPrivate: 'محلي وخاص بنسبة 100٪', chat: 'المحادثة', knowledgeBases: 'قواعد المعرفة', mainNavigation: 'التنقل الرئيسي', enableDarkMode: 'تفعيل الوضع الداكن', enableLightMode: 'تفعيل الوضع الفاتح', chooseLanguage: 'اختيار اللغة', languageFrench: 'الفرنسية', languageEnglish: 'الإنجليزية', historyUnavailable: 'سجل المحادثات غير متاح.', conversationNotFound: 'المحادثة غير موجودة.', unableToLoadConversation: 'يتعذر تحميل هذه المحادثة.', backendConnectionError: 'يتعذر الاتصال بالخادم المحلي.', serverResponded: 'استجاب الخادم بالرمز {status}.', chatWithCoach: 'محادثة مع المدرب', conversationHistory: 'سجل المحادثات', local: 'محلي', history: 'السجل', newConversation: 'محادثة جديدة', new: 'جديد', noSavedConversations: 'لا توجد محادثات محفوظة.', privacyChat: 'يستخدم المدرب فقط المعلومات المفهرسة على هذا الجهاز.', assistant: 'المساعد', talkToCoach: 'التحدث إلى المدرب', yourQuestion: 'سؤالك', questionPlaceholder: 'مثال: ما المهارات التي ينبغي أن أبرزها؟', searching: 'جارٍ البحث...', send: 'إرسال', sourcesAppearHere: 'ستظهر المصادر المستخدمة تحت كل إجابة.', you: 'أنت', coach: 'المدرب', sourcesUsed: 'المصادر المستخدمة', noRelevantSources: 'لا توجد مصادر ذات صلة كافية.', responseLoading: 'يعد المدرب إجابة', editQuestion: 'تعديل السؤال', deleteQuestion: 'حذف السؤال', saveQuestion: 'حفظ السؤال', cancelEdit: 'إلغاء التعديل', editQuestionPlaceholder: 'عدّل سؤالك', deleteQuestionConfirmation: 'هل تريد حذف هذا السؤال وإجابته المرتبطة؟', questionUpdated: 'تم تعديل السؤال. ينشئ المدرب إجابة جديدة.', questionUpdateFailed: 'يتعذر تعديل هذا السؤال.', questionDeleteFailed: 'يتعذر حذف هذا السؤال.', renameConversation: 'إعادة تسمية المحادثة', deleteConversation: 'حذف المحادثة', saveConversationName: 'حفظ اسم المحادثة', cancelConversationRename: 'إلغاء إعادة التسمية', conversationNamePlaceholder: 'اسم المحادثة', deleteConversationConfirmation: 'هل تريد حذف هذه المحادثة وكل رسائلها؟', conversationRenameFailed: 'يتعذر إعادة تسمية هذه المحادثة.', conversationDeleteFailed: 'يتعذر حذف هذه المحادثة.', activeDiscussion: 'المحادثة النشطة', newDiscussion: 'محادثة جديدة', discussionStarted: 'بدأت المحادثة في {date}', messageCount: '{count} رسالة{plural}', sourceCount: '{count} مصدر{plural}', responseHistory: 'أحدث الإجابات', noAnswersYet: 'ستظهر أحدث إجاباتك هنا، فوق مربع الرسالة مباشرة.', sentAt: 'أُرسل في {date}', knowledgeBase: 'قاعدة المعرفة', knowledgeBaseList: 'قائمة قواعد المعرفة', privacyKnowledge: 'تُحلل الملفات وتُفهرس محلياً فقط.', organization: 'التنظيم', myBases: 'قواعدي', noBases: 'لا توجد قاعدة معرفة بعد. أنشئ واحدة أدناه.', newBase: 'قاعدة معرفة جديدة', baseNamePlaceholder: 'مثال: الملف المهني', optionalDescription: 'وصف اختياري', createBase: 'إنشاء القاعدة', selectedBase: 'القاعدة المحددة', editBase: 'تعديل القاعدة', name: 'الاسم', description: 'الوصف', save: 'حفظ', delete: 'حذف', content: 'المحتوى', addKnowledge: 'إضافة معرفة', supportedFiles: 'PDF أو DOCX أو TXT أو MD', notePlaceholder: 'ألصق هنا خبرة أو إنجازاً أو ملاحظة شخصية...', chooseFile: 'اختيار ملف', noFileSelected: 'لم يتم اختيار ملف', indexing: 'جارٍ الفهرسة...', index: 'فهرسة', createBaseToStart: 'أنشئ قاعدة معرفة لبدء فهرسة مستنداتك.', basesUnavailable: 'قائمة القواعد غير متاحة.', creationFailed: 'يتعذر إنشاء قاعدة المعرفة.', updateFailed: 'يتعذر تعديل قاعدة المعرفة.', baseUpdated: 'تم تحديث القاعدة.', deletionFailed: 'يتعذر حذف قاعدة المعرفة.', baseDeleted: 'تم حذف القاعدة والمتجهات المرتبطة بها.', ingestionFailed: 'فشلت الفهرسة.', createdBase: 'تم إنشاء القاعدة «{name}».', indexedContent: 'تمت فهرسة {filename} في «{name}»: {count} مقطع{plural}.', deleteConfirmation: 'هل تريد حذف «{name}» ومستنداته البالغ عددها {count}؟', documentCount: '{count} مستند{plural}', copyMessage: 'نسخ الإجابة', copied: 'تم النسخ!', selectModel: 'النموذج النشط',
  },
  en: {
    localPrivate: '100% local and private',
    chat: 'Chat',
    knowledgeBases: 'Knowledge bases',
    mainNavigation: 'Main navigation',
    enableDarkMode: 'Enable dark mode',
    enableLightMode: 'Enable light mode',
    chooseLanguage: 'Choose language',
    languageFrench: 'French',
    languageEnglish: 'English',
    historyUnavailable: 'Conversation history is unavailable.',
    conversationNotFound: 'Conversation not found.',
    unableToLoadConversation: 'Unable to load this conversation.',
    backendConnectionError: 'Unable to connect to the local backend.',
    serverResponded: 'The server responded with {status}.',
    chatWithCoach: 'Conversation with the coach',
    conversationHistory: 'Conversation history',
    local: 'Local',
    history: 'History',
    newConversation: 'New conversation',
    new: 'New',
    noSavedConversations: 'No saved conversations.',
    privacyChat: 'The coach only uses information indexed on this machine.',
    assistant: 'Assistant',
    talkToCoach: 'Talk to the coach',
    yourQuestion: 'Your question',
    questionPlaceholder: 'For example: Which skills should I highlight?',
    searching: 'Searching...',
    send: 'Send',
    sourcesAppearHere: 'Sources used will appear below each answer.',
    you: 'You',
    coach: 'Coach',
    sourcesUsed: 'Sources used',
    noRelevantSources: 'No sufficiently relevant sources.',
    responseLoading: 'The coach is preparing a response',
    editQuestion: 'Edit question',
    deleteQuestion: 'Delete question',
    saveQuestion: 'Save question',
    cancelEdit: 'Cancel edit',
    editQuestionPlaceholder: 'Edit your question',
    deleteQuestionConfirmation: 'Delete this question and its associated response?',
    questionUpdated: 'Question updated. The coach is generating a new response.',
    questionUpdateFailed: 'Unable to update this question.',
    questionDeleteFailed: 'Unable to delete this question.',
    renameConversation: 'Rename conversation',
    deleteConversation: 'Delete conversation',
    saveConversationName: 'Save conversation name',
    cancelConversationRename: 'Cancel conversation rename',
    conversationNamePlaceholder: 'Conversation name',
    deleteConversationConfirmation: 'Delete this conversation and all its messages?',
    conversationRenameFailed: 'Unable to rename this conversation.',
    conversationDeleteFailed: 'Unable to delete this conversation.',
    copyMessage: 'Copy response',
    copied: 'Copied!',
    selectModel: 'Active model',
    activeDiscussion: 'Active conversation',
    newDiscussion: 'New conversation',
    discussionStarted: 'Conversation started {date}',
    messageCount: '{count} message{plural}',
    sourceCount: '{count} source{plural}',
    responseHistory: 'Latest answers',
    noAnswersYet: 'Your newest answers will appear here, directly above the message box.',
    sentAt: 'Sent {date}',
    knowledgeBase: 'Knowledge base',
    knowledgeBaseList: 'Knowledge base list',
    privacyKnowledge: 'Files are analyzed and indexed locally only.',
    organization: 'Organization',
    myBases: 'My bases',
    noBases: 'No knowledge base yet. Create one below.',
    newBase: 'New knowledge base',
    baseNamePlaceholder: 'For example: Professional profile',
    optionalDescription: 'Optional description',
    createBase: 'Create base',
    selectedBase: 'Selected base',
    editBase: 'Edit base',
    name: 'Name',
    description: 'Description',
    save: 'Save',
    delete: 'Delete',
    content: 'Content',
    addKnowledge: 'Add knowledge',
    supportedFiles: 'PDF, DOCX, TXT, or MD',
    notePlaceholder: 'Paste an experience, achievement, or personal note here...',
    chooseFile: 'Choose a file',
    noFileSelected: 'No file selected',
    indexing: 'Indexing...',
    index: 'Index',
    createBaseToStart: 'Create a knowledge base to start indexing your documents.',
    basesUnavailable: 'Knowledge base list is unavailable.',
    creationFailed: 'Unable to create the knowledge base.',
    updateFailed: 'Unable to update the knowledge base.',
    baseUpdated: 'Knowledge base updated.',
    deletionFailed: 'Unable to delete the knowledge base.',
    baseDeleted: 'Knowledge base and associated vectors deleted.',
    ingestionFailed: 'Indexing failed.',
    createdBase: 'Knowledge base "{name}" created.',
    indexedContent: '{filename} indexed in "{name}": {count} chunk{plural}.',
    deleteConfirmation: 'Delete "{name}" and its {count} document{plural}?',
    documentCount: '{count} document{plural}',
  },
  es: {
    localPrivate: '100 % local y privado', chat: 'Chat', knowledgeBases: 'Bases de conocimiento', mainNavigation: 'Navegacion principal', enableDarkMode: 'Activar modo oscuro', enableLightMode: 'Activar modo claro', chooseLanguage: 'Elegir idioma', languageFrench: 'Frances', languageEnglish: 'Ingles', languageSpanish: 'Espanol', languagePortuguese: 'Portugues', historyUnavailable: 'El historial de conversaciones no esta disponible.', conversationNotFound: 'Conversacion no encontrada.', unableToLoadConversation: 'No se puede cargar esta conversacion.', backendConnectionError: 'No se puede conectar al backend local.', serverResponded: 'El servidor respondio {status}.', chatWithCoach: 'Conversacion con el coach', conversationHistory: 'Historial de conversaciones', local: 'Local', history: 'Historial', newConversation: 'Nueva conversacion', new: 'Nuevo', noSavedConversations: 'No hay conversaciones guardadas.', privacyChat: 'El coach solo utiliza informacion indexada en este equipo.', assistant: 'Asistente', talkToCoach: 'Hablar con el coach', yourQuestion: 'Tu pregunta', questionPlaceholder: 'Ej. Que competencias debo destacar?', searching: 'Buscando...', send: 'Enviar', sourcesAppearHere: 'Las fuentes utilizadas apareceran debajo de cada respuesta.', you: 'Tu', coach: 'Coach', sourcesUsed: 'Fuentes utilizadas', noRelevantSources: 'No hay fuentes suficientemente relevantes.', responseLoading: 'El coach esta preparando una respuesta', editQuestion: 'Editar pregunta', deleteQuestion: 'Eliminar pregunta', saveQuestion: 'Guardar pregunta', cancelEdit: 'Cancelar edicion', editQuestionPlaceholder: 'Modifica tu pregunta', deleteQuestionConfirmation: 'Eliminar esta pregunta y su respuesta asociada?', questionUpdated: 'Pregunta modificada. El coach esta generando una nueva respuesta.', questionUpdateFailed: 'No se puede modificar esta pregunta.', questionDeleteFailed: 'No se puede eliminar esta pregunta.', renameConversation: 'Renombrar conversacion', deleteConversation: 'Eliminar conversacion', saveConversationName: 'Guardar nombre de la conversacion', cancelConversationRename: 'Cancelar cambio de nombre', conversationNamePlaceholder: 'Nombre de la conversacion', deleteConversationConfirmation: 'Eliminar esta conversacion y todos sus mensajes?', conversationRenameFailed: 'No se puede renombrar esta conversacion.', conversationDeleteFailed: 'No se puede eliminar esta conversacion.', activeDiscussion: 'Conversacion activa', newDiscussion: 'Nueva conversacion', discussionStarted: 'Conversacion iniciada el {date}', messageCount: '{count} mensaje{plural}', sourceCount: '{count} fuente{plural}', responseHistory: 'Ultimas respuestas', noAnswersYet: 'Las respuestas mas recientes apareceran aqui, justo encima del cuadro de mensaje.', sentAt: 'Enviado el {date}', knowledgeBase: 'Base de conocimiento', knowledgeBaseList: 'Lista de bases de conocimiento', privacyKnowledge: 'Los archivos se analizan e indexan solo localmente.', organization: 'Organizacion', myBases: 'Mis bases', noBases: 'Aun no hay bases de conocimiento. Crea una abajo.', newBase: 'Nueva base de conocimiento', baseNamePlaceholder: 'Ej. Perfil profesional', optionalDescription: 'Descripcion opcional', createBase: 'Crear base', selectedBase: 'Base seleccionada', editBase: 'Editar base', name: 'Nombre', description: 'Descripcion', save: 'Guardar', delete: 'Eliminar', content: 'Contenido', addKnowledge: 'Agregar conocimiento', supportedFiles: 'PDF, DOCX, TXT o MD', notePlaceholder: 'Pega aqui una experiencia, un logro o una nota personal...', chooseFile: 'Elegir un archivo', noFileSelected: 'Ningun archivo seleccionado', indexing: 'Indexando...', index: 'Indexar', createBaseToStart: 'Crea una base de conocimiento para empezar a indexar tus documentos.', basesUnavailable: 'La lista de bases no esta disponible.', creationFailed: 'No se puede crear la base de conocimiento.', updateFailed: 'No se puede modificar la base de conocimiento.', baseUpdated: 'Base actualizada.', deletionFailed: 'No se puede eliminar la base de conocimiento.', baseDeleted: 'Base y vectores asociados eliminados.', ingestionFailed: 'La indexacion fallo.', createdBase: 'Base "{name}" creada.', indexedContent: '{filename} indexado en "{name}": {count} fragmento{plural}.', deleteConfirmation: 'Eliminar "{name}" y sus {count} documento{plural}?', documentCount: '{count} documento{plural}', copyMessage: 'Copiar respuesta', copied: 'Copiado!', selectModel: 'Modelo activo',
  },
  pt: {
    localPrivate: '100 % local e privado', chat: 'Chat', knowledgeBases: 'Bases de conhecimento', mainNavigation: 'Navegacao principal', enableDarkMode: 'Ativar modo escuro', enableLightMode: 'Ativar modo claro', chooseLanguage: 'Escolher idioma', languageFrench: 'Frances', languageEnglish: 'Ingles', languageSpanish: 'Espanhol', languagePortuguese: 'Portugues', historyUnavailable: 'O historico de conversas nao esta disponivel.', conversationNotFound: 'Conversa nao encontrada.', unableToLoadConversation: 'Nao foi possivel carregar esta conversa.', backendConnectionError: 'Nao foi possivel conectar ao backend local.', serverResponded: 'O servidor respondeu {status}.', chatWithCoach: 'Conversa com o coach', conversationHistory: 'Historico de conversas', local: 'Local', history: 'Historico', newConversation: 'Nova conversa', new: 'Novo', noSavedConversations: 'Nenhuma conversa salva.', privacyChat: 'O coach usa apenas informacoes indexadas nesta maquina.', assistant: 'Assistente', talkToCoach: 'Falar com o coach', yourQuestion: 'Sua pergunta', questionPlaceholder: 'Ex. Quais competencias devo destacar?', searching: 'Pesquisando...', send: 'Enviar', sourcesAppearHere: 'As fontes utilizadas aparecerao abaixo de cada resposta.', you: 'Voce', coach: 'Coach', sourcesUsed: 'Fontes utilizadas', noRelevantSources: 'Nenhuma fonte suficientemente relevante.', responseLoading: 'O coach esta preparando uma resposta', editQuestion: 'Editar pergunta', deleteQuestion: 'Excluir pergunta', saveQuestion: 'Salvar pergunta', cancelEdit: 'Cancelar edicao', editQuestionPlaceholder: 'Edite sua pergunta', deleteQuestionConfirmation: 'Excluir esta pergunta e a resposta associada?', questionUpdated: 'Pergunta alterada. O coach esta gerando uma nova resposta.', questionUpdateFailed: 'Nao foi possivel alterar esta pergunta.', questionDeleteFailed: 'Nao foi possivel excluir esta pergunta.', renameConversation: 'Renomear conversa', deleteConversation: 'Excluir conversa', saveConversationName: 'Salvar nome da conversa', cancelConversationRename: 'Cancelar renomeacao', conversationNamePlaceholder: 'Nome da conversa', deleteConversationConfirmation: 'Excluir esta conversa e todas as mensagens?', conversationRenameFailed: 'Nao foi possivel renomear esta conversa.', conversationDeleteFailed: 'Nao foi possivel excluir esta conversa.', activeDiscussion: 'Conversa ativa', newDiscussion: 'Nova conversa', discussionStarted: 'Conversa iniciada em {date}', messageCount: '{count} mensagem{plural}', sourceCount: '{count} fonte{plural}', responseHistory: 'Ultimas respostas', noAnswersYet: 'As respostas mais recentes aparecerao aqui, logo acima da caixa de mensagem.', sentAt: 'Enviado em {date}', knowledgeBase: 'Base de conhecimento', knowledgeBaseList: 'Lista de bases de conhecimento', privacyKnowledge: 'Os arquivos sao analisados e indexados apenas localmente.', organization: 'Organizacao', myBases: 'Minhas bases', noBases: 'Ainda nao ha base de conhecimento. Crie uma abaixo.', newBase: 'Nova base de conhecimento', baseNamePlaceholder: 'Ex. Perfil profissional', optionalDescription: 'Descricao opcional', createBase: 'Criar base', selectedBase: 'Base selecionada', editBase: 'Editar base', name: 'Nome', description: 'Descricao', save: 'Salvar', delete: 'Excluir', content: 'Conteudo', addKnowledge: 'Adicionar conhecimento', supportedFiles: 'PDF, DOCX, TXT ou MD', notePlaceholder: 'Cole aqui uma experiencia, realizacao ou nota pessoal...', chooseFile: 'Escolher arquivo', noFileSelected: 'Nenhum arquivo selecionado', indexing: 'Indexando...', index: 'Indexar', createBaseToStart: 'Crie uma base de conhecimento para comecar a indexar seus documentos.', basesUnavailable: 'A lista de bases nao esta disponivel.', creationFailed: 'Nao foi possivel criar a base de conhecimento.', updateFailed: 'Nao foi possivel alterar a base de conhecimento.', baseUpdated: 'Base atualizada.', deletionFailed: 'Nao foi possivel excluir a base de conhecimento.', baseDeleted: 'Base e vetores associados excluidos.', ingestionFailed: 'A indexacao falhou.', createdBase: 'Base "{name}" criada.', indexedContent: '{filename} indexado em "{name}": {count} trecho{plural}.', deleteConfirmation: 'Excluir "{name}" e seus {count} documento{plural}?', documentCount: '{count} documento{plural}', copyMessage: 'Copiar respuesta', copied: 'Copiado!', selectModel: 'Modelo activo',
  },
} as const

type TranslationKey = keyof typeof translations.fr
type TranslationValues = Record<string, string | number>

type LanguageContextValue = {
  language: Language
  locale: string
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, values?: TranslationValues) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

function getInitialLanguage(): Language {
  const storedLanguage = localStorage.getItem('assistant-language')
  return storedLanguage === 'fr' || storedLanguage === 'es' || storedLanguage === 'pt' || storedLanguage === 'ar' ? storedLanguage : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)

  useEffect(() => {
    localStorage.setItem('assistant-language', language)
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  function t(key: TranslationKey, values: TranslationValues = {}) {
    return translations[language][key].replace(/\{(\w+)\}/g, (_, value: string) => String(values[value] ?? `{${value}}`))
  }

  const locale = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', pt: 'pt-PT', ar: 'ar' }[language]
  return <LanguageContext value={{ language, locale, setLanguage, t }}>{children}</LanguageContext>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider')
  return context
}