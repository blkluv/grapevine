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
        <div className="px-8 py-4 bg-[#00f0ff] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-2xl md:text-4xl font-mono font-black uppercase tracking-tight text-center">
            Grapevine
          </h1>
          <p className="text-lg md:text-xl font-mono font-bold mt-1 text-center">
            Create Liquid Information
          </p>
        </div>
        <div className="px-6 py-3 bg-[#ff6b35] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-base md:text-lg font-mono font-bold text-center">
            Publish, discover, and buy high-signal data consumed by humans or AI.
          </p>
        </div>
      </div>

      {/* The Question */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-mono text-base font-bold text-center py-3 bg-[#ffff00] border-2 border-black mb-4 inline-block w-full">
          Do you ever wonder where AI gets its information?
        </p>
        <p className="font-mono text-base leading-relaxed mb-4">
          AI systems are improving rapidly, but their usefulness still depends on the data they receive. The world has endless amounts of human insight, research, analysis and real time observations. What it doesn't have is a clean way to publish it, find it, and buy it when you need it.
        </p>
        <p className="font-mono text-base leading-relaxed font-bold">
          That is why we built Grapevine.
        </p>
      </div>

      {/* What is Grapevine */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <p className="font-mono text-base leading-relaxed mb-4">
          Grapevine is a product. A tool. A platform that makes human information instantly publishable, discoverable, and purchasable. It is built around simple primitives so it can support a wide range of use cases, including many we have not thought of yet.
        </p>
        <p className="font-mono text-base leading-relaxed">
          Below is how it works and what people can build with it.
        </p>
      </div>

      {/* Feeds */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#ff6b35] border-2 border-black mb-4">
          <h3 className="font-mono font-black uppercase text-lg">Feeds</h3>
        </div>
        <p className="font-mono text-base leading-relaxed">
          A feed is your channel. It is your personal or organizational stream of information. You own it. You define what lives inside it. You decide how it is structured. A feed can be specific, broad, formal, casual, data heavy, lightweight or anything in between.
        </p>
      </div>

      {/* Entries */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#ff6b35] border-2 border-black mb-4">
          <h3 className="font-mono font-black uppercase text-lg">Entries</h3>
        </div>
        <p className="font-mono text-base leading-relaxed">
          An entry is a single piece of content inside a feed. It can be text, a file, a dataset, an observation, a screenshot, a short write up or any other piece of information. Each entry stands alone. If it has value, people can buy it.
        </p>
      </div>

      {/* Payments */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#ff6b35] border-2 border-black mb-4">
          <h3 className="font-mono font-black uppercase text-lg">Payments</h3>
        </div>
        <p className="font-mono text-base leading-relaxed">
          Grapevine includes built in payments so entries can have prices attached to them. Buyers pay inside the request itself. No storefront setup. No checkout flows. No subscriptions. Payments are powered by @CoinbaseDev's x402 protocol which lets people use their wallet to generate and purchase data without creating an account.
        </p>
      </div>

      {/* Use Cases Header */}
      <div className="bg-[#00f0ff] border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl md:text-2xl font-mono font-black uppercase text-center">
          What Grapevine Can Be Used For
        </h2>
      </div>

      {/* Use Case 1 */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#ffff00] border-2 border-black mb-4">
          <h3 className="font-mono font-black uppercase text-base">1. Fuel for AI and Data Driven Systems</h3>
        </div>
        <p className="font-mono text-base leading-relaxed mb-4">
          AI systems are hungry for high quality, real world, human generated data. But most human knowledge is not structured anywhere. It lives in group chats, Slack threads, notebooks, personal documents or in someone's head.
        </p>
        <p className="font-mono text-base leading-relaxed mb-4">
          Grapevine can serve as a marketplace for feeding AI the information it cannot scrape. Analysts, researchers, experts, and everyday observers can publish data, insights or updates that AI companies and developers can purchase and ingest. Models can subscribe to feeds or buy specific entries that improve their accuracy, recency or relevance.
        </p>
        <p className="font-mono text-base leading-relaxed font-bold bg-gray-100 p-3 border-2 border-black">
          Grapevine helps answer the question: Where does real world AI get its information?
        </p>
      </div>

      {/* Use Case 2 */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#ffff00] border-2 border-black mb-4">
          <h3 className="font-mono font-black uppercase text-base">2. Real Time Intelligence for Prediction Markets</h3>
        </div>
        <p className="font-mono text-base leading-relaxed mb-4">
          Prediction markets thrive when good information flows quickly. People who follow politics, sports, technology, local events or specialized domains often see changes before they become public.
        </p>
        <p className="font-mono text-base leading-relaxed">
          Grapevine lets people publish those observations in real time and lets anyone who participates in prediction markets or trading apps purchase the ones they find useful. This helps markets operate more efficiently without relying on rumors or low quality speculation.
        </p>
      </div>

      {/* Use Case 3 */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="inline-block px-4 py-2 bg-[#ffff00] border-2 border-black mb-4">
          <h3 className="font-mono font-black uppercase text-base">3. A Wallet Native Gumroad for Humans or AI</h3>
        </div>
        <p className="font-mono text-base leading-relaxed mb-4">
          Grapevine can also act like a simple, flexible version of Gumroad. People can sell files, reports, templates, data packs or any digital product. The buyer could be a human or an AI system. It does not matter. If someone or something finds the entry valuable, they can buy it.
        </p>
        <p className="font-mono text-base leading-relaxed">
          This use case applies to creators especially, since they can run an entire micro business from a feed without needing a storefront, subscription billing system or platform lock in.
        </p>
      </div>

      {/* Data Should Be Easy To Buy */}
      <div className="bg-[#ff6b35] border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl font-mono font-black uppercase mb-4 text-center">
          Data Should Be Easy To Buy
        </h2>
        <p className="font-mono text-base leading-relaxed mb-4">
          We believe information should be easy to publish and easier to buy. We believe small pieces of high quality insight can be more valuable than large documents. We believe human generated information deserves a real market.
        </p>
        <div className="text-center space-y-2 mt-6">
          <p className="font-mono text-lg font-bold">Prediction markets are the beginning.</p>
          <p className="font-mono text-lg font-bold">AI is the horizon.</p>
          <p className="font-mono text-lg font-bold">Everything else is white space.</p>
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-[#00f0ff] border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-xl md:text-2xl font-mono font-black uppercase text-center">
          What's Next
        </h2>
      </div>

      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-4">
          <div className="flex gap-4 items-start">
            <span className="inline-block px-3 py-1 bg-[#ffff00] border-2 border-black font-mono font-black shrink-0">1</span>
            <p className="font-mono text-base leading-relaxed">
              <span className="font-bold">Feed AI.</span> Publish data, insights or updates that can improve AI systems and fine tuned models.
            </p>
          </div>
          <div className="flex gap-4 items-start">
            <span className="inline-block px-3 py-1 bg-[#ffff00] border-2 border-black font-mono font-black shrink-0">2</span>
            <p className="font-mono text-base leading-relaxed">
              <span className="font-bold">Publish real time information</span> for prediction markets or trading apps in a clean, structured way.
            </p>
          </div>
          <div className="flex gap-4 items-start">
            <span className="inline-block px-3 py-1 bg-[#ffff00] border-2 border-black font-mono font-black shrink-0">3</span>
            <p className="font-mono text-base leading-relaxed">
              <span className="font-bold">Use Grapevine like a wallet native Gumroad</span> by selling files, reports or digital content to humans or AI.
            </p>
          </div>
        </div>
      </div>

      {/* Closing */}
      <div className="bg-white border-4 border-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
        <p className="font-mono text-base leading-relaxed font-bold mb-4">
          We built Grapevine because we believe in turning human knowledge into usable, accessible, liquid information.
        </p>
        <p className="font-mono text-xl font-black uppercase bg-[#00f0ff] border-2 border-black p-4 inline-block">
          Create liquid information. Let the world consume it.
        </p>
      </div>
    </div>
  )
}
