import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Feeds from './pages/Feeds'
import FeedEntries from './pages/FeedEntries'
import EntryDetail from './pages/EntryDetail'
import Category from './pages/Category'
import UserProfile from './pages/UserProfile'
import TopSellers from './pages/TopSellers'
import About from './pages/About'
import OriginalLayout from "@/components/Layouts/OriginalLayout.tsx";
import ScrollToTop from '@/components/ScrollToTop'
import { PageTitleProvider } from '@/context/PageTitleContext'
import { FarcasterAutoLogin } from '@/components/FarcasterAutoLogin'

function App() {
  return (
    <BrowserRouter>
      <FarcasterAutoLogin />
      <ScrollToTop />
      <PageTitleProvider>
        <OriginalLayout>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/feeds" element={<Feeds />} />
        <Route path="/feeds/:feedId/entries" element={<FeedEntries />} />
        <Route path="/feeds/:feedId/entries/:entryId" element={<EntryDetail />} />
        <Route path="/category/:id" element={<Category />} />
        <Route path="/user/:walletAddress" element={<UserProfile />} />
        <Route path="/top-sellers" element={<TopSellers />} />
        <Route path="/about" element={<About />} />
        </Routes>
        </OriginalLayout>
      </PageTitleProvider>
    </BrowserRouter>
  )
}

export default App
