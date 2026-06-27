"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Mail, Loader2, ShoppingBag, Store, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [shopName, setShopName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentEmail, setSentEmail] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopName.trim() || !email.trim() || !password) {
      toast.error('შეავსეთ ყველა ველი')
      return
    }
    if (password.length < 6) {
      toast.error('პაროლი მინიმუმ 6 სიმბოლო')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { shop_name: shopName.trim() } },
    })
    if (error) {
      toast.error(error.message.includes('already') ? 'ეს ელ-ფოსტა უკვე რეგისტრირებულია' : 'რეგისტრაცია ვერ მოხერხდა')
      setLoading(false)
      return
    }
    // Email confirmation OFF → session is live, go straight in.
    if (data.session) {
      toast.success('მაღაზია შექმნილია! კეთილი იყოს თქვენი მობრძანება')
      router.push('/warehouse')
      router.refresh()
      return
    }
    // Email confirmation ON → ask the user to verify.
    setSentEmail(email.trim())
    setLoading(false)
  }

  if (sentEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-background to-indigo-50/40 p-4">
        <div className="w-full max-w-md text-center bg-white border border-border rounded-[28px] shadow-2xl shadow-black/5 p-8 flex flex-col items-center gap-4">
          <div className="size-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/25">
            <CheckCircle2 className="size-8 text-white" />
          </div>
          <h1 className="text-xl font-black text-foreground">დაადასტურეთ ელ-ფოსტა</h1>
          <p className="text-sm text-muted-foreground">
            გამოგზავნილია დადასტურების ბმული მისამართზე <span className="font-bold text-foreground">{sentEmail}</span>.
            დააჭირეთ ბმულს და შემდეგ შედით სისტემაში.
          </p>
          <Link href="/login" className="text-sm font-bold text-primary hover:underline mt-2">
            შესვლის გვერდზე დაბრუნება →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-background to-indigo-50/40 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="size-16 rounded-3xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-xl shadow-primary/25">
            <ShoppingBag className="size-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-foreground">შექმენი შენი მაღაზია</h1>
            <p className="text-sm text-muted-foreground font-medium">14 დღიანი უფასო საცდელი პერიოდი</p>
          </div>
        </div>

        <form
          onSubmit={handleSignup}
          className="bg-white border border-border rounded-[28px] shadow-2xl shadow-black/5 p-7 md:p-8 flex flex-col gap-5"
        >
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider pl-1">მაღაზიის სახელი</label>
            <div className="relative">
              <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-muted-foreground/60" />
              <Input
                type="text"
                placeholder="ჩემი მაღაზია"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="h-12 rounded-2xl bg-slate-50 border-border/60 pl-11 focus-visible:ring-primary/20"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider pl-1">ელ-ფოსტა</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-muted-foreground/60" />
              <Input
                type="email"
                autoComplete="email"
                placeholder="admin@shop.ge"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-2xl bg-slate-50 border-border/60 pl-11 focus-visible:ring-primary/20"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider pl-1">პაროლი</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-muted-foreground/60" />
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="მინიმუმ 6 სიმბოლო"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-2xl bg-slate-50 border-border/60 pl-11 focus-visible:ring-primary/20"
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 mt-2 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 border-0 shadow-lg shadow-primary/30 font-black text-white text-[15px] hover:scale-[1.01] transition-transform disabled:opacity-70 disabled:hover:scale-100"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : 'მაღაზიის შექმნა'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            უკვე გაქვს ანგარიში?{' '}
            <Link href="/login" className="font-bold text-primary hover:underline">შესვლა</Link>
          </p>
        </form>

        <p className="text-center text-xs text-muted-foreground/70 mt-6">
          © {new Date().getFullYear()} AccessoryShop — ყველა უფლება დაცულია
        </p>
      </div>
    </div>
  )
}
