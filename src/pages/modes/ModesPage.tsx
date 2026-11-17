import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Compass } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { hasCnInfo } from '../../lib/gameModes'
import type { GameModeRow } from '../../types'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { ModeStatusBadges, SeasonBadge } from './ModeParts'

/** หน้ารวมไกด์โหมด — ข้อมูล Global เช็กในเกมเอง + สรุปจากผู้เล่นเซิร์ฟจีนพร้อมเครดิต */
export function ModesPage() {
  const [modes, setModes] = useState<GameModeRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase.from('game_modes').select('*').order('sort_order').order('name')
      .then(({ data, error }) => {
        if (cancelled) return
        // ยังไม่ได้รัน migration / โหลดไม่ได้ → แสดงหน้าว่าง ไม่ทำให้หน้าพัง
        setModes(error ? [] : (data || []) as GameModeRow[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  if (loading) return <PageLoader />

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-ptn-text flex items-center gap-3">
          <Compass size={28} className="text-ptn-red" />
          ไกด์โหมด
        </h1>
        <p className="mt-1 text-ptn-muted">
          วิธีเล่นและข้อมูลรอบปัจจุบันของแต่ละโหมด ชื่อและข้อมูลเซิร์ฟ Global เช็กในเกมเอง เสริมด้วยสรุปจากผู้เล่นเซิร์ฟจีน พร้อมเครดิตและลิงก์ต้นฉบับ
        </p>
      </div>

      {modes.length === 0 ? (
        <Card className="p-8 text-center text-ptn-muted">ยังไม่มีไกด์โหมด</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {modes.map((m, i) => (
            <Link key={m.id} to={`/modes/${m.slug}`}>
              <Card hover className="flex h-full items-center gap-4 p-4">
                <span className="hidden font-heading text-4xl font-bold italic text-transparent [-webkit-text-stroke:1px_rgba(239,68,68,.7)] sm:block">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {m.tag && <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-ptn-muted">{m.tag}</p>}
                  <h2 className="font-heading text-xl font-bold italic text-ptn-text">{m.name}</h2>
                  {m.global_menu && <p className="font-mono text-[11px] uppercase text-ptn-disabled">อยู่ใน {m.global_menu}</p>}
                  {m.summary && <p className="text-sm text-ptn-muted line-clamp-3">{m.summary}</p>}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <ModeStatusBadges mode={m} />
                    <SeasonBadge mode={m} />
                    {hasCnInfo(m) && <span className="rounded border border-ptn-border bg-ptn-elevated px-2 py-0.5 text-xs text-ptn-muted">+ ข้อมูลเซิร์ฟจีน</span>}
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-ptn-muted" />
              </Card>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-ptn-disabled">
        ข้อมูลจากเซิร์ฟจีนสรุปโดยทีม Project Duck ไม่ใช่คำแปลทั้งบท อ่านรายละเอียดเต็มที่ลิงก์ต้นฉบับ · ข้อมูลเซิร์ฟจีนอาจมาก่อนหรือต่างจากเซิร์ฟ Global
      </p>
    </div>
  )
}
