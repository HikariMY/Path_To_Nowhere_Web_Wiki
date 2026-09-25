import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const CONTACT_EMAIL = 'earth253371@gmail.com'
const UPDATED_AT = '25 กันยายน 2026'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-heading text-lg font-semibold text-ptn-text mb-3">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-ptn-muted">{children}</div>
    </section>
  )
}

/** นโยบายความเป็นส่วนตัว — Google ต้องใช้ลิงก์หน้านี้ก่อนเปิดล็อกอินด้วย Google ให้ทุกคน */
export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-ptn-text mb-1">นโยบายความเป็นส่วนตัว</h1>
      <p className="text-xs text-ptn-disabled mb-8">ปรับปรุงล่าสุด {UPDATED_AT}</p>

      <Section title="เกี่ยวกับเว็บไซต์">
        <p>
          Project Duck เป็นเว็บไซต์ชุมชนแฟนเกม Path to Nowhere ภาษาไทย ดำเนินการโดยอาสาสมัคร
          ไม่ได้เป็นทางการและไม่เกี่ยวข้องกับ AISNO หน้านี้อธิบายว่าเราเก็บข้อมูลอะไร ใช้ทำอะไร และคุณจัดการข้อมูลของคุณได้อย่างไร
        </p>
      </Section>

      <Section title="ข้อมูลที่เราเก็บ">
        <ul className="list-disc space-y-1 pl-5">
          <li><span className="text-ptn-text">ข้อมูลบัญชี</span> — อีเมล ชื่อผู้ใช้ ชื่อที่แสดง รูปโปรไฟล์ และคำอธิบายตัวเองที่คุณกรอก</li>
          <li>
            <span className="text-ptn-text">ข้อมูลจาก Discord / Google</span> — เมื่อคุณเลือกเข้าสู่ระบบผ่านบริการเหล่านี้
            เราได้รับเฉพาะรหัสบัญชี ชื่อผู้ใช้ ชื่อที่แสดง รูปโปรไฟล์ และอีเมล
            เราไม่ได้รับรหัสผ่าน ข้อความ รายชื่อเพื่อน หรือเซิร์ฟเวอร์ของคุณ
          </li>
          <li><span className="text-ptn-text">เนื้อหาที่คุณสร้าง</span> — กระทู้ ความคิดเห็น เทียร์ลิสต์ ไกด์ และรูปภาพที่อัปโหลด ซึ่งผู้อื่นมองเห็นได้ตามที่เว็บไซต์แสดง</li>
          <li><span className="text-ptn-text">ข้อมูลในเบราว์เซอร์</span> — โทเคนการเข้าสู่ระบบ และธีมที่เลือก เก็บไว้ในเบราว์เซอร์ของคุณ (localStorage)</li>
        </ul>
        <p>เราไม่ใช้โฆษณา ไม่ใช้เครื่องมือติดตามพฤติกรรม และไม่เก็บข้อมูลการชำระเงินใด ๆ</p>
      </Section>

      <Section title="เราใช้ข้อมูลอย่างไร">
        <ul className="list-disc space-y-1 pl-5">
          <li>ยืนยันตัวตนและให้คุณเข้าสู่ระบบได้</li>
          <li>แสดงโปรไฟล์และชื่อผู้เขียนคู่กับเนื้อหาที่คุณสร้าง</li>
          <li>ดูแลชุมชน เช่น ตรวจสอบและลบเนื้อหาที่ผิดกฎ</li>
        </ul>
        <p>เราไม่ขาย ไม่ให้เช่า และไม่แบ่งปันข้อมูลส่วนตัวของคุณให้บุคคลภายนอกเพื่อการตลาด</p>
      </Section>

      <Section title="ที่เก็บข้อมูลและผู้ให้บริการ">
        <p>
          ข้อมูลบัญชีและเนื้อหาเก็บไว้ที่ Supabase ซึ่งเป็นผู้ให้บริการฐานข้อมูลและระบบยืนยันตัวตนของเว็บไซต์
          การเข้าสู่ระบบผ่าน Discord หรือ Google อยู่ภายใต้นโยบายความเป็นส่วนตัวของบริการนั้น ๆ ด้วย
        </p>
      </Section>

      <Section title="สิทธิ์ของคุณ">
        <ul className="list-disc space-y-1 pl-5">
          <li>แก้ไขชื่อที่แสดง รูปโปรไฟล์ และคำอธิบายตัวเองได้ที่ <Link to="/settings" className="text-ptn-cyan hover:underline">ตั้งค่าบัญชี</Link></li>
          <li>ยกเลิกการเชื่อมบัญชี Discord / Google ได้ที่หน้าตั้งค่าบัญชี หรือถอนสิทธิ์จากฝั่ง Discord / Google ได้โดยตรง</li>
          <li>ขอสำเนาข้อมูล หรือขอลบบัญชีพร้อมข้อมูลทั้งหมด โดยส่งอีเมลจากอีเมลที่ใช้สมัครมาที่ด้านล่าง เราจะดำเนินการภายใน 30 วัน</li>
        </ul>
      </Section>

      <Section title="การเปลี่ยนแปลงนโยบาย">
        <p>หากมีการเปลี่ยนแปลง เราจะแก้ไขหน้านี้และปรับวันที่ปรับปรุงล่าสุดด้านบน</p>
      </Section>

      <Section title="ติดต่อเรา">
        <p>
          อีเมล: <span className="select-all text-ptn-text">{CONTACT_EMAIL}</span>{' '}
          (<a href={`mailto:${CONTACT_EMAIL}`} className="text-ptn-cyan hover:underline">ส่งอีเมล</a>)
        </p>
      </Section>
    </div>
  )
}
