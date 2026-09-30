import type { ReactNode } from 'react'

const CONTACT_EMAIL = 'earth253371@gmail.com'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-heading text-lg font-semibold text-ptn-text mb-3">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-ptn-muted">{children}</div>
    </section>
  )
}

/** หน้าให้เครดิตแหล่งข้อมูลที่เว็บนี้ใช้ — โดยเฉพาะ s1n.gg และเกม Path to Nowhere */
export function CreditsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-ptn-text mb-1">เครดิตแหล่งข้อมูล</h1>
      <p className="text-xs text-ptn-disabled mb-8">ข้อมูลตัวละครและเกมบนเว็บนี้มาจากที่ไหนบ้าง</p>

      <Section title="เกม Path to Nowhere">
        <p>
          ตัวละคร เนื้อเรื่อง ภาพประกอบ และเนื้อหาเกมทั้งหมด เป็นลิขสิทธิ์ของ AISNO ผู้พัฒนาเกม Path to Nowhere
          Project Duck เป็นเว็บไซต์ชุมชนแฟนเกมที่ทำขึ้นเอง ไม่แสวงหากำไร ไม่ได้เป็นทางการ และไม่เกี่ยวข้องกับ AISNO
        </p>
      </Section>

      <Section title="s1n.gg">
        <p>
          ข้อมูลตัวละครส่วนใหญ่บนเว็บนี้ — สเตตัส สกิล Shackle Break Crimebrand build และรูปภาพประกอบ —
          รวบรวมและแปลมาจาก{' '}
          <a href="https://s1n.gg" target="_blank" rel="noopener noreferrer" className="text-ptn-cyan hover:underline">
            s1n.gg
          </a>{' '}
          ขอบคุณทีมงาน s1n ที่รวบรวมข้อมูลเกมไว้ให้ชุมชน
        </p>
      </Section>

      <Section title="无期迷途WIKI (BWIKI)">
        <p>
          ข้อมูลตัวละครบางส่วนอ้างอิงจาก{' '}
          <a href="https://wiki.biligame.com/wqmt/" target="_blank" rel="noopener noreferrer" className="text-ptn-cyan hover:underline">
            无期迷途WIKI (BWIKI)
          </a>{' '}
          ซึ่งเผยแพร่ภายใต้สัญญาอนุญาต{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.th" target="_blank" rel="noopener noreferrer" className="text-ptn-cyan hover:underline">
            CC BY-SA 4.0
          </a>{' '}
          เนื้อหาที่แปลและเรียบเรียงเป็นภาษาไทยจากแหล่งนี้ เผยแพร่ภายใต้สัญญาอนุญาตเดียวกัน
        </p>
      </Section>

      <Section title="Path to Nowhere Wiki (Fandom)">
        <p>
          ข้อมูลตัวละครบางส่วนอ้างอิงจาก{' '}
          <a href="https://path-to-nowhere.fandom.com/" target="_blank" rel="noopener noreferrer" className="text-ptn-cyan hover:underline">
            Path to Nowhere Wiki
          </a>{' '}
          บน Fandom ซึ่งเผยแพร่ภายใต้สัญญาอนุญาต CC BY-SA เช่นกัน
        </p>
      </Section>

      <Section title="เนื้อหาที่ผู้ใช้สร้าง">
        <p>ไกด์ กระทู้ เทียร์ลิสต์ และความคิดเห็น เป็นผลงานของผู้เขียนแต่ละคน ไม่ใช่ของเว็บไซต์</p>
      </Section>

      <Section title="ติดต่อเรา">
        <p>
          หากคุณเป็นเจ้าของข้อมูลหรือเนื้อหาส่วนใดบนเว็บนี้ และต้องการให้แก้ไขหรือนำออก ติดต่อได้ที่
          อีเมล <span className="select-all text-ptn-text">{CONTACT_EMAIL}</span>{' '}
          (<a href={`mailto:${CONTACT_EMAIL}`} className="text-ptn-cyan hover:underline">ส่งอีเมล</a>)
        </p>
      </Section>
    </div>
  )
}
