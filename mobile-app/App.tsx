import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ImagePicker from 'expo-image-picker'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  analyzeImage,
  analyzeText,
  analyzeUrl,
  createInbox,
  fetchCurrentUser,
  fetchInboxes,
  fetchRequests,
  loginWithEmail,
  logout,
  registerWithEmail,
  syncInboxes,
} from './src/api'
import type { AnalysisResult, AppUser, ConnectedInbox, RiskLevel, SecurityRequest } from './src/types'

const STORAGE_KEYS = {
  apiBaseUrl: 'truststep.mobile.apiBaseUrl',
  sessionToken: 'truststep.mobile.sessionToken',
}

const DEFAULT_API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://192.168.1.228:3000'

type TabKey = 'dashboard' | 'analyze' | 'inboxes' | 'account'

function riskColor(riskLevel: RiskLevel) {
  if (riskLevel === 'high') return styles.riskHigh
  if (riskLevel === 'medium') return styles.riskMedium
  return styles.riskLow
}

function prettyDate(value: string) {
  return new Date(value).toLocaleString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function App() {
  const [booting, setBooting] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [tab, setTab] = useState<TabKey>('dashboard')
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE_URL)
  const [savedApiBaseUrl, setSavedApiBaseUrl] = useState(DEFAULT_API_BASE_URL)
  const [sessionToken, setSessionToken] = useState('')
  const [user, setUser] = useState<AppUser | null>(null)
  const [requests, setRequests] = useState<SecurityRequest[]>([])
  const [inboxes, setInboxes] = useState<ConnectedInbox[]>([])
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [textToAnalyze, setTextToAnalyze] = useState('')
  const [urlToAnalyze, setUrlToAnalyze] = useState('')
  const [selectedImage, setSelectedImage] = useState<{ uri: string; fileName: string; mimeType: string } | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [inboxEmail, setInboxEmail] = useState('')
  const [inboxProvider, setInboxProvider] = useState<'gmail' | 'outlook' | 'imap'>('gmail')

  useEffect(() => {
    async function bootstrap() {
      try {
        const [storedBaseUrl, storedToken] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.apiBaseUrl),
          AsyncStorage.getItem(STORAGE_KEYS.sessionToken),
        ])

        if (storedBaseUrl?.trim()) {
          setApiBaseUrl(storedBaseUrl)
          setSavedApiBaseUrl(storedBaseUrl)
        }

        if (!storedToken) return

        const activeBaseUrl = storedBaseUrl?.trim() || DEFAULT_API_BASE_URL
        const payload = await fetchCurrentUser(activeBaseUrl, storedToken)
        if (!payload.user) return

        setSessionToken(storedToken)
        setUser(payload.user)
        await loadWorkspace(activeBaseUrl, storedToken, payload.user)
      } catch {
        await AsyncStorage.multiRemove([STORAGE_KEYS.sessionToken])
      } finally {
        setBooting(false)
      }
    }

    bootstrap()
  }, [])

  const summary = useMemo(() => {
    const high = requests.filter((request) => request.risk_level === 'high').length
    const medium = requests.filter((request) => request.risk_level === 'medium').length
    return {
      total: requests.length,
      high,
      medium,
      protected: new Set(requests.map((request) => request.submitted_by)).size,
    }
  }, [requests])

  async function loadWorkspace(baseUrl: string, token: string, activeUser: AppUser) {
    setLoadingWorkspace(true)
    try {
      const [requestsPayload, inboxesPayload] = await Promise.all([
        fetchRequests(baseUrl, token),
        fetchInboxes(baseUrl, token, activeUser.id),
      ])

      setRequests(requestsPayload.requests ?? [])
      setInboxes(inboxesPayload.inboxes ?? [])
    } finally {
      setLoadingWorkspace(false)
    }
  }

  async function handleAuthSubmit() {
    if (!authEmail.trim() || !authPassword.trim()) {
      Alert.alert('Chýbajú údaje', 'Zadajte e-mail aj heslo.')
      return
    }

    setAuthLoading(true)
    try {
      const activeBaseUrl = apiBaseUrl.trim() || DEFAULT_API_BASE_URL
      const payload = mode === 'register'
        ? await registerWithEmail(activeBaseUrl, authEmail, authPassword)
        : await loginWithEmail(activeBaseUrl, authEmail, authPassword)

      await AsyncStorage.multiSet([
        [STORAGE_KEYS.apiBaseUrl, activeBaseUrl],
        [STORAGE_KEYS.sessionToken, payload.sessionToken],
      ])

      setSavedApiBaseUrl(activeBaseUrl)
      setSessionToken(payload.sessionToken)
      setUser(payload.user)
      setTab('dashboard')
      await loadWorkspace(activeBaseUrl, payload.sessionToken, payload.user)
    } catch (error) {
      Alert.alert('Prihlásenie zlyhalo', error instanceof Error ? error.message : 'Skúste to znova.')
    } finally {
      setAuthLoading(false)
      setBooting(false)
    }
  }

  async function handleLogout() {
    try {
      if (sessionToken) {
        await logout(savedApiBaseUrl, sessionToken)
      }
    } catch {
      // Allow local cleanup even if server logout fails.
    } finally {
      await AsyncStorage.multiRemove([STORAGE_KEYS.sessionToken])
      setSessionToken('')
      setUser(null)
      setRequests([])
      setInboxes([])
      setAnalysisResult(null)
      setTab('dashboard')
    }
  }

  async function saveApiBaseUrl() {
    const normalized = apiBaseUrl.trim() || DEFAULT_API_BASE_URL
    await AsyncStorage.setItem(STORAGE_KEYS.apiBaseUrl, normalized)
    setSavedApiBaseUrl(normalized)
    Alert.alert('Uložené', 'Mobilná appka bude používať túto backend URL.')
  }

  async function runTextAnalysis() {
    if (!user || !sessionToken) return
    if (!textToAnalyze.trim()) {
      Alert.alert('Chýba text', 'Vlož správu alebo e-mail na overenie.')
      return
    }

    setSubmitting(true)
    try {
      const result = await analyzeText(savedApiBaseUrl, sessionToken, {
        text: textToAnalyze,
        submittedBy: user.email,
        companyId: user.id,
      })
      setAnalysisResult(result)
      await loadWorkspace(savedApiBaseUrl, sessionToken, user)
      setTab('dashboard')
    } catch (error) {
      Alert.alert('Analýza zlyhala', error instanceof Error ? error.message : 'Skúste to znova.')
    } finally {
      setSubmitting(false)
    }
  }

  async function runUrlAnalysis() {
    if (!user || !sessionToken) return
    if (!urlToAnalyze.trim()) {
      Alert.alert('Chýba link', 'Vlož podozrivú URL adresu.')
      return
    }

    setSubmitting(true)
    try {
      const result = await analyzeUrl(savedApiBaseUrl, sessionToken, {
        url: urlToAnalyze,
        submittedBy: user.email,
        companyId: user.id,
      })
      setAnalysisResult(result)
      await loadWorkspace(savedApiBaseUrl, sessionToken, user)
      setTab('dashboard')
    } catch (error) {
      Alert.alert('Analýza linku zlyhala', error instanceof Error ? error.message : 'Skúste to znova.')
    } finally {
      setSubmitting(false)
    }
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Povolenie chýba', 'TrustStep potrebuje prístup k fotkám kvôli screenshot analýze.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    })

    if (result.canceled || !result.assets[0]) return

    const asset = result.assets[0]
    setSelectedImage({
      uri: asset.uri,
      fileName: asset.fileName || `screenshot-${Date.now()}.jpg`,
      mimeType: asset.mimeType || 'image/jpeg',
    })
  }

  async function runImageAnalysis() {
    if (!user || !sessionToken) return
    if (!selectedImage) {
      Alert.alert('Chýba screenshot', 'Najprv vyber screenshot z galérie.')
      return
    }

    setSubmitting(true)
    try {
      const result = await analyzeImage(savedApiBaseUrl, sessionToken, {
        ...selectedImage,
        submittedBy: user.email,
        companyId: user.id,
      })
      setAnalysisResult(result)
      await loadWorkspace(savedApiBaseUrl, sessionToken, user)
      setTab('dashboard')
    } catch (error) {
      Alert.alert('Analýza screenshotu zlyhala', error instanceof Error ? error.message : 'Skúste to znova.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCreateInbox() {
    if (!user || !sessionToken) return
    if (!inboxEmail.trim()) {
      Alert.alert('Chýba e-mail', 'Zadajte e-mailovú adresu inboxu.')
      return
    }

    setSyncing(true)
    try {
      await createInbox(savedApiBaseUrl, sessionToken, {
        companyId: user.id,
        provider: inboxProvider,
        emailAddress: inboxEmail,
        scanMode: 'auto',
      })
      const inboxesPayload = await fetchInboxes(savedApiBaseUrl, sessionToken, user.id)
      setInboxes(inboxesPayload.inboxes ?? [])
      setInboxEmail('')
      Alert.alert('Inbox pridaný', 'Teraz môžete spustiť demo sync.')
    } catch (error) {
      Alert.alert('Inbox sa nepodarilo vytvoriť', error instanceof Error ? error.message : 'Skúste to znova.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleSync(inboxId?: string) {
    if (!user || !sessionToken) return

    setSyncing(true)
    try {
      const payload = await syncInboxes(savedApiBaseUrl, sessionToken, user.id, inboxId)
      await loadWorkspace(savedApiBaseUrl, sessionToken, user)
      Alert.alert(
        'Sync dokončený',
        `Inboxy: ${payload.summary.syncedInboxes}\nNové incidenty: ${payload.summary.created}\nRizikové: ${payload.summary.risky}`
      )
    } catch (error) {
      Alert.alert('Sync zlyhal', error instanceof Error ? error.message : 'Skúste to znova.')
    } finally {
      setSyncing(false)
    }
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#0f766e" />
        <Text style={styles.mutedText}>Pripravujem TrustStep mobile workspace…</Text>
      </SafeAreaView>
    )
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.authContainer}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>TrustStep Mobile</Text>
            <Text style={styles.heroTitle}>Natívna vrstva pre screenshoty, linky a inbox incidenty.</Text>
            <Text style={styles.heroText}>
              Prihlásite sa na ten istý účet ako na webe a uvidíte rovnaké incidenty aj demo inbox sync.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.segment}>
              {(['register', 'login'] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setMode(value)}
                  style={[styles.segmentButton, mode === value && styles.segmentButtonActive]}
                >
                  <Text style={[styles.segmentLabel, mode === value && styles.segmentLabelActive]}>
                    {value === 'register' ? 'Registrácia' : 'Prihlásenie'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Backend URL</Text>
            <TextInput
              value={apiBaseUrl}
              onChangeText={setApiBaseUrl}
              autoCapitalize="none"
              style={styles.input}
              placeholder="http://192.168.1.228:3000"
            />

            <Text style={styles.label}>E-mail</Text>
            <TextInput
              value={authEmail}
              onChangeText={setAuthEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholder="ty@firma.sk"
            />

            <Text style={styles.label}>Heslo</Text>
            <TextInput
              value={authPassword}
              onChangeText={setAuthPassword}
              secureTextEntry
              style={styles.input}
              placeholder="Aspoň 6 znakov"
            />

            <Pressable style={styles.primaryButton} onPress={handleAuthSubmit} disabled={authLoading}>
              {authLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{mode === 'register' ? 'Vytvoriť účet' : 'Prihlásiť sa'}</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>TrustStep</Text>
          <Text style={styles.topTitle}>{user.email}</Text>
        </View>
        {loadingWorkspace ? <ActivityIndicator color="#0f766e" /> : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'dashboard' && (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>High</Text>
                <Text style={styles.statValue}>{summary.high}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Medium</Text>
                <Text style={styles.statValue}>{summary.medium}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Analyzované</Text>
                <Text style={styles.statValue}>{summary.total}</Text>
              </View>
            </View>

            {analysisResult ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Posledný výsledok</Text>
                <View style={[styles.badge, riskColor(analysisResult.riskLevel)]}>
                  <Text style={styles.badgeText}>{analysisResult.riskLevel.toUpperCase()}</Text>
                </View>
                <Text style={styles.recommendation}>{analysisResult.recommendation}</Text>
                {analysisResult.reasons.map((reason) => (
                  <Text key={reason} style={styles.reasonItem}>• {reason}</Text>
                ))}
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Najnovšie incidenty</Text>
              {requests.length === 0 ? (
                <Text style={styles.emptyText}>Zatiaľ tu nič nie je. Spustite analýzu alebo demo inbox sync.</Text>
              ) : (
                requests.slice(0, 10).map((request) => (
                  <View key={request.id} style={styles.listItem}>
                    <View style={styles.listHeader}>
                      <Text style={styles.listTitle}>{request.source.toUpperCase()}</Text>
                      <View style={[styles.badge, riskColor(request.risk_level)]}>
                        <Text style={styles.badgeText}>{request.risk_level.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.listMeta}>{prettyDate(request.created_at)} · {request.submitted_by}</Text>
                    <Text style={styles.listBody} numberOfLines={3}>{request.text}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {tab === 'analyze' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Text alebo e-mail</Text>
              <TextInput
                value={textToAnalyze}
                onChangeText={setTextToAnalyze}
                multiline
                style={[styles.input, styles.textarea]}
                placeholder="Vlož podozrivý e-mail, SMS alebo chat."
              />
              <Pressable style={styles.primaryButton} onPress={runTextAnalysis} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Analyzovať text</Text>}
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>URL a landing page</Text>
              <TextInput
                value={urlToAnalyze}
                onChangeText={setUrlToAnalyze}
                autoCapitalize="none"
                style={styles.input}
                placeholder="https://podozrivy-web.sk"
              />
              <Pressable style={styles.primaryButton} onPress={runUrlAnalysis} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Analyzovať link</Text>}
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Screenshot z galérie</Text>
              <Pressable style={styles.secondaryButton} onPress={pickImage}>
                <Text style={styles.secondaryButtonText}>Vybrať screenshot</Text>
              </Pressable>
              {selectedImage ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                  <Text style={styles.listMeta}>{selectedImage.fileName}</Text>
                </View>
              ) : null}
              <Pressable style={styles.primaryButton} onPress={runImageAnalysis} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Analyzovať screenshot</Text>}
              </Pressable>
            </View>
          </>
        )}

        {tab === 'inboxes' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pridať demo inbox</Text>
              <Text style={styles.label}>Provider</Text>
              <View style={styles.segment}>
                {(['gmail', 'outlook', 'imap'] as const).map((provider) => (
                  <Pressable
                    key={provider}
                    onPress={() => setInboxProvider(provider)}
                    style={[styles.segmentButton, inboxProvider === provider && styles.segmentButtonActive]}
                  >
                    <Text style={[styles.segmentLabel, inboxProvider === provider && styles.segmentLabelActive]}>
                      {provider.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Inbox e-mail</Text>
              <TextInput
                value={inboxEmail}
                onChangeText={setInboxEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                placeholder="finance@firma.sk"
              />
              <Pressable style={styles.primaryButton} onPress={handleCreateInbox} disabled={syncing}>
                {syncing ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Pridať inbox</Text>}
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => handleSync()} disabled={syncing}>
                <Text style={styles.secondaryButtonText}>Spustiť sync všetkých inboxov</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pripojené inboxy</Text>
              {inboxes.length === 0 ? (
                <Text style={styles.emptyText}>Zatiaľ žiadny inbox. Pridajte demo Gmail, Outlook alebo IMAP schránku.</Text>
              ) : (
                inboxes.map((inbox) => (
                  <View key={inbox.id} style={styles.listItem}>
                    <View style={styles.listHeader}>
                      <Text style={styles.listTitle}>{inbox.email_address}</Text>
                      <Text style={styles.statusPill}>{inbox.status}</Text>
                    </View>
                    <Text style={styles.listMeta}>{inbox.provider.toUpperCase()} · {inbox.scan_mode}</Text>
                    <Text style={styles.listMeta}>
                      {inbox.last_checked_at ? `Posledný sync ${prettyDate(inbox.last_checked_at)}` : 'Ešte nebol syncnutý'}
                    </Text>
                    <Pressable style={styles.secondaryButton} onPress={() => handleSync(inbox.id)} disabled={syncing}>
                      <Text style={styles.secondaryButtonText}>Syncnúť tento inbox</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {tab === 'account' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Účet a backend</Text>
            <Text style={styles.listMeta}>Prihlásený účet: {user.email}</Text>
            <Text style={styles.label}>API base URL</Text>
            <TextInput
              value={apiBaseUrl}
              onChangeText={setApiBaseUrl}
              autoCapitalize="none"
              style={styles.input}
              placeholder="http://192.168.1.228:3000"
            />
            <Pressable style={styles.secondaryButton} onPress={saveApiBaseUrl}>
              <Text style={styles.secondaryButtonText}>Uložiť backend URL</Text>
            </Pressable>
            <Text style={styles.listMeta}>Aktívne: {savedApiBaseUrl}</Text>
            <Pressable style={styles.dangerButton} onPress={handleLogout}>
              <Text style={styles.primaryButtonText}>Odhlásiť sa</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View style={styles.tabBar}>
        {([
          ['dashboard', 'Prehľad'],
          ['analyze', 'Overiť'],
          ['inboxes', 'Inboxy'],
          ['account', 'Účet'],
        ] as Array<[TabKey, string]>).map(([value, label]) => (
          <Pressable key={value} onPress={() => setTab(value)} style={styles.tabButton}>
            <Text style={[styles.tabLabel, tab === value && styles.tabLabelActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f3f8f7',
  },
  centeredScreen: {
    flex: 1,
    backgroundColor: '#f3f8f7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  authContainer: {
    padding: 20,
    gap: 18,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#0f766e',
    borderRadius: 28,
    padding: 24,
    gap: 10,
  },
  eyebrow: {
    color: '#99f6e4',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  heroText: {
    color: '#d1fae5',
    fontSize: 15,
    lineHeight: 22,
  },
  topTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  label: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 18,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: 18,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#99f6e4',
    backgroundColor: '#ecfeff',
  },
  secondaryButtonText: {
    color: '#115e59',
    fontSize: 15,
    fontWeight: '800',
  },
  dangerButton: {
    backgroundColor: '#dc2626',
    borderRadius: 18,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    gap: 8,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '900',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  riskHigh: {
    backgroundColor: '#dc2626',
  },
  riskMedium: {
    backgroundColor: '#d97706',
  },
  riskLow: {
    backgroundColor: '#0f766e',
  },
  recommendation: {
    color: '#0f172a',
    fontSize: 15,
    lineHeight: 22,
  },
  reasonItem: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
  },
  listItem: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    gap: 6,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  listTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  listMeta: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
  listBody: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
  },
  imagePreviewWrap: {
    gap: 8,
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  segment: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#0f766e',
  },
  segmentLabel: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  segmentLabelActive: {
    color: '#ffffff',
  },
  statusPill: {
    color: '#115e59',
    backgroundColor: '#ccfbf1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
  },
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 8,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '800',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  mutedText: {
    color: '#475569',
    fontSize: 14,
  },
})
