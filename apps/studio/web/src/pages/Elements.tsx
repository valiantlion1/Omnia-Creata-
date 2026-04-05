import { Plus } from 'lucide-react'

const styleCards = [
  {
    id: 'dramatic-cinema',
    title: 'Dramatic Cinema',
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'soft-editorial',
    title: 'Soft Editorial',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'product-gloss',
    title: 'Product Gloss',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
  },
]

export default function ElementsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1620px] flex-col gap-6 px-4 py-6 md:px-6">
      <section className="space-y-4">
        <div className="text-[12px] font-medium text-zinc-500">Elements</div>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ background: 'linear-gradient(135deg, #fff 0%, rgb(var(--primary-light)) 60%, rgb(var(--accent)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Styles</h1>
      </section>

      <section className="flex items-center gap-3">
        <button className="rounded-full px-4 py-2 text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' }}>Explore</button>
        <button className="rounded-full bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 ring-1 ring-white/8">My styles</button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex min-h-[360px] flex-col justify-between rounded-[28px] border border-dashed border-white/[0.12] p-5 transition-all duration-300 hover:border-[rgb(var() / )]" style={{ background: 'rgb(var() / )' }}>
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl text-zinc-400 ring-1 ring-white/[0.08]" style={{ background: 'linear-gradient(135deg, rgb(var() / ), rgb(var() / ))' }}>
            <Plus className="h-7 w-7" />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">Create style</div>
          </div>
        </div>

        {styleCards.map((card) => (
          <div key={card.id} className="overflow-hidden rounded-[28px] border border-white/[0.08] transition-all duration-300 hover:border-[rgb(var() / )] hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)]" style={{ background: 'rgb(var() / )' }}>
            <img src={card.image} alt={card.title} className="aspect-[4/5] w-full object-cover" />
            <div className="space-y-1 p-4">
              <div className="text-sm text-zinc-500">Omnia</div>
              <div className="text-xl font-semibold text-white">{card.title}</div>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
