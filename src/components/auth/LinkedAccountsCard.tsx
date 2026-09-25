import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import type { UserIdentity } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { useToast } from '../ui/Toast'
import { ProviderIcon } from './SocialLoginButtons'
import {
  SOCIAL_PROVIDERS, authCallbackUrl, canUnlinkIdentity, providerLabel, type SocialProvider,
} from '../../lib/authRedirect'

const identityName = (identity: UserIdentity): string | null => {
  const data = identity.identity_data ?? {}
  const name = data.email ?? data.user_name ?? data.full_name ?? data.name
  return typeof name === 'string' ? name : null
}

/** การ์ด "บัญชีที่เชื่อมอยู่" ในหน้าตั้งค่า — เชื่อม/ยกเลิกการเชื่อม Discord, Google */
export function LinkedAccountsCard() {
  const { toast } = useToast()
  const [identities, setIdentities] = useState<UserIdentity[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  // เพิ่มค่าเพื่อโหลดรายการใหม่ (หลังยกเลิกการเชื่อม)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    supabase.auth.getUserIdentities().then(({ data, error }) => {
      if (!active) return
      // โหลดไม่ได้ต้องไม่แสดงเป็น "ยังไม่ได้เชื่อม" — ผู้ใช้จะเข้าใจผิดแล้วกดเชื่อมซ้ำ
      setLoadFailed(Boolean(error))
      setIdentities(error ? null : data.identities)
    })
    return () => { active = false }
  }, [reloadKey])

  const handleLink = async (provider: SocialProvider) => {
    setBusy(provider)
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: authCallbackUrl(window.location.origin, '/settings', 'link') },
    })
    // สำเร็จ = กำลังย้ายไปหน้าแพลตฟอร์ม
    if (error) {
      setBusy(null)
      toast(`เชื่อม ${providerLabel(provider)} ไม่สำเร็จ: ${error.message}`, 'error')
    }
  }

  const handleUnlink = async (identity: UserIdentity) => {
    if (!identities || !canUnlinkIdentity(identities)) return
    setBusy(identity.provider)
    const { error } = await supabase.auth.unlinkIdentity(identity)
    setBusy(null)
    if (error) {
      toast('ยกเลิกการเชื่อมไม่สำเร็จ: ' + error.message, 'error')
      return
    }
    toast(`ยกเลิกการเชื่อม ${providerLabel(identity.provider)} แล้ว`, 'success')
    setReloadKey(k => k + 1)
  }

  const unlinkAllowed = identities ? canUnlinkIdentity(identities) : false

  return (
    <Card className="p-6 mb-6">
      <h2 className="font-heading text-lg font-semibold text-ptn-text mb-1 flex items-center gap-2">
        <Link2 size={18} className="text-ptn-cyan" />
        บัญชีที่เชื่อมอยู่
      </h2>
      <p id="linked-accounts-hint" className="text-xs text-ptn-muted mb-4">
        เชื่อมไว้แล้วใช้ล็อกอินเข้าบัญชีนี้ได้ทุกช่องทาง (ต้องเหลืออย่างน้อย 1 ช่องทางเสมอ)
      </p>

      {loadFailed ? (
        <div className="flex flex-col items-center gap-2 py-4 text-sm text-ptn-muted">
          โหลดบัญชีที่เชื่อมอยู่ไม่สำเร็จ
          <Button size="sm" variant="outline" onClick={() => { setLoadFailed(false); setReloadKey(k => k + 1) }}>ลองใหม่</Button>
        </div>
      ) : identities === null ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : (
        <ul className="divide-y divide-ptn-border">
          {SOCIAL_PROVIDERS.map(provider => {
            const identity = identities.find(i => i.provider === provider)
            return (
              <li key={provider} className="flex items-center gap-3 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-ptn-elevated">
                  <ProviderIcon provider={provider} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ptn-text">{providerLabel(provider)}</div>
                  <div className="truncate text-xs text-ptn-muted">
                    {identity ? identityName(identity) ?? 'เชื่อมแล้ว' : 'ยังไม่ได้เชื่อม'}
                  </div>
                </div>
                {identity ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={busy === provider}
                    disabled={busy !== null || !unlinkAllowed}
                    title={unlinkAllowed ? undefined : 'ต้องมีช่องทางล็อกอินอื่นก่อนจึงยกเลิกได้'}
                    aria-describedby="linked-accounts-hint"
                    onClick={() => handleUnlink(identity)}
                  >
                    ยกเลิกการเชื่อม
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={busy === provider}
                    disabled={busy !== null}
                    onClick={() => handleLink(provider)}
                  >
                    เชื่อมบัญชี
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
