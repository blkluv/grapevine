export const config = {
  runtime: 'edge',
}

export default async function handler(request: Request) {
  const url = new URL(request.url)
  const pathname = url.searchParams.get('path') || ''
  const origin = url.origin

  // Determine API URL and gateway based on environment
  const isProd = origin.includes('grapevine.fyi')
  const apiUrl = isProd ? 'https://api.grapevine.fyi' : 'https://api.grapevine.markets'
  const gatewayUrl = isProd ? 'https://gateway.grapevine.fyi' : 'https://grapevine.dev-mypinata.cloud'
  const defaultOgImage = 'https://grapevine-assets.mypinata.cloud/ipfs/bafybeiaargrcfmn2d5yjvtp2iyjklfxgskqbk63gwmkl477q6r5bzk3tfu'

  try {
    // Parse the route
    const feedMatch = pathname.match(/^\/feeds\/([^/]+)(?:\/entries(?:\/([^/]+))?)?$/)

    if (!feedMatch) {
      // No match, serve index.html without modifications
      return fetch(`${origin}/index.html`)
    }

    const feedId = feedMatch[1]
    const entryId = feedMatch[2]

    // Fetch feed data
    const feedResponse = await fetch(`${apiUrl}/v1/feeds/${feedId}`)
    if (!feedResponse.ok) {
      return fetch(`${origin}/index.html`)
    }
    const feed = await feedResponse.json()

    let title = feed.name || 'Grapevine Feed'
    let description = feed.description || 'Discover content on Grapevine'
    const image = defaultOgImage
    let pageUrl = `${origin}/feeds/${feedId}`

    // If viewing a specific entry, fetch entry data (only need title)
    if (entryId) {
      const entryResponse = await fetch(`${apiUrl}/v1/feeds/${feedId}/entries/${entryId}`)
      if (entryResponse.ok) {
        const entry = await entryResponse.json()
        title = entry.title || title
        description = entry.description || description
        pageUrl = `${origin}/feeds/${feedId}/entries/${entryId}`
        // Image stays as feed's image
      }
    }

    // Fetch the original index.html
    const indexResponse = await fetch(`${origin}/index.html`)
    if (!indexResponse.ok) {
      return new Response('Not found', { status: 404 })
    }
    let html = await indexResponse.text()

    // Remove existing OG/Twitter meta tags to avoid duplicates (keep fc:miniapp for mini app launches)
    html = html.replace(/<meta\s+property="og:[^"]*"\s*[^>]*>/gi, '')
    html = html.replace(/<meta\s+property="twitter:[^"]*"\s*[^>]*>/gi, '')
    html = html.replace(/<meta\s+name="twitter:[^"]*"\s*[^>]*>/gi, '')

    // Generate OG tags
    const ogTags = generateOgTags({ title, description, image, url: pageUrl })

    // Inject OG tags into <head>
    html = html.replace('</head>', `${ogTags}\n</head>`)

    // Also update the <title> tag
    html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)} | Grapevine</title>`)

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (error) {
    console.error('OG handler error:', error)
    return fetch(`${origin}/index.html`)
  }
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function generateOgTags({ title, description, image, url }: {
  title: string
  description: string
  image: string
  url: string
}) {
  const safeTitle = escapeHtml(title)
  const safeDescription = escapeHtml(description)

  return `
  <!-- Dynamic OG Tags -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${image}">
  <meta property="og:site_name" content="Grapevine">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:image" content="${image}">`
}
