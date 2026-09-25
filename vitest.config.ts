import { defineConfig } from 'vitest/config'

// เทสต์เฉพาะ logic ใน src และสคริปต์ automation — ไม่ให้ไปสแกนโฟลเดอร์อื่นในรีโป
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
  },
})
