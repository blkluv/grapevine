import { useEffect, useState } from 'react'
import { usePageTitle } from '@/context/PageTitleContext'
import gif1 from '@/assets/gif1.gif'

// Theme-specific styles
const themeStyles = {
  default: {
    imageContainer: 'flex justify-center items-center gap-6 mb-6',
    image: 'w-96 border-4 border-black shadow-[8px_8px_0px_0px_#000]',
    contentCard: 'bg-gray-200 border-4 border-gray-400 p-8 shadow-[4px_4px_0px_0px_#666]',
    badgeContainer: 'flex justify-center mb-6',
    badge: 'px-12 py-4 bg-[var(--btn-warning)] border-4 border-t-[var(--btn-warning-light)] border-l-[var(--btn-warning-light)] border-b-[var(--btn-warning-dark)] border-r-[var(--btn-warning-dark)] shadow-[4px_4px_0px_0px_#000]',
    badgeStyle: { borderRadius: '50%' },
    badgeText: 'text-2xl font-bold uppercase whitespace-nowrap',
    paragraph: 'text-lg mb-4',
    lastParagraph: 'text-lg',
    bold: 'font-bold',
    italic: 'italic',
  },
  modern: {
    imageContainer: 'flex justify-center items-center gap-6 mb-8',
    image: 'w-96 rounded-2xl border border-gray-700 shadow-2xl shadow-purple-500/20',
    contentCard: 'bg-gray-800 border border-gray-700 rounded-2xl p-10 shadow-2xl',
    badgeContainer: 'flex justify-center mb-8',
    badge: 'px-12 py-4 bg-gray-800 border border-gray-700 rounded-full shadow-lg',
    badgeStyle: {},
    badgeText: 'text-2xl font-bold text-gray-100',
    paragraph: 'text-base text-gray-300 mb-6 leading-relaxed',
    lastParagraph: 'text-base text-gray-300 leading-relaxed',
    bold: 'font-semibold text-gray-100',
    italic: 'italic text-purple-300',
  },
  win95: {
    imageContainer: 'flex justify-center items-center gap-6 mb-4',
    image: 'w-96 border-2 border-black',
    contentCard: 'bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080] p-6',
    badgeContainer: 'flex justify-center mb-4',
    badge: 'px-8 py-2 bg-[#000080] border-2 border-t-white border-l-white border-b-[#808080] border-r-[#808080]',
    badgeStyle: {},
    badgeText: 'text-xl font-bold text-white',
    paragraph: 'text-sm text-black mb-3',
    lastParagraph: 'text-sm text-black',
    bold: 'font-bold',
    italic: 'italic',
  },
  neobrutalism: {
    imageContainer: 'flex justify-center items-center gap-6 mb-8',
    image: 'w-96 border-[2px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
    welcomeHeader: 'flex justify-center mb-8',
    welcomeBadge: 'px-12 py-6 bg-[#00f0ff] border-[2px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
    welcomeText: 'text-3xl font-mono font-black uppercase tracking-tight',
    contentCard: 'bg-white border-[2px] border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
    badgeContainer: 'flex justify-center mb-6',
    badge: 'px-8 py-4 bg-white border-[2px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
    badgeStyle: {},
    badgeText: 'text-xl font-mono font-black uppercase',
    paragraph: 'text-base mb-6 font-mono leading-relaxed',
    lastParagraph: 'text-base font-mono leading-relaxed',
    bold: 'font-black',
    italic: 'font-bold',
  },
}

export default function About() {
  const { setTitle } = usePageTitle()
  const [currentTheme, setCurrentTheme] = useState('default')

  // Theme detection
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme') || 'default'
      setCurrentTheme(theme)
    }

    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => observer.disconnect()
  }, [])

  // Set page title (empty for neobrutalism since we render it inline)
  useEffect(() => {
    setTitle(currentTheme === 'neobrutalism' ? '' : 'Welcome to Grapevine')
  }, [setTitle, currentTheme])

  // Get theme-specific styles
  const themeKey = ['modern', 'win95', 'neobrutalism'].includes(currentTheme) ? currentTheme : 'default'
  const styles = themeStyles[themeKey as keyof typeof themeStyles]

  return (
    <div>
      <div className="max-w-4xl mx-auto">
          {/* Neobrutalism Welcome Header */}
          {themeKey === 'neobrutalism' && 'welcomeHeader' in styles && (
            <div className={styles.welcomeHeader}>
              <div className={styles.welcomeBadge}>
                <h1 className={styles.welcomeText}>Welcome to Grapevine</h1>
              </div>
            </div>
          )}

          <div className={styles.imageContainer}>
            <img src={gif1} alt="Grapevine Animation" className={styles.image} />
          </div>
          <div className={styles.contentCard}>
            <div className={styles.badgeContainer}>
              <div className={styles.badge} style={styles.badgeStyle}>
                <h2 className={styles.badgeText}>What is Grapevine?</h2>
              </div>
            </div>
            <p className={styles.paragraph}>
              Grapevine is an <span className={styles.bold}>x402 feed discovery platform</span> where humans create and monetize content feeds that AI agents automatically discover, subscribe to, and pay for using the x402 protocol.
            </p>
            <p className={styles.paragraph}>
              <span className={styles.bold}>How it works:</span> You set up your feeds, publish valuable resources and content, then share the links. AI agents (and sometimes humans) find your feeds, subscribe, and automatically pay for access using x402 micropayments. You earn money while you sleep.
            </p>
            <p className={styles.paragraph}>
              Think of it as <span className={styles.italic}>RSS meets micropayments meets AI</span>. The future of content monetization is here, and it's powered by autonomous agents doing the heavy lifting.
            </p>
            <p className={styles.lastParagraph}>
              <span className={styles.bold}>Get started:</span> Navigate using the menu above to create your first feed and start monetizing your content today.
            </p>
          </div>
      </div>
    </div>
  )
}
