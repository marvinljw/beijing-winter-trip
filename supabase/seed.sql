-- Starting trip plan. Run once in Supabase → SQL Editor, after schema.sql.
insert into public.settings (key,value) values ('cnyPerSgd','5.4') on conflict (key) do nothing;

insert into public.days (date,city,headline,plan,area,food) values
  ('2026-12-24', 'Singapore → Hanoi', 'Fly to Hanoi · night stopover', 'Flight: Singapore ~4 pm → Hanoi ~7 pm
Overnight in Hanoi. Stay near the airport, or in the Old Quarter (about 45 min away) for a late pho or bun cha dinner.
Morning flight tomorrow, so stay close to the airport.', 'Old Quarter, Hanoi', 'Phở Gia Truyền (49 Bát Đàn) — the classic beef pho; check hours if you land late
Bún Chả Hương Liên — grilled pork with noodles, the "Obama combo"
Tạ Hiện (Beer Street) — street stalls and cheap beer open late'),
  ('2026-12-25', 'Hanoi → Beijing', 'Hanoi → Beijing · Qianmen and Peking duck', 'Flight: Hanoi ~10 am → Beijing ~2:30 pm
Immigration, then the Airport Express or a taxi into the city. Check in.
Evening: walk Qianmen Street and Dashilan hutong, then Peking duck for Christmas dinner.', 'Qianmen & Dashilan, Beijing', 'Quanjude Qianmen — the original Peking duck house, around since 1864
Xianyukou Food Street — old Beijing snacks: zhajiangmian, tanghulu, fried pastries
Duyichu — shaomai dumplings on Qianmen Street'),
  ('2026-12-26', 'Day trip', 'Great Wall day trip', 'Leave early for Mutianyu Great Wall: cable car up, toboggan down if it''s open in winter.
Afternoon: drive on to Gubei Water Town and see Simatai Great Wall lit up at night.
Dress for well below freezing. You''ll be back late.', 'Mutianyu Great Wall, Beijing', 'The Schoolhouse at Mutianyu — lunch near the Wall in an old village school
Mutianyu village restaurants — rainbow trout and home-style dishes
Gubei Water Town — dinner on the old street before the night views'),
  ('2026-12-27', 'Beijing → Chongli', 'Forbidden City, then train to Chongli', 'Morning: Forbidden City (book ahead with your passport; it opens around 8:30). Then a quick climb up Jingshan Park for the view.
Afternoon: high-speed train from Beijing North or Qinghe to Taizicheng (about 1 hr), then the resort shuttle.
Check in, pick up rentals, early night.', 'Forbidden City & Jingshan, Beijing', 'Siji Minfu (Forbidden City branch) — Peking duck by the palace moat; expect a queue
Qingfeng Baozi — quick steamed buns before the train
Hotpot in Chongli for dinner — the easy warm-up after a travel day'),
  ('2026-12-28', 'Chongli', 'Ski day 1 · Thaiwoo', 'Thaiwoo: good mix of beginner, intermediate and advanced runs.
Book a morning lesson if anyone is new, then ski freely after lunch.
Evening: hotpot and a soak.', 'Thaiwoo Ski Resort, Chongli', 'Youmian wowo (莜面窝窝) — Zhangjiakou''s oat-noodle rolls, the local dish to try
Lamb hotpot in Thaiwoo village — warms you up after skiing
Slope-side lodges — quick lunch without leaving the mountain (pricey)'),
  ('2026-12-29', 'Chongli', 'Ski day 2 · Genting or Wanlong', 'Try another resort. Genting Secret Garden hosted the Olympic freestyle and snowboard events. Wanlong has more steep and black runs.
Beginners can stay on Thaiwoo''s easy slopes.', 'Genting Resort Secret Garden, Chongli', 'Genting slope-side restaurants — lunch without taking your boots off
Taizicheng Ice & Snow Town — restaurants and food stalls by the station in the evening
Lamb skewers (yangrou chuan) — Hebei does them well; look for a smoky grill'),
  ('2026-12-30', 'Chongli → Beijing', 'Last ski morning, train back', 'Ski the morning, return rentals and check out.
Afternoon or evening: train back to Beijing. Some trains don''t return to Beijing North, so check the station on your ticket.
Evening, if you have energy: skate or ride ice bikes on the Beihai Park rink.', 'Beihai Park, Beijing', 'Fangshan Restaurant — imperial-court dishes inside Beihai Park; check opening hours
Huguosi Xiaochi — old Beijing snacks, cheap and quick
Nanmen Shuanrou — old-style copper-pot mutton hotpot'),
  ('2026-12-31', 'Beijing', 'New Year''s Eve', 'Sleep in after skiing. Afternoon: Lama Temple and the Wudaoying hutong cafés.
Night: the countdown. Last year''s big ones were Shougang Park (Big Air), 798 Art District (free night event) and Jingshan for the view. Check this year''s line-up in December and get there by 8 pm.', 'Lama Temple & Wudaoying Hutong, Beijing', 'Hu Da on Gui Jie — famous spicy crayfish, open late; queues before the countdown
Xu Xiang Zhai — vegetarian buffet opposite the Lama Temple
Wudaoying cafés — coffee and a warm-up between sights'),
  ('2027-01-01', 'Beijing', 'New Year''s Day in the hutongs', 'Public holiday, so expect crowds. Stay central and keep it easy.
Late morning: Nanluoguxiang and the Drum and Bell Towers.
Afternoon: skate at the Shichahai outdoor rink (use the supervised area), then Houhai.
Optional: Olympic Forest Park ice and snow carnival, if it runs again this winter.', 'Nanluoguxiang & Drum Tower, Beijing', 'Yaoji Chaogan — Beijing liver stew and baozi by the Drum Tower
Wenyu Nailao — creamy Beijing milk pudding on Nanluoguxiang
Kaorouji — Beijing barbecue since 1848, right by Shichahai'),
  ('2027-01-02', 'Beijing', 'Universal Beijing Resort', 'Universal Beijing Resort for the whole day. Buy tickets ahead, because the holiday weekend will be busy.
Backup plan: Summer Palace, where you can skate on Kunming Lake once it''s frozen.
Last big dinner: hotpot or Peking duck round two. Pack tonight.', 'Universal Beijing Resort, Beijing', 'Universal CityWalk — restaurants outside the park gates, no ticket needed
Da Dong — modern Peking duck for the last big dinner; book ahead
Haidilao — hotpot with famous service, open late if the park runs long'),
  ('2027-01-03', 'Beijing → Hanoi', 'Temple of Heaven, fly to Hanoi', 'Early: Temple of Heaven (opens around 6:00, with locals doing tai chi). Grab souvenirs on the way back.
Leave for the airport around midday. It''s the last day of the holiday, so allow extra time.
Flight: Beijing ~3:30 pm → Hanoi ~6:30 pm
Overnight in Hanoi, near the airport.', 'Temple of Heaven, Beijing', 'Jianbing from a street cart — Beijing''s breakfast crepe
Qingfeng Baozi — steamed buns, quick and cheap before the airport'),
  ('2027-01-04', 'Hanoi → Singapore', 'Hanoi → Singapore', 'Flight: Hanoi ~8 am → Singapore ~12:30 pm
Early start for the airport. Home for lunch.', 'Noi Bai Airport, Hanoi', 'Bánh mì or phở near your airport hotel for breakfast
Egg coffee (cà phê trứng) — Hanoi''s specialty, if a café at the airport has it')
on conflict (date) do update set area=excluded.area, food=excluded.food;

insert into public.tasks (id,title,who,due,tag,note,done,created_at) values
  ('s01', 'Book flights Singapore ⇄ Beijing via Hanoi', 'anyone', '', 'Book', '', true, timestamptz '2026-10-20 00:00:00+00' + interval '0 seconds'),
  ('s02', 'Check passport validity and China entry rules for your passport', 'everyone', '', 'Docs', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '1 seconds'),
  ('s03', 'Book Beijing hotel', 'anyone', '', 'Book', '', true, timestamptz '2026-10-20 00:00:00+00' + interval '2 seconds'),
  ('s04', 'Book Chongli ski stay for Mon 28 – Wed 30 Dec', 'anyone', '', 'Book', '', true, timestamptz '2026-10-20 00:00:00+00' + interval '3 seconds'),
  ('s05', 'Book high-speed train Beijing ⇄ Taizicheng (Chongli)', 'anyone', '', 'Book', 'Sales open about 15 days ahead', true, timestamptz '2026-10-20 00:00:00+00' + interval '4 seconds'),
  ('s06', 'Sort out lift passes and ski / board rental', 'anyone', '', 'Ski', '', true, timestamptz '2026-10-20 00:00:00+00' + interval '5 seconds'),
  ('s07', 'Travel insurance that covers skiing', 'everyone', '', 'Docs', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '6 seconds'),
  ('s08', 'Set up Alipay / WeChat Pay with your card', 'everyone', '', 'Money', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '7 seconds'),
  ('s09', 'Get an eSIM / roaming plan that works with Google and WhatsApp', 'everyone', '', 'Plan', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '8 seconds'),
  ('s10', 'Reserve Forbidden City tickets (need passport numbers)', 'anyone', '', 'Book', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '9 seconds'),
  ('s11', 'Book Mutianyu + Gubei Water Town day trip (driver or tour)', 'anyone', '2026-12-26', 'Book', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '10 seconds'),
  ('s12', 'Pack thermals, ski gloves, goggles. Chongli can drop below −20 °C', 'everyone', '', 'Pack', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '11 seconds'),
  ('s13', 'Check this year''s New Year''s Eve countdown events and book if needed', 'anyone', '2026-12-31', 'Plan', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '12 seconds'),
  ('s14', 'Buy Universal Beijing Resort tickets', 'anyone', '2027-01-02', 'Book', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '13 seconds'),
  ('s16', 'Book ski lesson for the first morning (if anyone is a beginner)', 'anyone', '2026-12-28', 'Ski', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '14 seconds'),
  ('s17', 'Book Hanoi hotel for 24 Dec (near the airport, morning flight next day)', 'anyone', '2026-12-24', 'Book', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '15 seconds'),
  ('s18', 'Book Hanoi airport hotel for 3 Jan (early flight next day)', 'anyone', '2027-01-03', 'Book', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '16 seconds'),
  ('s19', 'Check Vietnam entry rules for the overnight stopovers', 'everyone', '', 'Docs', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '17 seconds'),
  ('s20', 'Book Beijing airport → hotel transfer (or plan the Airport Express)', 'anyone', '2026-12-25', 'Book', '', false, timestamptz '2026-10-20 00:00:00+00' + interval '18 seconds')
on conflict (id) do nothing;

insert into public.ideas (id,title,city,when_text,note,link,ord) values
  ('i01', 'Forbidden City', 'Beijing', 'Half day · closed Mondays', 'Book ahead with your passport details.', '', 1),
  ('i02', 'Jingshan Park at sunset', 'Beijing', '1 hr', 'The best view over the Forbidden City''s roofs, especially after snow.', '', 2),
  ('i03', 'Skate at Shichahai', 'Beijing', 'Winter only', 'Big outdoor natural rink with skate rental. Stay in the supervised area.', '', 3),
  ('i04', 'Beihai Park ice rink', 'Beijing', 'Winter only', 'Ice sleds and ice bikes below the White Dagoba.', '', 4),
  ('i05', 'Temple of Heaven', 'Beijing', 'Morning', 'Go early to see locals doing tai chi and dancing.', '', 5),
  ('i06', 'Lama Temple + Wudaoying hutong', 'Beijing', 'Half day', 'Incense, giant Buddha, then cafés along the hutong.', '', 6),
  ('i07', 'Summer Palace', 'Beijing', 'Half day', 'Skate on Kunming Lake once it''s frozen.', '', 7),
  ('i08', '798 Art District', 'Beijing', 'Afternoon', 'Galleries in old factories. Last year it ran a free New Year''s Eve night event.', '', 8),
  ('i09', 'Olympic Park + Forest Park ice and snow carnival', 'Beijing', 'Late Dec – Feb', 'Last winter''s carnival ran 24 Dec – 28 Feb. Check the dates for this year.', '', 9),
  ('i10', 'Universal Beijing Resort', 'Beijing', 'Full day', 'Book tickets ahead, especially for the holiday weekend.', '', 10),
  ('i11', 'Shougang Park New Year countdown', 'Beijing', '31 Dec night', 'Last year''s main countdown was at Big Air Shougang, the Olympic ski jump.', '', 11),
  ('i12', 'Peking duck dinner', 'Beijing', 'Evening', 'Book a table for the first or last night.', '', 12),
  ('i13', 'Mutianyu Great Wall: cable car up, toboggan down', 'Day trip', 'Full day', 'The toboggan can close in bad weather. Expect well below freezing.', '', 13),
  ('i14', 'Gubei Water Town + Simatai Great Wall at night', 'Day trip', 'Evening', 'One of the few Great Wall sections you can visit at night. Pairs well with Mutianyu.', '', 14),
  ('i15', 'Ski Thaiwoo', 'Chongli', 'Full day', 'Good for mixed abilities: beginner, intermediate and advanced runs.', '', 15),
  ('i16', 'Ski Genting Secret Garden', 'Chongli', 'Full day', 'Olympic freestyle and snowboard venue. Steeper terrain.', '', 16),
  ('i17', 'Ski Wanlong', 'Chongli', 'Full day', 'Lots of black runs. Best for intermediate and advanced skiers.', '', 17),
  ('i18', 'Cuiyunshan Galaxy', 'Chongli', 'Full day', 'Smaller and beginner-friendly.', '', 18)
on conflict (id) do nothing;
