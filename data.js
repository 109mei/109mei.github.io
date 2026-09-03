/*!
 * data.js — 掲載データ
 *
 * 唯一のデータ源は docs/SITE_SPEC.md の §6（確定分のみ）です。
 * §6 にない業績・情報を推測で足さないこと。追加・修正はまず仕様書 §6 を更新してから。
 * §5 の掲載禁止情報（学籍番号・住所・電話番号・メールアドレス・生年月日 ほか）は書かない。
 */
window.SITE_DATA = {

  /* ── サイト情報（§3-9 / §8-4）─────────────────────────────────
     updated: フッターに出る最終更新日。内容を更新したらここも更新する */
  siteMeta: {
    updated: '2026-09-03',
    siteUrl: 'https://109mei.github.io/',
    ogImage: 'assets/og.png'
  },

  /* ── プロフィール（§3-1 / §3-2） ───────────────────────────── */
  profile: {
    name: '永野 斗遠',
    reading: 'ながの とわ',
    nameEn: 'Towa Nagano',
    handle: '109mei',
    roles: [
      '九州情報大学大学院 荒平研究室',
      '制作団体 IDERIA 代表'
    ],
    keywords: ['教育用ゲームジャム研究', 'ゲーム制作', '高大連携'],
    about: [
      '福岡県立嘉穂総合高等学校を経て九州情報大学へ進み、現在は同大学院の荒平高章研究室に在籍しています。',
      '研究テーマは「初心者向け教育用ゲームジャムの設計と実践」。制作団体 IDERIA の代表として、ゲームと教材を制作しています。'
    ],
    path: [
      '福岡県立嘉穂総合高等学校',
      '九州情報大学',
      '九州情報大学大学院（荒平高章研究室）'
    ]
  },

  /* ── リンク（§3-7）───────────────────────────────────────────
     url を空にするとその項目は表示されません（リンク切れを作らないため）。 */
  links: {
    github:  { label: 'GitHub',       url: 'https://github.com/109mei' },
    archive: { label: '学習アーカイブ', url: 'https://109mei.github.io/game-learning-archive/' },
    ideria:  { label: 'IDERIA公式',    url: 'https://109mei.github.io/ideria-official/' }
  },

  /* ── 数字で見る活動（§3-3）─────────────────────────────────── */
  stats: [
    { label: '学会発表',               value: 7,  unit: '件' },
    { label: '受賞',                   value: 2,  unit: '件' },
    { label: '運営したゲームジャム',   value: 4,  unit: '回', note: '＋予備実験' },
    { label: 'ブラウザで遊べる公開作品', value: 24, unit: '本', note: '学習アーカイブより' }
  ],

  /* ── 学会発表（§6・新しい順）───────────────────────────────
     upcomingUntil: この日より前は「発表予定」と表示する */
  talks: [
    {
      authors: [
        { name: '伊嵜音子' },
        { name: '椎葉圭', org: '純真高等学校' },
        { name: '永野斗遠', me: true },
        { name: '荒平高章', org: '九州情報大学大学院' }
      ],
      title: '写真・一言分析から感情を読み取り記録していくアプリケーションの提案',
      venue: 'ゲーム学会「ゲームと健康科学」研究部会 第3回研究会',
      dateLabel: '2026-09-05',
      date: '2026-09-05',
      place: '九州情報大学',
      notes: ['共著', '高大連携'],
      upcomingUntil: '2026-09-05'
    },
    {
      authors: [
        { name: '永野斗遠', me: true },
        { name: '荒平高章' }
      ],
      title: '初心者向けゲームジャムの実施 ～第1回の実施結果と次回への課題～',
      venue: 'ゲーム学会「ゲームと健康科学」研究部会 第3回研究会',
      dateLabel: '2026-09-05',
      date: '2026-09-05',
      format: 'ポスター発表',
      upcomingUntil: '2026-09-05'
    },
    {
      authors: [
        { name: '永野斗遠', me: true },
        { name: '荒平高章', org: '九州情報大学' }
      ],
      title: 'VRを用いた3Dモデル制作体験会の実施と課題',
      venue: 'ゲーム学会「ゲームと健康科学」研究部会 第2回研究会',
      dateLabel: '2026-07-10',
      date: '2026-07-10',
      place: 'オンライン'
    },
    {
      authors: [
        { name: '永野斗遠', me: true },
        { name: '荒平高章', org: '九州情報大学' }
      ],
      title: '新しいゲームコンテストの試行と評価',
      venue: 'ゲーム学会 第24回全国大会',
      session: 'OB3',
      dateLabel: '2026-03-01',
      date: '2026-03-01',
      place: '九州情報大学太宰府キャンパス',
      url: 'https://www.gameamusementsociety.org/html/NationalConvention_24_prog2.html',
      urlLabel: '大会プログラム'
    },
    {
      authors: [
        { name: '田村明日香' },
        { name: '永野斗遠', me: true },
        { name: '荒平高章', org: '九州情報大学' }
      ],
      title: '自主制作ゲーム『チョコパキ！』の物理的触覚体験への拡張と試作',
      venue: 'ゲーム学会 第24回全国大会',
      session: 'OC3',
      dateLabel: '2026-03-01',
      date: '2026-03-01',
      place: '九州情報大学太宰府キャンパス',
      url: 'https://www.gameamusementsociety.org/html/NationalConvention_24_prog2.html',
      urlLabel: '大会プログラム',
      notes: ['共著・第2著者']
    },
    {
      authors: [
        { name: '永野斗遠', me: true },
        { name: '田村明日香' },
        { name: '中嶋文萌' },
        { name: '荒平高章', org: '九州情報大学' }
      ],
      title: 'VRを用いた3Dモデル制作体験',
      venue: 'ゲーム学会 第24回全国大会',
      session: 'DP4',
      dateLabel: '2026-02-28',
      date: '2026-02-28',
      place: '九州情報大学太宰府キャンパス',
      url: 'https://www.gameamusementsociety.org/html/NationalConvention_24_prog1.html',
      urlLabel: '大会プログラム',
      format: 'デモ・ポスター'
    },
    {
      authors: [
        { name: '永野斗遠', me: true },
        { name: '田村明日香' },
        { name: '椎葉圭' },
        { name: '荒平高章', org: '九州情報大学' }
      ],
      title: '高大連携による制作ゲーム『OneButtonGames』',
      venue: 'ゲーム学会 第24回全国大会',
      session: 'DP5',
      dateLabel: '2026-02-28',
      date: '2026-02-28',
      place: '九州情報大学太宰府キャンパス',
      url: 'https://www.gameamusementsociety.org/html/NationalConvention_24_prog1.html',
      urlLabel: '大会プログラム',
      format: 'デモ・ポスター'
    }
  ],

  /* ── 受賞（§6）─────────────────────────────────────────────── */
  awards: [
    {
      title: '太宰府市 令和7年度「令和の都だざいふ 世界に羽ばたく人材育成表彰」',
      work: '一般表彰（団体）・2年連続',
      recipients: ['荒平ゼミ「IDERIA」'],
      dateLabel: '授賞式 2026-02-08',
      date: '2026-02-08',
      url: 'https://www.kiis.ac.jp/info/%E5%A4%AA%E5%AE%B0%E5%BA%9C%E5%B8%82%E3%80%80%E4%BB%A4%E5%92%8C7%E5%B9%B4%E5%BA%A6%E3%80%8C%E4%BB%A4%E5%92%8C%E3%81%AE%E9%83%BD%E3%81%A0%E3%81%96%E3%81%84%E3%81%B5%E4%B8%96%E7%95%8C%E3%81%AB%E7%BE%BD/',
      urlLabel: '九州情報大学の記事'
    },
    {
      title: '太宰府市 令和6年度「世界に羽ばたく人材育成表彰」',
      work: '一般表彰（団体）',
      recipients: ['荒平ゼミ「IDERIA」'],
      dateLabel: '授賞式 2025-02-09',
      date: '2025-02-09',
      url: 'https://www.kiis.ac.jp/info/%E5%A4%AA%E5%AE%B0%E5%BA%9C%E5%B8%82%E3%80%80%E4%BB%A4%E5%92%8C6%E5%B9%B4%E5%BA%A6%E3%80%8C%E4%B8%96%E7%95%8C%E3%81%AB%E7%BE%BD%E3%81%B0%E3%81%9F%E3%81%8F%E4%BA%BA%E6%9D%90%E8%82%B2%E6%88%90%E3%80%8D/',
      urlLabel: '九州情報大学の記事'
    },
    {
      title: 'ゲーム学会 第21回ゲームコンペ 優秀賞',
      work: '作品「チョコパキ！」',
      recipients: ['永野斗遠', '田村明日香'],
      org: '九州情報大学',
      dateLabel: '表彰式 2024-03-02（第22回全国大会）',
      date: '2024-03-02',
      url: 'https://www.gameamusementsociety.org/html/GameCompe21_Award2.html',
      urlLabel: '受賞作品紹介'
    }
  ],

  /* ── 制作物（§6）───────────────────────────────────────────
     url が空のものはリンクを出さない（リンク切れを作らないため） */
  works: [
    {
      title: 'ゲーム制作・プログラミング学習アーカイブ',
      kind: 'Webサイト',
      period: '2026〜',
      image: '',
      desc: '',
      url: 'https://109mei.github.io/game-learning-archive/'
    },
    {
      title: 'チョコパキ！',
      kind: 'ゲーム',
      image: 'https://109mei.github.io/game-learning-archive/images/games/ideria-chokopaki.png',
      desc: 'Python + Pygame の対戦ゲーム。おもちゃ化の試作も行った。',
      url: 'https://109mei.github.io/game-learning-archive/games/ideria-chokopaki/'
    },
    {
      title: 'OneButtonGames ランチャー',
      kind: 'ゲーム',
      image: '',
      desc: '高校生・大学生による1ボタンゲーム10作品を収録。IDERIA × 純真高等学校 × 九州情報大学。',
      url: ''
    },
    {
      title: 'しまっぴー先生の覚えてクイズ／ひらがなUNO／オセロカードゲーム試作',
      kind: '教材・ゲーム',
      image: '',
      desc: 'IDERIA制作。「しまっぴー先生の覚えてクイズ」は TyranoScript 製。',
      url: ''
    }
  ],

  /* ── 関連サイト（§3-8。§6の業績データとは別枠のサイト情報）──────
     url が空のカードは表示しない（2件とも空ならセクションごと非表示） */
  relatedSites: [
    {
      name: 'ゲーム制作・プログラミング学習アーカイブ',
      desc: '制作した作品を遊んで・コードを見て学べるサイト',
      url: 'https://109mei.github.io/game-learning-archive/'
    },
    {
      name: 'IDERIA公式サイト',
      desc: '代表を務める制作団体の公式サイト',
      url: 'https://109mei.github.io/ideria-official/'
    }
  ],

  /* ── 年表（§6「活動」・古い→新しい順）───────────────────────
     type: presentation=発表 / award=受賞 / activity=活動 / work=制作 */
  timeline: [
    {
      when: '2024年度',
      alt: 3000,
      type: 'activity',
      title: '十人十色ゲームコンテスト実施',
      detail: '九州情報大学'
    },
    {
      when: '2024年度',
      alt: 3450,
      type: 'award',
      title: '「チョコパキ！」が第21回ゲームコンペ 優秀賞',
      detail: '表彰式 2024-03-02（第22回全国大会）'
    },
    {
      when: '2025-03-18',
      alt: 3900,
      type: 'activity',
      title: '福岡県立嘉穂総合高等学校で1日完結型ゲームジャム試行',
      detail: '母校での予備実験'
    },
    {
      when: '2025-05〜07',
      alt: 4400,
      type: 'activity',
      title: '九州情報大学 学部生対象ゲームジャムを2日程で実施',
      detail: '第1回・第2回'
    },
    {
      when: '2025-11',
      alt: 4850,
      type: 'activity',
      title: '純真高等学校 eスポーツ部でゲームジャム実施',
      detail: '第3回・高大連携',
      link: { label: '紹介記事', url: 'https://junshin-hs.ed.jp/club/archives/19744' }
    },
    {
      when: '2025-12',
      alt: 5300,
      type: 'activity',
      title: '純真高等学校 追加制作サポート'
    },
    {
      when: '2026-01-21',
      alt: 5750,
      type: 'activity',
      title: '純真高等学校でVR 3Dモデル制作体験会'
    },
    {
      when: '2026-01-25',
      alt: 6250,
      type: 'work',
      title: 'OneButtonGames プロジェクト始動',
      detail: '企画書'
    },
    {
      when: '2026-02-08',
      alt: 6700,
      type: 'award',
      title: '令和の都だざいふ 世界に羽ばたく人材育成表彰',
      detail: '2年連続'
    },
    {
      when: '2026-02-28〜03-01',
      alt: 7150,
      type: 'presentation',
      title: 'ゲーム学会 第24回全国大会で発表4件',
      detail: '九州情報大学開催'
    },
    {
      when: '2026-07-10',
      alt: 7600,
      type: 'presentation',
      title: '「ゲームと健康科学」第2回研究会で発表'
    },
    {
      when: '2026-08-21',
      alt: 8100,
      type: 'activity',
      title: '夏の集中講義「ゲームプログラミング」で第4回ゲームジャム実施',
      detail: '8-24 改良日'
    },
    {
      when: '2026-08〜',
      alt: 8550,
      type: 'work',
      title: '学習アーカイブサイトを公開',
      link: { label: 'サイトを見る', url: 'https://109mei.github.io/game-learning-archive/' }
    },
    {
      when: '2026-09-05',
      alt: 9000,
      type: 'presentation',
      title: '「ゲームと健康科学」第3回研究会で発表2件',
      upcomingUntil: '2026-09-05'
    }
  ]
};
