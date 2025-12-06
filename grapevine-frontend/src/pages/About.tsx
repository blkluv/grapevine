import { useEffect } from 'react'
import { usePageTitle } from '@/context/PageTitleContext'

export default function About() {
  const { setTitle } = usePageTitle()

  useEffect(() => {
    setTitle('')
  }, [setTitle])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="flex flex-col items-center gap-4">
        <div className="px-8 py-4 bg-[#8B5CF6] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="font-mono text-2xl font-black tracking-tight text-center uppercase md:text-4xl">
            5DTOK
          </h1>
          <p className="mt-1 font-mono text-lg font-bold text-center md:text-xl">
            Where Consciousness Meets Expression
          </p>
        </div>
        <div className="px-6 py-3 bg-[#10B981] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-mono text-base font-bold text-center md:text-lg">
            Share your truth. Value your wisdom. Connect through authentic expression.
          </p>
        </div>
      </div>

      {/* The Question */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-mono text-base font-bold text-center py-3 bg-[#FBBF24] border-2 border-black mb-4 inline-block w-full">
          Do you ever feel your truth deserves to be valued?
        </p>
        <p className="mb-4 font-mono text-base leading-relaxed">
          We live in a world overflowing with content, but much of it lacks depth, authenticity, and spiritual resonance. Your unique perspective—your intuitive downloads, healing insights, artistic expressions, and personal truths—holds immense value.
        </p>
        <p className="font-mono text-base font-bold leading-relaxed">
          That is why we created 5DTOK.
        </p>
      </div>

      {/* What is 5DTOK */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <p className="mb-4 font-mono text-base leading-relaxed">
          5DTOK is more than a platform—it's a multidimensional space where consciousness, creativity, and community converge. 
          <span className="font-bold"> 5D </span> represents the fifth dimension: a state of unity consciousness where intuition, creativity, and spiritual awareness flow freely.
          <span className="font-bold"> TOK </span> stands for Token + Talk + Tock—your wisdom as value, your voice as currency, your timing as rhythm.
        </p>
        <p className="font-mono text-base leading-relaxed">
          Here, numerology meets expression: <span className="font-bold">5</span> symbolizes freedom, truth, and raw authenticity—the essence of what we're building together.
        </p>
      </div>

      {/* The 5D Concept */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#8B5CF6] border-2 border-black mb-4">
          <h3 className="font-mono text-lg font-black uppercase">The 5D Reality</h3>
        </div>
        <p className="mb-4 font-mono text-base leading-relaxed">
          In the 5th dimension, separation dissolves. Technology and spirituality merge. Intuition becomes data. Your inner wisdom finds outer expression. 5DTOK is built on this principle: that your spiritual insights, healing practices, artistic creations, and personal truths deserve a space where they can be shared, valued, and exchanged.
        </p>
        <p className="p-3 font-mono text-base font-bold leading-relaxed bg-purple-100 border-2 border-black">
          This is where your consciousness becomes content, and your content becomes connection.
        </p>
      </div>

      {/* Our Categories = Your Expressions */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#10B981] border-2 border-black mb-4">
          <h3 className="font-mono text-lg font-black uppercase">Your Channels of Expression</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-3">
          {[
            { name: 'food', desc: 'Nourishment as medicine, recipes as rituals' },
            { name: 'healxyz', desc: 'Holistic healing, energy work, wellness wisdom' },
            { name: 'musik', desc: 'Sound healing, frequency medicine, soul expression' },
            { name: 'sex', desc: 'Sacred intimacy, relationship alchemy' },
            { name: 'magic', desc: 'Mysticism, ritual, spiritual practices' },
            { name: 'reviews', desc: 'Authentic experiences, trusted recommendations' },
            { name: 'truth', desc: 'Personal revelations, philosophical insights' },
            { name: 'money', desc: 'Conscious finance, abundance mindset' },
            { name: 'relationships', desc: 'Soul connections, community building' }
          ].map((cat, i) => (
            <div key={i} className="p-3 border-2 border-black bg-gray-50">
              <div className="mb-1 font-mono text-sm font-bold text-center uppercase">{cat.name}</div>
              <div className="font-mono text-xs text-center">{cat.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feeds */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#F59E0B] border-2 border-black mb-4">
          <h3 className="font-mono text-lg font-black uppercase">Your Sacred Space</h3>
        </div>
        <p className="font-mono text-base leading-relaxed">
          Create your own channel—a sacred space for your unique expressions. Whether you're sharing healing modalities, spiritual insights, artistic creations, or personal truths, your space is yours to design. You decide what resonates, what heals, what inspires.
        </p>
      </div>

      {/* Entries */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#F59E0B] border-2 border-black mb-4">
          <h3 className="font-mono text-lg font-black uppercase">Your Wisdom Drops</h3>
        </div>
        <p className="font-mono text-base leading-relaxed">
          Each piece of content is a wisdom drop—a meditation recording, a healing frequency, a sacred recipe, a truth revelation. These aren't just files or text; they're energy transmissions. If your wisdom resonates with someone, they can exchange energy for it through a simple, respectful transaction.
        </p>
      </div>

      {/* Energy Exchange */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#F59E0B] border-2 border-black mb-4">
          <h3 className="font-mono text-lg font-black uppercase">Conscious Exchange</h3>
        </div>
        <p className="font-mono text-base leading-relaxed">
          In 5D consciousness, energy flows where attention goes. When someone values your wisdom enough to exchange energy for it, that's sacred commerce. No complicated setups. No middlemen. Just direct, respectful exchange between creator and receiver. Your wallet becomes your temple offering box.
        </p>
      </div>

      {/* What 5DTOK Enables Header */}
      <div className="bg-[#8B5CF6] border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="font-mono text-xl font-black text-center uppercase md:text-2xl">
          What You Can Create With 5DTOK
        </h2>
      </div>

      {/* Use Case 1 */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#FBBF24] border-2 border-black mb-4">
          <h3 className="font-mono text-base font-black uppercase">1. Your Spiritual Practice, Shared</h3>
        </div>
        <p className="mb-4 font-mono text-base leading-relaxed">
          Share guided meditations, energy healing frequencies, moon cycle rituals, or intuitive readings. What you've developed through personal practice can become sacred offerings for others on their journey.
        </p>
        <p className="p-3 font-mono text-base font-bold leading-relaxed border-2 border-black bg-purple-50">
          Your spiritual gifts deserve to be valued and shared.
        </p>
      </div>

      {/* Use Case 2 */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#FBBF24] border-2 border-black mb-4">
          <h3 className="font-mono text-base font-black uppercase">2. Healing Wisdom & Wellness Guides</h3>
        </div>
        <p className="mb-4 font-mono text-base leading-relaxed">
          From herbal remedies to breathwork techniques, from trauma-informed practices to nutritional wisdom—your healing knowledge can guide others toward wholeness.
        </p>
        <p className="font-mono text-base leading-relaxed">
          Create collections around specific healing modalities or offer single sessions of profound insight.
        </p>
      </div>

      {/* Use Case 3 */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#FBBF24] border-2 border-black mb-4">
          <h3 className="font-mono text-base font-black uppercase">3. Artistic Soul Expression</h3>
        </div>
        <p className="mb-4 font-mono text-base leading-relaxed">
          Your music, poetry, visual art, or performance pieces are more than entertainment—they're vibrational medicine. Share your creations as conscious offerings rather than mere commodities.
        </p>
        <p className="font-mono text-base leading-relaxed">
          This is art as awakening, creativity as consciousness-raising.
        </p>
      </div>

      {/* Truth & Authenticity */}
      <div className="bg-[#10B981] border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="mb-4 font-mono text-xl font-black text-center uppercase">
          Your Truth Has Value
        </h2>
        <p className="mb-4 font-mono text-base leading-relaxed">
          We believe authentic expression should be easy to share and meaningful to receive. We believe your personal revelations, spiritual insights, and healing wisdom deserve a space where they can be valued appropriately.
        </p>
        <div className="mt-6 space-y-2 text-center">
          <p className="font-mono text-lg font-bold">Social media is the surface.</p>
          <p className="font-mono text-lg font-bold">5D consciousness is the depth.</p>
          <p className="font-mono text-lg font-bold">Your expression is the bridge.</p>
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-[#8B5CF6] border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="font-mono text-xl font-black text-center uppercase md:text-2xl">
          Your Next Steps
        </h2>
      </div>

      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <span className="inline-block px-3 py-1 bg-[#FBBF24] border-2 border-black font-mono font-black shrink-0">1</span>
            <p className="font-mono text-base leading-relaxed">
              <span className="font-bold">Share your healing.</span> Offer guided meditations, energy work sessions, or wellness practices that have transformed your journey.
            </p>
          </div>
          <div className="flex items-start gap-4">
            <span className="inline-block px-3 py-1 bg-[#FBBF24] border-2 border-black font-mono font-black shrink-0">2</span>
            <p className="font-mono text-base leading-relaxed">
              <span className="font-bold">Express your creativity</span> through music, art, writing, or performance that comes from your soul, not just your skills.
            </p>
          </div>
          <div className="flex items-start gap-4">
            <span className="inline-block px-3 py-1 bg-[#FBBF24] border-2 border-black font-mono font-black shrink-0">3</span>
            <p className="font-mono text-base leading-relaxed">
              <span className="font-bold">Teach your truth</span> through personal revelations, philosophical insights, or lived experiences that can guide others.
            </p>
          </div>
          <div className="flex items-start gap-4">
            <span className="inline-block px-3 py-1 bg-[#FBBF24] border-2 border-black font-mono font-black shrink-0">4</span>
            <p className="font-mono text-base leading-relaxed">
              <span className="font-bold">Build your sacred economy</span> where your wisdom is valued, your time is respected, and your offerings find their perfect recipients.
            </p>
          </div>
        </div>
      </div>

      {/* Closing */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
        <p className="mb-4 font-mono text-base font-bold leading-relaxed">
          We created 5DTOK because we believe in the sacred exchange of wisdom, the power of authentic expression, and the unity of consciousness that technology can help us achieve.
        </p>
        <p className="font-mono text-xl font-black uppercase bg-[#8B5CF6] text-white border-2 border-black p-4 inline-block">
          Express your 5D truth. Let the universe receive it.
        </p>
      </div>

      {/* Numerology Footer */}
      <div className="p-4 text-center text-white bg-gray-900 border-4 border-black">
        <p className="font-mono text-sm">
          <span className="font-bold">5</span> = Freedom • Truth • Raw Expression • 
          <span className="font-bold"> D</span> = Dimension • Divine • Destiny • 
          <span className="font-bold"> TOK</span> = Token • Talk • Tock
        </p>
      </div>
    </div>
  )
}