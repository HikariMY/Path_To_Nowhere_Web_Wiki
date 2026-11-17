-- ============================================================
-- PTN Wiki TH — เนื้อหาเริ่มต้นของไกด์โหมด (รันหลัง supabase_migration_game_modes.sql)
-- ============================================================
-- ข้อมูล Global เช็กในเกมเซิร์ฟ Global เมื่อ 16 พ.ย. 2569 · ข้อมูลเซิร์ฟจีนสรุปเองจาก BWIKI พร้อมเครดิต
-- ภาพจากในเกมยังไม่ได้ใส่ — อัปโหลดผ่านหน้าแอดมิน → ไกด์โหมด
-- รันซ้ำได้: โหมดที่มี slug อยู่แล้วจะข้าม (ไม่ทับข้อมูลที่แอดมินแก้ไว้) · แหล่งอ้างอิงที่มีลิงก์เดิมแล้วจะข้าม
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

insert into public.game_modes (slug, name, cn_name, verified, in_global, locked, global_menu, path, tag, summary, sort_order,
  global_rules, stages_title, stages, season_label, season_trait, season_ends, season_bosses, tips,
  cn_note, cn_rules, cn_season_label, cn_season_effect, cn_buffs, cn_tips)
values ($t$dark-domain$t$, $t$Dark Area$t$, $t$暗域$t$, true, true, false, $t$Broken Frontline$t$, $t$DisCity → DisSea → Broken Frontline → ZONE-04 Dark Area$t$, $t$Score Attack · Weekly$t$, $t$ด่านสุดท้ายของ Broken Frontline หลังผ่าน Low / Medium / High-Risk Area แล้ว วัดคะแนนจากความเร็วในการเคลียร์และล้ม Boss ยิ่งใช้ Sinner และ Buff น้อยยิ่งได้คะแนนโบนัส$t$, 10,
  $j$[{"title":"รอบ","body":"Broken Frontline รีเซ็ตทุก 7 วัน (จันทร์ 05:00 – จันทร์ถัดไป 04:00 เวลาไทย)"},{"title":"ลำดับ","body":"Low-Risk Area → Medium-Risk Area → High-Risk Area แล้วจึงเข้า Dark Area"},{"title":"คะแนนเวลา","body":"Clearance Time และ Boss Kill Time อย่างละไม่เกิน 100,000 — นับถอยจาก 150 วินาที ยิ่งเร็วยิ่งได้มาก"},{"title":"คะแนนศัตรู","body":"Mob 10,000 · Elite 20,000 (หารตามจำนวนตัว) · Boss สูงสุด 30,000 ตาม % HP ที่ลดได้"},{"title":"โบนัสเล่นยาก","body":"Buff ได้ 5,000 ต่อ Buff ที่ไม่เลือก (เลือกได้ 3) · Sinner ได้ 5,000 ต่อช่องที่ไม่ลง (ลงได้ 6)"}]$j$::jsonb, null, $j$[]$j$::jsonb,
  $t$Stage 33$t$, $t$Oblivion Light$t$, $t$2026-12-21T05:00:00+07:00$t$::timestamptz, $j$["Misfortune Incarnate","Model Divine Punishment","Unsealed Calamity"]$j$::jsonb, $j$["ล้ม Boss ให้เร็วก่อน เพราะ Boss Kill Time กับคะแนน Boss รวมกันเป็นส่วนใหญ่ของคะแนน","อย่าปล่อย Mob / Elite หลุด คะแนนส่วนนี้ได้ตามจำนวนตัวที่ฆ่า","ถ้าทีมแรงพอ ลองลด Buff หรือจำนวน Sinner เพื่อเก็บโบนัสครั้งละ 5,000"]$j$::jsonb,
  null, $j$[{"title":"คะแนน","body":"สูตรเก่าของเซิร์ฟจีน: Boss 75,000 · Elite 30,000 · Mob 15,000 · เวลา 150 วินาที หักวินาทีละ 1,200"},{"title":"Frame","body":"นาฬิกาละเอียดถึงระดับ Frame (1 วินาที = 15 Frame) ผู้เล่นจีนกดสกิลให้ตรง Frame เพื่อเก็บคะแนนเวลา"},{"title":"Wave","body":"Wave ถัดไปเกิดตามเวลาที่ Wave ก่อนหน้าตาย Boss ส่วนใหญ่อยู่ในด่านตั้งแต่เริ่ม"}]$j$::jsonb, $t$Season 35$t$, $t$Summon ของ Sinner สายโจมตีทำดาเมจเพิ่ม 30% และติด Debuff ให้เป้าหมายรับ Skill DMG เพิ่ม 1% ต่อ Stack (5 วินาที สูงสุด 30 Stack)$t$, $j$[{"title":"ทุกคลาส","body":"ATK +15% · Physical / Magic / True DMG +30% · Normal ATK / Skill DMG +30% · Crit Rate +25% · Crit DMG +50%"},{"title":"Endura","body":"ATK +15% · ศัตรูช่องเดียวกันรับดาเมจเพิ่ม 20%"},{"title":"Fury","body":"ATK +15% · ดาเมจต่อศัตรูที่ Core Break +20%"},{"title":"Umbra","body":"หลังใช้ Ultimate ได้ Crit Rate +25% · Crit DMG +50% นาน 5 วินาที"},{"title":"Reticle","body":"Normal ATK DMG +20% · ATK Speed +20%"},{"title":"Arcane","body":"Energy Regen +20% · Skill DMG +10%"},{"title":"Catalyst","body":"Energy Regen +40% · ATK +20%"}]$j$::jsonb, $j$[]$j$::jsonb)
on conflict (slug) do nothing;

insert into public.game_mode_sources (mode_id, title, author, url, checked_at, sort_order)
select id, $t$暗域论 (ทฤษฎีคะแนนของโหมดนี้)$t$, $t$宴与猫$t$, $t$https://wiki.biligame.com/wqmt/%E6%9A%97%E5%9F%9F%E8%AE%BA$t$, $t$2026-06-18$t$::date, 0
from public.game_modes gm where gm.slug = $t$dark-domain$t$
  and not exists (select 1 from public.game_mode_sources x where x.mode_id = gm.id and x.url = $t$https://wiki.biligame.com/wqmt/%E6%9A%97%E5%9F%9F%E8%AE%BA$t$);

insert into public.game_mode_sources (mode_id, title, author, url, checked_at, sort_order)
select id, $t$部分高难本信息记录 (ข้อมูล Season ปัจจุบัน)$t$, $t$【多人测试】$t$, $t$https://wiki.biligame.com/wqmt/%E9%83%A8%E5%88%86%E9%AB%98%E9%9A%BE%E6%9C%AC%E4%BF%A1%E6%81%AF%E8%AE%B0%E5%BD%95$t$, $t$2026-11-10$t$::date, 1
from public.game_modes gm where gm.slug = $t$dark-domain$t$
  and not exists (select 1 from public.game_mode_sources x where x.mode_id = gm.id and x.url = $t$https://wiki.biligame.com/wqmt/%E9%83%A8%E5%88%86%E9%AB%98%E9%9A%BE%E6%9C%AC%E4%BF%A1%E6%81%AF%E8%AE%B0%E5%BD%95$t$);

insert into public.game_modes (slug, name, cn_name, verified, in_global, locked, global_menu, path, tag, summary, sort_order,
  global_rules, stages_title, stages, season_label, season_trait, season_ends, season_bosses, tips,
  cn_note, cn_rules, cn_season_label, cn_season_effect, cn_buffs, cn_tips)
values ($t$ashen-tide$t$, $t$Tide Of Ashen$t$, $t$灰烬之潮$t$, true, true, false, null, null, $t$Boss Rush · Rotating$t$, $t$ด่าน Boss หมุนเวียน เปลี่ยน Boss ทุก Season ก่อนจัดทีมควรดูกลไกของ Boss รอบนั้น$t$, 20,
  $j$[{"title":"รูปแบบ","body":"สู้ Boss ที่มีกลไกเฉพาะตัว เปลี่ยนทุก Season"},{"title":"ควรดูก่อนเข้า","body":"สกิลของ Boss · Resistance · จังหวะเปลี่ยน Phase"}]$j$::jsonb, null, $j$[]$j$::jsonb,
  null, null, null, $j$[]$j$::jsonb, $j$["ตัวเลข Boss ในแหล่งอ้างอิงมาจากผู้เล่นทดสอบเอง อาจคลาดเคลื่อนเล็กน้อย"]$j$::jsonb,
  null, $j$[]$j$::jsonb, $t$Season 15$t$, $t$เซิร์ฟจีนมี Boss ใหม่ และรอบพิเศษที่นำ Boss เก่ากลับมาแบบ Remake ดูรายละเอียด Boss ได้ที่แหล่งอ้างอิง$t$, $j$[]$j$::jsonb, $j$[]$j$::jsonb)
on conflict (slug) do nothing;

insert into public.game_mode_sources (mode_id, title, author, url, checked_at, sort_order)
select id, $t$部分高难本信息记录$t$, $t$【多人测试】$t$, $t$https://wiki.biligame.com/wqmt/%E9%83%A8%E5%88%86%E9%AB%98%E9%9A%BE%E6%9C%AC%E4%BF%A1%E6%81%AF%E8%AE%B0%E5%BD%95$t$, $t$2026-11-10$t$::date, 0
from public.game_modes gm where gm.slug = $t$ashen-tide$t$
  and not exists (select 1 from public.game_mode_sources x where x.mode_id = gm.id and x.url = $t$https://wiki.biligame.com/wqmt/%E9%83%A8%E5%88%86%E9%AB%98%E9%9A%BE%E6%9C%AC%E4%BF%A1%E6%81%AF%E8%AE%B0%E5%BD%95$t$);

insert into public.game_modes (slug, name, cn_name, verified, in_global, locked, global_menu, path, tag, summary, sort_order,
  global_rules, stages_title, stages, season_label, season_trait, season_ends, season_bosses, tips,
  cn_note, cn_rules, cn_season_label, cn_season_effect, cn_buffs, cn_tips)
values ($t$extreme-challenge$t$, $t$Extreme Challenge$t$, $t$极限挑战$t$, false, false, false, null, null, $t$Character Challenge$t$, $t$ด่านความยากสูงที่ออกแบบรอบ Sinner ตัวเดียว ใช้ทดสอบความเข้าใจตัวนั้นแบบสุดทาง ตอนนี้ยังไม่พบในเซิร์ฟ Global$t$, 30,
  $j$[]$j$::jsonb, null, $j$[]$j$::jsonb,
  null, null, null, $j$[]$j$::jsonb, $j$["อ่านสกิลและ Shackle ของ Sinner เจ้าของด่านให้ครบก่อนเข้า"]$j$::jsonb,
  null, $j$[{"title":"รูปแบบ","body":"ด่านเดี่ยวความยากสูง เน้นหรือบังคับใช้ Sinner เจ้าของด่าน"}]$j$::jsonb, $t$ล่าสุด$t$, $t$ด่านของ Arancia$t$, $j$[]$j$::jsonb, $j$[]$j$::jsonb)
on conflict (slug) do nothing;

insert into public.game_mode_sources (mode_id, title, author, url, checked_at, sort_order)
select id, $t$部分高难本信息记录$t$, $t$【多人测试】$t$, $t$https://wiki.biligame.com/wqmt/%E9%83%A8%E5%88%86%E9%AB%98%E9%9A%BE%E6%9C%AC%E4%BF%A1%E6%81%AF%E8%AE%B0%E5%BD%95$t$, $t$2026-11-10$t$::date, 0
from public.game_modes gm where gm.slug = $t$extreme-challenge$t$
  and not exists (select 1 from public.game_mode_sources x where x.mode_id = gm.id and x.url = $t$https://wiki.biligame.com/wqmt/%E9%83%A8%E5%88%86%E9%AB%98%E9%9A%BE%E6%9C%AC%E4%BF%A1%E6%81%AF%E8%AE%B0%E5%BD%95$t$);

insert into public.game_modes (slug, name, cn_name, verified, in_global, locked, global_menu, path, tag, summary, sort_order,
  global_rules, stages_title, stages, season_label, season_trait, season_ends, season_bosses, tips,
  cn_note, cn_rules, cn_season_label, cn_season_effect, cn_buffs, cn_tips)
values ($t$dreamscape$t$, $t$Memoir$t$, $t$梦境$t$, true, true, false, $t$Mirage$t$, $t$Lobby → Bureau → Mirage → Memoir$t$, $t$Character Story$t$, $t$ด่านความทรงจำของ Sinner แต่ละตัว ("A Dream Within a Dream") ด่านละ 1 Sinner แบ่งเป็น Phase I – IV ต้องมี Sinner คนนั้นก่อนถึงจะเข้าได้$t$, 40,
  $j$[{"title":"รูปแบบ","body":"ด่านละ 1 Sinner แต่ละด่านมี 4 Phase (I – IV) เปิดทีละ Phase"},{"title":"ปลดล็อก","body":"ต้องมี Sinner เจ้าของด่านในบัญชี"},{"title":"ค่าเข้า","body":"ใช้ไอเทมขวด 1 ชิ้นต่อการเข้า 1 ครั้ง"},{"title":"รางวัล","body":"Phase I ได้ไอเทมคริสตัลสีฟ้า ×100"},{"title":"เมนูข้างเคียง","body":"ในหน้า Mirage มีอีกแท็บคือ Heartgaze"}]$j$::jsonb, $t$ด่านในเซิร์ฟ Global (8 ด่าน)$t$, $j$[{"title":"Fall Into the Stars","body":"ยังไม่ทราบ"},{"title":"Crossing the Void Alone","body":"Lichen"},{"title":"Wilderness Trek","body":"Mantis"},{"title":"Eternal Watch","body":"Vanilla"},{"title":"Deep Sea Reverie","body":"Pylgia"},{"title":"Defying Fate","body":"Chengxiao"},{"title":"Black Tide Revelation","body":"Shin"},{"title":"Fire and Eternity","body":"Hestia"}]$j$::jsonb,
  null, null, null, $j$[]$j$::jsonb, $j$["ด่านจะไม่เปิดจนกว่าจะมี Sinner เจ้าของด่าน ถ้าอยากเล่นด่านไหนให้ดูชื่อ Sinner ในตารางก่อน"]$j$::jsonb,
  $t$ด่านที่มีไกด์ในเซิร์ฟจีน (Bai Yi · Victoria · Hecate · Tsukumo · Lisa) ไม่ตรงกับ 8 ด่านใน Global ไกด์เส้นทางด้านล่างจึงอาจยังใช้ไม่ได้$t$, $j$[{"title":"รูปแบบ","body":"เดินบนแผนที่ หลบศัตรู แลกไอเทมกับ NPC และเลือกบทสนทนาให้ถูกเพื่อไปถึงทางออก"},{"title":"ด่านที่มีไกด์","body":"Bai Yi · Victoria · Hecate · Tsukumo · Lisa"}]$j$::jsonb, null, null, $j$[]$j$::jsonb, $j$["ด่านของ Victoria ยาวมาก ต้องแลก Rose Seed กับ Rose หลายรอบ อย่าใช้หมดก่อนถึงประตู","ด่านของ Hecate ให้เลือก \"ลด\" ที่กลไกทั้ง 3 จุด ทำจุดไหนก่อนก็ได้","อย่าเพิ่งเดินไปที่เครื่องหมาย ! สีแดงข้างทาง จะชนศัตรู"]$j$::jsonb)
on conflict (slug) do nothing;

insert into public.game_mode_sources (mode_id, title, author, url, checked_at, sort_order)
select id, $t$梦境图解 (ภาพเส้นทางทุกด่าน)$t$, $t$暮色浮华$t$, $t$https://wiki.biligame.com/wqmt/%E6%A2%A6%E5%A2%83%E5%9B%BE%E8%A7%A3$t$, $t$2026-06-18$t$::date, 0
from public.game_modes gm where gm.slug = $t$dreamscape$t$
  and not exists (select 1 from public.game_mode_sources x where x.mode_id = gm.id and x.url = $t$https://wiki.biligame.com/wqmt/%E6%A2%A6%E5%A2%83%E5%9B%BE%E8%A7%A3$t$);

insert into public.game_modes (slug, name, cn_name, verified, in_global, locked, global_menu, path, tag, summary, sort_order,
  global_rules, stages_title, stages, season_label, season_trait, season_ends, season_bosses, tips,
  cn_note, cn_rules, cn_season_label, cn_season_effect, cn_buffs, cn_tips)
values ($t$eerie-echoes$t$, $t$Eerie Echoes$t$, $t$诡境余音$t$, false, false, false, null, null, $t$Maze · Multi-route$t$, $t$เขาวงกตในหมอก มีหลายเส้นทาง ต้องเก็บ Memory Fragment และลอบโจมตีศัตรูจากด้านหลังเพื่อผ่าน ตอนนี้ยังไม่พบในเซิร์ฟ Global$t$, 50,
  $j$[]$j$::jsonb, null, $j$[]$j$::jsonb,
  null, null, null, $j$[]$j$::jsonb, $j$["X-3 มี 2 เส้นทาง เส้นทางที่ 2 ต้องจ่าย Purple Gem เป็นค่าผ่านทาง","Z-3 ต้องเก็บ Memory Fragment ให้ครบ ถอยหลังหนึ่งก้าวเพื่อหลบศัตรูได้"]$j$::jsonb,
  null, $j$[{"title":"ด่าน","body":"X-3 Fog Zone · Y-3 Ruins · Z-3 Deep Layer"},{"title":"กลไก","body":"เปิดหมอก · ล่อศัตรู · ลอบโจมตีด้านหลัง · เลือกตัวเลือกตามจุด"}]$j$::jsonb, null, null, $j$[]$j$::jsonb, $j$[]$j$::jsonb)
on conflict (slug) do nothing;

insert into public.game_mode_sources (mode_id, title, author, url, checked_at, sort_order)
select id, $t$诡境余音迷宫图解$t$, $t$暮色浮华$t$, $t$https://wiki.biligame.com/wqmt/%E8%AF%A1%E5%A2%83%E4%BD%99%E9%9F%B3%E8%BF%B7%E5%AE%AB%E5%9B%BE%E8%A7%A3$t$, $t$2026-06-18$t$::date, 0
from public.game_modes gm where gm.slug = $t$eerie-echoes$t$
  and not exists (select 1 from public.game_mode_sources x where x.mode_id = gm.id and x.url = $t$https://wiki.biligame.com/wqmt/%E8%AF%A1%E5%A2%83%E4%BD%99%E9%9F%B3%E8%BF%B7%E5%AE%AB%E5%9B%BE%E8%A7%A3$t$);

insert into public.game_modes (slug, name, cn_name, verified, in_global, locked, global_menu, path, tag, summary, sort_order,
  global_rules, stages_title, stages, season_label, season_trait, season_ends, season_bosses, tips,
  cn_note, cn_rules, cn_season_label, cn_season_effect, cn_buffs, cn_tips)
values ($t$oblivion-pit$t$, $t$Oblivion Pit$t$, null, true, true, false, $t$DisSea$t$, $t$DisCity → DisSea → Oblivion Pit$t$, $t$Depth Dive · Rotating$t$, $t$ดำดิ่งลง 5 ชั้น ลึก 1,000 – 3,000 เมตร แต่ละชั้นกำหนด Sinner ที่ต้องใช้ ชั้นที่เคลียร์แล้วกด Raid เพื่อกวาดรางวัลได้$t$, 60,
  $j$[{"title":"โครงสร้าง","body":"5 ชั้น ลึกขึ้นชั้นละ 500 เมตร จาก 1,000 ถึง 3,000 เมตร"},{"title":"Designate Sinner","body":"แต่ละชั้นกำหนด Sinner ที่ต้องใช้ และต้องเลเวล 15 ขึ้นไป"},{"title":"Attempts","body":"จำนวนครั้งที่เข้าได้มีจำกัดต่อรอบ"},{"title":"Raid","body":"ชั้นที่เคลียร์แล้วกด Raid เพื่อกวาดรางวัลได้โดยไม่ต้องเล่นซ้ำ"},{"title":"ร้านค้า","body":"มีร้านค้าของโหมด (ปุ่มรถเข็นมุมขวาบน)"}]$j$::jsonb, $t$ชั้นของรอบนี้$t$, $j$[{"title":"01 Limbo Resonance","body":"1,000 m"},{"title":"02 Death by Sand","body":"1,500 m"},{"title":"03 Square Haze","body":"2,000 m"},{"title":"04 Ominous Abyss","body":"2,500 m"},{"title":"05 Paradise Illusion","body":"3,000 m"}]$j$::jsonb,
  $t$Remnants of the Depth$t$, null, $t$2026-12-08T04:59:59+07:00$t$::timestamptz, $j$[]$j$::jsonb, $j$["เช็ก Designate Sinner ของแต่ละชั้นก่อนเริ่ม ตัวที่กำหนดต้องเลเวล 15 ขึ้นไป","ชั้นไหนเคลียร์แล้วใช้ Raid กวาดได้ ไม่ต้องเสีย Attempts เล่นซ้ำ"]$j$::jsonb,
  null, $j$[]$j$::jsonb, null, null, $j$[]$j$::jsonb, $j$[]$j$::jsonb)
on conflict (slug) do nothing;

insert into public.game_modes (slug, name, cn_name, verified, in_global, locked, global_menu, path, tag, summary, sort_order,
  global_rules, stages_title, stages, season_label, season_trait, season_ends, season_bosses, tips,
  cn_note, cn_rules, cn_season_label, cn_season_effect, cn_buffs, cn_tips)
values ($t$eternal-nightmare$t$, $t$Eternal Nightmare$t$, null, true, true, false, $t$DisSea$t$, $t$DisCity → DisSea → Eternal Nightmare$t$, $t$Roguelike · Exploration$t$, $t$สำรวจ Nightmare Realm ที่เปลี่ยนทุกครั้งด้วยทีม Sinner เฉพาะโหมด หาทางออกให้ได้ก่อน SAN หมด และสะสม Realm Cube ไปปลดบัฟถาวร$t$, 70,
  $j$[{"title":"ทีม","body":"จัดทีม Sinner เฉพาะโหมด ทุกตัวถูกตั้งเป็น Lv.90 · Skill Lv.10 · Exclusive Crimebrand Phase 3 ไม่ต้องเลี้ยงตัวมาก่อน"},{"title":"SAN","body":"หาทางออกก่อน SAN หมด ถ้า SAN หมดจะกลับไปเริ่มใหม่ตั้งแต่ต้น"},{"title":"Nightmare Realm Stele","body":"เก็บ Realm Cube ไปจุดโหนดเพื่อรับบัฟถาวรสำหรับรอบถัดไป ได้ Cube ทั้งตอนผ่านและไม่ผ่าน"},{"title":"ทีมสำเร็จรูป","body":"King of Combat · Bullseye · Umbra CRIT · Arcane Explosion · Life Loss"},{"title":"เมนูย่อย","body":"Illusory Moon Memory · Memories of the Past · Nightmare Realm Stele · Nightmare Challenge"},{"title":"ประเภท","body":"สลับได้ด้วยปุ่ม Change Type เช่น Hunting Shade / Tracing Back"}]$j$::jsonb, $t$พื้นที่ที่ปลดล็อกหลังเคลียร์ Hunting Shade$t$, $j$[{"title":"Heart of Eternity","body":"พื้นที่ใหม่"},{"title":"Embers of Long Night","body":"พื้นที่ใหม่"},{"title":"Echoless Dive","body":"ทางแยกใน Moon Phase Zero"}]$j$::jsonb,
  null, null, null, $j$[]$j$::jsonb, $j$["ถึงจะไปไม่ถึงทางออกก็ยังได้ Realm Cube เอาไปจุดโหนดใน Stele ก่อนลองใหม่","ยังไม่รู้จะจัดทีมแบบไหน เริ่มจากทีมสำเร็จรูปที่ตรงกับสายที่ถนัด"]$j$::jsonb,
  null, $j$[]$j$::jsonb, null, null, $j$[]$j$::jsonb, $j$[]$j$::jsonb)
on conflict (slug) do nothing;

insert into public.game_modes (slug, name, cn_name, verified, in_global, locked, global_menu, path, tag, summary, sort_order,
  global_rules, stages_title, stages, season_label, season_trait, season_ends, season_bosses, tips,
  cn_note, cn_rules, cn_season_label, cn_season_effect, cn_buffs, cn_tips)
values ($t$intertidal-exploration$t$, $t$Intertidal Exploration$t$, null, true, true, true, $t$DisSea$t$, $t$DisCity → DisSea → Intertidal Exploration$t$, $t$Exploration$t$, $t$โหมดสำรวจใน DisSea ที่ยังล็อกอยู่ เปิดเมื่อสลับ Eternal Nightmare เป็นประเภท Tracing Back$t$, 80,
  $j$[{"title":"ปลดล็อก","body":"กดปุ่ม Change Type ที่ Eternal Nightmare แล้วสลับเป็น [Eternal Nightmare – Tracing Back]"},{"title":"รายละเอียด","body":"ยังไม่ได้เข้าไปดูข้างใน จะอัปเดตเมื่อปลดล็อก"}]$j$::jsonb, null, $j$[]$j$::jsonb,
  null, null, null, $j$[]$j$::jsonb, $j$[]$j$::jsonb,
  null, $j$[]$j$::jsonb, null, null, $j$[]$j$::jsonb, $j$[]$j$::jsonb)
on conflict (slug) do nothing;

insert into public.game_modes (slug, name, cn_name, verified, in_global, locked, global_menu, path, tag, summary, sort_order,
  global_rules, stages_title, stages, season_label, season_trait, season_ends, season_bosses, tips,
  cn_note, cn_rules, cn_season_label, cn_season_effect, cn_buffs, cn_tips)
values ($t$salva-chaos-shadow$t$, $t$SALVA Chaos: Shadow$t$, null, true, true, false, $t$DisSea$t$, $t$DisCity → DisSea → Dis Shadow → SALVA Chaos: Shadow (EX-01)$t$, $t$Challenge · EX$t$, $t$ด่าน EX ที่เข้าจาก Dis Shadow บนแผนที่ DisSea มี 3 ด่านกับภารกิจสะสม 6 ข้อ$t$, 90,
  $j$[{"title":"ทางเข้า","body":"กด Dis Shadow บนแผนที่ DisSea ป้ายบนแผนที่จะบอกว่า Shadow อยู่ตรงไหน (ตอนเช็กอยู่ที่ Aureate Regale)"},{"title":"Mission Progress","body":"ภารกิจสะสม 6 ข้อ"},{"title":"โบนัส","body":"ตอนเช็กมี Drop Rate Up"}]$j$::jsonb, $t$ด่าน$t$, $j$[{"title":"EX1-1S","body":""},{"title":"EX1-2","body":""},{"title":"EX1-3","body":""}]$j$::jsonb,
  null, null, null, $j$[]$j$::jsonb, $j$[]$j$::jsonb,
  null, $j$[]$j$::jsonb, null, null, $j$[]$j$::jsonb, $j$[]$j$::jsonb)
on conflict (slug) do nothing;

insert into public.game_modes (slug, name, cn_name, verified, in_global, locked, global_menu, path, tag, summary, sort_order,
  global_rules, stages_title, stages, season_label, season_trait, season_ends, season_bosses, tips,
  cn_note, cn_rules, cn_season_label, cn_season_effect, cn_buffs, cn_tips)
values ($t$main-story$t$, $t$Main Story$t$, $t$主线$t$, true, true, false, null, null, $t$Permanent$t$, $t$ด่านเนื้อเรื่องหลัก แบ่งเป็นหลายพื้นที่ แต่ละบทมีด่านพิเศษแทรกอยู่$t$, 100,
  $j$[{"title":"ประเภทด่าน","body":"ด่านปกติ (เช่น 1-1) · Sd / Sp ด่านพิเศษ · Mz ด่านเขาวงกต · Re ด่านเวอร์ชันยากของด่านเดิม"}]$j$::jsonb, null, $j$[]$j$::jsonb,
  null, null, null, $j$[]$j$::jsonb, $j$["ด่านที่ผู้เล่นจีนติดบ่อยคือ 12-6 และ 4-12 (ด่าน Boss)"]$j$::jsonb,
  null, $j$[{"title":"ไกด์ที่มี","body":"ผ่าน 12-6 แบบไม่ยืม Support · ผ่าน 7-12 ด้วยตัวแรงก์ต่ำ Lv.40 · ผ่าน 2-9 แบบเลเวลต่ำ"}]$j$::jsonb, null, null, $j$[]$j$::jsonb, $j$[]$j$::jsonb)
on conflict (slug) do nothing;

insert into public.game_mode_sources (mode_id, title, author, url, checked_at, sort_order)
select id, $t$关卡一览 (รายชื่อด่านทั้งหมด)$t$, $t$BWIKI$t$, $t$https://wiki.biligame.com/wqmt/%E5%85%B3%E5%8D%A1%E4%B8%80%E8%A7%88$t$, $t$2026-06-18$t$::date, 0
from public.game_modes gm where gm.slug = $t$main-story$t$
  and not exists (select 1 from public.game_mode_sources x where x.mode_id = gm.id and x.url = $t$https://wiki.biligame.com/wqmt/%E5%85%B3%E5%8D%A1%E4%B8%80%E8%A7%88$t$);

insert into public.game_mode_sources (mode_id, title, author, url, checked_at, sort_order)
select id, $t$其他攻略 (รวมไกด์ผ่านด่าน)$t$, $t$หลายผู้เขียน$t$, $t$https://wiki.biligame.com/wqmt/%E5%85%B6%E4%BB%96%E6%94%BB%E7%95%A5$t$, $t$2026-06-18$t$::date, 1
from public.game_modes gm where gm.slug = $t$main-story$t$
  and not exists (select 1 from public.game_mode_sources x where x.mode_id = gm.id and x.url = $t$https://wiki.biligame.com/wqmt/%E5%85%B6%E4%BB%96%E6%94%BB%E7%95%A5$t$);

-- ตรวจผล: ควรเห็น 10 โหมด และจำนวนแหล่งอ้างอิงของแต่ละโหมด
select gm.slug, gm.name, count(s.id) as sources
from public.game_modes gm left join public.game_mode_sources s on s.mode_id = gm.id
group by gm.slug, gm.name, gm.sort_order
order by gm.sort_order;
