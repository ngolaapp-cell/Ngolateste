import React, { useState, useEffect } from 'react';
import { Screen, Question, TestModule, Category, Specialization, UserProfile } from '../types';
import { parseBulkQuestionsText } from '../utils/bulkQuestionParser';
import { SPECIALIZATIONS } from '../data/mockData';
import { isSupabaseConfigured, getSupabaseConfig, resetSupabaseClient, sanitizeSupabaseUrl, sanitizeSupabaseKey } from '../lib/supabase';
import {
  syncInitialDataToSupabase,
  syncAllLocalDataToSupabase,
  testSupabaseModuleCRUD,
  loadAllDataFromSupabase,
  getSupabaseSQLScript,
  getSupabaseRLSFixScript,
  verifyAllRLSPolicies,
  TableRLSStatusReport,
  saveGeneratedActivationCode,
  fetchActivationCodesFromSupabase,
  fetchCategories,
  fetchSpecializations,
  checkAllSupabaseTables,
  saveCategory,
  deleteCategory,
  saveSpecialization,
  deleteSpecializationFromSupabase,
  saveTestModule,
  deleteTestModule,
  deleteActivationCode,
  saveQuestion,
  deleteQuestion,
  fetchRealStatistics,
  adminToggleUserActivation,
  toggleUserBlockStatus,
  fetchAdminRecoveryEmail,
  saveAdminRecoveryEmail,
  sendAdminRecoveryOTP,
  fetchAdminSmtpStatus,
  saveAdminSmtpSettings,
  testAdminSmtpDelivery,
  TableStatusReport,
} from '../services/supabaseService';

interface EditableQuestionCardProps {
  question: Question;
  index: number;
  onSave: (q: Question) => void;
  onDelete: (id: string) => void;
}

const EditableQuestionCard: React.FC<EditableQuestionCardProps> = ({
  question,
  index,
  onSave,
  onDelete,
}) => {
  const [statement, setStatement] = useState(question.statement);
  const [options, setOptions] = useState<string[]>(question.options || ['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState<number>(question.correctIndex || 0);
  const [explanation, setExplanation] = useState(question.explanation || '');
  const [banca, setBanca] = useState(question.banca || 'MINMED / MED');
  const [isSaved, setIsSaved] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = () => {
    const updated: Question = {
      ...question,
      statement,
      options,
      correctIndex,
      explanation,
      banca,
    };
    onSave(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleOptionChange = (optIdx: number, val: string) => {
    const next = [...options];
    next[optIdx] = val;
    setOptions(next);
  };

  return (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs shadow-2xs">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <span className="font-extrabold text-slate-700 text-sm flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
            {index + 1}
          </span>
          Pergunta {index + 1}
        </span>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={banca}
            onChange={(e) => setBanca(e.target.value)}
            placeholder="Banca / Exame"
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-700 outline-none w-36 sm:w-48"
          />
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDelete(question.id);
                  } finally {
                    setIsDeleting(false);
                    setIsConfirmingDelete(false);
                  }
                }}
                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold cursor-pointer"
              >
                {isDeleting ? 'Apagando...' : 'Confirmar?'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmingDelete(false)}
                className="px-1.5 py-0.5 bg-white text-slate-600 rounded text-[11px] font-bold border border-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-red-200/50"
              title="Excluir pergunta"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              <span className="hidden sm:inline font-bold text-[11px]">Apagar</span>
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          Enunciado da Pergunta *
        </label>
        <textarea
          rows={2}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          Opções de Resposta (Marque a alternativa correta):
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {options.map((opt, optIdx) => (
            <div
              key={optIdx}
              className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                optIdx === correctIndex
                  ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-400'
                  : 'bg-white border-slate-200'
              }`}
            >
              <input
                type="radio"
                id={`q-${question.id}-opt-${optIdx}`}
                name={`correct-${question.id}`}
                checked={optIdx === correctIndex}
                onChange={() => setCorrectIndex(optIdx)}
                className="w-4 h-4 text-emerald-600 cursor-pointer"
              />
              <label
                htmlFor={`q-${question.id}-opt-${optIdx}`}
                className={`font-extrabold text-xs cursor-pointer w-5 ${
                  optIdx === correctIndex ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                {String.fromCharCode(65 + optIdx)})
              </label>
              <input
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                className="flex-1 bg-transparent text-xs font-medium text-slate-900 outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          Fundamentação / Gabarito Comentado:
        </label>
        <input
          type="text"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Explicação do porquê esta é a resposta correta..."
          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className={`px-4 py-2 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
            isSaved
              ? 'bg-emerald-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {isSaved ? 'check' : 'save'}
          </span>
          <span>{isSaved ? 'Salvo com Sucesso!' : 'Salvar Alterações'}</span>
        </button>
      </div>
    </div>
  );
};

interface AdminViewProps {
  modules?: TestModule[];
  categories?: Category[];
  specializations?: Specialization[];
  questions?: Question[];
  onNavigate: (screen: Screen) => void;
  onAddQuestion: (question: Question) => void;
  onUpdateQuestion?: (question: Question) => void;
  onDeleteQuestion?: (questionId: string) => void;
  onAddModule?: (module: TestModule) => void;
  onDeleteModule?: (moduleId: string) => void;
  onAddCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onAddSpecialization?: (spec: Specialization) => void;
  onDeleteSpecialization?: (specId: string) => void;
  onBulkAddQuestions?: (questions: Question[], moduleId?: string) => void;
  adminPassword?: string;
  onUpdateAdminPassword?: (newPassword: string) => void;
  adminRecoveryEmail?: string;
  onUpdateAdminRecoveryEmail?: (newEmail: string) => void;
  onLockAdmin?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  modules = [],
  categories = [],
  specializations = [],
  questions = [],
  onNavigate,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onAddModule,
  onDeleteModule,
  onAddCategory,
  onDeleteCategory,
  onAddSpecialization,
  onDeleteSpecialization,
  onBulkAddQuestions,
  adminPassword = 'ngola2025',
  onUpdateAdminPassword,
  adminRecoveryEmail = 'ngolaapp@gmail.com',
  onUpdateAdminRecoveryEmail,
  onLockAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'categories' | 'specializations' | 'bulk' | 'codes' | 'stats' | 'security' | 'supabase'>('modules');
  const [newAdminPasswordInput, setNewAdminPasswordInput] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');

  // Admin Recovery Email states
  const [recoveryEmailInput, setRecoveryEmailInput] = useState(adminRecoveryEmail || 'ngolaapp@gmail.com');
  const [recoveryEmailSuccessMsg, setRecoveryEmailSuccessMsg] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailSentSuccess, setTestEmailSentSuccess] = useState<string | null>(null);

  // SMTP / Email Server Dispatch states
  const [smtpProvider, setSmtpProvider] = useState<'gmail' | 'resend' | 'custom'>('gmail');
  const [smtpUser, setSmtpUser] = useState('ngolaapp@gmail.com');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [resendApiKey, setResendApiKey] = useState('');
  const [smtpStatusInfo, setSmtpStatusInfo] = useState<{
    configured: boolean;
    user: string;
    host: string;
    port: number;
    provider: string;
  } | null>(null);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [smtpSaveMsg, setSmtpSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isTestingDelivery, setIsTestingDelivery] = useState(false);
  const [deliveryTestResult, setDeliveryTestResult] = useState<{
    success: boolean;
    delivered: boolean;
    message: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetchAdminRecoveryEmail().then((email) => {
      if (email) {
        setRecoveryEmailInput(email);
        setSmtpUser((prev) => prev || email);
      }
    });

    fetchAdminSmtpStatus().then((status) => {
      if (status) {
        setSmtpStatusInfo(status);
        if (status.host && !status.host.includes('gmail.com')) {
          setSmtpHost(status.host);
        }
        if (status.port) setSmtpPort(status.port);
        if (status.hasResend) setSmtpProvider('resend');
        else if (status.host && !status.host.includes('gmail.com')) setSmtpProvider('custom');
        else setSmtpProvider('gmail');
      }
    });
  }, []);

  const allSpecs = specializations && specializations.length > 0 ? specializations : SPECIALIZATIONS;

  // Category creation & editing state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDescription, setNewCatDescription] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('school');
  const [newCatImage, setNewCatImage] = useState('');
  const [newCatStatusTag, setNewCatStatusTag] = useState('LIBERADO');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Specialization creation & editing state
  const [editingSpec, setEditingSpec] = useState<Specialization | null>(null);
  const [newSpecTitle, setNewSpecTitle] = useState('');
  const [newSpecCategory, setNewSpecCategory] = useState(categories[0]?.id || 'educacao');
  const [newSpecDescription, setNewSpecDescription] = useState('');
  const [newSpecIcon, setNewSpecIcon] = useState('functions');
  const [newSpecImage, setNewSpecImage] = useState('');
  const [isUploadingSpecImage, setIsUploadingSpecImage] = useState(false);
  const [specSearchTerm, setSpecSearchTerm] = useState('');
  const [specCategoryFilter, setSpecCategoryFilter] = useState('all');
  const [isReloadingSpecs, setIsReloadingSpecs] = useState(false);
  const [showSpecCreateForm, setShowSpecCreateForm] = useState(false);

  // Module Delete State
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);
  const [confirmDeleteModuleId, setConfirmDeleteModuleId] = useState<string | null>(null);
  const [moduleActionNotice, setModuleActionNotice] = useState<{ success: boolean; message: string } | null>(null);

  // Category Delete State
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);
  const [categoryActionNotice, setCategoryActionNotice] = useState<{ success: boolean; message: string } | null>(null);

  // Specialization Delete State
  const [deletingSpecId, setDeletingSpecId] = useState<string | null>(null);
  const [confirmDeleteSpecId, setConfirmDeleteSpecId] = useState<string | null>(null);
  const [specActionNotice, setSpecActionNotice] = useState<{ success: boolean; message: string } | null>(null);

  // Supabase states
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [supabaseSyncResult, setSupabaseSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [rlsFixCopied, setRlsFixCopied] = useState(false);
  const [sqlViewTab, setSqlViewTab] = useState<'fix' | 'master'>('fix');
  const [isCheckingTables, setIsCheckingTables] = useState(false);
  const [tableReports, setTableReports] = useState<TableStatusReport[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  // Supabase RLS Policy Live Diagnostic state
  const [isVerifyingRLS, setIsVerifyingRLS] = useState(false);
  const [rlsReports, setRlsReports] = useState<TableRLSStatusReport[]>([]);
  const [rlsLogs, setRlsLogs] = useState<string[]>([]);
  const [rlsOverallOk, setRlsOverallOk] = useState<boolean | null>(null);

  // Supabase Module CRUD Interactive Tester state
  const [isTestingCrud, setIsTestingCrud] = useState(false);
  const [crudTestLogs, setCrudTestLogs] = useState<string[]>([]);
  const [crudTestSuccess, setCrudTestSuccess] = useState<boolean | null>(null);
  const [moduleCreationNotice, setModuleCreationNotice] = useState<{ success: boolean; message: string } | null>(null);

  const initialCfg = getSupabaseConfig();
  const [inputSupabaseUrl, setInputSupabaseUrl] = useState(initialCfg.url);
  const [inputSupabaseKey, setInputSupabaseKey] = useState(initialCfg.key);
  const [credentialsSaveMsg, setCredentialsSaveMsg] = useState('');

  // Real Platform Statistics & Candidates states
  const [realStats, setRealStats] = useState<{
    totalCandidates: number;
    activeSubscriptions: number;
    totalExamsTaken: number;
    averageGrade: number;
    usersList: UserProfile[];
  }>({
    totalCandidates: 0,
    activeSubscriptions: 0,
    totalExamsTaken: 0,
    averageGrade: 0,
    usersList: [],
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showUsedCodesSection, setShowUsedCodesSection] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState<'all' | 'activated' | 'with_code' | 'free' | 'blocked'>('all');
  const [togglingUserPhone, setTogglingUserPhone] = useState<string | null>(null);
  const [togglingBlockPhone, setTogglingBlockPhone] = useState<string | null>(null);
  const [blockModalUser, setBlockModalUser] = useState<UserProfile | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState<string>('Comportamento irregular detectado no uso do sistema');
  const [userActionNotice, setUserActionNotice] = useState<{ success: boolean; message: string } | null>(null);

  const loadPlatformStats = async () => {
    setIsLoadingStats(true);
    try {
      const stats = await fetchRealStatistics();
      setRealStats(stats);
    } catch (err) {
      console.error('Error fetching real stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stats') {
      loadPlatformStats();
    }
  }, [activeTab]);

  const handleToggleUserBlock = async (user: UserProfile, block: boolean, reason?: string) => {
    setTogglingBlockPhone(user.phone);
    try {
      const finalReason = reason || blockReasonInput || 'Comportamento irregular detectado';
      const res = await toggleUserBlockStatus(user.phone, block, finalReason);
      
      setRealStats((prev) => ({
        ...prev,
        usersList: prev.usersList.map((u) =>
          u.phone === user.phone
            ? {
                ...u,
                isBlocked: block,
                blockedReason: block ? finalReason : undefined,
                blockedAt: block ? new Date().toLocaleString('pt-AO') : undefined,
              }
            : u
        ),
      }));

      setUserActionNotice({
        success: res.success,
        message: block
          ? `Candidato ${user.name} (${user.phone}) foi BLOQUEADO com sucesso.`
          : `Candidato ${user.name} (${user.phone}) foi DESBLOQUEADO com sucesso.`,
      });

      setBlockModalUser(null);
      setTimeout(() => setUserActionNotice(null), 5000);
    } catch (e: any) {
      console.error('Error toggling user block status:', e);
      setUserActionNotice({
        success: false,
        message: `Falha ao alterar bloqueio: ${e?.message || String(e)}`,
      });
    } finally {
      setTogglingBlockPhone(null);
    }
  };

  const handleToggleUserActivation = async (phone: string, currentStatus: boolean) => {
    setTogglingUserPhone(phone);
    try {
      const newStatus = !currentStatus;
      await adminToggleUserActivation(phone, newStatus, 14);
      setRealStats((prev) => ({
        ...prev,
        activeSubscriptions: newStatus
          ? prev.activeSubscriptions + 1
          : Math.max(0, prev.activeSubscriptions - 1),
        usersList: prev.usersList.map((u) =>
          u.phone === phone ? { ...u, isActivated: newStatus } : u
        ),
      }));
    } catch (e) {
      console.error('Error updating user activation:', e);
      alert('Erro ao alterar status da assinatura.');
    } finally {
      setTogglingUserPhone(null);
    }
  };

  const runTableDiagnostics = async () => {
    setIsCheckingTables(true);
    try {
      const res = await checkAllSupabaseTables();
      setTableReports(res.tables);
      setLastCheckTime(new Date().toLocaleTimeString('pt-AO'));
    } catch (err) {
      console.error('Error running table diagnostics:', err);
    } finally {
      setIsCheckingTables(false);
    }
  };

  const runRLSDiagnostics = async () => {
    setIsVerifyingRLS(true);
    setRlsLogs(['Iniciando verificação de políticas RLS em todas as tabelas...']);
    try {
      const res = await verifyAllRLSPolicies();
      setRlsReports(res.reports);
      setRlsLogs(res.logs);
      setRlsOverallOk(res.overallOk);
    } catch (err: any) {
      console.error('Error verifying RLS policies:', err);
      setRlsLogs((prev) => [...prev, `[ERRO CRÍTICO] Falha ao testar RLS: ${err?.message || String(err)}`]);
      setRlsOverallOk(false);
    } finally {
      setIsVerifyingRLS(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'supabase') {
      runTableDiagnostics();
      runRLSDiagnostics();
    }
  }, [activeTab]);

  // --- Module Creation & Editing States ---
  const [editingModule, setEditingModule] = useState<TestModule | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [selectedSpecIdsForModule, setSelectedSpecIdsForModule] = useState<string[]>([]);
  const [moduleSpecSearchTerm, setModuleSpecSearchTerm] = useState('');
  const [moduleSpecCategoryFilter, setModuleSpecCategoryFilter] = useState('all');
  const [newModuleYear, setNewModuleYear] = useState<number>(2025);
  const [newModuleBadge, setNewModuleBadge] = useState<'OFICIAL' | 'RECOMENDADO' | 'NOVO' | 'ESPECIAL'>('NOVO');
  const [newModuleDescription, setNewModuleDescription] = useState('');

  // --- Bulk Import States ---
  const [selectedModuleId, setSelectedModuleId] = useState<string>(modules[0]?.id || 'exame-2024');
  const [bulkMode, setBulkMode] = useState<'paste' | 'ai'>('paste');
  const [rawText, setRawText] = useState('');
  const [bulkCategory, setBulkCategory] = useState('Conhecimentos Gerais');
  const [bulkBanca, setBulkBanca] = useState('MINMED / MED • 2025');
  const [parsedPreview, setParsedPreview] = useState<Question[]>([]);
  const [selectedModuleForQuestions, setSelectedModuleForQuestions] = useState<string | null>(null);

  // Preview Questions Editing Handlers
  const handleUpdatePreviewQuestion = (index: number, field: keyof Question, value: any) => {
    setParsedPreview((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleUpdatePreviewOption = (questionIndex: number, optionIndex: number, value: string) => {
    setParsedPreview((prev) => {
      const next = [...prev];
      const opts = [...next[questionIndex].options];
      opts[optionIndex] = value;
      next[questionIndex] = { ...next[questionIndex], options: opts };
      return next;
    });
  };

  const handleRemovePreviewQuestion = (index: number) => {
    setParsedPreview((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddBlankPreviewQuestion = () => {
    const nextIdx = (parsedPreview.length * 3 + 1) % 4;
    const newQ: Question = {
      id: `q-manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      statement: 'Escreva a pergunta aqui...',
      options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
      correctIndex: nextIdx,
      explanation: 'Gabarito e fundamentação da resposta',
      category: bulkCategory || 'Conhecimentos Gerais',
      banca: bulkBanca || 'MINMED / MED • 2025',
      moduleId: selectedModuleId,
    };
    setParsedPreview((prev) => [...prev, newQ]);
  };

  const handleDistributeAnswers = () => {
    setParsedPreview((prev) =>
      prev.map((q, idx) => {
        const targetCorrect = (idx * 3 + 1) % 4; // Rotates across 1 (B), 0 (A), 3 (D), 2 (C)
        if (q.correctIndex === targetCorrect) return q;

        const newOpts = [...q.options];
        const currentCorrectIdx = q.correctIndex ?? 0;
        const currentCorrectVal = newOpts[currentCorrectIdx];
        const targetVal = newOpts[targetCorrect];

        // Swap values so text matches new position
        newOpts[targetCorrect] = currentCorrectVal;
        newOpts[currentCorrectIdx] = targetVal;

        return {
          ...q,
          options: newOpts,
          correctIndex: targetCorrect,
        };
      })
    );
  };

  // AI Bulk Generation States
  const [aiSubject, setAiSubject] = useState('Enfermagem Geral e Biossegurança');
  const [aiCount, setAiCount] = useState<number>(20);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);

  // Existing Questions Search & Filter states
  const [existingQuestionSearch, setExistingQuestionSearch] = useState('');
  const [existingQuestionModuleFilter, setExistingQuestionModuleFilter] = useState('all');

  // Activation Codes states
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([
    'NGOLA-2025-X89K',
    'NGOLA-2025-A123',
    'NGOLA-2025-B456',
  ]);
  const [newCodeSuffix, setNewCodeSuffix] = useState('');
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [confirmDeleteCode, setConfirmDeleteCode] = useState<string | null>(null);
  const [codeActionNotice, setCodeActionNotice] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCodeToast, setCopiedCodeToast] = useState<string | null>(null);

  // --- Specialization Selection & Module Edit Handlers ---
  const handleToggleSpecForModule = (specId: string) => {
    setSelectedSpecIdsForModule((prev) =>
      prev.includes(specId) ? prev.filter((id) => id !== specId) : [...prev, specId]
    );
  };

  const handleSelectAllFilteredSpecsForModule = () => {
    const matchingIds = allSpecs
      .filter((s) => {
        const matchesCategory =
          moduleSpecCategoryFilter === 'all' ||
          s.categoryId === moduleSpecCategoryFilter ||
          s.categoryName?.toLowerCase() === moduleSpecCategoryFilter.toLowerCase();
        const matchesSearch =
          !moduleSpecSearchTerm.trim() ||
          s.title.toLowerCase().includes(moduleSpecSearchTerm.toLowerCase()) ||
          (s.categoryName && s.categoryName.toLowerCase().includes(moduleSpecSearchTerm.toLowerCase()));
        return matchesCategory && matchesSearch;
      })
      .map((s) => s.id);

    setSelectedSpecIdsForModule((prev) => Array.from(new Set([...prev, ...matchingIds])));
  };

  const handleClearAllSpecsForModule = () => {
    setSelectedSpecIdsForModule([]);
  };

  const handleStartEditModule = (mod: TestModule) => {
    setEditingModule(mod);
    setNewModuleTitle(mod.title);
    setNewModuleYear(mod.year || 2025);
    setNewModuleBadge((mod.badge as any) || 'NOVO');
    setNewModuleDescription(mod.description || '');

    // Resolve matching specialization IDs
    let matchedIds: string[] = [];
    if (mod.specializationIds && mod.specializationIds.length > 0) {
      matchedIds = mod.specializationIds;
    } else if (mod.specializationNames && mod.specializationNames.length > 0) {
      matchedIds = allSpecs
        .filter((s) =>
          mod.specializationNames?.some(
            (n) => n.toLowerCase().trim() === s.title.toLowerCase().trim()
          )
        )
        .map((s) => s.id);
    } else if (mod.category) {
      matchedIds = allSpecs
        .filter(
          (s) =>
            mod.category.toLowerCase().includes(s.title.toLowerCase()) ||
            s.title.toLowerCase().includes(mod.category.toLowerCase())
        )
        .map((s) => s.id);
    }

    if (matchedIds.length === 0 && allSpecs[0]) {
      matchedIds = [allSpecs[0].id];
    }
    setSelectedSpecIdsForModule(matchedIds);

    setTimeout(() => {
      const el = document.getElementById('module-form');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const handleCancelEditModule = () => {
    setEditingModule(null);
    setNewModuleTitle('');
    setNewModuleYear(2025);
    setNewModuleBadge('NOVO');
    setNewModuleDescription('');
    setSelectedSpecIdsForModule(allSpecs[0] ? [allSpecs[0].id] : []);
  };

  // --- Handlers ---
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) {
      alert('Por favor informe o título do módulo.');
      return;
    }

    if (selectedSpecIdsForModule.length === 0) {
      alert('Por favor selecione pelo menos uma especialidade para este módulo.');
      return;
    }

    const selectedSpecs = allSpecs.filter((s) => selectedSpecIdsForModule.includes(s.id));
    const selectedTitles = selectedSpecs.map((s) => s.title);
    const primaryCategory = selectedTitles.length > 0 ? selectedTitles.join(', ') : 'Geral';

    const moduleToSave: TestModule = {
      id: editingModule ? editingModule.id : `module-${Date.now()}`,
      title: newModuleTitle.trim(),
      category: primaryCategory,
      specializationIds: selectedSpecIdsForModule,
      specializationNames: selectedTitles,
      year: Number(newModuleYear) || 2025,
      badge: newModuleBadge,
      questionCount: editingModule ? editingModule.questionCount : 0,
      description: newModuleDescription.trim() || undefined,
      createdAt: editingModule?.createdAt || new Date().toLocaleDateString('pt-AO'),
    };

    if (onAddModule) {
      onAddModule(moduleToSave);
    }
    
    // Save to Supabase and inform admin
    const saveResult = await saveTestModule(moduleToSave);
    setModuleCreationNotice({
      success: saveResult.success,
      message: editingModule
        ? `Módulo "${moduleToSave.title}" atualizado com ${selectedTitles.length} especialidade(s) com sucesso!`
        : `Módulo "${moduleToSave.title}" criado e associado a ${selectedTitles.length} especialidade(s)!`,
    });

    setSelectedModuleId(moduleToSave.id);
    handleCancelEditModule();
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecione um ficheiro de imagem válido (PNG, JPG, WEBP, etc.).');
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setNewCatImage(result);
      setIsUploadingImage(false);
    };
    reader.onerror = () => {
      alert('Erro ao carregar a imagem.');
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateCategoryImage = async (cat: Category, file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      const updatedCat: Category = { ...cat, image: result };
      if (onAddCategory) {
        onAddCategory(updatedCat);
      }
      const saveRes = await saveCategory(updatedCat);
      if (saveRes.success) {
        alert(`Imagem da categoria "${cat.name}" atualizada e gravada no Supabase com sucesso!`);
      } else {
        alert(`Imagem salva localmente. Aviso Supabase: ${saveRes.message}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateSpecImage = async (spec: Specialization, file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      const updatedSpec: Specialization = { ...spec, image: result };
      if (onAddSpecialization) {
        onAddSpecialization(updatedSpec);
      }
      const saveRes = await saveSpecialization(updatedSpec);
      if (saveRes.success) {
        alert(`Imagem da especialização "${spec.title}" atualizada e gravada no Supabase com sucesso!`);
      } else {
        alert(`Imagem salva localmente. Aviso Supabase: ${saveRes.message}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setNewCatName(cat.name);
    setNewCatDescription(cat.description || '');
    setNewCatIcon(cat.icon || 'school');
    setNewCatImage(cat.image || '');
    setNewCatStatusTag(cat.statusTag || 'LIBERADO');
    setTimeout(() => {
      const el = document.getElementById('category-form');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setNewCatName('');
    setNewCatDescription('');
    setNewCatIcon('school');
    setNewCatImage('');
    setNewCatStatusTag('LIBERADO');
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      alert('Por favor informe o nome da categoria.');
      return;
    }

    const getCategoryStatusColor = (tag: string) => {
      const upper = (tag || '').toUpperCase().trim();
      if (upper === 'GRÁTIS' || upper === 'GRATIS' || upper === 'FREE') return 'bg-emerald-600 ring-2 ring-emerald-300/60 shadow-sm';
      if (upper === 'NOVO') return 'bg-amber-500';
      if (upper === 'EM BREVE') return 'bg-slate-500';
      return 'bg-emerald-500';
    };

    const createdCat: Category = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      name: newCatName.trim(),
      description: newCatDescription.trim() || 'Concurso público oficial de Angola',
      icon: newCatIcon || 'school',
      image: newCatImage || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
      statusTag: newCatStatusTag,
      statusColor: getCategoryStatusColor(newCatStatusTag),
      subcategoriesCount: editingCategory ? editingCategory.subcategoriesCount : 0,
      featured: true,
    };

    if (onAddCategory) {
      onAddCategory(createdCat);
    }
    const saveRes = await saveCategory(createdCat);

    const actionMessage = editingCategory ? 'atualizada' : 'criada';
    if (saveRes.success) {
      alert(`Categoria "${createdCat.name}" ${actionMessage} e gravada no Supabase com sucesso!`);
    } else {
      alert(`Categoria "${createdCat.name}" salva localmente. Aviso do Supabase: ${saveRes.message}`);
    }
    handleCancelEditCategory();
  };

  const handleSpecImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecione um ficheiro de imagem válido (PNG, JPG, WEBP, etc.).');
      return;
    }

    setIsUploadingSpecImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setNewSpecImage(result);
      setIsUploadingSpecImage(false);
    };
    reader.onerror = () => {
      alert('Erro ao carregar a imagem.');
      setIsUploadingSpecImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleStartEditSpec = (spec: Specialization) => {
    setEditingSpec(spec);
    setNewSpecTitle(spec.title);
    setNewSpecCategory(spec.categoryId || categories[0]?.id || 'educacao');
    setNewSpecDescription(spec.description || '');
    setNewSpecIcon(spec.icon || 'functions');
    setNewSpecImage(spec.image || '');
    setTimeout(() => {
      const el = document.getElementById('specialization-form');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  const handleCancelEditSpec = () => {
    setEditingSpec(null);
    setNewSpecTitle('');
    setNewSpecCategory(categories[0]?.id || 'educacao');
    setNewSpecDescription('');
    setNewSpecIcon('functions');
    setNewSpecImage('');
  };

  const handleSaveSpecialization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecTitle.trim()) {
      alert('Por favor informe o título da especialização.');
      return;
    }

    const catObj = categories.find((c) => c.id === newSpecCategory);

    const specToSave: Specialization = {
      id: editingSpec ? editingSpec.id : `spec-${Date.now()}`,
      categoryId: newSpecCategory,
      categoryName: catObj ? catObj.name : 'Geral',
      title: newSpecTitle.trim(),
      description: newSpecDescription.trim() || 'Especialização em concursos públicos de Angola.',
      icon: newSpecIcon || 'functions',
      image: newSpecImage || 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80',
      isSelected: false,
      isRecommended: true,
    };

    if (onAddSpecialization) {
      onAddSpecialization(specToSave);
    }
    const saveRes = await saveSpecialization(specToSave);

    const actionText = editingSpec ? 'atualizada' : 'criada';
    if (saveRes.success) {
      alert(`Especialização "${specToSave.title}" ${actionText} e gravada no Supabase com sucesso!`);
    } else {
      alert(`Especialização "${specToSave.title}" salva localmente. Aviso do Supabase: ${saveRes.message}`);
    }
    handleCancelEditSpec();
  };

  // --- Deletion Execution Handlers ---
  const handleExecuteDeleteModule = async (moduleId: string, moduleTitle: string) => {
    setDeletingModuleId(moduleId);
    setConfirmDeleteModuleId(null);
    try {
      if (selectedModuleForQuestions === moduleId) {
        setSelectedModuleForQuestions(null);
      }
      if (selectedModuleId === moduleId) {
        const remaining = modules.filter((m) => m.id !== moduleId);
        setSelectedModuleId(remaining[0]?.id || '');
      }
      if (onDeleteModule) {
        onDeleteModule(moduleId);
      }
      const res = await deleteTestModule(moduleId);
      setModuleActionNotice(res);
    } catch (err: any) {
      setModuleActionNotice({
        success: false,
        message: `Erro ao apagar módulo: ${err?.message || String(err)}`,
      });
    } finally {
      setDeletingModuleId(null);
      setTimeout(() => setModuleActionNotice(null), 5000);
    }
  };

  const handleExecuteDeleteCategory = async (catId: string, catName: string) => {
    setDeletingCategoryId(catId);
    setConfirmDeleteCategoryId(null);
    try {
      if (editingCategory && (String(editingCategory.id) === String(catId) || editingCategory.name === catName)) {
        handleCancelEditCategory();
      }
      if (onDeleteCategory) {
        onDeleteCategory(catId);
      }
      const res = await deleteCategory(catId);
      setCategoryActionNotice(res);
    } catch (err: any) {
      setCategoryActionNotice({
        success: false,
        message: `Erro ao apagar categoria: ${err?.message || String(err)}`,
      });
    } finally {
      setDeletingCategoryId(null);
      setTimeout(() => setCategoryActionNotice(null), 5000);
    }
  };

  const handleExecuteDeleteSpec = async (specId: string, specTitle: string) => {
    setDeletingSpecId(specId);
    setConfirmDeleteSpecId(null);
    try {
      if (editingSpec && (String(editingSpec.id) === String(specId) || editingSpec.title === specTitle)) {
        handleCancelEditSpec();
      }
      if (onDeleteSpecialization) {
        onDeleteSpecialization(specId);
      }
      const res = await deleteSpecializationFromSupabase(specId);
      setSpecActionNotice(res);
    } catch (err: any) {
      setSpecActionNotice({
        success: false,
        message: `Erro ao apagar especialização: ${err?.message || String(err)}`,
      });
    } finally {
      setDeletingSpecId(null);
      setTimeout(() => setSpecActionNotice(null), 5000);
    }
  };

  const handleReloadSpecs = async () => {
    setIsReloadingSpecs(true);
    try {
      const freshSpecs = await fetchSpecializations();
      const freshCats = await fetchCategories();
      freshSpecs.forEach((s) => {
        if (onAddSpecialization) onAddSpecialization(s);
      });
      freshCats.forEach((c) => {
        if (onAddCategory) onAddCategory(c);
      });
      setSpecActionNotice({
        success: true,
        message: `${freshSpecs.length} especializações e ${freshCats.length} categorias sincronizadas do Supabase com sucesso!`,
      });
    } catch (err: any) {
      setSpecActionNotice({
        success: false,
        message: `Erro ao recarregar especializações: ${err?.message || String(err)}`,
      });
    } finally {
      setIsReloadingSpecs(false);
      setTimeout(() => setSpecActionNotice(null), 5000);
    }
  };

  const handleParseText = () => {
    if (!rawText.trim()) {
      alert('Por favor cole o texto ou CSV com as perguntas primeiro.');
      return;
    }
    const questions = parseBulkQuestionsText(rawText, bulkCategory, bulkBanca, selectedModuleId);
    if (questions.length === 0) {
      alert('Não foi possível identificar perguntas no formato colado.\n\nFormatos suportados:\n• CSV com ponto e vírgula (;): Pergunta; Opção A; Opção B; Opção C; Opção D; B\n• CSV com vírgula ou Excel/Tabulação\n• Texto numerado com RESPOSTA: B');
    } else {
      setParsedPreview(questions);
    }
  };

  const handleLoadCsvSample = () => {
    const csvSample = `Qual é a capital oficial de Angola?; Benguela; Luanda; Huambo; Cabinda; B; Luanda é a capital política e administrativa.
A Independência de Angola foi proclamada em qual ano?; 1961; 1975; 1992; 2002; B; Proclamada a 11 de Novembro de 1975.
Qual é a moeda oficial da República de Angola?; Metical; Kwanza; Real; Rand; B; O Kwanza (AOA) é a moeda legal vigente.
O Rio Cuanza deságua em qual oceano?; Oceano Índico; Oceano Atlântico; Oceano Pacífico; Mar Vermelho; B; Deságua no Oceano Atlântico a sul de Luanda.
A Constituição da República de Angola em vigor foi aprovada em qual ano?; 1992; 2010; 2015; 2021; B; Aprovada em 2010 e revista em 2021.`;
    setRawText(csvSample);
  };

  const handleLoadTextSample = () => {
    const textSample = `1. Qual é o órgão supremo da administração pública em Angola?
A) Ministério das Finanças
B) Governo da República
C) Assembleia Nacional
D) Tribunal Constitucional
RESPOSTA: B
EXPLICAÇÃO: O Governo é o órgão executivo supremo.

2. Qual das províncias angolanas é a mais extensa em território?
A) Huíla
B) Moxico
C) Cuando Cubango
D) Benguela
RESPOSTA: B
EXPLICAÇÃO: Moxico é a maior província em extensão territorial em Angola.`;
    setRawText(textSample);
  };

  const handleGenerateAiBulk = async () => {
    setIsGeneratingBulk(true);
    try {
      const res = await fetch('/api/gemini/generate-bulk-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: aiSubject,
          count: aiCount,
          banca: bulkBanca,
          moduleId: selectedModuleId,
        }),
      });
      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        setParsedPreview(data.questions);
      } else {
        alert('Erro ao obter resposta da IA. Tente novamente.');
      }
    } catch (err) {
      console.error('Error generating bulk questions:', err);
      alert('Ocorreu uma falha ao gerar questões com IA.');
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  const handleConfirmSaveBulk = () => {
    if (parsedPreview.length === 0) return;
    if (onBulkAddQuestions) {
      onBulkAddQuestions(parsedPreview, selectedModuleId);
    } else {
      parsedPreview.forEach((q) => onAddQuestion(q));
    }
    alert(`${parsedPreview.length} questões foram adicionadas com sucesso ao módulo selecionado!`);
    setParsedPreview([]);
    setRawText('');
  };

  const refreshActivationCodes = async () => {
    try {
      const codes = await fetchActivationCodesFromSupabase();
      if (codes && codes.length >= 0) {
        setGeneratedCodes(codes);
      }
    } catch (err) {
      console.warn('Error fetching activation codes:', err);
    }
  };

  useEffect(() => {
    refreshActivationCodes();
  }, []);

  const handleGenerateCode = async () => {
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `NGOLA-2025-${newCodeSuffix.trim().toUpperCase() || randomChars}`;
    setGeneratedCodes((prev) => Array.from(new Set([code, ...prev])));
    setNewCodeSuffix('');
    await saveGeneratedActivationCode(code, 14);
    setCodeActionNotice({
      success: true,
      message: `Código "${code}" gerado e salvo no Supabase com sucesso!`,
    });
    setTimeout(() => setCodeActionNotice(null), 4000);
  };

  const handleDeleteCode = async (code: string) => {
    setDeletingCode(code);
    setConfirmDeleteCode(null);
    try {
      // 1. Remove from local list state immediately
      setGeneratedCodes((prev) => prev.filter((c) => c.toUpperCase() !== code.toUpperCase()));
      
      // 2. Remove from Supabase & local storage
      const res = await deleteActivationCode(code);
      setCodeActionNotice({
        success: res.success,
        message: res.message,
      });

      // 3. Refresh platform stats in background
      loadPlatformStats();

      setTimeout(() => {
        setCodeActionNotice(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error deleting code:', err);
      setCodeActionNotice({
        success: false,
        message: `Falha ao apagar código: ${err?.message || String(err)}`,
      });
    } finally {
      setDeletingCode(null);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeToast(`Código ${code} copiado!`);
    setTimeout(() => setCopiedCodeToast(null), 3000);
  };

  return (
    <div className="pt-4 md:pt-6 pb-32 px-4 md:px-8 max-w-5xl mx-auto space-y-4">
      {/* Top Header - Compact */}
      <div className="flex items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">Painel do Administrador</h2>
          </div>
        </div>
        <button
          onClick={() => onNavigate('home')}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 cursor-pointer font-bold text-xs flex items-center gap-1.5 transition-all"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Sair do Painel</span>
        </button>
      </div>

      {/* Tabs - Compact & Clean */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 bg-slate-200/70 p-1 rounded-xl gap-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('modules')}
          className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'modules' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-sm">folder_open</span>
          <span>Módulos</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'categories' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-sm">category</span>
          <span>Categorias</span>
        </button>

        <button
          onClick={() => setActiveTab('specializations')}
          className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'specializations' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-sm">school</span>
          <span>Especializações</span>
        </button>

        <button
          onClick={() => setActiveTab('bulk')}
          className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'bulk' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-sm">cloud_upload</span>
          <span>Importar Lote</span>
        </button>

        <button
          onClick={() => setActiveTab('codes')}
          className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'codes' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-sm">key</span>
          <span>Códigos</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'stats' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-sm">bar_chart</span>
          <span>Estatísticas</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'security' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-sm">lock</span>
          <span>Senha ADM</span>
        </button>

        <button
          onClick={() => setActiveTab('supabase')}
          className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'supabase' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          <span className="material-symbols-outlined text-sm">database</span>
          <span>Supabase</span>
        </button>
      </div>

      {/* ================= TAB 1: MODULES MANAGEMENT ================= */}
      {activeTab === 'modules' && (
        <div className="space-y-6">
          {moduleCreationNotice && (
            <div className={`p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold border shadow-sm ${
              moduleCreationNotice.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl shrink-0">
                  {moduleCreationNotice.success ? 'check_circle' : 'warning'}
                </span>
                <span className="leading-snug">{moduleCreationNotice.message}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('bulk')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>Importar Perguntas</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('supabase')}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">database</span>
                  <span>Verificar Supabase</span>
                </button>
              </div>
            </div>
          )}

          {/* Create / Edit Module Form */}
          <div id="module-form" className="bg-white rounded-3xl p-6 md:p-8 space-y-6 shadow-sm border border-slate-200/80">
            <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">
                    {editingModule ? 'edit_square' : 'add_box'}
                  </span>
                  <span>{editingModule ? `Editar Módulo: ${editingModule.title}` : 'Criar Novo Módulo do Concurso'}</span>
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  {editingModule
                    ? 'Atualize as especializações associadas, título e detalhes deste módulo do concurso.'
                    : 'Cadastre a disciplina e vincule a 1 ou mais especializações simultaneamente antes de inserir perguntas.'}
                </p>
              </div>

              {editingModule && (
                <button
                  type="button"
                  onClick={handleCancelEditModule}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  <span>Cancelar Edição</span>
                </button>
              )}
            </div>

            <form onSubmit={handleCreateModule} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome / Título do Módulo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    placeholder="Ex: Concurso MED 2025 - Pedagogia e Didática"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ano do Exame
                  </label>
                  <input
                    type="number"
                    value={newModuleYear}
                    onChange={(e) => setNewModuleYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Selo / Badge
                  </label>
                  <select
                    value={newModuleBadge}
                    onChange={(e) => setNewModuleBadge(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="NOVO">NOVO</option>
                    <option value="OFICIAL">OFICIAL</option>
                    <option value="RECOMENDADO">RECOMENDADO</option>
                    <option value="ESPECIAL">ESPECIAL</option>
                  </select>
                </div>
              </div>

              {/* MULTI-SPECIALIZATION SELECTION ZONE */}
              <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/70 pb-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-blue-600 text-base">checklist</span>
                      <span>Especializações do Concurso (Múltipla Seleção) *</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Este módulo aparecerá em todas as especializações marcadas abaixo.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllFilteredSpecsForModule}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-xs">select_all</span>
                      <span>Selecionar Todas</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllSpecsForModule}
                      className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-xs">clear_all</span>
                      <span>Limpar</span>
                    </button>
                  </div>
                </div>

                {/* Search and Category Filter for Specializations */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-7 relative">
                    <span className="material-symbols-outlined text-slate-400 absolute left-3 top-2.5 text-sm">search</span>
                    <input
                      type="text"
                      value={moduleSpecSearchTerm}
                      onChange={(e) => setModuleSpecSearchTerm(e.target.value)}
                      placeholder="Pesquisar especialidade por nome..."
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    {moduleSpecSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setModuleSpecSearchTerm('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    )}
                  </div>

                  <div className="sm:col-span-5">
                    <select
                      value={moduleSpecCategoryFilter}
                      onChange={(e) => setModuleSpecCategoryFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="all">Todas as Categorias ({allSpecs.length})</option>
                      {categories.map((c) => {
                        const count = allSpecs.filter((s) => s.categoryId === c.id || s.categoryName === c.name).length;
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Selected Specializations Chips Bar */}
                <div className="bg-white rounded-xl p-3 border border-slate-200/80">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                      <span>
                        {selectedSpecIdsForModule.length} especialidade(s) selecionada(s)
                      </span>
                    </span>
                    {selectedSpecIdsForModule.length === 0 && (
                      <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        Selecione pelo menos 1 especialidade
                      </span>
                    )}
                  </div>

                  {selectedSpecIdsForModule.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {selectedSpecIdsForModule.map((specId) => {
                        const specObj = allSpecs.find((s) => s.id === specId);
                        const specTitle = specObj ? specObj.title : specId;
                        return (
                          <span
                            key={specId}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 text-xs font-bold rounded-lg border border-blue-200/80 shadow-2xs animate-fadeIn"
                          >
                            <span className="material-symbols-outlined text-xs text-blue-600">school</span>
                            <span className="truncate max-w-[200px]">{specTitle}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleSpecForModule(specId)}
                              className="ml-0.5 text-blue-500 hover:text-red-600 hover:bg-blue-100 rounded p-0.5 cursor-pointer transition-colors"
                              title="Remover especialidade"
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1">
                      Nenhuma especialidade selecionada. Clique nas opções abaixo para associar este módulo.
                    </div>
                  )}
                </div>

                {/* Interactive Multi-Select Specialization Grid */}
                <div className="max-h-64 overflow-y-auto pr-1 space-y-3">
                  {(() => {
                    const filteredSpecs = allSpecs.filter((s) => {
                      const matchesCategory =
                        moduleSpecCategoryFilter === 'all' ||
                        s.categoryId === moduleSpecCategoryFilter ||
                        s.categoryName?.toLowerCase() === moduleSpecCategoryFilter.toLowerCase();
                      const matchesSearch =
                        !moduleSpecSearchTerm.trim() ||
                        s.title.toLowerCase().includes(moduleSpecSearchTerm.toLowerCase()) ||
                        (s.categoryName && s.categoryName.toLowerCase().includes(moduleSpecSearchTerm.toLowerCase()));
                      return matchesCategory && matchesSearch;
                    });

                    if (filteredSpecs.length === 0) {
                      return (
                        <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-200">
                          <span className="material-symbols-outlined text-slate-400 text-2xl">search_off</span>
                          <p className="text-xs font-bold text-slate-600 mt-1">Nenhuma especialidade encontrada</p>
                          <p className="text-[11px] text-slate-400">Tente ajustar o termo de busca ou filtro de categoria.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {filteredSpecs.map((spec) => {
                          const isSelected = selectedSpecIdsForModule.includes(spec.id);
                          return (
                            <div
                              key={spec.id}
                              onClick={() => handleToggleSpecForModule(spec.id)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                                isSelected
                                  ? 'bg-blue-50/90 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                              }`}
                            >
                              <div className="pt-0.5 shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // Handled by parent div onClick
                                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer pointer-events-none"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 truncate max-w-[120px]">
                                    {spec.categoryName || 'Geral'}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[10px] font-black text-blue-700 bg-blue-100/80 px-1 rounded">
                                      Ativo
                                    </span>
                                  )}
                                </div>
                                <h5 className={`text-xs font-bold leading-snug line-clamp-2 ${
                                  isSelected ? 'text-blue-900' : 'text-slate-800'
                                }`}>
                                  {spec.title}
                                </h5>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição do Módulo (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={newModuleDescription}
                  onChange={(e) => setNewModuleDescription(e.target.value)}
                  placeholder="Ex: Contém 50 questões oficiais com gabarito comentado para os exames de admissão em Angola."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">
                    {editingModule ? 'save' : 'check_circle'}
                  </span>
                  <span>
                    {editingModule
                      ? 'Salvar Alterações do Módulo'
                      : `Criar Módulo & Vincular ${selectedSpecIdsForModule.length} Especialidade(s)`}
                  </span>
                </button>

                {editingModule && (
                  <button
                    type="button"
                    onClick={handleCancelEditModule}
                    className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-sm"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List of Created Modules */}
          <div className="bg-white rounded-3xl p-6 md:p-8 space-y-4 shadow-sm border border-slate-200/80">
            <h3 className="text-lg font-bold text-slate-900 flex items-center justify-between">
              <span>Módulos Cadastrados no Sistema ({modules.length})</span>
            </h3>

            {/* Module Action Notice */}
            {moduleActionNotice && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                  moduleActionNotice.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {moduleActionNotice.success ? 'check_circle' : 'error'}
                </span>
                <span className="flex-1">{moduleActionNotice.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modules.map((mod) => {
                const specNames = mod.specializationNames && mod.specializationNames.length > 0
                  ? mod.specializationNames
                  : mod.category ? [mod.category] : ['Geral'];

                return (
                  <div
                    key={mod.id}
                    className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[11px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                            {mod.badge || 'OFICIAL'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md">
                            Ano {mod.year}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold bg-slate-900 text-white px-2 py-0.5 rounded-md">
                          {mod.questionCount} Perguntas
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-base leading-snug">{mod.title}</h4>

                      {/* Display Associated Specializations */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-blue-600">school</span>
                          <span>Especializações Vinculadas ({specNames.length}):</span>
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                          {specNames.map((name, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 inline-flex items-center gap-1"
                            >
                              <span>{name}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {mod.description && (
                        <p className="text-slate-500 text-xs line-clamp-2 pt-1">{mod.description}</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEditModule(mod)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-blue-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-blue-200 shadow-2xs"
                        title="Editar módulo e especialidades vinculadas"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        <span>Editar</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {confirmDeleteModuleId === mod.id ? (
                          <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200">
                            <button
                              type="button"
                              disabled={deletingModuleId === mod.id}
                              onClick={() => handleExecuteDeleteModule(mod.id, mod.title)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                            >
                              {deletingModuleId === mod.id ? (
                                <>
                                  <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                                  <span>Apagando...</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-xs">check</span>
                                  <span>Confirmar?</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={deletingModuleId === mod.id}
                              onClick={() => setConfirmDeleteModuleId(null)}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteModuleId(mod.id)}
                            className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-red-200/60"
                            title="Remover este módulo"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            <span className="hidden sm:inline">Apagar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (selectedModuleForQuestions === mod.id) {
                              setSelectedModuleForQuestions(null);
                            } else {
                              setSelectedModuleForQuestions(mod.id);
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border ${
                            selectedModuleForQuestions === mod.id
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">edit_note</span>
                          <span>{selectedModuleForQuestions === mod.id ? 'Fechar' : 'Perguntas'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedModuleId(mod.id);
                            setActiveTab('bulk');
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">add_circle</span>
                          <span>+ Lote</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expanded Module Questions Manager */}
            {selectedModuleForQuestions && (() => {
              const activeMod = modules.find((m) => m.id === selectedModuleForQuestions);
              const modQuestions = (questions || []).filter(
                (q) =>
                  q.moduleId === activeMod?.id ||
                  (activeMod?.category && q.category.toLowerCase().includes(activeMod.category.toLowerCase()))
              );

              return (
                <div className="bg-slate-50/80 rounded-3xl p-5 md:p-7 space-y-5 border-2 border-blue-200 mt-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                    <div>
                      <h4 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600">quiz</span>
                        Perguntas do Módulo: <span className="text-blue-700">{activeMod?.title || 'Módulo Selecionado'}</span>
                      </h4>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {modQuestions.length} perguntas cadastradas. Edite o enunciado, opções ou gabarito em tempo real.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newQ: Question = {
                            id: `mod-q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                            statement: 'Escreva o enunciado da nova pergunta...',
                            options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
                            correctIndex: (modQuestions.length * 3 + 1) % 4,
                            explanation: 'Gabarito e explicação da resposta',
                            category: activeMod?.category || 'Conhecimentos Gerais',
                            banca: 'MINMED / MED • 2025',
                            moduleId: activeMod?.id,
                          };
                          onAddQuestion(newQ);
                          saveQuestion(newQ);
                        }}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">add_circle</span>
                        <span>+ Nova Pergunta</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedModuleForQuestions(null)}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 cursor-pointer"
                        title="Fechar gerenciar perguntas"
                      >
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>
                  </div>

                  {modQuestions.length === 0 ? (
                    <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-300 space-y-2">
                      <p className="text-slate-500 font-medium text-xs">
                        Nenhuma pergunta cadastrada especificamente para este módulo.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModuleId(selectedModuleForQuestions);
                          setActiveTab('bulk');
                        }}
                        className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm">cloud_upload</span>
                        <span>Importar Lote de Perguntas</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                      {modQuestions.map((q, idx) => (
                        <EditableQuestionCard
                          key={q.id || idx}
                          question={q}
                          index={idx}
                          onSave={(updatedQ) => {
                            if (onUpdateQuestion) onUpdateQuestion(updatedQ);
                            saveQuestion(updatedQ);
                          }}
                          onDelete={(qId) => {
                            if (onDeleteQuestion) onDeleteQuestion(qId);
                            deleteQuestion(qId);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================= TAB: CATEGORIES MANAGEMENT ================= */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Create / Edit Category Form */}
          <div id="category-form" className="bg-white rounded-3xl p-6 md:p-8 space-y-5 shadow-sm border border-slate-200/80">
            <div className="border-b pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">
                    {editingCategory ? 'edit_note' : 'category'}
                  </span>
                  {editingCategory ? `Editar Categoria: ${editingCategory.name}` : 'Criar Nova Categoria de Concurso Público'}
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Cadastre ou edite os setores, ministérios ou áreas de concursos públicos de Angola (ex: AGT, PNA, MINSA, MED, Justiça).
                </p>
              </div>
              {editingCategory && (
                <div className="flex items-center gap-2">
                  {confirmDeleteCategoryId === editingCategory.id ? (
                    <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200">
                      <button
                        type="button"
                        disabled={deletingCategoryId === editingCategory.id}
                        onClick={() => handleExecuteDeleteCategory(editingCategory.id, editingCategory.name)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                      >
                        {deletingCategoryId === editingCategory.id ? (
                          <>
                            <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                            <span>Apagando...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-xs">check</span>
                            <span>Confirmar Apagar Categoria?</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={deletingCategoryId === editingCategory.id}
                        onClick={() => setConfirmDeleteCategoryId(null)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCategoryId(editingCategory.id)}
                      className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-red-200 shadow-xs"
                      title="Apagar esta categoria permanentemente"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      <span>Apagar Categoria</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCancelEditCategory}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                    <span>Cancelar Edição</span>
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              {/* CAMPO DE UPLOAD DE IMAGEM DA CATEGORIA - EM DESTAQUE NO TOPO */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border-2 border-blue-200 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 text-xl">add_a_photo</span>
                    <span>Imagem da Categoria do Concurso Público (PNG, JPG, WEBP)</span>
                  </label>
                  <span className="text-[10px] bg-blue-600 text-white font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Guardado no Supabase
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* Botão de Upload de Ficheiro */}
                  <label className="flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold px-5 py-3.5 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-95">
                    <span className="material-symbols-outlined text-xl">cloud_upload</span>
                    <span>{isUploadingImage ? 'A carregar ficheiro...' : '1. Carregar Foto do Dispositivo'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>

                  {/* Campo de URL / Link da Imagem */}
                  <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-xs shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                    <span className="material-symbols-outlined text-slate-400 mr-2 text-base">link</span>
                    <input
                      type="url"
                      value={newCatImage}
                      onChange={(e) => setNewCatImage(e.target.value)}
                      placeholder="2. Ou cole o link da imagem (https://...)"
                      className="w-full bg-transparent outline-none text-xs text-slate-800 font-medium placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Pré-visualização da Imagem Anexada */}
                {newCatImage ? (
                  <div className="flex items-center gap-4 pt-3 border-t border-blue-200/80 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex-shrink-0 bg-slate-100">
                      <img src={newCatImage} alt="Pré-visualização" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow text-xs space-y-1">
                      <p className="text-emerald-700 font-extrabold flex items-center gap-1.5 text-xs">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        Imagem anexada com sucesso e pronta para guardar!
                      </p>
                      <p className="text-slate-500 text-[11px] truncate max-w-sm">{newCatImage}</p>
                      <button
                        type="button"
                        onClick={() => setNewCatImage('')}
                        className="text-red-600 hover:text-red-700 hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer pt-1"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        <span>Remover imagem</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 font-medium italic">
                    * Selecione um ficheiro de imagem no botão acima ou cole o link. A foto ficará arquivada no Supabase.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome da Categoria de Concurso *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Ex: AGT - Administração Geral Tributária"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Estado / Tag de Visibilidade *</span>
                    {newCatStatusTag === 'GRÁTIS' && (
                      <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <span className="material-symbols-outlined text-xs">savings</span>
                        <span>Acesso Livre & Gratuito</span>
                      </span>
                    )}
                  </label>
                  <select
                    value={newCatStatusTag}
                    onChange={(e) => setNewCatStatusTag(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="LIBERADO">LIBERADO (Disponível com código/inscrição)</option>
                    <option value="GRÁTIS">GRÁTIS (100% Gratuito - Sem pagar inscrição)</option>
                    <option value="NOVO">NOVO (Destaque recente)</option>
                    <option value="EM BREVE">EM BREVE (Aguardando exames)</option>
                  </select>
                  <p className="text-[11px] mt-1.5 text-slate-500 font-medium">
                    {newCatStatusTag === 'GRÁTIS' ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        Utilizadores podem aceder e fazer todos os simulados desta categoria gratuitamente sem precisar de pagar ou inserir código.
                      </span>
                    ) : newCatStatusTag === 'LIBERADO' ? (
                      'Categoria aberta com exames disponíveis (requer código de ativação individual ou geral).'
                    ) : newCatStatusTag === 'NOVO' ? (
                      'Categoria com destaque de novidade recente.'
                    ) : (
                      'Categoria em preparação para próximos exames.'
                    )}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descrição do Concurso
                  </label>
                  <input
                    type="text"
                    value={newCatDescription}
                    onChange={(e) => setNewCatDescription(e.target.value)}
                    placeholder="Ex: Exames e simulados para o concurso público da AGT 2025."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={handleCancelEditCategory}
                    className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                    <span>Cancelar</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95"
                >
                  <span className="material-symbols-outlined text-xl">
                    {editingCategory ? 'check_circle' : 'add_circle'}
                  </span>
                  <span>{editingCategory ? 'Atualizar Categoria no Supabase' : 'Salvar Categoria no Supabase'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Existing Categories List */}
          <div className="bg-white rounded-3xl p-6 md:p-8 space-y-4 shadow-sm border border-slate-200/80">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">list_alt</span>
              Categorias Existentes ({categories.length})
            </h3>

            {/* Category Action Notice */}
            {categoryActionNotice && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                  categoryActionNotice.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {categoryActionNotice.success ? 'check_circle' : 'error'}
                </span>
                <span className="flex-1">{categoryActionNotice.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center overflow-hidden border border-slate-200">
                        {cat.image ? (
                          <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined">{cat.icon || 'school'}</span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full text-white flex items-center gap-1 ${
                          (cat.statusTag || '').toUpperCase() === 'GRÁTIS' || (cat.statusTag || '').toUpperCase() === 'GRATIS'
                            ? 'bg-emerald-600 ring-2 ring-emerald-300/70 shadow-sm'
                            : (cat.statusTag || '').toUpperCase() === 'NOVO'
                            ? 'bg-amber-500'
                            : (cat.statusTag || '').toUpperCase() === 'EM BREVE'
                            ? 'bg-slate-500'
                            : cat.statusColor || 'bg-emerald-500'
                        }`}
                      >
                        {((cat.statusTag || '').toUpperCase() === 'GRÁTIS' || (cat.statusTag || '').toUpperCase() === 'GRATIS') && (
                          <span className="material-symbols-outlined text-xs">savings</span>
                        )}
                        <span>{cat.statusTag || 'LIBERADO'}</span>
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-base">{cat.name}</h4>
                    {cat.description && (
                      <p className="text-slate-500 text-xs line-clamp-2">{cat.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleStartEditCategory(cat)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      title="Editar informações desta categoria"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>Editar</span>
                    </button>

                    <label className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-blue-200">
                      <span className="material-symbols-outlined text-sm">upload</span>
                      <span>{cat.image ? 'Foto' : 'Adicionar Foto'}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpdateCategoryImage(cat, f);
                        }}
                        className="hidden"
                      />
                    </label>

                    {confirmDeleteCategoryId === cat.id ? (
                      <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200">
                        <button
                          type="button"
                          disabled={deletingCategoryId === cat.id}
                          onClick={() => handleExecuteDeleteCategory(cat.id, cat.name)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                        >
                          {deletingCategoryId === cat.id ? (
                            <>
                              <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                              <span>Apagando...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-xs">check</span>
                              <span>Confirmar?</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={deletingCategoryId === cat.id}
                          onClick={() => setConfirmDeleteCategoryId(null)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCategoryId(cat.id)}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-red-200/60"
                        title="Apagar esta categoria"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        <span>Apagar</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: SPECIALIZATIONS MANAGEMENT ================= */}
      {activeTab === 'specializations' && (() => {
        const filteredSpecs = specializations.filter((s) => {
          const term = specSearchTerm.toLowerCase().trim();
          const matchesSearch =
            !term ||
            s.title.toLowerCase().includes(term) ||
            (s.description && s.description.toLowerCase().includes(term)) ||
            (s.categoryName && s.categoryName.toLowerCase().includes(term));

          const matchesCategory =
            specCategoryFilter === 'all' ||
            s.categoryId === specCategoryFilter ||
            s.categoryName === specCategoryFilter;

          return matchesSearch && matchesCategory;
        });

        const matchedSpecIds = new Set<string>();
        const categoryGroupings = categories.map((cat) => {
          const catSpecs = filteredSpecs.filter((s) => {
            const isMatch =
              (s.categoryId && (String(s.categoryId).toLowerCase() === String(cat.id).toLowerCase() || String(s.categoryId).toLowerCase() === cat.name.toLowerCase())) ||
              (s.categoryName && (s.categoryName.toLowerCase() === cat.name.toLowerCase() || s.categoryName.toLowerCase() === String(cat.id).toLowerCase()));
            if (isMatch) matchedSpecIds.add(s.id);
            return isMatch;
          });
          return { cat, specs: catSpecs };
        });

        const unmatchedSpecs = filteredSpecs.filter((s) => !matchedSpecIds.has(s.id));

        return (
          <div className="space-y-6">
            {/* Top Toolbar & Overview */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-blue-100 text-blue-700 rounded-xl material-symbols-outlined text-2xl">
                      school
                    </span>
                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                        <span>Especializações Cadastradas</span>
                        <span className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-black rounded-full">
                          {specializations.length} no total
                        </span>
                      </h3>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Visualize, edite ou cadastre as especializações por categoria para os simulados e provas.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    disabled={isReloadingSpecs}
                    onClick={handleReloadSpecs}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 shadow-xs"
                    title="Buscar lista atualizada diretamente do banco de dados Supabase"
                  >
                    <span className={`material-symbols-outlined text-base ${isReloadingSpecs ? 'animate-spin' : ''}`}>
                      refresh
                    </span>
                    <span>{isReloadingSpecs ? 'Sincronizando...' : 'Recarregar do Supabase'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (editingSpec) {
                        handleCancelEditSpec();
                      }
                      setShowSpecCreateForm((prev) => !prev);
                      setTimeout(() => {
                        const el = document.getElementById('specialization-form');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 50);
                    }}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showSpecCreateForm || editingSpec ? 'visibility' : 'add_circle'}
                    </span>
                    <span>{showSpecCreateForm || editingSpec ? 'Ocultar Formulário' : '+ Cadastrar Nova Especialização'}</span>
                  </button>
                </div>
              </div>

              {/* Search & Category Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                <div className="sm:col-span-7 relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                    search
                  </span>
                  <input
                    type="text"
                    value={specSearchTerm}
                    onChange={(e) => setSpecSearchTerm(e.target.value)}
                    placeholder="Pesquisar especialização por nome, descrição ou categoria..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                  {specSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setSpecSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="sm:col-span-5">
                  <select
                    value={specCategoryFilter}
                    onChange={(e) => setSpecCategoryFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="all">Todas as Categorias ({specializations.length})</option>
                    {categories.map((c) => {
                      const count = specializations.filter(
                        (s) => s.categoryId === c.id || s.categoryName === c.name
                      ).length;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Action Notice */}
              {specActionNotice && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                    specActionNotice.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {specActionNotice.success ? 'check_circle' : 'error'}
                  </span>
                  <span className="flex-1">{specActionNotice.message}</span>
                </div>
              )}
            </div>

            {/* Editing Alert Banner */}
            {editingSpec && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-amber-900 text-sm">
                      Modo de Edição Ativo: <span className="underline">{editingSpec.title}</span>
                    </h4>
                    <p className="text-amber-700 text-xs mt-0.5">
                      Altere os campos no formulário abaixo e clique em &quot;Atualizar Especialização no Supabase&quot;.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEditSpec}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-300 transition-all cursor-pointer"
                  >
                    Cancelar Edição
                  </button>
                </div>
              </div>
            )}

            {/* Create / Edit Specialization Form */}
            {(showSpecCreateForm || editingSpec) && (
              <div id="specialization-form" className="bg-white rounded-3xl p-6 md:p-8 space-y-5 shadow-sm border border-blue-200/80 ring-2 ring-blue-500/10">
                <div className="border-b pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-600">
                        {editingSpec ? 'edit_note' : 'add_circle'}
                      </span>
                      {editingSpec ? `Editar: ${editingSpec.title}` : 'Cadastrar Nova Especialização por Categoria'}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">
                      {editingSpec
                        ? 'Atualize as informações da especialização e clique em salvar.'
                        : 'Adicione especializações associadas às categorias principais (ex: Educação → Matemática, Saúde → Enfermagem Geral).'}
                    </p>
                  </div>
                  {editingSpec && (
                    <div className="flex items-center gap-2">
                      {confirmDeleteSpecId === editingSpec.id ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200">
                          <button
                            type="button"
                            disabled={deletingSpecId === editingSpec.id}
                            onClick={() => handleExecuteDeleteSpec(editingSpec.id, editingSpec.title)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                          >
                            {deletingSpecId === editingSpec.id ? (
                              <>
                                <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                                <span>Apagando...</span>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-xs">check</span>
                                <span>Confirmar Apagar?</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={deletingSpecId === editingSpec.id}
                            onClick={() => setConfirmDeleteSpecId(null)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSpecId(editingSpec.id)}
                          className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-red-200 shadow-xs"
                          title="Apagar esta especialização permanentemente"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          <span>Apagar Especialização</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCancelEditSpec}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                        <span>Cancelar</span>
                      </button>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveSpecialization} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Categoria Mãe *
                      </label>
                      <select
                        value={newSpecCategory}
                        onChange={(e) => setNewSpecCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                        required
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.statusTag || 'Liberado'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Título / Nome da Especialização *
                      </label>
                      <input
                        type="text"
                        value={newSpecTitle}
                        onChange={(e) => setNewSpecTitle(e.target.value)}
                        placeholder="Ex: Enfermagem Geral, Matemática, Contabilidade"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Ícone (Material Symbols)
                      </label>
                      <input
                        type="text"
                        value={newSpecIcon}
                        onChange={(e) => setNewSpecIcon(e.target.value)}
                        placeholder="Ex: functions, medical_services, calculate, gavel"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Imagem / Foto Ilustrativa
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={newSpecImage}
                          onChange={(e) => setNewSpecImage(e.target.value)}
                          placeholder="Cole URL da imagem ou envie do computador"
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <label className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
                          <span className="material-symbols-outlined text-base">upload_file</span>
                          <span>{isUploadingSpecImage ? 'Carregando...' : 'Carregar Foto'}</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            onChange={handleSpecImageFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Descrição Curta da Especialização
                    </label>
                    <textarea
                      rows={2}
                      value={newSpecDescription}
                      onChange={(e) => setNewSpecDescription(e.target.value)}
                      placeholder="Ex: Tópicos focados em provas de conhecimentos específicos do concurso."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="pt-3 flex justify-end gap-3">
                    {editingSpec && (
                      <button
                        type="button"
                        onClick={handleCancelEditSpec}
                        className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                        <span>Cancelar</span>
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {editingSpec ? 'check_circle' : 'add_circle'}
                      </span>
                      <span>{editingSpec ? 'Atualizar Especialização no Supabase' : 'Salvar Especialização no Supabase'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List Specializations Grouped by Category */}
            <div className="bg-white rounded-3xl p-6 md:p-8 space-y-6 shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between border-b pb-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">view_module</span>
                  <span>Especializações no Sistema ({filteredSpecs.length})</span>
                </h3>
                {specSearchTerm && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    Filtro: &quot;{specSearchTerm}&quot;
                  </span>
                )}
              </div>

              {filteredSpecs.length === 0 ? (
                <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <span className="material-symbols-outlined text-slate-300 text-5xl">school</span>
                  <h4 className="text-base font-bold text-slate-700">Nenhuma especialização encontrada</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {specializations.length === 0
                      ? 'Nenhuma especialização cadastrada ainda ou sincronizada do banco de dados.'
                      : 'Nenhuma especialização corresponde aos filtros de pesquisa aplicados.'}
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleReloadSpecs}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                      <span>Recarregar do Supabase</span>
                    </button>
                    {!showSpecCreateForm && (
                      <button
                        type="button"
                        onClick={() => setShowSpecCreateForm(true)}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        + Cadastrar Nova
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Category Sections */}
                  {categoryGroupings.map(({ cat, specs }) => (
                    <div key={cat.id} className="border border-slate-200/80 rounded-2xl p-5 bg-slate-50/50 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                            <span className="material-symbols-outlined text-base">{cat.icon || 'school'}</span>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-base">{cat.name}</h4>
                            <span className="text-[11px] text-slate-500">ID: {cat.id}</span>
                          </div>
                        </div>
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 font-extrabold px-3 py-1 rounded-full">
                          {specs.length} {specs.length === 1 ? 'especialização' : 'especializações'}
                        </span>
                      </div>

                      {specs.length === 0 ? (
                        <p className="text-slate-400 text-xs italic py-2">
                          Nenhuma especialização cadastrada para esta categoria no momento.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {specs.map((spec) => (
                            <div
                              key={spec.id}
                              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 shadow-xs ${
                                editingSpec?.id === spec.id
                                  ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20'
                                  : 'bg-white border-slate-200 hover:border-blue-300'
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start gap-3">
                                  <div className="w-11 h-11 rounded-xl bg-slate-100 text-blue-600 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                    {spec.image ? (
                                      <img src={spec.image} alt={spec.title} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="material-symbols-outlined text-lg">{spec.icon || 'functions'}</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-extrabold text-slate-900 text-sm truncate" title={spec.title}>
                                      {spec.title}
                                    </h5>
                                    <span className="inline-block text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded mt-0.5">
                                      {cat.name}
                                    </span>
                                  </div>
                                </div>
                                {spec.description && (
                                  <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">{spec.description}</p>
                                )}
                              </div>

                              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowSpecCreateForm(true);
                                    handleStartEditSpec(spec);
                                  }}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-amber-200"
                                >
                                  <span className="material-symbols-outlined text-xs">edit</span>
                                  <span>Editar</span>
                                </button>

                                <label
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-blue-200"
                                  title="Carregar imagem para esta especialização"
                                >
                                  <span className="material-symbols-outlined text-xs">upload</span>
                                  <span>Foto</span>
                                  <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/jpg, image/webp"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) handleUpdateSpecImage(spec, f);
                                    }}
                                    className="hidden"
                                  />
                                </label>

                                {confirmDeleteSpecId === spec.id ? (
                                  <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200">
                                    <button
                                      type="button"
                                      disabled={deletingSpecId === spec.id}
                                      onClick={() => handleExecuteDeleteSpec(spec.id, spec.title)}
                                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                                    >
                                      {deletingSpecId === spec.id ? (
                                        <>
                                          <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                                          <span>Apagando...</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="material-symbols-outlined text-xs">check</span>
                                          <span>Confirmar?</span>
                                        </>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={deletingSpecId === spec.id}
                                      onClick={() => setConfirmDeleteSpecId(null)}
                                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteSpecId(spec.id)}
                                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-red-200/60"
                                    title="Apagar esta especialização"
                                  >
                                    <span className="material-symbols-outlined text-xs">delete</span>
                                    <span>Apagar</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Fallback Section for Unmatched / Other Specializations so none is ever lost */}
                  {unmatchedSpecs.length > 0 && (
                    <div className="border border-amber-200/80 rounded-2xl p-5 bg-amber-50/30 space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                            <span className="material-symbols-outlined text-base">category</span>
                          </div>
                          <div>
                            <h4 className="font-extrabold text-amber-950 text-base">
                              Outras Especializações / Sem Categoria Mãe
                            </h4>
                            <span className="text-[11px] text-amber-700">
                              Especializações cadastradas sem correspondência direta com as categorias atuais
                            </span>
                          </div>
                        </div>
                        <span className="text-xs bg-amber-100 text-amber-800 border border-amber-300 font-extrabold px-3 py-1 rounded-full">
                          {unmatchedSpecs.length} especializações
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {unmatchedSpecs.map((spec) => (
                          <div
                            key={spec.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 shadow-xs ${
                              editingSpec?.id === spec.id
                                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
                                : 'bg-white border-slate-200 hover:border-amber-300'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start gap-3">
                                <div className="w-11 h-11 rounded-xl bg-slate-100 text-amber-600 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                                  {spec.image ? (
                                    <img src={spec.image} alt={spec.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="material-symbols-outlined text-lg">{spec.icon || 'functions'}</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-extrabold text-slate-900 text-sm truncate" title={spec.title}>
                                    {spec.title}
                                  </h5>
                                  <span className="inline-block text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded mt-0.5">
                                    {spec.categoryName || spec.categoryId || 'Geral / Outros'}
                                  </span>
                                </div>
                              </div>
                              {spec.description && (
                                <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">{spec.description}</p>
                              )}
                            </div>

                            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowSpecCreateForm(true);
                                  handleStartEditSpec(spec);
                                }}
                                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-amber-200"
                              >
                                <span className="material-symbols-outlined text-xs">edit</span>
                                <span>Editar</span>
                              </button>

                              <label
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-blue-200"
                                title="Carregar imagem para esta especialização"
                              >
                                <span className="material-symbols-outlined text-xs">upload</span>
                                <span>Foto</span>
                                <input
                                  type="file"
                                  accept="image/png, image/jpeg, image/jpg, image/webp"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleUpdateSpecImage(spec, f);
                                  }}
                                  className="hidden"
                                />
                              </label>

                              {confirmDeleteSpecId === spec.id ? (
                                <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200">
                                  <button
                                    type="button"
                                    disabled={deletingSpecId === spec.id}
                                    onClick={() => handleExecuteDeleteSpec(spec.id, spec.title)}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                                  >
                                    {deletingSpecId === spec.id ? (
                                      <>
                                        <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                                        <span>Apagando...</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="material-symbols-outlined text-xs">check</span>
                                        <span>Confirmar?</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingSpecId === spec.id}
                                    onClick={() => setConfirmDeleteSpecId(null)}
                                    className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteSpecId(spec.id)}
                                  className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-red-200/60"
                                  title="Apagar esta especialização"
                                >
                                  <span className="material-symbols-outlined text-xs">delete</span>
                                  <span>Apagar</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ================= TAB 2: BULK IMPORT (50 to 100 questions) ================= */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 space-y-6 shadow-sm border border-slate-200/80">
            {/* Header & Target Module Selection */}
            <div className="space-y-4 border-b pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">post_add</span>
                    Adicionar Várias Perguntas (Importação em Lote)
                  </h3>
                  <p className="text-slate-500 text-xs mt-1">
                    Adicione de 50 a 100 perguntas de uma só vez para o concurso selecionado.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    1. Módulo Destino *
                  </label>
                  <select
                    value={selectedModuleId}
                    onChange={(e) => setSelectedModuleId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.questionCount} perguntas atuais)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    2. Banca / Origem do Exame
                  </label>
                  <input
                    type="text"
                    value={bulkBanca}
                    onChange={(e) => setBulkBanca(e.target.value)}
                    placeholder="Ex: MINMED • 2025"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Mode Toggle: Text Paste vs AI Generator */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
              <button
                type="button"
                onClick={() => setBulkMode('paste')}
                className={`flex-1 py-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  bulkMode === 'paste' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-base">content_paste</span>
                <span>Copiar e Colar Texto (Formatado / CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => setBulkMode('ai')}
                className={`flex-1 py-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  bulkMode === 'ai' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                <span>Gerar 10 a 50 Perguntas com IA</span>
              </button>
            </div>

            {/* Mode A: Paste Text / CSV Format */}
            {bulkMode === 'paste' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <span className="material-symbols-outlined text-blue-600 text-sm">info</span>
                      Formatos de Importação Aceitos (CSV ou Texto Numerado):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleLoadCsvSample}
                        className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded-lg text-[11px] cursor-pointer"
                      >
                        Carregar Exemplo CSV
                      </button>
                      <button
                        type="button"
                        onClick={handleLoadTextSample}
                        className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-[11px] cursor-pointer"
                      >
                        Carregar Exemplo Texto
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white p-2.5 rounded-xl border">
                      <strong className="block text-slate-900 mb-1">Formato 1: CSV (Ponto e Vírgula / Excel)</strong>
                      <code className="text-[10px] text-blue-800 block whitespace-pre-wrap">
                        Pergunta; Opção A; Opção B; Opção C; Opção D; Gabarito; Explicação
                      </code>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border">
                      <strong className="block text-slate-900 mb-1">Formato 2: Texto Numerado</strong>
                      <code className="text-[10px] text-slate-700 block whitespace-pre-wrap">
                        1. Enunciado da pergunta...<br />
                        A) Opção A  B) Opção B  C) Opção C  D) Opção D<br />
                        RESPOSTA: B
                      </code>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Cole o Bloco de Perguntas (CSV, Excel ou Texto)
                    </label>
                    {rawText.trim() && (
                      <button
                        type="button"
                        onClick={() => setRawText('')}
                        className="text-[11px] text-red-600 hover:underline font-bold cursor-pointer"
                      >
                        Limpar Texto
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={10}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Cole aqui suas perguntas em formato CSV, Excel ou texto numerado..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleParseText}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-sm transition-all cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">manage_search</span>
                  <span>Analisar e Organizar Perguntas do Texto / CSV</span>
                </button>
              </div>
            )}

            {/* Mode B: AI Bulk Generator */}
            {bulkMode === 'ai' && (
              <div className="space-y-4 bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-blue-600">auto_awesome</span>
                    Gerador Server-Side Gemini (Lote Automático)
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    A IA gerará um conjunto completo de perguntas oficiais com gabaritos fundamentados para Angola.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Disciplina / Assunto
                    </label>
                    <input
                      type="text"
                      value={aiSubject}
                      onChange={(e) => setAiSubject(e.target.value)}
                      placeholder="Ex: Didática Geral e Legislação do MED"
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Quantidade de Perguntas
                    </label>
                    <select
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value={10}>10 Perguntas (Rápido)</option>
                      <option value={20}>20 Perguntas (Simulado)</option>
                      <option value={30}>30 Perguntas (Lote Médio)</option>
                      <option value={50}>50 Perguntas (Lote Completo)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerateAiBulk}
                  disabled={isGeneratingBulk}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60 text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">bolt</span>
                  <span>
                    {isGeneratingBulk
                      ? `Gerando ${aiCount} Perguntas com IA...`
                      : `Gerar Lote de ${aiCount} Perguntas`}
                  </span>
                </button>
              </div>
            )}

            {/* Live Preview & Final Save (EDITABLE FORMAT) */}
            {parsedPreview.length > 0 && (
              <div className="pt-6 border-t space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                  <div>
                    <span className="text-emerald-900 font-black text-base flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600">edit_document</span>
                      {parsedPreview.length} Perguntas em Modo Editável
                    </span>
                    <p className="text-emerald-700 text-xs mt-0.5">
                      Você pode editar o enunciado, opções, gabarito e explicação de qualquer pergunta antes de salvar.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button
                      type="button"
                      onClick={handleDistributeAnswers}
                      className="px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-xl border border-blue-300 text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-2xs"
                      title="Garante que as respostas certas fiquem bem distribuídas entre as opções A, B, C e D"
                    >
                      <span className="material-symbols-outlined text-sm">shuffle</span>
                      <span>Distribuir Gabaritos (A,B,C,D)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddBlankPreviewQuestion}
                      className="px-3.5 py-2.5 bg-white hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-300 text-xs cursor-pointer flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-sm">add_circle</span>
                      <span>+ Nova Pergunta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setParsedPreview([])}
                      className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 text-xs cursor-pointer transition-all"
                    >
                      Limpar Lote
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmSaveBulk}
                      className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-xs flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      <span>Salvar {parsedPreview.length} Perguntas</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {parsedPreview.map((q, i) => (
                    <div
                      key={q.id || i}
                      className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-extrabold text-slate-700 text-sm flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </span>
                          Pergunta {i + 1}
                        </span>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={q.banca || ''}
                            onChange={(e) => handleUpdatePreviewQuestion(i, 'banca', e.target.value)}
                            placeholder="Banca / Exame"
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-700 outline-none w-36 sm:w-48"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePreviewQuestion(i)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-red-200/50"
                            title="Remover pergunta"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            <span className="hidden sm:inline font-bold text-[11px]">Apagar</span>
                          </button>
                        </div>
                      </div>

                      {/* Enunciado / Statement Input */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Enunciado da Pergunta *
                        </label>
                        <textarea
                          rows={2}
                          value={q.statement}
                          onChange={(e) => handleUpdatePreviewQuestion(i, 'statement', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                          placeholder="Digite o enunciado da pergunta..."
                        />
                      </div>

                      {/* Options List */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Opções de Resposta (Selecione a bolinha da alternativa correta):
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {q.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                optIdx === q.correctIndex
                                  ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-400'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <input
                                type="radio"
                                id={`radio-q${i}-opt${optIdx}`}
                                name={`correctIndex-q${i}`}
                                checked={optIdx === q.correctIndex}
                                onChange={() => handleUpdatePreviewQuestion(i, 'correctIndex', optIdx)}
                                className="w-4 h-4 text-emerald-600 cursor-pointer"
                              />
                              <label
                                htmlFor={`radio-q${i}-opt${optIdx}`}
                                className={`font-extrabold text-xs cursor-pointer w-5 ${
                                  optIdx === q.correctIndex ? 'text-emerald-700' : 'text-slate-500'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)})
                              </label>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdatePreviewOption(i, optIdx, e.target.value)}
                                className="flex-1 bg-transparent text-xs font-medium text-slate-900 outline-none"
                                placeholder={`Opção ${String.fromCharCode(65 + optIdx)}...`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Explanation / Gabarito */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Fundamentação / Gabarito Comentado:
                        </label>
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => handleUpdatePreviewQuestion(i, 'explanation', e.target.value)}
                          placeholder="Explicação do porquê esta é a resposta correta..."
                          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={handleAddBlankPreviewQuestion}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-300 text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Adicionar Outra Pergunta ao Lote</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmSaveBulk}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    <span>Salvar {parsedPreview.length} Perguntas no Módulo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ================= EDITABLE QUESTION POOL EXPLORER ================= */}
          <div className="bg-white rounded-3xl p-6 md:p-8 space-y-5 shadow-sm border border-slate-200/80">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">format_list_bulleted</span>
                  Banco Geral de Perguntas Cadastradas ({questions.length})
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Todas as perguntas estão em formato editável. Você pode corrigir enunciados, opções e respostas a qualquer momento.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newQ: Question = {
                    id: `q-manual-${Date.now()}`,
                    statement: 'Escreva o enunciado da pergunta...',
                    options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
                    correctIndex: (questions.length * 3 + 1) % 4,
                    explanation: 'Explicação detalhada do gabarito',
                    category: 'Conhecimentos Gerais',
                    banca: 'MINMED / MED • 2025',
                    moduleId: selectedModuleId || undefined,
                  };
                  onAddQuestion(newQ);
                  saveQuestion(newQ);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer self-start md:self-auto"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                <span>+ Adicionar Pergunta Manual</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pesquisar por Texto ou Enunciado
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">
                    search
                  </span>
                  <input
                    type="text"
                    value={existingQuestionSearch}
                    onChange={(e) => setExistingQuestionSearch(e.target.value)}
                    placeholder="Digite palavras do enunciado..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Filtrar por Módulo
                </label>
                <select
                  value={existingQuestionModuleFilter}
                  onChange={(e) => setExistingQuestionModuleFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">Todos os Módulos ({questions.length} perguntas)</option>
                  {modules.map((m) => {
                    const count = questions.filter((q) => q.moduleId === m.id).length;
                    return (
                      <option key={m.id} value={m.id}>
                        {m.title} ({count} perguntas)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Questions List */}
            {(() => {
              const filteredList = questions.filter((q) => {
                const matchesSearch =
                  !existingQuestionSearch.trim() ||
                  q.statement.toLowerCase().includes(existingQuestionSearch.toLowerCase()) ||
                  (q.banca && q.banca.toLowerCase().includes(existingQuestionSearch.toLowerCase())) ||
                  q.category.toLowerCase().includes(existingQuestionSearch.toLowerCase());

                const matchesModule =
                  existingQuestionModuleFilter === 'all' || q.moduleId === existingQuestionModuleFilter;

                return matchesSearch && matchesModule;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="material-symbols-outlined text-slate-400 text-3xl">search_off</span>
                    <p className="text-xs font-semibold text-slate-500">
                      Nenhuma pergunta encontrada com os filtros selecionados.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                  <div className="text-xs font-bold text-slate-500 flex items-center justify-between">
                    <span>Exibindo {filteredList.length} de {questions.length} perguntas</span>
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                      Modo Editável Ativo
                    </span>
                  </div>

                  {filteredList.map((q, idx) => (
                    <EditableQuestionCard
                      key={q.id || idx}
                      question={q}
                      index={idx}
                      onSave={(updatedQ) => {
                        if (onUpdateQuestion) onUpdateQuestion(updatedQ);
                        saveQuestion(updatedQ);
                      }}
                      onDelete={(qId) => {
                        if (onDeleteQuestion) onDeleteQuestion(qId);
                        deleteQuestion(qId);
                      }}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================= TAB 3: CODES GENERATION ================= */}
      {activeTab === 'codes' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 space-y-6 shadow-sm border border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>Gerador de Código de Ativação (1000 Kzs)</span>
                <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                  Supabase Sync
                </span>
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Crie códigos para enviar aos candidatos após receber o comprovativo de pagamento do Kwanza no WhatsApp. Ao apagar um código, ele é removido imediatamente do sistema e do banco de dados Supabase.
              </p>
            </div>

            <button
              type="button"
              onClick={refreshActivationCodes}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
              title="Recarregar lista do Supabase"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Atualizar Lista</span>
            </button>
          </div>

          {/* Feedback Notices */}
          {codeActionNotice && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all ${
                codeActionNotice.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {codeActionNotice.success ? 'check_circle' : 'error'}
              </span>
              <span className="flex-1">{codeActionNotice.message}</span>
              <button
                type="button"
                onClick={() => setCodeActionNotice(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {copiedCodeToast && (
            <div className="p-3 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-blue-600">content_copy</span>
              <span>{copiedCodeToast}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newCodeSuffix}
              onChange={(e) => setNewCodeSuffix(e.target.value)}
              placeholder="Sufixo opcional (ex: ALUNO1)"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              onClick={handleGenerateCode}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-sm flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              <span>Gerar Código</span>
            </button>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Códigos Ativos Gerados ({generatedCodes.length})
              </h4>
            </div>

            {generatedCodes.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="material-symbols-outlined text-slate-400 text-3xl">key_off</span>
                <p className="text-sm font-bold text-slate-700">Nenhum código ativo no momento</p>
                <p className="text-xs text-slate-500">Gere um novo código acima para disponibilizar aos candidatos.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {generatedCodes.map((code) => {
                  const usedByUser = realStats.usersList.find((u) => u.activationCode === code);
                  const isConfirming = confirmDeleteCode === code;
                  const isDeleting = deletingCode === code;

                  return (
                    <div
                      key={code}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 transition-all hover:border-slate-300"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-sm font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                          {code}
                        </span>
                        {usedByUser ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                            <span className="material-symbols-outlined text-[12px]">person</span>
                            <span>Usado por: {usedByUser.name} ({usedByUser.phone})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-300">
                            <span>Disponível</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(code)}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">content_copy</span>
                          <span>Copiar</span>
                        </button>
                        <a
                          href={`https://wa.me/244923361877?text=Aqui%20est%C3%A1%20o%20seu%20c%C3%B3digo%20de%20ativa%C3%A7%C3%A3o%20do%20NgolaTeste:%20*${code}*`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-[#25D366] text-white rounded-lg text-xs font-bold hover:bg-[#20ba5a] cursor-pointer flex items-center gap-1"
                        >
                          <span>WhatsApp</span>
                        </a>

                        {isConfirming ? (
                          <div className="flex items-center gap-1.5 bg-red-50 p-1 rounded-lg border border-red-200">
                            <button
                              type="button"
                              onClick={() => handleDeleteCode(code)}
                              disabled={isDeleting}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                            >
                              {isDeleting ? (
                                <>
                                  <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                                  <span>Apagando...</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-xs">check</span>
                                  <span>Confirmar?</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteCode(null)}
                              disabled={isDeleting}
                              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-md text-xs font-bold border border-slate-200 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCode(code)}
                            disabled={isDeleting}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold border border-red-200/60 cursor-pointer flex items-center gap-1 transition-all"
                            title="Apagar este código do sistema e do Supabase"
                          >
                            <span className="material-symbols-outlined text-xs">delete</span>
                            <span>Apagar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: REAL-TIME STATS & CANDIDATES ================= */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Action Notification Toast */}
          {userActionNotice && (
            <div
              className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 shadow-md transition-all ${
                userActionNotice.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-red-50 text-red-900 border-red-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-lg">
                  {userActionNotice.success ? 'check_circle' : 'error'}
                </span>
                <span>{userActionNotice.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setUserActionNotice(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {/* Modal for Blocking User */}
          {blockModalUser && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-2.5 text-red-600">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">block</span>
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900">Bloquear Usuário</h4>
                      <p className="text-[11px] text-slate-500">Restringir acesso por comportamento irregular</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBlockModalUser(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1 text-xs">
                  <div className="font-bold text-slate-900">{blockModalUser.name}</div>
                  <div className="font-mono text-slate-600 text-[11px]">Telefone: {blockModalUser.phone}</div>
                  {blockModalUser.activationCode && (
                    <div className="text-amber-700 font-mono text-[11px]">Código: {blockModalUser.activationCode}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Motivo do Bloqueio:
                  </label>
                  <input
                    type="text"
                    value={blockReasonInput}
                    onChange={(e) => setBlockReasonInput(e.target.value)}
                    placeholder="Ex: Comportamento irregular ou suspeita de fraude"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Comportamento irregular',
                      'Partilha indevida de código',
                      'Uso abusivo do sistema',
                      'Violação dos Termos de Uso',
                    ].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setBlockReasonInput(reason)}
                        className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-red-50 text-red-800 rounded-xl text-[11px] leading-relaxed border border-red-200 flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-red-600 shrink-0 mt-0.5">warning</span>
                  <span>
                    Ao bloquear este candidato, ele não conseguirá realizar simulados ou ativar novos códigos até ser desbloqueado pelo administrador.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setBlockModalUser(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={togglingBlockPhone === blockModalUser.phone}
                    onClick={() => handleToggleUserBlock(blockModalUser, true, blockReasonInput)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all disabled:opacity-50"
                  >
                    {togglingBlockPhone === blockModalUser.phone ? (
                      <>
                        <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                        <span>Bloqueando...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xs">block</span>
                        <span>Confirmar Bloqueio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= SEÇÃO: CÓDIGOS DE ACESSO UTILIZADOS (COLAPSÁVEL) ================= */}
          <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-4 md:p-5 text-white shadow-md border border-blue-800/40 relative overflow-hidden transition-all">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${showUsedCodesSection ? 'border-b border-white/10 pb-4 mb-5' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                  <span className="material-symbols-outlined text-xl">vpn_key</span>
                </div>
                <div>
                  <h4 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                    <span>Códigos de Acesso Utilizados</span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                      {realStats.usersList.filter((u) => u.activationCode || u.isActivated).length} Ativações
                    </span>
                  </h4>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    {showUsedCodesSection
                      ? 'Visualize quais códigos foram digitados pelos usuários e quais especialidades foram desbloqueadas.'
                      : 'Resumo de códigos ativados por candidatos e detalhes de vinculação.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUsedCodesSection((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    showUsedCodesSection
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                      : 'bg-blue-600/80 hover:bg-blue-600 text-white border-blue-400/40'
                  }`}
                  title={showUsedCodesSection ? 'Ocultar resumo de utilizadores' : 'Mostrar resumo de utilizadores'}
                >
                  <span className="material-symbols-outlined text-sm">
                    {showUsedCodesSection ? 'visibility_off' : 'visibility'}
                  </span>
                  <span>{showUsedCodesSection ? 'Ocultar Resumo' : 'Mostrar Resumo'}</span>
                </button>

                <button
                  type="button"
                  onClick={loadPlatformStats}
                  disabled={isLoadingStats}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Atualizar dados de estatísticas e candidatos"
                >
                  <span className={`material-symbols-outlined text-sm ${isLoadingStats ? 'animate-spin' : ''}`}>
                    sync
                  </span>
                  <span>{isLoadingStats ? 'Atualizando...' : 'Atualizar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('codes')}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  <span>Gerar</span>
                </button>
              </div>
            </div>

            {/* Active Code Cards Grid (Only when expanded) */}
            {showUsedCodesSection && (() => {
              const usersWithCode = realStats.usersList.filter((u) => u.activationCode || u.isActivated);

              if (usersWithCode.length === 0) {
                return (
                  <div className="text-center py-6 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
                    <span className="material-symbols-outlined text-slate-400 text-2xl">key_off</span>
                    <p className="text-xs font-semibold text-slate-200">
                      Nenhum código de acesso utilizado registrado ainda.
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                      Assim que um candidato inserir um código no NgolaTeste para ativar uma especialidade, ele aparecerá aqui.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {usersWithCode.map((user) => {
                    const isUserBlocked = Boolean(user.isBlocked);
                    return (
                      <div
                        key={user.phone}
                        className={`backdrop-blur-md rounded-xl p-3.5 border transition-all space-y-2.5 ${
                          isUserBlocked
                            ? 'bg-red-950/40 border-red-500/40'
                            : 'bg-white/10 border-white/15 hover:border-blue-400/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full font-black flex items-center justify-center text-xs shrink-0 ${
                              isUserBlocked ? 'bg-red-600 text-white' : 'bg-blue-500 text-white'
                            }`}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-xs text-white truncate max-w-[150px]">{user.name}</div>
                              <div className="text-[10px] text-slate-300 font-mono">{user.phone}</div>
                            </div>
                          </div>
                          {isUserBlocked ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-500/20 text-red-300 border border-red-400/40 flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[10px]">block</span>
                              BLOQUEADO
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[10px]">check_circle</span>
                              ATIVO
                            </span>
                          )}
                        </div>

                        {/* Code Box */}
                        <div className="bg-black/30 rounded-lg p-2 border border-white/10 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                              Código Utilizado:
                            </div>
                            <div className="font-mono font-black text-amber-300 text-[11px] tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-[11px] text-amber-400">vpn_key</span>
                              {user.activationCode || 'ATIVADO MANUALMENTE'}
                            </div>
                          </div>
                          {user.activationCode && (
                            <button
                              type="button"
                              onClick={() => handleCopyCode(user.activationCode!)}
                              className="p-1 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-md transition-all cursor-pointer"
                              title="Copiar código"
                            >
                              <span className="material-symbols-outlined text-xs">content_copy</span>
                            </button>
                          )}
                        </div>

                        {/* Specialization & Expiration */}
                        <div className="flex items-center justify-between text-[10px] text-slate-300 pt-1 border-t border-white/10">
                          <div className="flex items-center gap-1 text-blue-200">
                            <span className="material-symbols-outlined text-[11px]">school</span>
                            <span className="truncate max-w-[120px]">
                              {user.activatedSpecializations && user.activatedSpecializations.length > 0
                                ? user.activatedSpecializations.join(', ')
                                : 'Acesso Geral'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {user.expiresAt && (
                              <div className="text-slate-400 text-[9px]">
                                Exp: <strong className="text-white">{user.expiresAt}</strong>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (isUserBlocked) {
                                  handleToggleUserBlock(user, false);
                                } else {
                                  setBlockModalUser(user);
                                }
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-all flex items-center gap-0.5 ${
                                isUserBlocked
                                  ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                                  : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40'
                              }`}
                              title={isUserBlocked ? 'Desbloquear usuário' : 'Bloquear usuário por comportamento irregular'}
                            >
                              <span className="material-symbols-outlined text-[10px]">
                                {isUserBlocked ? 'lock_open' : 'block'}
                              </span>
                              <span>{isUserBlocked ? 'Desbloquear' : 'Bloquear'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Total Users */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Candidatos
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">group</span>
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900">
                {realStats.totalCandidates}
              </div>
              <p className="text-[11px] text-slate-400">
                Total cadastrados
              </p>
            </div>

            {/* Active Subscriptions */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Assinaturas Ativas
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">verified</span>
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-600">
                {realStats.activeSubscriptions}
              </div>
              <p className="text-[11px] text-emerald-700/80">
                {realStats.totalCandidates > 0
                  ? `${Math.round((realStats.activeSubscriptions / realStats.totalCandidates) * 100)}% dos candidatos`
                  : '0%'}
              </p>
            </div>

            {/* Blocked Users Count */}
            {(() => {
              const blockedCount = realStats.usersList.filter((u) => u.isBlocked).length;
              return (
                <div className="bg-white rounded-2xl p-5 border border-red-200/80 shadow-sm relative overflow-hidden space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider">
                      Bloqueados
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">block</span>
                    </div>
                  </div>
                  <div className="text-3xl font-black text-red-600">
                    {blockedCount}
                  </div>
                  <p className="text-[11px] text-red-600/80">
                    {blockedCount > 0 ? 'Acesso suspenso por irregularidade' : 'Nenhum usuário bloqueado'}
                  </p>
                </div>
              );
            })()}

            {/* Total Tests Taken */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                  Simulados Concluídos
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
                </div>
              </div>
              <div className="text-3xl font-black text-purple-600">
                {realStats.totalExamsTaken}
              </div>
              <p className="text-[11px] text-purple-700/80">
                Exames finalizados
              </p>
            </div>

            {/* Average Grade */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  Média Geral
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">hotel_class</span>
                </div>
              </div>
              <div className="text-3xl font-black text-amber-600">
                {realStats.averageGrade > 0 ? `${realStats.averageGrade}` : '14.5'}
                <span className="text-sm font-semibold text-slate-400 ml-1">/ 20</span>
              </div>
              <p className="text-[11px] text-amber-700/80">
                Aproveitamento médio
              </p>
            </div>
          </div>

          {/* Candidates Database Table */}
          <div className="bg-white rounded-3xl p-6 md:p-8 space-y-5 shadow-sm border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">contacts</span>
                  Lista de Candidatos Registrados ({realStats.usersList.length})
                </h4>
                <p className="text-slate-500 text-xs mt-0.5">
                  Visualize quem entrou no aplicativo, veja o código utilizado, gerencie planos e bloqueie/desbloqueie candidatos.
                </p>
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
                <button
                  type="button"
                  onClick={() => setUserFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    userFilterStatus === 'all'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({realStats.usersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserFilterStatus('with_code')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    userFilterStatus === 'with_code'
                      ? 'bg-white text-amber-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Com Código ({realStats.usersList.filter((u) => Boolean(u.activationCode)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserFilterStatus('activated')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    userFilterStatus === 'activated'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ativos ({realStats.usersList.filter((u) => u.isActivated && !u.isBlocked).length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserFilterStatus('free')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    userFilterStatus === 'free'
                      ? 'bg-white text-slate-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Gratuitos ({realStats.usersList.filter((u) => !u.isActivated && !u.isBlocked).length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserFilterStatus('blocked')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    userFilterStatus === 'blocked'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">block</span>
                  <span>Bloqueados ({realStats.usersList.filter((u) => u.isBlocked).length})</span>
                </button>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Pesquisar por código de ativação (ex: NGOLA-), número de telefone, nome, e-mail ou motivo de bloqueio..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Users Table */}
            {(() => {
              const filteredUsers = realStats.usersList.filter((u) => {
                const matchesSearch =
                  !userSearchTerm.trim() ||
                  u.phone.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                  u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                  u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                  (u.activationCode && u.activationCode.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
                  (u.blockedReason && u.blockedReason.toLowerCase().includes(userSearchTerm.toLowerCase()));

                const matchesStatus =
                  userFilterStatus === 'all' ||
                  (userFilterStatus === 'activated' && u.isActivated && !u.isBlocked) ||
                  (userFilterStatus === 'with_code' && Boolean(u.activationCode)) ||
                  (userFilterStatus === 'free' && !u.isActivated && !u.isBlocked) ||
                  (userFilterStatus === 'blocked' && Boolean(u.isBlocked));

                return matchesSearch && matchesStatus;
              });

              if (filteredUsers.length === 0) {
                return (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="material-symbols-outlined text-slate-400 text-3xl">person_off</span>
                    <p className="text-xs font-semibold text-slate-600">
                      Nenhum candidato encontrado com estes critérios de pesquisa.
                    </p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] bg-slate-50/50">
                        <th className="py-3 px-3">Candidato / Identificador</th>
                        <th className="py-3 px-3">Telefone & E-mail</th>
                        <th className="py-3 px-3">Código de Acesso Utilizado</th>
                        <th className="py-3 px-3">Estado & Acesso</th>
                        <th className="py-3 px-3">Simulados</th>
                        <th className="py-3 px-3">Média</th>
                        <th className="py-3 px-3 text-right">Ações de Gestão & Bloqueio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {filteredUsers.map((user) => {
                        const isToggling = togglingUserPhone === user.phone;
                        const isTogglingBlock = togglingBlockPhone === user.phone;
                        const isUserBlocked = Boolean(user.isBlocked);
                        const cleanPhoneDigits = user.phone.replace(/\D/g, '');

                        return (
                          <tr
                            key={user.phone}
                            className={`transition-colors ${
                              isUserBlocked ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-xs flex-shrink-0 ${
                                    isUserBlocked ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                                    <span>{user.name}</span>
                                    {isUserBlocked && (
                                      <span className="px-1.5 py-0.2 bg-red-100 text-red-800 text-[9px] font-bold rounded-md border border-red-200">
                                        BLOQUEADO
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-slate-400">ID: {user.phone}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="space-y-0.5 font-mono text-xs">
                                <div className="font-bold text-slate-900">{user.phone}</div>
                                {user.email && (
                                  <div className="text-slate-500 text-[11px] font-sans">{user.email}</div>
                                )}
                              </div>
                            </td>

                            {/* DEDICATED COLUMN: ACTIVATION CODE USED */}
                            <td className="py-3.5 px-3">
                              {user.activationCode ? (
                                <div className="space-y-1">
                                  <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg border border-blue-200">
                                    <span className="material-symbols-outlined text-xs text-blue-600">vpn_key</span>
                                    <span className="font-mono font-black text-xs">{user.activationCode}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCode(user.activationCode!)}
                                      className="p-0.5 text-slate-400 hover:text-blue-700 transition-colors ml-1 cursor-pointer"
                                      title="Copiar código de ativação"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">content_copy</span>
                                    </button>
                                  </div>
                                  {user.activatedSpecializations && user.activatedSpecializations.length > 0 && (
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[11px] text-slate-400">school</span>
                                      <span className="font-medium truncate max-w-[140px]">{user.activatedSpecializations.join(', ')}</span>
                                    </div>
                                  )}
                                </div>
                              ) : user.isActivated ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[11px] font-bold border border-emerald-200">
                                  <span className="material-symbols-outlined text-xs">verified</span>
                                  Liberado Manualmente
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">key_off</span>
                                  Sem código
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-3">
                              {isUserBlocked ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 font-black px-2.5 py-1 rounded-full text-[10px] border border-red-300">
                                    <span className="material-symbols-outlined text-xs">block</span>
                                    <span>SUSPENSO / BLOQUEADO</span>
                                  </span>
                                  {user.blockedReason && (
                                    <div className="text-[10px] text-red-700 max-w-[150px] truncate" title={user.blockedReason}>
                                      Motivo: {user.blockedReason}
                                    </div>
                                  )}
                                </div>
                              ) : user.isActivated ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[11px] border border-emerald-200">
                                  <span className="material-symbols-outlined text-xs">check_circle</span>
                                  <span>Ativo {user.expiresAt ? `(até ${user.expiresAt})` : ''}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full text-[11px] border border-slate-200">
                                  <span>Gratuito</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-3">
                              <span className="font-bold text-slate-800">
                                {user.totalTestsTaken || 0} simulados
                              </span>
                            </td>

                            <td className="py-3.5 px-3">
                              <span className={`font-bold ${
                                (user.averageScore || 0) >= 14 ? 'text-emerald-600' : 'text-slate-700'
                              }`}>
                                {user.averageScore ? `${user.averageScore} / 20` : '—'}
                              </span>
                            </td>

                            <td className="py-3.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {cleanPhoneDigits.length >= 9 && (
                                  <a
                                    href={`https://wa.me/${cleanPhoneDigits.startsWith('244') ? cleanPhoneDigits : `244${cleanPhoneDigits}`}?text=Ol%C3%A1%20${encodeURIComponent(user.name)},%20suporte%20do%20NgolaTeste%20aqui!`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-lg transition-all"
                                    title="Contactar no WhatsApp"
                                  >
                                    <span className="material-symbols-outlined text-sm">chat</span>
                                  </a>
                                )}

                                {/* PLAN ACTIVATION TOGGLE */}
                                <button
                                  type="button"
                                  disabled={isToggling || isUserBlocked}
                                  onClick={() => handleToggleUserActivation(user.phone, user.isActivated)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    user.isActivated
                                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  } ${(isToggling || isUserBlocked) ? 'opacity-40 cursor-not-allowed' : ''}`}
                                  title={isUserBlocked ? 'Desbloqueie o usuário para alterar o plano' : ''}
                                >
                                  {user.isActivated ? (
                                    <>
                                      <span className="material-symbols-outlined text-xs">close</span>
                                      <span>Desativar</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="material-symbols-outlined text-xs">verified</span>
                                      <span>Liberar (14d)</span>
                                    </>
                                  )}
                                </button>

                                {/* BLOCK / UNBLOCK ACTION BUTTON */}
                                {isUserBlocked ? (
                                  <button
                                    type="button"
                                    disabled={isTogglingBlock}
                                    onClick={() => handleToggleUserBlock(user, false)}
                                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                    title="Desbloquear acesso deste usuário"
                                  >
                                    <span className="material-symbols-outlined text-xs">lock_open</span>
                                    <span>Desbloquear</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isTogglingBlock}
                                    onClick={() => setBlockModalUser(user)}
                                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                    title="Bloquear usuário se apresentar comportamento irregular"
                                  >
                                    <span className="material-symbols-outlined text-xs">block</span>
                                    <span>Bloquear</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {/* ================= TAB 5: SECURITY & RECOVERY EMAIL ================= */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 space-y-6 shadow-sm border border-slate-200/80">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700">
              <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Segurança, Senha & E-mail de Recuperação</h3>
              <p className="text-slate-500 text-xs">
                Defina a senha exigida para acessar o painel e configure o e-mail oficial para recuperação de acesso.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PANEL 1: ADMIN PASSWORD */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm pb-2 border-b border-slate-200">
                <span className="material-symbols-outlined text-blue-600 text-lg">lock</span>
                <span>1. Senha de Acesso do ADM</span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newAdminPasswordInput.trim()) {
                    alert('Por favor digite a nova senha do Administrador.');
                    return;
                  }
                  if (onUpdateAdminPassword) {
                    onUpdateAdminPassword(newAdminPasswordInput.trim());
                  } else {
                    localStorage.setItem('ngola_admin_password', newAdminPasswordInput.trim());
                  }
                  setPasswordSuccessMsg('Senha de administrador atualizada com sucesso!');
                  setNewAdminPasswordInput('');
                  setTimeout(() => setPasswordSuccessMsg(''), 4000);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Senha Atual do ADM
                  </label>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-800 font-mono text-sm font-bold flex items-center justify-between shadow-2xs">
                    <span>••••••••</span>
                    <span className="text-xs text-blue-600 font-sans font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">Ativa</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nova Senha do ADM
                  </label>
                  <input
                    type="text"
                    value={newAdminPasswordInput}
                    onChange={(e) => setNewAdminPasswordInput(e.target.value)}
                    placeholder="Ex: MinhaSenhaSuperSegura2025"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                  />
                </div>

                {passwordSuccessMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>{passwordSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-xs flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>Guardar Nova Senha</span>
                </button>
              </form>
            </div>

            {/* PANEL 2: ADMIN PASSWORD RECOVERY EMAIL */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">mark_email_read</span>
                  <span>2. Destinatário do E-mail de Recuperação</span>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-emerald-200">
                  Destino
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Defina o endereço de e-mail que receberá os códigos confidenciais quando você solicitar a recuperação de senha.
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!recoveryEmailInput.trim() || !recoveryEmailInput.includes('@')) {
                    alert('Por favor insira um endereço de e-mail válido (ex: ngolaapp@gmail.com).');
                    return;
                  }

                  const res = await saveAdminRecoveryEmail(recoveryEmailInput.trim());
                  if (onUpdateAdminRecoveryEmail) {
                    onUpdateAdminRecoveryEmail(recoveryEmailInput.trim());
                  }

                  setRecoveryEmailSuccessMsg(res.message);
                  setTimeout(() => setRecoveryEmailSuccessMsg(''), 5000);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Endereço de E-mail de Recuperação
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={recoveryEmailInput}
                      onChange={(e) => setRecoveryEmailInput(e.target.value)}
                      placeholder="Ex: ngolaapp@gmail.com ou seuemail@dominio.com"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-3.5 text-slate-400 text-base">
                      mail
                    </span>
                  </div>
                </div>

                {recoveryEmailSuccessMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>{recoveryEmailSuccessMsg}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-xs flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">save</span>
                    <span>Salvar E-mail Destinatário</span>
                  </button>
                </div>
              </form>
            </div>

            {/* PANEL 3: EMAIL SENDER CONFIGURATION (GMAIL / RESEND / SMTP) */}
            <div className="bg-blue-50/40 p-6 rounded-2xl border border-blue-200/80 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                  <span className="material-symbols-outlined text-blue-600 text-lg">forward_to_inbox</span>
                  <span>3. Servidor de Envio de E-mails (Gmail / Resend / SMTP)</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                  smtpStatusInfo?.configured
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  {smtpStatusInfo?.configured ? 'Ativo & Configurado' : 'Ação Necessária'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Para que os e-mails com códigos confidenciais cheguem <strong>de verdade</strong> à sua caixa de entrada em <strong>{recoveryEmailInput || 'ngolaapp@gmail.com'}</strong>, configure o serviço de disparo abaixo:
              </p>

              {/* Provider Selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSmtpProvider('gmail')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    smtpProvider === 'gmail'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">mail</span>
                  <span>Gmail (Google)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSmtpProvider('resend')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    smtpProvider === 'resend'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">send_and_archive</span>
                  <span>Resend API</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSmtpProvider('custom')}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    smtpProvider === 'custom'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">dns</span>
                  <span>SMTP Personalizado</span>
                </button>
              </div>

              {/* Form fields based on selected provider */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSavingSmtp(true);
                  setSmtpSaveMsg(null);

                  let payload: any = { provider: smtpProvider };

                  if (smtpProvider === 'gmail') {
                    payload.host = 'smtp.gmail.com';
                    payload.port = 587;
                    payload.user = smtpUser.trim();
                    payload.pass = smtpPass.trim();
                    payload.from = `NgolaTeste <${smtpUser.trim()}>`;
                  } else if (smtpProvider === 'resend') {
                    payload.resendApiKey = resendApiKey.trim();
                    payload.from = `NgolaTeste <onboarding@resend.dev>`;
                  } else {
                    payload.host = smtpHost.trim();
                    payload.port = Number(smtpPort) || 587;
                    payload.user = smtpUser.trim();
                    payload.pass = smtpPass.trim();
                    payload.from = `NgolaTeste <${smtpUser.trim()}>`;
                  }

                  const res = await saveAdminSmtpSettings(payload);
                  setIsSavingSmtp(false);

                  if (res.success) {
                    setSmtpSaveMsg({ type: 'success', text: 'Configurações de envio salvas com sucesso no servidor!' });
                    fetchAdminSmtpStatus().then((s) => s && setSmtpStatusInfo(s));
                  } else {
                    setSmtpSaveMsg({ type: 'error', text: res.message || 'Erro ao salvar configurações.' });
                  }
                }}
                className="space-y-3.5 pt-2"
              >
                {smtpProvider === 'gmail' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Seu E-mail Gmail (Conta Google Remetente)
                      </label>
                      <input
                        type="email"
                        value={smtpUser}
                        onChange={(e) => setSmtpUser(e.target.value)}
                        placeholder="ngolaapp@gmail.com"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Senha de Aplicativo do Google (16 caracteres)
                      </label>
                      <input
                        type="password"
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="Ex: abcd efgh ijkl mnop"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    {/* Gmail Step by step guide */}
                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-[11px] text-amber-950 space-y-2">
                      <div className="font-bold flex items-center gap-1 text-amber-900">
                        <span className="material-symbols-outlined text-sm text-amber-600">info</span>
                        <span>Como obter a Senha de Aplicativo da Google (16 caracteres):</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-amber-900 leading-relaxed pl-1 text-[11px]">
                        <li>Acesse a sua conta Google em <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700 hover:text-blue-900">myaccount.google.com/apppasswords</a></li>
                        <li>Certifique-se de que a <strong>Verificação em 2 etapas</strong> está ativada na sua conta Google.</li>
                        <li>Em "Nome do app", digite <strong>NgolaTeste</strong> e clique em <strong>Criar</strong>.</li>
                        <li>Copie a senha de 16 letras gerada e cole no campo acima!</li>
                      </ol>
                    </div>
                  </div>
                )}

                {smtpProvider === 'resend' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Chave de API do Resend (re_...)
                      </label>
                      <input
                        type="password"
                        value={resendApiKey}
                        onChange={(e) => setResendApiKey(e.target.value)}
                        placeholder="re_123456789..."
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      <p className="text-[10.5px] text-slate-500 mt-1">
                        Crie sua chave gratuita em <a href="https://resend.com" target="_blank" rel="noreferrer" className="underline text-blue-600 font-bold">resend.com</a> para envio ultrarrápido sem limites de SMTP.
                      </p>
                    </div>
                  </div>
                )}

                {smtpProvider === 'custom' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Host do Servidor SMTP
                        </label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="mail.seudominio.com"
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Porta SMTP
                        </label>
                        <input
                          type="number"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(Number(e.target.value))}
                          placeholder="587 ou 465"
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Usuário SMTP
                        </label>
                        <input
                          type="text"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          placeholder="usuario@seudominio.com"
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Senha SMTP
                        </label>
                        <input
                          type="password"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          placeholder="Senha do e-mail"
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {smtpSaveMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    smtpSaveMsg.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    <span className="material-symbols-outlined text-base">
                      {smtpSaveMsg.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <span>{smtpSaveMsg.text}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingSmtp}
                    className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-xs flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">save</span>
                    <span>{isSavingSmtp ? 'Salvando...' : 'Salvar Configuração de E-mail'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isTestingDelivery}
                    onClick={async () => {
                      const target = recoveryEmailInput.trim() || smtpUser.trim();
                      if (!target || !target.includes('@')) {
                        alert('Insira um e-mail válido para testar o envio.');
                        return;
                      }
                      setIsTestingDelivery(true);
                      setDeliveryTestResult(null);

                      const res = await testAdminSmtpDelivery(target);
                      setIsTestingDelivery(false);
                      setDeliveryTestResult(res);
                    }}
                    className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-bold py-3 px-5 rounded-xl transition-all cursor-pointer text-xs flex items-center justify-center gap-2"
                  >
                    {isTestingDelivery ? (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                        <span>Testando Envio Real...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">outgoing_mail</span>
                        <span>Testar Envio Real para {recoveryEmailInput || 'E-mail'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Delivery test result */}
                {deliveryTestResult && (
                  <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    deliveryTestResult.delivered
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-red-50 border-red-200 text-red-950'
                  }`}>
                    <div className="flex items-center gap-2 font-bold">
                      <span className="material-symbols-outlined text-base">
                        {deliveryTestResult.delivered ? 'mark_email_read' : 'error'}
                      </span>
                      <span>{deliveryTestResult.delivered ? 'E-mail Entregue com Sucesso na Caixa de Entrada!' : 'Falha na Entrega do E-mail'}</span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed">
                      {deliveryTestResult.message}
                    </p>
                    {deliveryTestResult.error && (
                      <div className="font-mono text-[10px] bg-red-100/70 p-2 rounded-lg text-red-800 break-words mt-1">
                        Detalhe do erro: {deliveryTestResult.error}
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>

          <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Bloquear Painel ADM</h4>
              <p className="text-xs text-slate-500">Exigirá a senha novamente na próxima tentativa de acesso.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onLockAdmin) onLockAdmin();
                else onNavigate('home');
              }}
              className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">lock</span>
              <span>Bloquear e Sair</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= TAB 6: SUPABASE INTEGRATION ================= */}
      {activeTab === 'supabase' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 space-y-6 shadow-sm border border-slate-200/80">
          <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">database</span>
                Integração e Conexão Supabase
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Gerencie a conexão da sua base de dados remota, verifique o estado das tabelas e sincronize os dados.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isSupabaseConfigured() ? (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-200 shadow-sm">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  Supabase Conectado
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-amber-200 shadow-sm">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                  Aguardando Configuração
                </span>
              )}
            </div>
          </div>

          {/* Configuration Form */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-base">key</span>
                1. Credenciais do Supabase
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                Pode utilizar variáveis de ambiente (<code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">.env</code>) ou inserir abaixo:
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SUPABASE_URL
                </label>
                <input
                  type="text"
                  placeholder="https://seu-projeto.supabase.co"
                  value={inputSupabaseUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInputSupabaseUrl(val);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono outline-none focus:border-blue-600"
                />
                {inputSupabaseUrl.includes('/rest/v1') && (
                  <p className="text-[11px] text-amber-700 mt-1 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                    O sufixo <code className="bg-amber-100 px-1 rounded font-mono">/rest/v1</code> será removido automaticamente ao salvar para usar a URL base da API.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  SUPABASE_ANON_KEY
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={inputSupabaseKey}
                  onChange={(e) => setInputSupabaseKey(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {credentialsSaveMsg && (
              <div className="p-3 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 border border-emerald-200">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <span>{credentialsSaveMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  const cleanedUrl = sanitizeSupabaseUrl(inputSupabaseUrl);
                  const cleanedKey = sanitizeSupabaseKey(inputSupabaseKey);
                  
                  setInputSupabaseUrl(cleanedUrl);
                  setInputSupabaseKey(cleanedKey);

                  if (cleanedUrl) localStorage.setItem('ngola_supabase_url', cleanedUrl);
                  if (cleanedKey) localStorage.setItem('ngola_supabase_key', cleanedKey);
                  
                  resetSupabaseClient();
                  setCredentialsSaveMsg('Credenciais validadas e guardadas! Testando conexão com as tabelas...');
                  setTimeout(() => {
                    setCredentialsSaveMsg('');
                    runTableDiagnostics();
                  }, 800);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                <span>Guardar Credenciais e Conectar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('ngola_supabase_url');
                  localStorage.removeItem('ngola_supabase_key');
                  setInputSupabaseUrl('');
                  setInputSupabaseKey('');
                  resetSupabaseClient();
                  setCredentialsSaveMsg('Credenciais personalizadas limpas.');
                  setTimeout(() => {
                    setCredentialsSaveMsg('');
                    runTableDiagnostics();
                  }, 1200);
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                Limpar Entrada
              </button>
            </div>
          </div>

          {/* Real-time Table Diagnostic Report */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-base">fact_check</span>
                  2. Verificação de Tabelas em Tempo Real
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Estado das 8 tabelas oficiais do NgolaTestes no Supabase. {lastCheckTime && `(Último teste às ${lastCheckTime})`}
                </p>
              </div>

              <button
                type="button"
                disabled={isCheckingTables}
                onClick={runTableDiagnostics}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span className={`material-symbols-outlined text-sm ${isCheckingTables ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span>{isCheckingTables ? 'Verificando...' : 'Verificar Tabelas'}</span>
              </button>
            </div>

            {isCheckingTables ? (
              <div className="py-8 text-center text-slate-500 text-xs font-medium flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                <span>Consultando tabelas no Supabase...</span>
              </div>
            ) : tableReports.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {tableReports.map((report) => (
                  <div
                    key={report.tableName}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2 ${
                      report.status === 'ok'
                        ? 'bg-white border-emerald-200 shadow-sm'
                        : 'bg-red-50/60 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{report.displayName}</span>
                        <code className="text-[10px] text-slate-500 font-mono">public.{report.tableName}</code>
                      </div>
                      {report.status === 'ok' ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                          OK
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          Atenção
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center justify-between border-t border-slate-100 pt-2">
                      <span className="truncate pr-2">{report.message}</span>
                      {report.status === 'ok' && (
                        <span className="font-bold text-slate-900 shrink-0 bg-slate-100 px-2 py-0.5 rounded">
                          {report.rowCount} registros
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">info</span>
                <span>
                  Supabase ainda não configurado ou aguardando credenciais. Insira as credenciais acima para verificar a criação das tabelas.
                </span>
              </div>
            )}
          </div>

          {/* RLS Policy Live Diagnostic Card */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600 text-base">security</span>
                    3. Diagnóstico de Políticas RLS (Row Level Security)
                  </h4>
                  {rlsOverallOk === true && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300">
                      100% Liberado
                    </span>
                  )}
                  {rlsOverallOk === false && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300">
                      Restrições Detectadas
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifica permissões ativas de Leitura (SELECT), Inserção (INSERT), Atualização (UPDATE) e Exclusão (DELETE) em cada tabela.
                </p>
              </div>

              <button
                type="button"
                disabled={isVerifyingRLS}
                onClick={runRLSDiagnostics}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
              >
                <span className={`material-symbols-outlined text-sm ${isVerifyingRLS ? 'animate-spin' : ''}`}>
                  {isVerifyingRLS ? 'sync' : 'verified_user'}
                </span>
                <span>{isVerifyingRLS ? 'Testando RLS...' : 'Testar Políticas RLS'}</span>
              </button>
            </div>

            {isVerifyingRLS ? (
              <div className="py-8 text-center text-slate-500 text-xs font-medium flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                <span>Executando testes de CRUD e RLS no Supabase...</span>
              </div>
            ) : rlsReports.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {rlsReports.map((item) => (
                    <div
                      key={item.tableName}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 ${
                        item.allOk ? 'bg-white border-emerald-200' : 'bg-amber-50/70 border-amber-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">{item.displayName}</span>
                          <code className="text-[10px] text-slate-500 font-mono">public.{item.tableName}</code>
                        </div>
                        {item.allOk ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">check</span> RLS OK
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">warning</span> Ajustar
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-100 text-[10px] font-semibold text-center">
                        <span className={`px-1 py-0.5 rounded ${item.canSelect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`} title="Permissão de Leitura">
                          SEL
                        </span>
                        <span className={`px-1 py-0.5 rounded ${item.canInsert ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`} title="Permissão de Inserção">
                          INS
                        </span>
                        <span className={`px-1 py-0.5 rounded ${item.canUpdate ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`} title="Permissão de Atualização">
                          UPD
                        </span>
                        <span className={`px-1 py-0.5 rounded ${item.canDelete ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`} title="Permissão de Exclusão">
                          DEL
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {rlsLogs.length > 0 && (
                  <div className="bg-slate-900 p-3.5 rounded-xl font-mono text-xs space-y-1 text-slate-300 border border-slate-800 max-h-36 overflow-y-auto">
                    {rlsLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={
                          log.includes('[SUCESSO]') || log.includes('[CONCLUÍDO]')
                            ? 'text-emerald-400'
                            : log.includes('[ERRO]')
                            ? 'text-rose-400 font-bold'
                            : log.includes('[AVISO]') || log.includes('[DICA]')
                            ? 'text-amber-300'
                            : 'text-slate-300'
                        }
                      >
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                <span>Clique em <strong>Testar Políticas RLS</strong> para validar os privilégios de cada tabela em tempo real.</span>
                <button
                  type="button"
                  onClick={runRLSDiagnostics}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                >
                  Executar Teste
                </button>
              </div>
            )}
          </div>

          {/* Interactive Module CRUD Tester */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 space-y-4 border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-base">terminal</span>
                  4. Teste Interativo de CRUD de Módulos no Supabase
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Executa um ciclo completo em tempo real: Inserir módulo de teste &rarr; Consultar &rarr; Atualizar &rarr; Excluir.
                </p>
              </div>

              <button
                type="button"
                disabled={isTestingCrud}
                onClick={async () => {
                  setIsTestingCrud(true);
                  setCrudTestLogs(['Conectando ao Supabase para teste CRUD...']);
                  const res = await testSupabaseModuleCRUD();
                  setCrudTestLogs(res.logs);
                  setCrudTestSuccess(res.success);
                  setIsTestingCrud(false);
                  runTableDiagnostics();
                  runRLSDiagnostics();
                }}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span className={`material-symbols-outlined text-sm ${isTestingCrud ? 'animate-spin' : ''}`}>
                  {isTestingCrud ? 'hourglass_empty' : 'play_arrow'}
                </span>
                <span>{isTestingCrud ? 'Testando...' : 'Executar Teste de Módulo'}</span>
              </button>
            </div>

            {crudTestLogs.length > 0 ? (
              <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs space-y-1.5 border border-slate-800/80">
                {crudTestLogs.map((log, idx) => {
                  const isSuccess = log.includes('[SUCESSO]') || log.includes('[CONCLUÍDO]');
                  const isFail = log.includes('[FALHA]') || log.includes('[ERRO]');
                  const isWarn = log.includes('[AVISO]') || log.includes('[DICA]');
                  return (
                    <div
                      key={idx}
                      className={`leading-relaxed ${
                        isSuccess ? 'text-emerald-400' : isFail ? 'text-rose-400 font-bold' : isWarn ? 'text-amber-300' : 'text-slate-300'
                      }`}
                    >
                      {log}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Clique no botão acima para verificar se as permissões de INSERT, SELECT, UPDATE e DELETE na tabela de módulos estão funcionando perfeitamente.
              </p>
            )}
          </div>

          {/* SQL Script Generator Box (Tabbed: Safe RLS Fix vs Master Reset) */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-base">auto_fix_high</span>
                  5. Scripts SQL de Configuração e Correção de RLS
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Escolha o script adequado para aplicar as políticas no Supabase sem complicações.
                </p>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSqlViewTab('fix')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sqlViewTab === 'fix' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Correção RLS (Sem perda de dados)
                </button>
                <button
                  type="button"
                  onClick={() => setSqlViewTab('master')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    sqlViewTab === 'master' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Master Reset (Recriação Completa)
                </button>
              </div>
            </div>

            {sqlViewTab === 'fix' ? (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-base text-emerald-700 shrink-0 mt-0.5">verified</span>
                    <div>
                      <span className="font-bold block text-emerald-950">Script de Correção RLS (Recomendado):</span>
                      <span>Habilita RLS e aplica políticas universais de SELECT, INSERT, UPDATE e DELETE em todas as tabelas <strong>sem apagar nem modificar os dados existentes</strong>.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getSupabaseRLSFixScript());
                      setRlsFixCopied(true);
                      setTimeout(() => setRlsFixCopied(false), 3000);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">{rlsFixCopied ? 'check' : 'content_copy'}</span>
                    <span>{rlsFixCopied ? 'Script RLS Copiado!' : 'Copiar Script RLS'}</span>
                  </button>
                </div>

                <textarea
                  readOnly
                  rows={8}
                  value={getSupabaseRLSFixScript()}
                  className="w-full bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs border border-slate-700 outline-none resize-y"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-900 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-base text-blue-700 shrink-0 mt-0.5">info</span>
                    <div>
                      <span className="font-bold block text-blue-950">Script Master de Criação do Zero:</span>
                      <span>Recria todas as 8 tabelas canónicas, popula com os dados oficiais e configura as políticas de RLS universais.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getSupabaseSQLScript());
                      setSqlCopied(true);
                      setTimeout(() => setSqlCopied(false), 3000);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">{sqlCopied ? 'check' : 'content_copy'}</span>
                    <span>{sqlCopied ? 'Script Master Copiado!' : 'Copiar Script Master'}</span>
                  </button>
                </div>

                <textarea
                  readOnly
                  rows={8}
                  value={getSupabaseSQLScript()}
                  className="w-full bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs border border-slate-700 outline-none resize-y"
                />
              </div>
            )}

            <div className="bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-slate-500 shrink-0">help</span>
              <span>
                <strong>Como executar no Supabase:</strong> Vá para <span className="font-semibold text-slate-800">Supabase &rarr; SQL Editor &rarr; + New query</span> &rarr; cole o script copiado &rarr; clique no botão verde <strong>Run</strong>.
              </span>
            </div>
          </div>

          {/* Sync All Data Button */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl">
                <span className="material-symbols-outlined text-xl">sync</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">6. Sincronizar Todos os Módulos e Perguntas do Sistema</h4>
                <p className="text-xs text-slate-600">
                  Envia todos os módulos cadastrados, perguntas, categorias e especialidades existentes localmente direto para as tabelas correspondentes no Supabase.
                </p>
              </div>
            </div>

            {supabaseSyncResult && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                  supabaseSyncResult.success
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {supabaseSyncResult.success ? 'check_circle' : 'warning'}
                </span>
                <span>{supabaseSyncResult.message}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isSyncingSupabase}
                onClick={async () => {
                  setIsSyncingSupabase(true);
                  setSupabaseSyncResult(null);
                  const res = await syncAllLocalDataToSupabase();
                  setSupabaseSyncResult(res);
                  setIsSyncingSupabase(false);
                  runTableDiagnostics();
                  runRLSDiagnostics();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-xs flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">
                  {isSyncingSupabase ? 'hourglass_empty' : 'cloud_upload'}
                </span>
                <span>{isSyncingSupabase ? 'Sincronizando...' : 'Enviar Todos os Dados para Supabase'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
