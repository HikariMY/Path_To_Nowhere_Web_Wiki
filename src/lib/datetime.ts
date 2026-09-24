// แปลงเวลาระหว่างคอลัมน์ timestamptz (เก็บเป็น UTC) กับ <input type="datetime-local">
// ช่อง datetime-local ไม่มี timezone — เบราว์เซอร์ถือว่าเป็นเวลาเครื่องเสมอ
// ห้ามตัดสตริงจาก DB ตรง ๆ (เช่น .slice(0, 16)) เพราะจะได้ตัวเลข UTC แล้วถูกอ่านเป็นเวลาไทย
// ทำให้เวลาเลื่อนไป 7 ชั่วโมงทุกครั้งที่เปิดแก้แล้วกดบันทึก

const pad = (n: number) => String(n).padStart(2, '0')

/** ค่าจาก DB → ค่าสำหรับช่อง datetime-local ในเวลาเครื่อง เช่น "2026-10-08T15:00" */
export function toDateTimeInput(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** ค่าจากช่อง datetime-local (เวลาเครื่อง) → ISO UTC สำหรับเก็บลง DB, ว่าง/ผิดรูปแบบ = null */
export function fromDateTimeInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
