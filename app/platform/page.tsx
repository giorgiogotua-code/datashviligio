"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, Loader2, Users, Package, Receipt, Ban, Play, LogOut, Building2, ArrowLeft, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type Org = {
  id: string
  name: string
  plan: 'trial' | 'pro' | 'enterprise'
  status: 'active' | 'suspended'
  trial_ends_at: string | null
  created_at: string
  members: number
  products: number
  sales: number
  upgrade_requested: boolean
}

const PLANS: Org['plan'][] = ['trial', 'pro', 'enterprise']
const PLAN_STYLES: Record<Org['plan'], string> = {
  trial: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30',
  pro: 'from-indigo-500/20 to-violet-500/20 text-indigo-300 border-indigo-500/30',
  enterprise: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30',
}

export default function PlatformPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('platform_org_overview')
    if (error) {
      setAuthorized(false)
      setLoading(false)
      return
    }
    setAuthorized(true)
    setOrgs((data ?? []) as Org[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const changePlan = async (id: string, plan: Org['plan']) => {
    setBusy(id)
    // Changing the plan also clears any pending upgrade request.
    setOrgs((prev) => prev.map((o) => (o.id === id ? { ...o, plan, upgrade_requested: false } : o)))
    const { error } = await supabase.from('organizations').update({ plan, upgrade_requested: false }).eq('id', id)
    setBusy(null)
    if (error) { toast.error('გეგმის შეცვლა ვერ მოხერხდა'); load(); return }
    toast.success('გეგმა განახლდა')
  }

  const toggleSuspend = async (org: Org) => {
    const next = org.status === 'active' ? 'suspended' : 'active'
    setBusy(org.id)
    setOrgs((prev) => prev.map((o) => (o.id === org.id ? { ...o, status: next } : o)))
    const { error } = await supabase.from('organizations').update({ status: next }).eq('id', org.id)
    setBusy(null)
    if (error) { toast.error('სტატუსის შეცვლა ვერ მოხერხდა'); load(); return }
    toast.success(next === 'suspended' ? 'მაღაზია შეჩერდა' : 'მაღაზია გააქტიურდა')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="size-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-center p-6">
        <div className="size-16 rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-xl shadow-red-500/25">
          <Ban className="size-8 text-white" />
        </div>
        <h1 className="text-xl font-black text-white">წვდომა აკრძალულია</h1>
        <p className="text-sm text-slate-400 max-w-sm">ეს გვერდი მხოლოდ პლატფორმის ადმინისტრატორებისთვისაა.</p>
        <button onClick={() => router.push('/warehouse')} className="mt-2 h-11 px-6 rounded-2xl bg-white/10 hover:bg-white/15 text-sm font-bold text-white transition-colors flex items-center gap-2">
          <ArrowLeft className="size-4" /> სამუშაო პანელში დაბრუნება
        </button>
      </div>
    )
  }

  const totalSales = orgs.reduce((s, o) => s + o.sales, 0)
  const activeCount = orgs.filter((o) => o.status === 'active').length

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Aurora-ish glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 size-[60vw] rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute -bottom-40 -left-40 size-[50vw] rounded-full bg-violet-600/10 blur-[140px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black leading-tight">პლატფორმის კონსოლი</h1>
              <p className="text-xs text-slate-400 leading-none mt-0.5">God mode · ყველა ორგანიზაცია</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/warehouse')} title="POS-ში დაბრუნება" className="size-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors">
              <Building2 className="size-4.5 text-slate-300" />
            </button>
            <button onClick={signOut} title="გასვლა" className="size-10 rounded-xl bg-white/5 hover:bg-red-500/15 hover:border-red-500/30 border border-white/10 flex items-center justify-center transition-colors">
              <LogOut className="size-4.5 text-slate-300" />
            </button>
          </div>
        </header>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-3 mb-7">
          {[
            { label: 'ორგანიზაციები', value: orgs.length, icon: Building2 },
            { label: 'აქტიური', value: activeCount, icon: Play },
            { label: 'გაყიდვები სულ', value: totalSales, icon: Receipt },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-3">
              <div className="size-9 rounded-xl bg-white/5 flex items-center justify-center"><Icon className="size-4.5 text-indigo-300" /></div>
              <div>
                <p className="text-xl font-black leading-none">{value}</p>
                <p className="text-[11px] text-slate-400 mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Org list */}
        <div className="flex flex-col gap-3">
          {orgs.map((org, i) => (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`rounded-2xl bg-white/5 border p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 ${org.status === 'suspended' ? 'border-red-500/30 bg-red-500/[0.03]' : 'border-white/10'}`}
            >
              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-bold truncate">{org.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-gradient-to-r border ${PLAN_STYLES[org.plan]}`}>
                    {org.plan.toUpperCase()}
                  </span>
                  {org.status === 'suspended' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/15 text-red-300 border border-red-500/30">შეჩერებული</span>
                  )}
                  {org.upgrade_requested && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                      <Bell className="size-3" /> განახლების მოთხოვნა
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-[12px] text-slate-400">
                  <span className="flex items-center gap-1"><Users className="size-3.5" /> {org.members}</span>
                  <span className="flex items-center gap-1"><Package className="size-3.5" /> {org.products}</span>
                  <span className="flex items-center gap-1"><Receipt className="size-3.5" /> {org.sales}</span>
                  {org.plan === 'trial' && org.trial_ends_at && (
                    <span className="hidden sm:inline">· trial: {new Date(org.trial_ends_at).toLocaleDateString('ka-GE')}</span>
                  )}
                  <span className="hidden md:inline">· {new Date(org.created_at).toLocaleDateString('ka-GE')}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={org.plan}
                  disabled={busy === org.id}
                  onChange={(e) => changePlan(org.id, e.target.value as Org['plan'])}
                  className="h-9 rounded-xl bg-white/5 border border-white/10 text-sm px-3 text-white outline-none focus:border-indigo-400/50 disabled:opacity-50 [&>option]:bg-slate-900"
                >
                  {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <button
                  onClick={() => toggleSuspend(org)}
                  disabled={busy === org.id}
                  className={`h-9 px-3 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 border ${
                    org.status === 'active'
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {busy === org.id ? <Loader2 className="size-4 animate-spin" />
                    : org.status === 'active' ? <><Ban className="size-4" /> შეჩერება</>
                    : <><Play className="size-4" /> გააქტიურება</>}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
