-- 和合本（CUV）文字修正 patch 02
-- 修正导入数据源（bolls.life）的字符损坏、生僻字与排版残留：
-- 损坏字符 8 处、{} 残留 7 节、□/ㄤ/拉丁残留/星号 6 节、䍁→繸 8 节、
-- 扩展B区生僻字（茵蔯→茵陈、枪杆、喂养）11 节、约翰三书 1:14/15 分节修正。
-- 逐节已与 eBible / YouVersion 和合本（CUNPSS-神）核对。

-- 耶利米书 29:6 �→里
update public.bible_verses set text = '娶妻生儿女，为你们的儿子娶妻，使你们的女儿嫁人，生儿养女。在那里生养众多，不致减少。'
where version = 'CUV' and book = '耶利米书' and chapter = 29 and verse = 6;

-- 马太福音 6:19 �→锈
update public.bible_verses set text = '不要为自己积儹财宝在地上；地上有虫子咬，能锈坏，也有贼挖窟窿来偷。'
where version = 'CUV' and book = '马太福音' and chapter = 6 and verse = 19;

-- 马太福音 6:20 �→锈
update public.bible_verses set text = '只要积儹财宝在天上；天上没有虫子咬，不能锈坏，也没有贼挖窟窿来偷。'
where version = 'CUV' and book = '马太福音' and chapter = 6 and verse = 20;

-- 马太福音 23:33 删?
update public.bible_verses set text = '你们这些蛇类、毒蛇之种阿，怎能逃脱地狱的刑罚呢？'
where version = 'CUV' and book = '马太福音' and chapter = 23 and verse = 33;

-- 马可福音 14:60 删?
update public.bible_verses set text = '大祭司起来站在中间，问耶稣说：你甚么都不回答么？这些人作见证告你的是甚么呢？'
where version = 'CUV' and book = '马可福音' and chapter = 14 and verse = 60;

-- 歌罗西书 1:29 �→里
update public.bible_verses set text = '我也为此劳苦，照著他在我里面运用的大能尽心竭力。'
where version = 'CUV' and book = '歌罗西书' and chapter = 1 and verse = 29;

-- 雅各书 5:3 �→锈 x2
update public.bible_verses set text = '你们的金银都长了锈；那锈要证明你们的不是，又要吃你们的肉，如同火烧。你们在这末世只知积儹钱财。'
where version = 'CUV' and book = '雅各书' and chapter = 5 and verse = 3;

-- 申命记 1:36 删 { }
update public.bible_verses set text = '惟有耶孚尼的儿子迦勒必得看见，并且我要将他所踏过的地赐给他和他的子孙，因为他专心跟从我。'
where version = 'CUV' and book = '申命记' and chapter = 1 and verse = 36;

-- 申命记 28:52 删 { }
update public.bible_verses set text = '他们必将你困在你各城里，直到你所倚靠、高大坚固的城墙都被攻塌。他们必将你困在耶和华─你神所赐你遍地的各城里。'
where version = 'CUV' and book = '申命记' and chapter = 28 and verse = 52;

-- 以赛亚书 48:9 删 { }
update public.bible_verses set text = '我为我的名暂且忍怒，为我的颂赞向你容忍，不将你剪除。'
where version = 'CUV' and book = '以赛亚书' and chapter = 48 and verse = 9;

-- 以赛亚书 56:4 删 { }
update public.bible_verses set text = '因为耶和华如此说：那些谨守我的安息日，拣选我所喜悦的事，持守我约的太监，'
where version = 'CUV' and book = '以赛亚书' and chapter = 56 and verse = 4;

-- 马太福音 14:9 删 { }
update public.bible_verses set text = '王便忧愁，但因他所起的誓，又因同席的人，就吩咐给他；'
where version = 'CUV' and book = '马太福音' and chapter = 14 and verse = 9;

-- 马可福音 15:13 删 { }
update public.bible_verses set text = '他们又喊著说：把他钉十字架！'
where version = 'CUV' and book = '马可福音' and chapter = 15 and verse = 13;

-- 犹大书 1:9 删 { }
update public.bible_verses set text = '天使长米迦勒为摩西的尸首与魔鬼争辩的时候，尚且不敢用毁谤的话罪责他，只说：主责备你罢！'
where version = 'CUV' and book = '犹大书' and chapter = 1 and verse = 9;

-- 使徒行传 5:5 删 r
update public.bible_verses set text = '亚拿尼亚听见这话，就仆倒，断了气；听见的人都甚惧怕。'
where version = 'CUV' and book = '使徒行传' and chapter = 5 and verse = 5;

-- 使徒行传 5:12 删 s 与多余标点
update public.bible_verses set text = '主藉使徒的手在民间行了许多神迹奇事；他们（或作：信的人）都同心合意的在所罗门的廊下。'
where version = 'CUV' and book = '使徒行传' and chapter = 5 and verse = 12;

-- 列王纪下 7:5 删 *
update public.bible_verses set text = '黄昏的时候，他们起来往亚兰人的营盘去；到了营边，不见一人在那里。'
where version = 'CUV' and book = '列王纪下' and chapter = 7 and verse = 5;

-- 民数记 15:38 䍁→繸
update public.bible_verses set text = '你吩咐以色列人，叫他们世世代代在衣服边上做繸子，又在底边的繸子上钉一根蓝细带子。'
where version = 'CUV' and book = '民数记' and chapter = 15 and verse = 38;

-- 民数记 15:39 䍁→繸
update public.bible_verses set text = '你们佩带这繸子，好叫你们看见就记念遵行耶和华一切的命令，不随从自己的心意、眼目行邪淫，像你们素常一样；'
where version = 'CUV' and book = '民数记' and chapter = 15 and verse = 39;

-- 申命记 22:12 䍁→繸
update public.bible_verses set text = '你要在所披的外衣上四围做繸子。'
where version = 'CUV' and book = '申命记' and chapter = 22 and verse = 12;

-- 马太福音 9:20 䍁→繸
update public.bible_verses set text = '有一个女人，患了十二年的血漏，来到耶稣背后，摸他的衣裳繸子；'
where version = 'CUV' and book = '马太福音' and chapter = 9 and verse = 20;

-- 马太福音 14:36 䍁→繸
update public.bible_verses set text = '只求耶稣准他们摸他的衣裳繸子；摸著的人就都好了。'
where version = 'CUV' and book = '马太福音' and chapter = 14 and verse = 36;

-- 马太福音 23:5 䍁→繸
update public.bible_verses set text = '他们一切所做的事都是要叫人看见，所以将佩戴的经文做宽了，衣裳的繸子做长了，'
where version = 'CUV' and book = '马太福音' and chapter = 23 and verse = 5;

-- 马可福音 6:56 䍁→繸
update public.bible_verses set text = '凡耶稣所到的地方，或村中，或城里，或乡间，他们都将病人放在街市上，求耶稣只容他们摸他的衣裳繸子；凡摸著的人就都好了。'
where version = 'CUV' and book = '马可福音' and chapter = 6 and verse = 56;

-- 路加福音 8:44 䍁→繸
update public.bible_verses set text = '他来到耶稣背后，摸他的衣裳繸子，血漏立刻就止住了。'
where version = 'CUV' and book = '路加福音' and chapter = 8 and verse = 44;

-- 申命记 29:18 茵𫈟→茵陈
update public.bible_verses set text = '惟恐你们中间，或男或女，或族长或支派长，今日心里偏离耶和华─我们的神，去事奉那些国的神；又怕你们中间有恶根生出苦菜和茵陈来，'
where version = 'CUV' and book = '申命记' and chapter = 29 and verse = 18;

-- 箴言 5:4 茵𫈟→茵陈
update public.bible_verses set text = '至终却苦似茵陈，快如两刃的刀。'
where version = 'CUV' and book = '箴言' and chapter = 5 and verse = 4;

-- 耶利米书 9:15 茵𫈟→茵陈
update public.bible_verses set text = '所以万军之耶和华─以色列的神如此说：看哪，我必将茵陈给这百姓吃，又将苦胆水给他们喝。'
where version = 'CUV' and book = '耶利米书' and chapter = 9 and verse = 15;

-- 耶利米书 23:15 茵𫈟→茵陈
update public.bible_verses set text = '所以万军之耶和华论到先知如此说：我必将茵陈给他们吃，又将苦胆水给他们喝；因为亵渎的事出于耶路撒冷的先知，流行遍地。'
where version = 'CUV' and book = '耶利米书' and chapter = 23 and verse = 15;

-- 耶利米哀歌 3:15 茵𫈟→茵陈
update public.bible_verses set text = '他用苦楚充满我，使我饱用茵陈。'
where version = 'CUV' and book = '耶利米哀歌' and chapter = 3 and verse = 15;

-- 耶利米哀歌 3:19 茵𫈟→茵陈
update public.bible_verses set text = '耶和华啊，求你记念我如茵陈和苦胆的困苦窘迫。'
where version = 'CUV' and book = '耶利米哀歌' and chapter = 3 and verse = 19;

-- 阿摩司书 5:7 茵𫈟→茵陈
update public.bible_verses set text = '你们这使公平变为茵陈、将公义丢弃于地的，'
where version = 'CUV' and book = '阿摩司书' and chapter = 5 and verse = 7;

-- 阿摩司书 6:12 茵𫈟→茵陈
update public.bible_verses set text = '马岂能在崖石上奔跑？人岂能在那里用牛耕种呢？你们却使公平变为苦胆，使公义的果子变为茵陈。'
where version = 'CUV' and book = '阿摩司书' and chapter = 6 and verse = 12;

-- 启示录 8:11 茵𫈟→茵陈
update public.bible_verses set text = '这星名叫茵陈。众水的三分之一变为茵陈；因水变苦，就死了许多人。'
where version = 'CUV' and book = '启示录' and chapter = 8 and verse = 11;

-- 撒母耳记下 2:23 枪𨱔→枪杆
update public.bible_verses set text = '亚撒黑仍不肯转开。故此，押尼珥就用枪杆刺入他的肚腹，甚至枪从背后透出，亚撒黑就在那里仆倒而死。众人赶到亚撒黑仆倒而死的地方，就都站住。'
where version = 'CUV' and book = '撒母耳记下' and chapter = 2 and verse = 23;

-- 士师记 8:15 ㄤ萑在→现在
update public.bible_verses set text = '基甸到了疏割，对那里的人说：你们从前讥诮我说：西巴和撒慕拿已经在你手里，你使我们将饼给跟随你的疲乏人么？现在西巴和撒慕拿在这里。'
where version = 'CUV' and book = '士师记' and chapter = 8 and verse = 15;

-- 士师记 13:7 删□（参照 YouVersion 和合本：归神）
update public.bible_verses set text = '却对我说：你要怀孕生一个儿子，所以清酒浓酒都不可喝，一切不洁之物也不可吃；因为这孩子从出胎一直到死，必归神作拿细耳人。'
where version = 'CUV' and book = '士师记' and chapter = 13 and verse = 7;

-- 士师记 18:10 删□（参照 YouVersion 和合本）
update public.bible_verses set text = '你们到了那里，必看见安居无虑的民，地也宽阔。神已将那地交在你们手中；那地百物俱全，一无所缺。'
where version = 'CUV' and book = '士师记' and chapter = 18 and verse = 10;

-- 犹大书 1:12 𫗪→喂
update public.bible_verses set text = '这样的人在你们的爱席上与你们同吃的时候，正是礁石（或作：玷污）。他们作牧人，只知喂养自己，无所惧怕；是没有雨的云彩，被风飘荡；是秋天没有果子的树，死而又死，连根被拔出来；'
where version = 'CUV' and book = '犹大书' and chapter = 1 and verse = 12;

-- 约翰三书 1:14 删去误植的第15节括注
update public.bible_verses set text = '但盼望快快的见你，我们就当面谈论。'
where version = 'CUV' and book = '约翰三书' and chapter = 1 and verse = 14;

-- 约翰三书 1:15（原误植于 1:14 括注中，现独立成节）
insert into public.bible_verses (version, book, book_index, chapter, verse, text)
values ('CUV', '约翰三书', 64, 1, 15, '愿你平安。众位朋友都问你安。请你替我按著姓名问众位朋友安。')
on conflict (version, book, chapter, verse) do update set text = excluded.text;
