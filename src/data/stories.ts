import type { Difficulty } from '../types';

export type StoryPoint = {
  id: string;
  /** Shown after the attempt. */
  label: string;
  /** English fact sent to Gemini. Paraphrase still counts. */
  fact: string;
  /** Phrases the browser can find in a speech-recognition transcript. */
  cues: string[];
};

export type Story = {
  id: string;
  title: string;
  difficulty: Difficulty;
  text: string;
  points: StoryPoint[];
};

/** Original retelling stories. Each one is heard once, then told again in the speaker's own words. */
export const STORIES: Story[] = [
  {
    id: 'e01',
    title: 'Late train',
    difficulty: 'easy',
    text: 'Maya missed the eight o\'clock train because she could not find her keys. She reached the station twenty minutes late. The next train was full, so she stood the whole way. She arrived at the office at nine thirty and missed the morning meeting.',
    points: [
      {
        id: 'train',
        label: '8時の電車に乗り遅れた',
        fact: 'She missed the eight o\'clock train.',
        cues: ['missed the eight', 'missed the 8', 'eight o\'clock train', '8 o\'clock train'],
      },
      {
        id: 'keys',
        label: '鍵が見つからなかった',
        fact: 'She could not find her keys.',
        cues: ['could not find her keys', 'could not find the keys', 'find her keys', 'lost her keys', 'her keys'],
      },
      {
        id: 'late',
        label: '駅に20分遅れて着いた',
        fact: 'She reached the station twenty minutes late.',
        cues: ['twenty minutes late', 'twenty minutes', '20 minutes'],
      },
      {
        id: 'stood',
        label: '次の電車は満員で、ずっと立っていた',
        fact: 'The next train was full, so she stood the whole way.',
        cues: ['train was full', 'next train was full', 'stood the whole way', 'stood all the way', 'had to stand'],
      },
      {
        id: 'meeting',
        label: '9時半に会社へ着き、朝の会議に出られなかった',
        fact: 'She arrived at the office at nine thirty and missed the morning meeting.',
        cues: ['nine thirty', '9:30', 'half past nine', 'missed the morning meeting', 'missed the meeting'],
      },
    ],
  },
  {
    id: 'e02',
    title: 'Cafe lunch',
    difficulty: 'easy',
    text: 'Leo went to a cafe near his office to meet Ann. Ann was late, so Leo ordered a sandwich and coffee. When Ann arrived, every seat in the cafe was taken. They ate lunch in twenty minutes and walked back to work.',
    points: [
      {
        id: 'meet',
        label: '職場の近くのカフェで Ann と会う予定だった',
        fact: 'Leo went to a cafe near his office to meet Ann.',
        cues: ['cafe near', 'coffee shop near', 'meet ann', 'met ann', 'to meet ann'],
      },
      {
        id: 'late',
        label: 'Ann が遅れた',
        fact: 'Ann was late.',
        cues: ['ann was late', 'ann arrived late', 'she was late'],
      },
      {
        id: 'order',
        label: 'サンドイッチとコーヒーを頼んだ',
        fact: 'Leo ordered a sandwich and coffee.',
        cues: ['sandwich and coffee', 'ordered a sandwich', 'sandwich', 'coffee'],
      },
      {
        id: 'seats',
        label: '席が埋まっていた',
        fact: 'Every seat in the cafe was taken.',
        cues: ['every seat', 'no seats', 'no empty seats', 'seats were taken', 'cafe was full', 'was full'],
      },
      {
        id: 'walk',
        label: '20分で昼ごはんを終え、歩いて仕事に戻った',
        fact: 'They ate lunch in twenty minutes and walked back to work.',
        cues: ['twenty minutes', '20 minutes', 'walked back', 'walked to work', 'back to work'],
      },
    ],
  },
  {
    id: 'e03',
    title: 'Library book',
    difficulty: 'medium',
    text: 'Nina borrowed a history book from the city library on Monday. The book was due in two weeks. She spilled tea on the last chapter and told the librarian. She paid four dollars and was allowed to keep the book.',
    points: [
      {
        id: 'borrow',
        label: '月曜に市立図書館で歴史の本を借りた',
        fact: 'Nina borrowed a history book from the city library on Monday.',
        cues: ['history book', 'city library', 'borrowed', 'on monday'],
      },
      {
        id: 'due',
        label: '返却期限は2週間後だった',
        fact: 'The book was due in two weeks.',
        cues: ['two weeks', 'due in two', 'return it in two'],
      },
      {
        id: 'tea',
        label: '最後の章にお茶をこぼした',
        fact: 'She spilled tea on the last chapter.',
        cues: ['spilled tea', 'spilt tea', 'tea on the last', 'last chapter'],
      },
      {
        id: 'told',
        label: '司書に話した',
        fact: 'She told the librarian.',
        cues: ['told the librarian', 'told a librarian', 'librarian'],
      },
      {
        id: 'paid',
        label: '4ドル払い、本はそのまま手元に置いた',
        fact: 'She paid four dollars and was allowed to keep the book.',
        cues: ['four dollars', '4 dollars', 'paid four', 'keep the book'],
      },
    ],
  },
  {
    id: 'e04',
    title: 'Rainy picnic',
    difficulty: 'easy',
    text: 'Tom and his sister planned a picnic by the lake on Sunday. They packed sandwiches, apples, and juice. Dark clouds came, and rain started at noon. They ran to the car and ate lunch there.',
    points: [
      {
        id: 'plan',
        label: '日曜に湖でピクニックする予定だった',
        fact: 'Tom and his sister planned a picnic by the lake on Sunday.',
        cues: ['picnic', 'by the lake', 'at the lake', 'on sunday', 'his sister'],
      },
      {
        id: 'food',
        label: 'サンドイッチとリンゴとジュースを持っていった',
        fact: 'They packed sandwiches, apples, and juice.',
        cues: ['sandwiches', 'apples', 'juice', 'packed'],
      },
      {
        id: 'rain',
        label: '正午に雨が降り出した',
        fact: 'Rain started at noon.',
        cues: ['rain started', 'started to rain', 'began to rain', 'at noon', 'dark clouds'],
      },
      {
        id: 'car',
        label: '車まで走って戻った',
        fact: 'They ran to the car.',
        cues: ['ran to the car', 'ran back to the car', 'to the car'],
      },
      {
        id: 'lunch',
        label: '車の中で昼ごはんを食べた',
        fact: 'They ate lunch in the car.',
        cues: ['ate lunch there', 'ate lunch in the car', 'ate in the car', 'lunch there'],
      },
    ],
  },
  {
    id: 'e05',
    title: 'Missing bike',
    difficulty: 'medium',
    text: 'Sam locked his bike outside the shop and went in for milk. When he came out, the bike was gone. The owner had seen a boy in a red jacket. Sam found the bike behind the shop and rode home.',
    points: [
      {
        id: 'lock',
        label: '店の外に自転車をロックし、ミルクを買いに入った',
        fact: 'Sam locked his bike outside the shop and went in for milk.',
        cues: ['locked his bike', 'locked the bike', 'outside the shop', 'for milk', 'buy milk'],
      },
      {
        id: 'gone',
        label: '出てきたら自転車がなかった',
        fact: 'When he came out, the bike was gone.',
        cues: ['bike was gone', 'bike was missing', 'bike was stolen', 'bike wasn\'t there'],
      },
      {
        id: 'boy',
        label: '店主は赤い上着の少年を見ていた',
        fact: 'The owner had seen a boy in a red jacket.',
        cues: ['red jacket', 'boy in a red', 'owner had seen', 'shop owner'],
      },
      {
        id: 'behind',
        label: '店の裏で自転車を見つけた',
        fact: 'Sam found the bike behind the shop.',
        cues: ['behind the shop', 'found the bike', 'found his bike'],
      },
      {
        id: 'home',
        label: '自転車で家に帰った',
        fact: 'He rode home.',
        cues: ['rode home', 'rode his bike home', 'cycled home', 'biked home'],
      },
    ],
  },
  {
    id: 'e06',
    title: 'Birthday cake',
    difficulty: 'medium',
    text: 'Emma baked a chocolate cake for her father\'s birthday. She forgot the sugar, so the cake tasted bitter. Her brother bought a small cake at the store. They sang to their father and served the new cake at seven.',
    points: [
      {
        id: 'baked',
        label: '父の誕生日にチョコレートケーキを焼いた',
        fact: 'Emma baked a chocolate cake for her father\'s birthday.',
        cues: ['chocolate cake', 'father\'s birthday', 'fathers birthday', 'baked a cake', 'baked'],
      },
      {
        id: 'sugar',
        label: '砂糖を入れ忘れ、ケーキは苦かった',
        fact: 'She forgot the sugar, so the cake tasted bitter.',
        cues: ['forgot the sugar', 'no sugar', 'tasted bitter', 'was bitter'],
      },
      {
        id: 'brother',
        label: '兄が店で小さいケーキを買った',
        fact: 'Her brother bought a small cake at the store.',
        cues: ['her brother', 'bought a small cake', 'small cake', 'at the store'],
      },
      {
        id: 'sang',
        label: '父に歌を歌った',
        fact: 'They sang to their father.',
        cues: ['sang', 'sang to their father', 'sang happy birthday'],
      },
      {
        id: 'seven',
        label: '7時に新しいケーキを出した',
        fact: 'They served the new cake at seven.',
        cues: ['at seven', 'at 7', 'new cake', 'served the'],
      },
    ],
  },
  {
    id: 'e07',
    title: 'Moved meeting',
    difficulty: 'medium',
    text: 'The team meeting was set for ten o\'clock in room four. The projector failed, so they moved to room six. The budget talk lasted forty minutes. They agreed to email the notes that afternoon.',
    points: [
      {
        id: 'room',
        label: '10時に4号室で会議の予定だった',
        fact: 'The team meeting was set for ten o\'clock in room four.',
        cues: ['ten o\'clock', '10 o\'clock', 'room four', 'room 4'],
      },
      {
        id: 'projector',
        label: 'プロジェクターが動かなかった',
        fact: 'The projector failed.',
        cues: ['projector failed', 'projector did not work', 'projector was broken', 'projector'],
      },
      {
        id: 'moved',
        label: '6号室へ移った',
        fact: 'They moved to room six.',
        cues: ['room six', 'room 6', 'moved to room'],
      },
      {
        id: 'budget',
        label: '予算の話は40分続いた',
        fact: 'The budget talk lasted forty minutes.',
        cues: ['forty minutes', '40 minutes', 'budget'],
      },
      {
        id: 'email',
        label: 'その午後にメモをメールすることで合意した',
        fact: 'They agreed to email the notes that afternoon.',
        cues: ['email the notes', 'email', 'that afternoon', 'send the notes'],
      },
    ],
  },
  {
    id: 'e08',
    title: 'Desk package',
    difficulty: 'hard',
    text: 'A package for Mr. Clark arrived at the front desk at two. The receptionist called him, but he was in a meeting. She left the box by his desk with a short note. He opened it at four and found a new keyboard.',
    points: [
      {
        id: 'arrived',
        label: 'Clark さん宛ての荷物が2時にフロントへ着いた',
        fact: 'A package for Mr. Clark arrived at the front desk at two.',
        cues: ['mr clark', 'mister clark', 'front desk', 'at two', 'at 2', 'package'],
      },
      {
        id: 'called',
        label: '受付が電話したが、会議中だった',
        fact: 'The receptionist called him, but he was in a meeting.',
        cues: ['receptionist', 'called him', 'in a meeting', 'was in a meeting'],
      },
      {
        id: 'desk',
        label: '机のそばに箱と短いメモを置いた',
        fact: 'She left the box by his desk with a short note.',
        cues: ['by his desk', 'on his desk', 'short note', 'left the box', 'left a note'],
      },
      {
        id: 'four',
        label: '4時に開けた',
        fact: 'He opened it at four.',
        cues: ['at four', 'at 4', 'opened it'],
      },
      {
        id: 'keyboard',
        label: '中身は新しいキーボードだった',
        fact: 'He found a new keyboard.',
        cues: ['new keyboard', 'a keyboard', 'found a keyboard'],
      },
    ],
  },
  {
    id: 'e09',
    title: 'Delayed flight',
    difficulty: 'hard',
    text: 'On Friday, Rosa\'s flight to Boston was delayed by two hours. She called her client and moved their lunch to three o\'clock. The plane landed at one thirty. She took a taxi and reached the restaurant ten minutes early.',
    points: [
      {
        id: 'delay',
        label: '金曜のボストン行きが2時間遅れた',
        fact: 'On Friday, her flight to Boston was delayed by two hours.',
        cues: ['two hours', 'delayed', 'flight to boston', 'boston', 'on friday'],
      },
      {
        id: 'client',
        label: '客に電話し、昼食を3時にずらした',
        fact: 'She called her client and moved their lunch to three o\'clock.',
        cues: ['called her client', 'her client', 'three o\'clock', '3 o\'clock', 'moved their lunch', 'moved the lunch'],
      },
      {
        id: 'landed',
        label: '飛行機は1時半に着いた',
        fact: 'The plane landed at one thirty.',
        cues: ['one thirty', '1:30', 'landed at'],
      },
      {
        id: 'taxi',
        label: 'タクシーで向かった',
        fact: 'She took a taxi.',
        cues: ['took a taxi', 'a taxi', 'by taxi'],
      },
      {
        id: 'early',
        label: 'レストランに10分早く着いた',
        fact: 'She reached the restaurant ten minutes early.',
        cues: ['ten minutes early', '10 minutes early', 'the restaurant'],
      },
    ],
  },
  {
    id: 'e10',
    title: 'Broken zipper',
    difficulty: 'hard',
    text: 'Ken bought a coat on Saturday and put the receipt in his wallet. On Monday the zipper broke, so he went back to the shop. He could not find the receipt. The clerk checked the card payment and exchanged the coat. Ken left with a new coat at noon.',
    points: [
      {
        id: 'bought',
        label: '土曜にコートを買い、レシートを財布に入れた',
        fact: 'Ken bought a coat on Saturday and put the receipt in his wallet.',
        cues: ['bought a coat', 'on saturday', 'receipt', 'wallet'],
      },
      {
        id: 'zipper',
        label: '月曜にファスナーが壊れた',
        fact: 'On Monday the zipper broke.',
        cues: ['zipper', 'on monday', 'broke'],
      },
      {
        id: 'shop',
        label: '店に戻った',
        fact: 'He went back to the shop.',
        cues: ['went back', 'back to the shop', 'returned to the shop'],
      },
      {
        id: 'receipt',
        label: 'レシートが見つからなかった',
        fact: 'He could not find the receipt.',
        cues: ['could not find the receipt', 'could not find his receipt', 'lost the receipt', 'no receipt'],
      },
      {
        id: 'card',
        label: '店員がカードの支払いを確認し、コートを交換した',
        fact: 'The clerk checked the card payment and exchanged the coat.',
        cues: ['card', 'exchanged', 'new coat', 'clerk'],
      },
      {
        id: 'noon',
        label: '正午に新しいコートを持って店を出た',
        fact: 'Ken left with a new coat at noon.',
        cues: ['at noon', 'new coat', 'left with'],
      },
    ],
  },
];

export function findStory(id: string): Story | undefined {
  return STORIES.find((story) => story.id === id);
}
