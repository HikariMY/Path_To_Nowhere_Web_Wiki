import { defineConfig } from 'vitest/config'

// เทสต์เฉพาะ logic ใน src — ไม่ให้ไปสแกนโฟลเดอร์อื่นในรีโป
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
