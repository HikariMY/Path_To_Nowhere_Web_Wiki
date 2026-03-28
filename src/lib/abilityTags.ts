export type TagGroup = {
  label: string
  bg: string
  border: string
  text: string
  tags: string[]
}

export const ABILITY_TAG_GROUPS: TagGroup[] = [
  {
    label: 'DMG Type',
    bg: '#3D1018',
    border: '#A03040',
    text: '#E06070',
    tags: ['Physical DMG', 'Magic DMG', 'True DMG'],
  },
  {
    label: 'Combat Type',
    bg: '#3D2800',
    border: '#A07000',
    text: '#D09030',
    tags: ['Core DMG', 'Normal Attack DMG', 'Skill DMG', 'Summons', 'DMG Absorption'],
  },
  {
    label: 'System Type',
    bg: '#28300A',
    border: '#708020',
    text: '#9AB030',
    tags: ['Life Loss', 'Burn', 'Electrocution', 'M-Value', 'Weakspot', 'Umbra Core', 'Shattered Blade', 'A.S. Tech', 'Overlimit Value'],
  },
  {
    label: 'Support Type',
    bg: '#081E0E',
    border: '#206830',
    text: '#30A050',
    tags: [
      'Attack Support', 'Physical DMG Support', 'Magic DMG Support', 'True DMG Support',
      'Normal Attack DMG Support', 'Skill DMG Support', 'CRIT Support', 'Attack Speed Support',
      'Summons Support', 'Energy Recovery', 'Special Energy Recovery', 'Chief Energy Recovery',
      'Defense Support', 'Healing Support', 'Shield Support', 'Special Support',
    ],
  },
  {
    label: 'Control Type',
    bg: '#100E38',
    border: '#4848B8',
    text: '#8080D8',
    tags: ['Fear', 'Stun', 'Petrification', 'Freeze', 'Special Control'],
  },
  {
    label: 'Special Effect',
    bg: '#0C1830',
    border: '#285898',
    text: '#4888C8',
    tags: ['Slow Down', 'Dispel', 'Purify', 'Revival', 'Damage Sharing', 'Control Immunity', 'Lethality Immunity', 'Invisibility Removal'],
  },
]

// Quick lookup: tag name → its group
export const TAG_GROUP_MAP: Record<string, TagGroup> = {}
ABILITY_TAG_GROUPS.forEach(g => g.tags.forEach(t => (TAG_GROUP_MAP[t] = g)))

// Tag descriptions (Thai)
export const TAG_DESCRIPTIONS: Record<string, string> = {
  // DMG Type
  'Physical DMG':          'สามารถโจมตีด้วยความเสียหายกายภาพ (Physical Damage)',
  'Magic DMG':             'สามารถโจมตีด้วยความเสียหายเวทมนตร์ (Magic Damage)',
  'True DMG':              'สามารถโจมตีด้วยความเสียหายจริง ทะลุเกราะและความต้านทานทุกชนิด',
  // Combat Type
  'Core DMG':              'สามารถโจมตีสร้าง Core Damage ใส่ศัตรูได้',
  'Normal Attack DMG':     'มีความชำนาญในการสร้างความเสียหายด้วยการโจมตีธรรมดา',
  'Skill DMG':             'มีความชำนาญในการสร้างความเสียหายด้วยสกิล',
  'Summons':               'สามารถเรียกสิ่งมีชีวิตหรือหน่วยย่อยมาช่วยในการต่อสู้',
  'DMG Absorption':        'สามารถดูดซับความเสียหายที่เข้ามา ลดผลกระทบต่อทีม',
  // System Type
  'Life Loss':             'สร้างหรือเกี่ยวข้องกับการสูญเสีย HP อย่างต่อเนื่อง',
  'Burn':                  'สามารถทำให้ศัตรูติดสถานะ Burn รับความเสียหายเป็นระยะ',
  'Electrocution':         'สามารถทำให้ศัตรูติดสถานะ Electrocution',
  'M-Value':               'มีกลไกที่เกี่ยวข้องกับระบบ M-Value',
  'Weakspot':              'สามารถโจมตีจุดอ่อน (Weak Spot) ของศัตรูเพื่อความเสียหายพิเศษ',
  'Umbra Core':            'มีกลไกที่เกี่ยวข้องกับระบบ Umbra Core',
  'Shattered Blade':       'มีกลไกที่เกี่ยวข้องกับระบบ Shattered Blade',
  'A.S. Tech':             'มีกลไกที่เกี่ยวข้องกับระบบ A.S. Tech',
  'Overlimit Value':       'มีกลไกที่เกี่ยวข้องกับระบบ Overlimit Value',
  // Support Type
  'Attack Support':        'สามารถเพิ่ม Attack ให้กับเพื่อนร่วมทีม',
  'Physical DMG Support':  'สามารถเพิ่ม Physical Damage ให้เพื่อนร่วมทีม รวมถึงลด Defense ของศัตรู',
  'Magic DMG Support':     'สามารถเพิ่ม Magic Damage ให้เพื่อนร่วมทีม รวมถึงลด Magic Resistance ของศัตรู',
  'True DMG Support':      'สามารถเพิ่มความเสียหายจริง (True DMG) ให้เพื่อนร่วมทีม',
  'Normal Attack DMG Support': 'สามารถเพิ่มความเสียหายจาก Normal Attack ให้เพื่อนร่วมทีม',
  'Skill DMG Support':     'สามารถเพิ่มความเสียหายจากสกิลให้เพื่อนร่วมทีม',
  'CRIT Support':          'สามารถเพิ่ม CRIT Rate หรือ CRIT Damage ให้เพื่อนร่วมทีม',
  'Attack Speed Support':  'สามารถเพิ่ม Attack Speed ให้เพื่อนร่วมทีม',
  'Summons Support':       'สามารถเพิ่มประสิทธิภาพให้กับ Summons ของทีม',
  'Energy Recovery':       'สามารถช่วยฟื้นฟู Energy ให้กับเพื่อนร่วมทีม',
  'Special Energy Recovery':   'สามารถช่วยฟื้นฟู Special Energy รูปแบบพิเศษ',
  'Chief Energy Recovery': 'สามารถฟื้นฟู Chief Energy ให้กับ Chief',
  'Defense Support':       'สามารถเพิ่มค่าป้องกันหรือลดความเสียหายที่เพื่อนร่วมทีมได้รับ',
  'Healing Support':       'สามารถฮีลฟื้นฟู HP ให้กับเพื่อนร่วมทีม',
  'Shield Support':        'สามารถสร้างโล่ป้องกัน (Shield) ให้กับเพื่อนร่วมทีม',
  'Special Support':       'สามารถมอบเอฟเฟกต์สนับสนุนพิเศษอื่นๆ ให้กับทีม',
  // Control Type
  'Fear':                  'สามารถทำให้ศัตรูติดสถานะ Fear ทำให้หยุดเคลื่อนไหว',
  'Stun':                  'สามารถทำให้ศัตรูติดสถานะ Stun หยุดการกระทำทั้งหมด',
  'Petrification':         'สามารถทำให้ศัตรูติดสถานะ Petrification กลายเป็นหิน',
  'Freeze':                'สามารถทำให้ศัตรูติดสถานะ Freeze หยุดการเคลื่อนไหว',
  'Special Control':       'มีกลไก Control พิเศษที่ไม่เข้ากับหมวดมาตรฐาน',
  // Special Effect
  'Slow Down':             'สามารถลดความเร็วการเคลื่อนที่หรือโจมตีของศัตรู',
  'Dispel':                'สามารถลบบัฟที่มีผลบวกออกจากศัตรู',
  'Purify':                'สามารถลบดีบัฟหรือสถานะลบออกจากเพื่อนร่วมทีม',
  'Revival':               'สามารถฟื้นคืนชีพเพื่อนร่วมทีมที่ถูก KO',
  'Damage Sharing':        'สามารถแบ่งรับความเสียหายที่เพื่อนร่วมทีมจะได้รับ',
  'Control Immunity':      'สามารถมอบภูมิคุ้มกันสถานะควบคุม (Control) ให้ตนเองหรือเพื่อนร่วมทีม',
  'Lethality Immunity':    'สามารถป้องกันไม่ให้เพื่อนร่วมทีมถูก KO ในคราวเดียว',
  'Invisibility Removal':  'สามารถเปิดเผยศัตรูที่ซ่อนตัวหรืออยู่ในสถานะ Invisibility',
}
