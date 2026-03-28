// @ts-nocheck
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { PageLoader } from '../../components/ui/Spinner'

type CbEffect = { piece: number; name: string; min: string; max: string }
type CbFlavor = { piece: number; text: string }

type Crimebrand = {
  id: string
  name: string
  slug: string
  rank: string
  icon_url: string | null
  artwork_url: string | null
  source: string | null
  unreleased: boolean
  effects: CbEffect[]
  set_bonus: string | null
  note: string | null
  flavor_texts: CbFlavor[]
  recommended_char_ids: string[] | null
}

type RelatedChar = {
  id: string
  name: string
  slug: string
  portrait_url: string | null
}

const RANK_COLORS: Record<string, string> = {
  S: '#FFD700',
  A: '#C084FC',
  B: '#60A5FA',
}

const PIECE_LABEL = ['I', 'II', 'III']

export function CrimebrandDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [cb, setCb] = useState<Crimebrand | null>(null)
  const [loading, setLoading] = useState(true)
  const [relatedChars, setRelatedChars] = useState<RelatedChar[]>([])

  useEffect(() => {
    if (!slug) return
    supabase
      .from('crimebrands')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        setCb(data || null)
        setLoading(false)
      })
  }, [slug])

  // Fetch recommended characters
  useEffect(() => {
    if (!cb?.recommended_char_ids?.length) return
    supabase
      .from('characters')
      .select('id,name,slug,portrait_url')
      .in('id', cb.recommended_char_ids)
      .order('name')
      .then(({ data }) => setRelatedChars(data || []))
  }, [cb?.id])

  if (loading) return <PageLoader />

  if (!cb) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-ptn-muted mb-4">ไม่พบ Crimebrand นี้</p>
        <Link to="/crimebrands" className="text-ptn-cyan hover:underline text-sm">← กลับหน้า Crimebrands</Link>
      </div>
    )
  }

  const effects: CbEffect[] = Array.isArray(cb.effects) ? cb.effects : []
  const flavors: CbFlavor[] = Array.isArray(cb.flavor_texts) ? cb.flavor_texts : []
  const rankColor = RANK_COLORS[cb.rank] || '#ffffff'

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* Back */}
      <Link to="/crimebrands" className="inline-flex items-center gap-1.5 text-sm text-ptn-muted hover:text-ptn-text transition-colors mb-6">
        <ChevronLeft size={16} />
        กลับหน้า Crimebrands
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ---- Left Panel ---- */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-ptn-border bg-ptn-elevated">
              {cb.icon_url ? (
                <img src={cb.icon_url} alt={cb.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ptn-disabled">?</div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-heading text-3xl font-bold text-ptn-text">{cb.name}</h1>
                {cb.unreleased && (
                  <span className="text-xs font-bold border border-ptn-muted text-ptn-muted px-2 py-0.5 rounded">UNRELEASED</span>
                )}
              </div>
              {cb.source && (
                <p className="text-sm text-ptn-muted mt-1">
                  <span className="text-ptn-disabled text-xs uppercase tracking-wider mr-1.5">Source</span>
                  {cb.source}
                </p>
              )}
            </div>

            {/* Rank */}
            <div
              className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-heading font-bold text-xl border"
              style={{ color: rankColor, borderColor: `${rankColor}50`, background: `${rankColor}15` }}
            >
              {cb.rank}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-ptn-border" />

          {/* Effects Table */}
          <div>
            <table className="w-full text-sm">
              <tbody>
                {[1, 2, 3].map(piece => {
                  const eff = effects.find(e => e.piece === piece)
                  const label = PIECE_LABEL[piece - 1]
                  const name = eff?.name || '-'
                  const min  = eff?.min  || '-'
                  const max  = eff?.max  || '-'
                  const hasEffect = name !== '-'
                  return (
                    <tr key={piece} className="border-b border-ptn-border/40 last:border-0">
                      <td className="py-3 pr-4 w-8">
                        <span className="font-heading font-bold text-ptn-muted text-sm">{label}</span>
                      </td>
                      <td className="py-3 pr-4 text-ptn-text flex-1">
                        {hasEffect ? name : <span className="text-ptn-disabled">-</span>}
                      </td>
                      <td className="py-3 pr-2 text-right text-ptn-muted font-mono text-xs w-16">
                        {hasEffect ? min : '-'}
                      </td>
                      <td className="py-3 px-2 text-ptn-disabled text-center w-6">
                        {hasEffect ? '→' : ''}
                      </td>
                      <td className="py-3 pl-2 text-left font-mono text-xs w-16" style={{ color: hasEffect ? rankColor : 'inherit' }}>
                        {hasEffect ? max : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Set Bonus */}
          {cb.set_bonus && (
            <div className="rounded-lg border border-ptn-border bg-ptn-elevated/50 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-ptn-disabled mb-2">Set Bonus</p>
              <p className="text-sm text-ptn-text leading-relaxed">{cb.set_bonus}</p>
            </div>
          )}

          {/* Note */}
          {cb.note && (
            <div className="rounded-lg border-l-2 border border-ptn-red/40 bg-ptn-elevated/50 p-4" style={{ borderLeftColor: rankColor }}>
              <p className="text-xs font-bold uppercase tracking-widest text-ptn-disabled mb-2">Note</p>
              <p className="text-sm text-ptn-muted leading-relaxed">{cb.note}</p>
            </div>
          )}

          {/* Flavor Texts */}
          {flavors.length > 0 && (
            <div className="rounded-lg border border-ptn-border bg-ptn-elevated/50 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-ptn-disabled mb-3">Flavor Text</p>
              <div className="space-y-2">
                {flavors.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="shrink-0 font-heading font-bold text-ptn-muted text-sm w-6">
                      {PIECE_LABEL[f.piece - 1] || f.piece}
                    </span>
                    <p className="text-sm text-ptn-muted italic leading-relaxed">{f.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Characters */}
          {relatedChars.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-ptn-disabled mb-3">
                ตัวละครที่แนะนำ
                <span className="ml-2 font-normal normal-case text-ptn-border">({relatedChars.length})</span>
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {relatedChars.map(char => (
                  <Link
                    key={char.id}
                    to={`/characters/${char.slug}`}
                    className="group flex flex-col items-center gap-1"
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden border border-ptn-border bg-ptn-elevated group-hover:border-ptn-red/50 transition-colors">
                      {char.portrait_url ? (
                        <img
                          src={char.portrait_url}
                          alt={char.name}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ptn-disabled text-xs">
                          {char.name[0]}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-ptn-muted text-center leading-tight group-hover:text-ptn-text transition-colors line-clamp-2">
                      {char.name}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---- Right Panel: Artwork ---- */}
        {cb.artwork_url && (
          <div className="lg:w-80 xl:w-96 shrink-0">
            <div className="sticky top-6 rounded-xl overflow-hidden border border-ptn-border bg-ptn-elevated">
              <img
                src={cb.artwork_url}
                alt={cb.name}
                className="w-full object-cover"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
