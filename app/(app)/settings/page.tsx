"use client"

import { useState } from 'react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Building2, Phone, MapPin, Hash, ShieldCheck,
  Eye, EyeOff, Save, Lock, CheckCircle2, AlertCircle,
} from 'lucide-react'

function Field({
  label, icon: Icon, value, onChange, placeholder, type = 'text', hint,
}: {
  label: string
  icon: React.ElementType
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

export default function SettingsPage() {
  const { settings, updateSettings, pin, setPin } = useStore()

  // Company form state
  const [form, setForm] = useState({
    companyName: settings.companyName,
    companyId: settings.companyId,
    address: settings.address,
    phone: settings.phone,
  })
  const [companySaved, setCompanySaved] = useState(false)

  // PIN form state
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPins, setShowPins] = useState(false)
  const [pinError, setPinError] = useState('')
  const [pinSaved, setPinSaved] = useState(false)

  const handleSaveCompany = () => {
    if (!form.companyName.trim()) return
    updateSettings(form)
    setCompanySaved(true)
    setTimeout(() => setCompanySaved(false), 2500)
  }

  const handleSavePin = () => {
    setPinError('')
    if (currentPin !== pin) { setPinError('მიმდინარე PIN კოდი არასწორია'); return }
    if (!/^\d{4,6}$/.test(newPin)) { setPinError('PIN კოდი უნდა შეიცავდეს 4-6 ციფრს'); return }
    if (newPin !== confirmPin) { setPinError('PIN კოდები არ ემთხვევა'); return }
    setPin(newPin)
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setPinSaved(true)
    setTimeout(() => setPinSaved(false), 2500)
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 animate-fade-up">

      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-foreground">პარამეტრები</h1>
        <p className="text-sm text-muted-foreground mt-1">კომპანიის ინფორმაცია და უსაფრთხოების პარამეტრები</p>
      </div>

      {/* Company card */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-indigo-500/5">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-md shadow-primary/20">
            <Building2 className="size-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">კომპანიის ინფორმაცია</h2>
            <p className="text-[11px] text-muted-foreground">გამოჩნდება ქვითრებზე და ანგარიშებში</p>
          </div>
        </div>

        <div className="px-6 py-6 flex flex-col gap-4">
          <Field
            label="კომპანიის სახელი"
            icon={Building2}
            value={form.companyName}
            onChange={v => setForm(p => ({ ...p, companyName: v }))}
            placeholder="მაგ. AccessoryShop Ltd"
          />
          <Field
            label="საიდენტიფიკაციო კოდი"
            icon={Hash}
            value={form.companyId}
            onChange={v => setForm(p => ({ ...p, companyId: v }))}
            placeholder="მაგ. 205123456"
            hint="9-ნიშნა საიდენტიფიკაციო კოდი"
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="ტელეფონი"
              icon={Phone}
              value={form.phone}
              onChange={v => setForm(p => ({ ...p, phone: v }))}
              placeholder="+995 5XX XXX XXX"
            />
            <Field
              label="მისამართი"
              icon={MapPin}
              value={form.address}
              onChange={v => setForm(p => ({ ...p, address: v }))}
              placeholder="ქ. თბილისი, ..."
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {companySaved && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold animate-fade-in">
                <CheckCircle2 className="size-4" /> შენახულია
              </span>
            )}
            <button
              onClick={handleSaveCompany}
              disabled={!form.companyName.trim()}
              className={cn(
                'ml-auto flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold transition-all duration-200',
                'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md shadow-primary/25',
                'hover:shadow-lg hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0',
                'disabled:opacity-40 disabled:pointer-events-none'
              )}
            >
              <Save className="size-4" />
              შენახვა
            </button>
          </div>
        </div>
      </div>

      {/* PIN card */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-gradient-to-r from-amber-500/5 to-orange-500/5">
          <div className="size-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-400/25">
            <Lock className="size-4.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">PIN კოდი</h2>
            <p className="text-[11px] text-muted-foreground">სისტემის ჩაკეტვა PIN კოდით</p>
          </div>
          <button
            onClick={() => setShowPins(p => !p)}
            className="ml-auto size-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center transition-colors"
          >
            {showPins ? <EyeOff className="size-4 text-muted-foreground" /> : <Eye className="size-4 text-muted-foreground" />}
          </button>
        </div>

        <div className="px-6 py-6 flex flex-col gap-4">
          {/* Current PIN info */}
          <div className="flex items-center gap-3 bg-muted/60 rounded-xl px-4 py-3">
            <ShieldCheck className="size-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              მიმდინარე PIN:{' '}
              <span className="font-mono font-bold text-foreground">
                {showPins ? pin : '••••'}
              </span>
            </p>
          </div>

          {/* PIN inputs */}
          {[
            { label: 'მიმდინარე PIN', val: currentPin, set: setCurrentPin, ph: '••••' },
            { label: 'ახალი PIN (4-6 ციფრი)', val: newPin, set: setNewPin, ph: '••••' },
            { label: 'გაიმეორე ახალი PIN', val: confirmPin, set: setConfirmPin, ph: '••••' },
          ].map(({ label, val, set, ph }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
              <input
                type={showPins ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={val}
                onChange={e => set(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={ph}
                className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm text-foreground font-mono tracking-[0.35em] placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
          ))}

          {pinError && (
            <div className="flex items-center gap-2 text-red-600 text-xs font-medium animate-fade-in bg-red-50 rounded-xl px-3 py-2 border border-red-200">
              <AlertCircle className="size-3.5 shrink-0" />
              {pinError}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {pinSaved && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold animate-fade-in">
                <CheckCircle2 className="size-4" /> PIN კოდი შეიცვალა
              </span>
            )}
            <button
              onClick={handleSavePin}
              disabled={!currentPin || !newPin || !confirmPin}
              className={cn(
                'ml-auto flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold transition-all duration-200',
                'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-400/25',
                'hover:shadow-lg hover:shadow-amber-400/35 hover:-translate-y-0.5 active:translate-y-0',
                'disabled:opacity-40 disabled:pointer-events-none'
              )}
            >
              <ShieldCheck className="size-4" />
              PIN-ის შეცვლა
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
