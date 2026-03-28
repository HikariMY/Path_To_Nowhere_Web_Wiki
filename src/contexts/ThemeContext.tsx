import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'original' | 'duck'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'original', toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'original'
  })

  useEffect(() => {
    const html = document.documentElement
    if (theme === 'duck') {
      html.classList.add('theme-duck')
    } else {
      html.classList.remove('theme-duck')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'original' ? 'duck' : 'original')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
