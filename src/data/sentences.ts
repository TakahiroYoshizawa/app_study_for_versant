import type { Difficulty, Sentence } from '../types';

/** Original sentences for Part B practice. Spoken length is 3–15 words. */
export const SENTENCES: Sentence[] = [
  { id: 'b01', difficulty: 'easy', text: 'I like tea.' },
  { id: 'b02', difficulty: 'easy', text: 'The door is open.' },
  { id: 'b03', difficulty: 'easy', text: 'She walks to school.' },
  { id: 'b04', difficulty: 'easy', text: 'We need more time.' },
  { id: 'b05', difficulty: 'easy', text: 'Please close the window.' },
  { id: 'b06', difficulty: 'easy', text: "Don't forget your ticket." },
  { id: 'b07', difficulty: 'medium', text: 'I usually take the bus to work.' },
  { id: 'b08', difficulty: 'medium', text: 'She left her bag on the train.' },
  { id: 'b09', difficulty: 'medium', text: 'We are meeting them after lunch today.' },
  { id: 'b10', difficulty: 'medium', text: 'He could not find his phone at home.' },
  { id: 'b11', difficulty: 'medium', text: 'Please tell her that I will be late.' },
  { id: 'b12', difficulty: 'medium', text: "We'll start the class in five minutes." },
  {
    id: 'b13',
    difficulty: 'hard',
    text: 'I was going to call you earlier, but my phone died.',
  },
  {
    id: 'b14',
    difficulty: 'hard',
    text: 'She asked me to water the plants while she was away.',
  },
  {
    id: 'b15',
    difficulty: 'hard',
    text: 'We decided to eat at home because the restaurant was completely full.',
  },
  {
    id: 'b16',
    difficulty: 'hard',
    text: 'If it rains tomorrow morning, we should bring an umbrella to the park.',
  },
  {
    id: 'b17',
    difficulty: 'hard',
    text: 'The meeting was moved to Friday, so please check your calendar tonight.',
  },
  {
    id: 'b18',
    difficulty: 'hard',
    text: 'I left the blue book on the kitchen table before I went out this morning.',
  },

  // 朝の支度 · 洗面台で歯を磨き、きれいなタオルを探す
  { id: 'b19', difficulty: 'easy', text: 'I brushed my teeth.' },
  { id: 'b20', difficulty: 'medium', text: 'I looked for a clean towel in the bathroom.' },
  {
    id: 'b21',
    difficulty: 'hard',
    text: 'I brushed my teeth and then looked for a clean towel before I left.',
  },

  // 朝の支度 · シャツにアイロンをかけたらボタンが取れた
  { id: 'b22', difficulty: 'easy', text: 'Please iron this shirt.' },
  { id: 'b23', difficulty: 'medium', text: 'A button came off while I ironed my shirt.' },
  {
    id: 'b24',
    difficulty: 'hard',
    text: 'A button came off while I ironed my shirt, so I changed clothes.',
  },

  // 朝の支度 · アラームを止めたあと、もう一度寝てしまった
  { id: 'b25', difficulty: 'easy', text: 'I slept in again.' },
  { id: 'b26', difficulty: 'medium', text: 'I turned off the alarm and fell asleep again.' },
  {
    id: 'b27',
    difficulty: 'hard',
    text: 'I turned off the alarm and fell asleep again, so I got up late.',
  },

  // 朝の支度 · 朝食用のパンを焼いたが、バターがなかった
  { id: 'b28', difficulty: 'easy', text: 'The toast is ready.' },
  { id: 'b29', difficulty: 'medium', text: 'I made toast, but we have no butter left.' },
  {
    id: 'b30',
    difficulty: 'hard',
    text: 'I made toast for breakfast, but there was no butter, so I used jam.',
  },

  // 朝の支度 · 出かける前に靴を磨いた
  { id: 'b31', difficulty: 'easy', text: 'I polished my shoes.' },
  { id: 'b32', difficulty: 'medium', text: 'I polished my shoes before I left the house.' },
  {
    id: 'b33',
    difficulty: 'hard',
    text: 'I polished my shoes before I left, so I would look neat at work.',
  },

  // 移動 · 自転車のタイヤの空気が少なく、歩いて駅へ行った
  { id: 'b34', difficulty: 'easy', text: 'My bike tire is flat.' },
  { id: 'b35', difficulty: 'medium', text: 'I walked to work because my bike tire was flat.' },
  {
    id: 'b36',
    difficulty: 'hard',
    text: 'My bike tire was flat, so I walked all the way to the station.',
  },

  // 移動 · タクシーが見つからず、そこから歩いた
  { id: 'b37', difficulty: 'easy', text: "Let's take a taxi." },
  { id: 'b38', difficulty: 'medium', text: 'I could not find a taxi, so I walked.' },
  {
    id: 'b39',
    difficulty: 'hard',
    text: 'I could not find a taxi near the station, so I walked from there.',
  },

  // 移動 · 電車が遅れて、車内で立っていた
  { id: 'b40', difficulty: 'easy', text: 'The train is late.' },
  { id: 'b41', difficulty: 'medium', text: 'The train was late, so I had to stand.' },
  {
    id: 'b42',
    difficulty: 'hard',
    text: 'The train was very late, so I had to stand all the way.',
  },

  // 移動 · 駐車場が満車で、路上に停めて歩いて戻った
  { id: 'b43', difficulty: 'easy', text: 'The parking lot is full.' },
  { id: 'b44', difficulty: 'medium', text: 'The parking lot was full, so I parked on the street.' },
  {
    id: 'b45',
    difficulty: 'hard',
    text: 'The parking lot was full, so I parked on the street and walked back.',
  },

  // 移動 · 店までの道に迷い、電話の地図を見た
  { id: 'b46', difficulty: 'easy', text: 'I lost my way.' },
  { id: 'b47', difficulty: 'medium', text: 'I got lost and checked the map on my phone.' },
  {
    id: 'b48',
    difficulty: 'hard',
    text: 'I got lost on the way to the store, so I checked the map.',
  },

  // 仕事 · 報告書の印刷中に、コピー機の紙がなくなった
  { id: 'b49', difficulty: 'easy', text: 'The printer needs paper.' },
  { id: 'b50', difficulty: 'medium', text: 'The printer stopped because it ran out of paper.' },
  {
    id: 'b51',
    difficulty: 'hard',
    text: 'The printer stopped in the middle of my report because it ran out of paper.',
  },

  // 仕事 · いつもの会議室が埋まっていて、別の部屋を取った
  { id: 'b52', difficulty: 'easy', text: 'Please book a room.' },
  { id: 'b53', difficulty: 'medium', text: 'I booked another room because ours was already taken.' },
  {
    id: 'b54',
    difficulty: 'hard',
    text: 'I booked another room down the hall because ours was already taken.',
  },

  // 仕事 · 昼前に報告書を仕上げ、相手の机に置いた
  { id: 'b55', difficulty: 'easy', text: 'Here is my report.' },
  { id: 'b56', difficulty: 'medium', text: 'I finished the report and left it on his desk.' },
  {
    id: 'b57',
    difficulty: 'hard',
    text: 'I finished the report before lunch and left it on his desk for him.',
  },

  // 仕事 · 短い休憩のあいだに、彼女のメールへ返信した
  { id: 'b58', difficulty: 'easy', text: 'I answered her email.' },
  { id: 'b59', difficulty: 'medium', text: 'I answered her email during my short break.' },
  {
    id: 'b60',
    difficulty: 'hard',
    text: 'I answered her email during my break, so she would have it soon.',
  },

  // 仕事 · 翌日の資料を揃えるため、事務所に残った
  { id: 'b61', difficulty: 'easy', text: 'I stayed late today.' },
  { id: 'b62', difficulty: 'medium', text: 'I stayed late to finish the papers for tomorrow.' },
  {
    id: 'b63',
    difficulty: 'hard',
    text: 'I stayed late at the office to finish the papers for tomorrow morning.',
  },

  // 食事 · 忙しくて外に出られず、スープを温めて昼にした
  { id: 'b64', difficulty: 'easy', text: 'The soup is hot.' },
  { id: 'b65', difficulty: 'medium', text: 'I heated the soup and had it for lunch.' },
  {
    id: 'b66',
    difficulty: 'hard',
    text: 'I heated the soup for lunch because I was too busy to go out.',
  },

  // 食事 · 違う料理が来たので、自分の注文を頼んだ
  { id: 'b67', difficulty: 'easy', text: 'This is the wrong order.' },
  { id: 'b68', difficulty: 'medium', text: 'They brought the wrong dish, so I asked for mine.' },
  {
    id: 'b69',
    difficulty: 'hard',
    text: 'They brought the wrong dish to my table, so I asked for mine.',
  },

  // 食事 · 簡単なレシピを見て、家で夕食を作った
  { id: 'b70', difficulty: 'easy', text: 'I cooked dinner tonight.' },
  { id: 'b71', difficulty: 'medium', text: 'I followed a simple recipe and cooked dinner.' },
  {
    id: 'b72',
    difficulty: 'hard',
    text: 'I followed a simple recipe and cooked dinner because we stayed home.',
  },

  // 食事 · 夕食のあと、皿が溜まっていたので洗った
  { id: 'b73', difficulty: 'easy', text: 'Please wash the dishes.' },
  { id: 'b74', difficulty: 'medium', text: 'I washed the dishes after we finished dinner.' },
  {
    id: 'b75',
    difficulty: 'hard',
    text: 'I washed the dishes after dinner because the sink was full of plates.',
  },

  // 食事 · 食後に果物を切り、軽いデザートとして出した
  { id: 'b76', difficulty: 'easy', text: 'She cut some fruit.' },
  { id: 'b77', difficulty: 'medium', text: 'She cut some fruit and served it after dinner.' },
  {
    id: 'b78',
    difficulty: 'hard',
    text: 'She cut some fruit and served it after dinner because we wanted something light.',
  },

  // 連絡 · 仕事のあと留守番電話を聞き、寝る前に折り返した
  { id: 'b79', difficulty: 'easy', text: 'Please call me back.' },
  { id: 'b80', difficulty: 'medium', text: 'I heard her message and called her back.' },
  {
    id: 'b81',
    difficulty: 'hard',
    text: 'I heard her message after work and called her back before I went to bed.',
  },

  // 連絡 · 正午の集合を知らせ、遅れないように伝えた
  { id: 'b82', difficulty: 'easy', text: 'We meet at noon.' },
  { id: 'b83', difficulty: 'medium', text: 'Please tell the group that we meet at noon.' },
  {
    id: 'b84',
    difficulty: 'hard',
    text: 'Please tell the group that we meet at noon, so nobody is late.',
  },

  // 連絡 · 建物が分かるように、住所を短い文で送った
  { id: 'b85', difficulty: 'easy', text: 'I sent her the address.' },
  { id: 'b86', difficulty: 'medium', text: 'I sent her the address so she can find us.' },
  {
    id: 'b87',
    difficulty: 'hard',
    text: 'I sent her a short message with the address so she can find us.',
  },

  // 連絡 · 返事が来ないので、同じ文をもう一度送った
  { id: 'b88', difficulty: 'easy', text: 'She did not reply.' },
  { id: 'b89', difficulty: 'medium', text: 'She did not reply, so I sent the message again.' },
  {
    id: 'b90',
    difficulty: 'hard',
    text: 'She did not reply to my note, so I sent the same message again.',
  },

  // 連絡 · 待つ場所が分かるように、入口の写真を送った
  { id: 'b91', difficulty: 'easy', text: 'I sent a photo.' },
  { id: 'b92', difficulty: 'medium', text: 'I sent a photo so they would know where to wait.' },
  {
    id: 'b93',
    difficulty: 'hard',
    text: 'I sent a photo of the entrance so they would know where to wait.',
  },

  // 天気と予定 · 風が強くなってきたので、洗濯物を取り込む
  { id: 'b94', difficulty: 'easy', text: 'The wind is strong.' },
  { id: 'b95', difficulty: 'medium', text: 'The wind was strong, so I brought the laundry inside.' },
  {
    id: 'b96',
    difficulty: 'hard',
    text: 'The wind was getting strong, so I brought the laundry inside before it blew away.',
  },

  // 天気と予定 · 正午は暑すぎたので、散歩を夕方に移した
  { id: 'b97', difficulty: 'easy', text: 'It is too hot.' },
  { id: 'b98', difficulty: 'medium', text: 'It was too hot, so we moved the walk to evening.' },
  {
    id: 'b99',
    difficulty: 'hard',
    text: 'It was too hot at noon, so we moved our walk to the evening.',
  },

  // 天気と予定 · 朝の霧が濃かったので、家を出るのを遅らせた
  { id: 'b100', difficulty: 'easy', text: 'The fog is thick.' },
  { id: 'b101', difficulty: 'medium', text: 'The fog was thick, so we left the house later.' },
  {
    id: 'b102',
    difficulty: 'hard',
    text: 'The fog was thick this morning, so we waited and left later.',
  },

  // 天気と予定 · 雨のあと日が差したので、洗濯物を外に干した
  { id: 'b103', difficulty: 'easy', text: 'I hung the laundry outside.' },
  { id: 'b104', difficulty: 'medium', text: 'The sun came out, so I hung the laundry outside.' },
  {
    id: 'b105',
    difficulty: 'hard',
    text: 'The sun came out after the rain, so I hung the laundry outside to dry.',
  },

  // 天気と予定 · 今朝は寒いので、家を出る前にコートを持つ
  { id: 'b106', difficulty: 'easy', text: 'Take your coat today.' },
  { id: 'b107', difficulty: 'medium', text: 'It is cold this morning, so please take your coat.' },
  {
    id: 'b108',
    difficulty: 'hard',
    text: 'It is cold this morning, so please take your coat before you leave.',
  },

  // 用事 · 仕事のあと銀行に寄り、市場用の現金を下ろした
  { id: 'b109', difficulty: 'easy', text: 'I went to the bank.' },
  { id: 'b110', difficulty: 'medium', text: 'I stopped at the bank and took out some cash.' },
  {
    id: 'b111',
    difficulty: 'hard',
    text: 'I stopped at the bank after work and took out cash for the market.',
  },

  // 用事 · 帰り道に郵便局へ寄り、小さい箱を送った
  { id: 'b112', difficulty: 'easy', text: 'I mailed a small box.' },
  { id: 'b113', difficulty: 'medium', text: 'I mailed a small box at the post office today.' },
  {
    id: 'b114',
    difficulty: 'hard',
    text: 'I mailed a small box at the post office on my way home.',
  },

  // 用事 · 喉が痛かったので、仕事のあと薬局で薬を受け取った
  { id: 'b115', difficulty: 'easy', text: 'I picked up the medicine.' },
  { id: 'b116', difficulty: 'medium', text: 'I picked up the medicine at the pharmacy after work.' },
  {
    id: 'b117',
    difficulty: 'hard',
    text: 'I picked up the medicine at the pharmacy because my throat was sore.',
  },

  // 用事 · 図書館で本を返し、閉館前に別の本を借りた
  { id: 'b118', difficulty: 'easy', text: 'I returned the book.' },
  { id: 'b119', difficulty: 'medium', text: 'I returned a book and borrowed another at the library.' },
  {
    id: 'b120',
    difficulty: 'hard',
    text: 'I returned a book at the library and borrowed another before it closed.',
  },

  // 用事 · 上着にしみがあったので、朝クリーニング店へ出した
  { id: 'b121', difficulty: 'easy', text: 'I dropped off my coat.' },
  { id: 'b122', difficulty: 'medium', text: 'I dropped my coat off at the cleaners this morning.' },
  {
    id: 'b123',
    difficulty: 'hard',
    text: 'I dropped my coat off at the cleaners because it had a stain.',
  },

  // 夜と体調 · 長い一日で疲れていたので、早めに寝た
  { id: 'b124', difficulty: 'easy', text: 'I went to bed early.' },
  { id: 'b125', difficulty: 'medium', text: 'I went to bed early because I was very tired.' },
  {
    id: 'b126',
    difficulty: 'hard',
    text: 'I went to bed early because I was tired after a long day.',
  },

  // 夜と体調 · 今夜は頭痛なので、照明を落として静かにしている
  { id: 'b127', difficulty: 'easy', text: 'I have a headache.' },
  { id: 'b128', difficulty: 'medium', text: 'I have a headache, so I am staying quiet tonight.' },
  {
    id: 'b129',
    difficulty: 'hard',
    text: 'I have a headache tonight, so I am staying quiet with the lights low.',
  },

  // 夜と体調 · 昨夜は喉が痛かったので、温かいものを飲んで休んだ
  { id: 'b130', difficulty: 'easy', text: 'My throat is sore.' },
  { id: 'b131', difficulty: 'medium', text: 'My throat is sore, so I drank something warm.' },
  {
    id: 'b132',
    difficulty: 'hard',
    text: 'My throat was sore last night, so I drank something warm and rested.',
  },

  // 夜と体調 · 仕事のあと目が疲れたので、画面を消して休んだ
  { id: 'b133', difficulty: 'easy', text: 'My eyes are tired.' },
  { id: 'b134', difficulty: 'medium', text: 'My eyes were tired, so I turned off the screen.' },
  {
    id: 'b135',
    difficulty: 'hard',
    text: 'My eyes were tired after work, so I turned off the screen and rested.',
  },

  // 夜と体調 · 昨夜はよく眠れて、起きたときには楽になっていた
  { id: 'b136', difficulty: 'easy', text: 'I slept very well.' },
  { id: 'b137', difficulty: 'medium', text: 'I slept well and felt much better this morning.' },
  {
    id: 'b138',
    difficulty: 'hard',
    text: 'I slept well last night and felt much better when I woke up.',
  },
];

export function difficultyLabel(difficulty: Difficulty): string {
  if (difficulty === 'easy') return 'Easy';
  if (difficulty === 'medium') return 'Medium';
  return 'Hard';
}

export function spokenWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function pickSentence(excludeId: string | null): Sentence {
  const pool = excludeId ? SENTENCES.filter((sentence) => sentence.id !== excludeId) : SENTENCES;
  const source = pool.length > 0 ? pool : SENTENCES;
  const index = Math.floor(Math.random() * source.length);
  return source[index] ?? SENTENCES[0];
}
