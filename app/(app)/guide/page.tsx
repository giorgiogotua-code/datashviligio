"use client"

import { useState, useMemo } from 'react'
import {
  Search, ChevronDown, Rocket, Package, ShoppingCart, Truck, BarChart2,
  Wrench, Settings, Smartphone, Lightbulb, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = { text: string; sub?: string }
type Section = {
  id: string
  icon: React.ElementType
  title: string
  gradient: string
  intro: string
  steps?: Step[]
  tips?: string[]
}

const SECTIONS: Section[] = [
  {
    id: 'start',
    icon: Rocket,
    title: 'სწრაფი დაწყება',
    gradient: 'from-primary to-indigo-600',
    intro: 'პირველი ნაბიჯები ახალი მაღაზიის გასამართად — თანმიმდევრობით.',
    steps: [
      { text: 'პარამეტრებში შეიყვანე კომპანიის სახელი და საიდენტიფიკაციო კოდი', sub: 'გამოჩნდება ქვითრებზე' },
      { text: 'საწყობში შექმენი კატეგორიები (მაგ. „ქეისები", „დამტენები")' },
      { text: 'დაამატე პროდუქცია — ხელით ან Excel-ით (ფოტოებთან ერთად)' },
      { text: 'მომწოდებლების სექციაში დაამატე მომწოდებლები და გააფორმე შესყიდვები' },
      { text: 'POS სალაროზე დაიწყე გაყიდვა — დაასკანერე ან დააკლიკე პროდუქტს' },
    ],
  },
  {
    id: 'warehouse',
    icon: Package,
    title: 'საწყობი',
    gradient: 'from-blue-500 to-indigo-600',
    intro: 'პროდუქციისა და კატეგორიების მართვა — მთელი მარაგის გული.',
    steps: [
      { text: 'მარცხნივ კატეგორიების ხეა — „+"-ით ამატებ მთავარ კატეგორიას', sub: 'მაუსის გადატანისას გამოჩნდება ქვეკატეგორიის/რედაქტირების/წაშლის ღილაკები' },
      { text: '„დამატება" ღილაკით ქმნი ახალ პროდუქტს — სახელი, შტრიხკოდი, ფასები, რაოდენობა, ფოტო' },
      { text: 'შტრიხკოდის ველში სკანერით თუ დაასკანერებ — არსებული პროდუქტი გაიხსნება, ახალი კი დასამატებლად მოგთხოვს' },
      { text: 'ფოტო ავტომატურად იკუმშება და იტვირთება ღრუბელში (R2)' },
    ],
    tips: [
      'Excel-ით ბევრი პროდუქტის ერთად დასამატებლად: ჩამოტვირთე შაბლონი (⬇️), შეავსე, და „იმპორტი"-ში აირჩიე Excel + ფოტოები.',
      'ფოტოს Excel-ში დასაკავშირებლად: „ფოტოს ფაილი" სვეტში მიუთითე ფაილის სახელი (მაგ. cable.jpg), ან დატოვე ცარიელი და barcode-ით დაემთხვევა.',
    ],
  },
  {
    id: 'pos',
    icon: ShoppingCart,
    title: 'POS სალარო',
    gradient: 'from-violet-500 to-purple-600',
    intro: 'ყოველდღიური გაყიდვების ადგილი — სწრაფი და მარტივი.',
    steps: [
      { text: 'პროდუქტზე დაკლიკებით ან შტრიხკოდის სკანერით ამატებ კალათაში' },
      { text: 'კალათაში არეგულირებ რაოდენობას „+ / −" ღილაკებით' },
      { text: 'ფასდაკლება: ₾/% გადამრთველი და ველი — ჯამი ავტომატურად გადაითვლება' },
      { text: 'აირჩიე გადახდის ტიპი (ნაღდი/ბარათი) და საჭიროებისას ჩართე ფისკალური ჩეკი' },
      { text: '„გაყიდვა" — დასტურის შემდეგ გამოვა ქვითარი ბეჭდვისთვის' },
    ],
    tips: [
      'გადადება (Hold): თუ კლიენტმა გადახდა გადადო — დააჭირე „გადადება", კალათა ღრუბელში შეინახება და მერე „გადადებული კალათები"-დან დააბრუნებ.',
      'მარაგზე მეტს ვერ გაყიდი — სისტემა დაგიბლოკავს (მაგ. 1 ცალია, 2-ს ვერ ჩაწერ).',
      'ფოტოზე ყოველთვის ჩანს მარაგი — „5 ცალი", „10 ცალი" და ა.შ.',
    ],
  },
  {
    id: 'suppliers',
    icon: Truck,
    title: 'მომწოდებლები',
    gradient: 'from-cyan-500 to-blue-600',
    intro: 'მომწოდებლები, შესყიდვები და ვალის თვალყური.',
    steps: [
      { text: '„+ მომწოდებელი" — დაამატე სახელით, ტელეფონით, საკონტაქტოთი' },
      { text: '„ახალი შესყიდვა" — აირჩიე მომწოდებელი, დაასკანერე ან მოძებნე პროდუქტი, მიუთითე რაოდენობა და თვითღირებულება' },
      { text: '„გადახდილი" ველში მიუთითე რამდენი გადაიხადე — დანარჩენი ვალში ჩაიწერება' },
      { text: 'შესყიდვისას მარაგი იზრდება და თვითღირებულება ნახლდება ავტომატურად' },
      { text: '„გადახდა" — როცა მომწოდებელს უხდი, ვალი მცირდება' },
    ],
    tips: [
      'შესყიდვის ფანჯარაში სკანერი მუშაობს — დაასკანერე და პროდუქტი თავად ჩაჯდება.',
      'თითო მომწოდებელზე ხედავ შესყიდვებისა და გადახდების სრულ ისტორიას.',
    ],
  },
  {
    id: 'accounting',
    icon: BarChart2,
    title: 'ბუღალტერია',
    gradient: 'from-emerald-500 to-teal-600',
    intro: 'გაყიდვების ისტორია, ანალიტიკა და დაბრუნებები.',
    steps: [
      { text: 'ნახე გაყიდვების სია გადახდის ტიპის ფილტრით (ყველა/ნაღდი/ბარათი)' },
      { text: 'დაბრუნება/რეფანდი — გახსენი გაყიდვა და გააფორმე დაბრუნება, მარაგი აღდგება' },
    ],
    tips: ['დაბრუნებები ავტომატურად აკლდება შემოსავალს ანგარიშებში.'],
  },
  {
    id: 'tools',
    icon: Wrench,
    title: 'ხელსაწყოები',
    gradient: 'from-orange-500 to-amber-600',
    intro: 'ფოტოების ოპტიმიზატორი — დააპატარავე ფოტოები ატვირთვამდე.',
    steps: [
      { text: 'ჩააგდე ან აირჩიე ფოტოები' },
      { text: '„მთლიანი ოპტიმიზაცია" — ფოტოები შეიკუმშება ხარისხის შენარჩუნებით' },
      { text: '„ჩამოტვირთე ZIP" — ყველა შეკუმშული ფოტო ერთ არქივში' },
    ],
  },
  {
    id: 'settings',
    icon: Settings,
    title: 'პარამეტრები',
    gradient: 'from-slate-500 to-slate-700',
    intro: 'კომპანიის ინფორმაცია და უსაფრთხოება.',
    steps: [
      { text: 'შეიყვანე კომპანიის სახელი, საიდენტიფიკაციო კოდი, ტელეფონი, მისამართი' },
      { text: 'PIN კოდი — სისტემის სწრაფი ჩაკეტვისთვის (ცალკეა ნამდვილი ლოგინისგან)' },
    ],
    tips: ['ჩაკეტვის ღილაკი 🔒 ზედა პანელშია — დააჭირე და სისტემა PIN-ით დაიკეტება.'],
  },
  {
    id: 'pwa',
    icon: Smartphone,
    title: 'აპლიკაცია (ტელეფონზე/კომპიუტერზე)',
    gradient: 'from-pink-500 to-rose-600',
    intro: 'სისტემა აპლიკაციად დაყენდება — ცალკე აიქონით, ბრაუზერის ზოლების გარეშე.',
    steps: [
      { text: 'Android (Chrome): მენიუ ⋮ → „Add to Home screen"' },
      { text: 'iPhone (Safari): Share ⬆️ → „Add to Home Screen"' },
      { text: 'კომპიუტერი (Chrome): მისამართის ზოლში დააჭირე install აიქონს ⊕' },
    ],
  },
]

function GuideCard({ section, open, onToggle }: { section: Section; open: boolean; onToggle: () => void }) {
  const Icon = section.icon
  return (
    <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3.5 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
        <div className={cn('size-11 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-md shrink-0', section.gradient)}>
          <Icon className="size-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-black text-foreground">{section.title}</h3>
          <p className="text-xs text-muted-foreground truncate">{section.intro}</p>
        </div>
        <ChevronDown className={cn('size-5 text-muted-foreground transition-transform duration-300 shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 animate-fade-up">
          {section.steps && (
            <ol className="flex flex-col gap-2.5 mb-3">
              {section.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="size-6 rounded-lg bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm text-foreground leading-relaxed">{s.text}</p>
                    {s.sub && <p className="text-[12px] text-muted-foreground mt-0.5">{s.sub}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {section.tips && section.tips.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              {section.tips.map((t, i) => (
                <div key={i} className="flex gap-2.5 bg-amber-50/70 border border-amber-100 rounded-xl px-3.5 py-2.5">
                  <Lightbulb className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-amber-900/80 leading-relaxed">{t}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function GuidePage() {
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>('start')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return SECTIONS
    return SECTIONS.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.intro.toLowerCase().includes(q) ||
      (s.steps ?? []).some(st => st.text.toLowerCase().includes(q)) ||
      (s.tips ?? []).some(t => t.toLowerCase().includes(q))
    )
  }, [search])

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5 animate-fade-up pb-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-indigo-700 p-6 text-white shadow-xl shadow-primary/25">
        <div className="absolute -top-8 -right-8 size-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 ring-1 ring-white/30">
            <Rocket className="size-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">სახელმძღვანელო</h1>
            <p className="text-sm text-white/80 mt-1">სად რა მოდულია და როგორ მოიქცე — ნაბიჯ-ნაბიჯ</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={'მოძებნე თემა — მაგ. ფასდაკლება, იმპორტი, ვალი...'}
          className="w-full h-12 pl-12 pr-4 text-sm bg-white border border-border rounded-2xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="size-10 mx-auto opacity-20 mb-3" />
            <p className="text-sm">ვერაფერი მოიძებნა „{search}"-ზე</p>
          </div>
        ) : filtered.map(section => (
          <GuideCard
            key={section.id}
            section={section}
            open={openId === section.id || !!search}
            onToggle={() => setOpenId(prev => prev === section.id ? null : section.id)}
          />
        ))}
      </div>

      {/* Footer note */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
        <ShieldCheck className="size-3.5" />
        <span>AccessoryShop POS · სახელმძღვანელო</span>
      </div>
    </div>
  )
}
