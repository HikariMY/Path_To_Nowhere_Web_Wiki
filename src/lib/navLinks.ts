// เมนูหลักของเว็บ — ใช้ทั้งแถบเมนูบนสุด (Navbar) และค้นหาด่วน (Ctrl+K)
export interface NavLinkItem {
  to: string
  label: string
  /** ชื่ออังกฤษ ให้ค้นหาด่วนเจอทั้งไทยและอังกฤษ */
  en: string
  exact: boolean
}

export const NAV_LINKS: readonly NavLinkItem[] = [
  { to: '/',            label: 'หน้าแรก',    en: 'Home',        exact: true },
  { to: '/characters',  label: 'ตัวละคร',    en: 'Characters',  exact: false },
  { to: '/crimebrands', label: 'Crimebrands', en: 'Crimebrands', exact: false },
  { to: '/game-info',   label: 'ข้อมูลเกม',  en: 'Game Info',   exact: false },
  { to: '/modes',       label: 'ไกด์โหมด',   en: 'Mode Guides', exact: false },
  { to: '/tier-lists',  label: 'เทียร์ลิสต์', en: 'Tier Lists',  exact: false },
  { to: '/teams',       label: 'ทีม',        en: 'Teams',       exact: false },
  { to: '/forum',       label: 'ฟอรัม',       en: 'Forum',       exact: false },
]
