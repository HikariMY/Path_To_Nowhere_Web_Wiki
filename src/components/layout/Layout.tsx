import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { Navbar } from './Navbar'
import { Footer } from './Footer'

function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-ptn-red hover:bg-ptn-red/80 text-white shadow-lg transition-all duration-300"
      title="กลับขึ้นบน"
    >
      <ChevronUp size={20} />
    </button>
  )
}

export function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-ptn-bg">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  )
}
