import type { Difficulty } from '../types';

export type ReadingSentence = {
  id: string;
  setId: string;
  number: number;
  group: 1 | 2;
  text: string;
};

export type ReadingSet = {
  id: string;
  title: string;
  difficulty: Difficulty;
  sentences: ReadingSentence[];
};

const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'] as const;

function sentence(setId: string, number: number, group: 1 | 2, text: string): ReadingSentence {
  return { id: `${setId}-${number}`, setId, number, group, text };
}

export const READING_SETS: ReadingSet[] = [
  {
    id: 'keys',
    title: '朝の鍵',
    difficulty: 'medium',
    sentences: [
      sentence('keys', 1, 1, 'I woke up a little late this morning.'),
      sentence('keys', 2, 1, 'The coffee was still hot, so I drank it quickly.'),
      sentence('keys', 3, 1, 'I could not find my keys on the kitchen table.'),
      sentence('keys', 4, 1, 'I left the house without locking the front door.'),
      sentence('keys', 5, 2, 'The bus was already at the corner when I arrived.'),
      sentence('keys', 6, 2, 'I waved, but the driver did not see me.'),
      sentence('keys', 7, 2, 'I decided to walk to the next stop instead.'),
      sentence('keys', 8, 2, 'I still got to work before the morning meeting.'),
    ],
  },
  {
    id: 'package',
    title: '隣の荷物',
    difficulty: 'medium',
    sentences: [
      sentence('package', 1, 1, 'A package arrived for my neighbor this afternoon.'),
      sentence('package', 2, 1, 'The driver left it in front of her door.'),
      sentence('package', 3, 1, 'It looked like it might rain, so I moved it inside.'),
      sentence('package', 4, 1, 'I wrote a short note and put it on the box.'),
      sentence('package', 5, 2, 'She came home after dark and saw the note.'),
      sentence('package', 6, 2, 'She thanked me and offered me some tea.'),
      sentence('package', 7, 2, 'We talked for a few minutes in the hallway.'),
      sentence('package', 8, 2, 'I went back upstairs and finished my dinner.'),
    ],
  },
  {
    id: 'towel',
    title: '朝のタオル',
    difficulty: 'medium',
    sentences: [
      sentence('towel', 1, 1, 'I brushed my teeth as soon as I got up.'),
      sentence('towel', 2, 1, 'I opened the cabinet and looked for a clean towel.'),
      sentence('towel', 3, 1, 'The clean towels were still sitting in the dryer.'),
      sentence('towel', 4, 1, 'I dried my face with a small towel and got dressed.'),
      sentence('towel', 5, 2, 'I put some bread in the toaster for breakfast.'),
      sentence('towel', 6, 2, 'The toast popped up, but the butter dish was empty.'),
      sentence('towel', 7, 2, 'I found a jar of jam at the back of the fridge.'),
      sentence('towel', 8, 2, 'I ate the toast with jam and rinsed my plate.'),
    ],
  },
  {
    id: 'commute',
    title: '駅までの道',
    difficulty: 'medium',
    sentences: [
      sentence('commute', 1, 1, 'I wheeled my bike out and saw that the tire was soft.'),
      sentence('commute', 2, 1, 'I did not have a pump with me this morning.'),
      sentence('commute', 3, 1, 'I locked the bike beside the building and started walking.'),
      sentence('commute', 4, 1, 'I got to the station just as the train was coming in.'),
      sentence('commute', 5, 2, 'The morning train pulled in several minutes late.'),
      sentence('commute', 6, 2, 'When the doors opened, every seat was already taken.'),
      sentence('commute', 7, 2, 'I stepped inside and held a rail near the door.'),
      sentence('commute', 8, 2, 'I stayed on my feet until I reached my stop.'),
    ],
  },
  {
    id: 'office',
    title: '午後の会議',
    difficulty: 'medium',
    sentences: [
      sentence('office', 1, 1, 'I sent my report to the printer before the meeting.'),
      sentence('office', 2, 1, 'The machine stopped before the last page came out.'),
      sentence('office', 3, 1, 'I checked the tray and found that there was no paper.'),
      sentence('office', 4, 1, 'I put in a new stack and printed that page again.'),
      sentence('office', 5, 2, 'I went to our usual room to set up the chairs.'),
      sentence('office', 6, 2, 'Another team was already using the table in there.'),
      sentence('office', 7, 2, 'I found an empty room a short walk down the hall.'),
      sentence('office', 8, 2, 'I carried our papers there before the others arrived.'),
    ],
  },
  {
    id: 'lunch',
    title: '昼の食事',
    difficulty: 'medium',
    sentences: [
      sentence('lunch', 1, 1, 'I opened the fridge at work and found the soup from last night.'),
      sentence('lunch', 2, 1, 'I poured a bowl and warmed it for a few minutes.'),
      sentence('lunch', 3, 1, 'It was a simple lunch, but it was hot and filling.'),
      sentence('lunch', 4, 1, 'I finished the bowl at my desk and washed the spoon.'),
      sentence('lunch', 5, 2, 'I ordered a sandwich and waited near the counter.'),
      sentence('lunch', 6, 2, 'The server set down a bowl that I had not ordered.'),
      sentence('lunch', 7, 2, 'I said I wanted the sandwich and pointed at the menu.'),
      sentence('lunch', 8, 2, 'She took the bowl back and brought me the right plate.'),
    ],
  },
  {
    id: 'callback',
    title: '折り返しの電話',
    difficulty: 'medium',
    sentences: [
      sentence('callback', 1, 1, 'I came home and noticed a missed call from her.'),
      sentence('callback', 2, 1, 'The message asked me to call when I had a minute.'),
      sentence('callback', 3, 1, 'I called her back before I started cooking dinner.'),
      sentence('callback', 4, 1, 'We picked a time to meet and then said goodbye.'),
      sentence('callback', 5, 2, 'She asked me how to find the building.'),
      sentence('callback', 6, 2, 'I wrote the street name and described the front door.'),
      sentence('callback', 7, 2, 'I sent the message so she would not walk past it.'),
      sentence('callback', 8, 2, 'She wrote back that she was standing by the entrance.'),
    ],
  },
  {
    id: 'weather',
    title: '午後の天気',
    difficulty: 'medium',
    sentences: [
      sentence('weather', 1, 1, 'I looked out and saw the trees moving in the wind.'),
      sentence('weather', 2, 1, 'The laundry was still hanging on the line outside.'),
      sentence('weather', 3, 1, 'I hurried out and pulled each piece off the line.'),
      sentence('weather', 4, 1, 'I carried the basket in before anything blew down the street.'),
      sentence('weather', 5, 2, 'We were going to walk around the block at noon.'),
      sentence('weather', 6, 2, 'The sun was high, and the sidewalk felt too hot.'),
      sentence('weather', 7, 2, 'We chose to wait and go out again in the evening.'),
      sentence('weather', 8, 2, 'By then the air was cooler, and the walk felt easy.'),
    ],
  },
  {
    id: 'errands',
    title: '帰り道の用事',
    difficulty: 'medium',
    sentences: [
      sentence('errands', 1, 1, 'I left work a little earlier than usual today.'),
      sentence('errands', 2, 1, 'On the way to the market, I stopped in at the bank.'),
      sentence('errands', 3, 1, 'I took out some cash and closed my wallet carefully.'),
      sentence('errands', 4, 1, 'I bought some fruit and walked home from there.'),
      sentence('errands', 5, 2, 'There was a small box on my desk that I needed to send.'),
      sentence('errands', 6, 2, 'I carried it to the post office on the way home.'),
      sentence('errands', 7, 2, 'The clerk weighed it and handed me a short receipt.'),
      sentence('errands', 8, 2, 'I tucked the receipt into my bag and headed home.'),
    ],
  },
  {
    id: 'rest',
    title: '夜の休息',
    difficulty: 'medium',
    sentences: [
      sentence('rest', 1, 1, 'A dull headache started while I was on the sofa.'),
      sentence('rest', 2, 1, 'The lamp was bright, so I switched it off.'),
      sentence('rest', 3, 1, 'I lay back and kept the room quiet for a while.'),
      sentence('rest', 4, 1, 'After that rest, my head felt a little better.'),
      sentence('rest', 5, 2, 'My throat started to hurt when I got home.'),
      sentence('rest', 6, 2, 'I heated some water and made a warm drink.'),
      sentence('rest', 7, 2, 'I sat at the table and sipped it slowly.'),
      sentence('rest', 8, 2, 'Then I went to bed so I could rest until morning.'),
    ],
  },
  {
    id: 'desk',
    title: '机のランプ',
    difficulty: 'easy',
    sentences: [
      sentence('desk', 1, 1, 'I sat down at my desk.'),
      sentence('desk', 2, 1, 'The lamp was still off.'),
      sentence('desk', 3, 1, 'I turned the lamp on.'),
      sentence('desk', 4, 1, 'Then I opened my notebook.'),
      sentence('desk', 5, 2, 'The first page was blank.'),
      sentence('desk', 6, 2, 'I wrote the date at the top.'),
      sentence('desk', 7, 2, 'I heard a knock at the door.'),
      sentence('desk', 8, 2, 'I stood up and opened it.'),
    ],
  },
  {
    id: 'umbrella',
    title: '雨の停留所',
    difficulty: 'easy',
    sentences: [
      sentence('umbrella', 1, 1, 'I looked out the window.'),
      sentence('umbrella', 2, 1, 'It was raining hard.'),
      sentence('umbrella', 3, 1, 'I picked up my umbrella.'),
      sentence('umbrella', 4, 1, 'I locked the front door.'),
      sentence('umbrella', 5, 2, 'The street was already wet.'),
      sentence('umbrella', 6, 2, 'I walked to the bus stop.'),
      sentence('umbrella', 7, 2, 'The bus arrived in a minute.'),
      sentence('umbrella', 8, 2, 'I sat down and shook my coat.'),
    ],
  },
  {
    id: 'delay',
    title: '遅れた朝',
    difficulty: 'hard',
    sentences: [
      sentence('delay', 1, 1, 'I had planned to leave early, but I could not find my keys in the kitchen.'),
      sentence('delay', 2, 1, 'I checked the table, my bag, and the coat by the door before I saw them.'),
      sentence('delay', 3, 1, 'By the time I stepped outside, the bus I usually take was pulling away.'),
      sentence('delay', 4, 1, 'I decided to walk to the next stop, even though the rain had started.'),
      sentence('delay', 5, 2, 'A later bus was waiting there, and a few seats near the door were open.'),
      sentence('delay', 6, 2, 'I sat down, caught my breath, and checked the time on my phone.'),
      sentence('delay', 7, 2, 'The ride took longer than usual because the traffic was slow near the station.'),
      sentence('delay', 8, 2, 'I still reached the office before the meeting, though I had no time for coffee.'),
    ],
  },
  {
    id: 'guest',
    title: '夕食の客',
    difficulty: 'hard',
    sentences: [
      sentence('guest', 1, 1, 'A friend was coming for dinner, so I left work earlier than I usually do.'),
      sentence('guest', 2, 1, 'On the way home I stopped at the market, because I still needed bread and fruit.'),
      sentence('guest', 3, 1, 'The line at the counter was long, and I waited several minutes before I could pay.'),
      sentence('guest', 4, 1, 'When I got back, I started the soup and set two plates on the table.'),
      sentence('guest', 5, 2, 'She called to say her train was late, so I turned the heat down and waited.'),
      sentence('guest', 6, 2, 'I used the extra time to wash the dishes that were still sitting in the sink.'),
      sentence('guest', 7, 2, 'She arrived just as the soup was ready, and she brought a small cake with her.'),
      sentence('guest', 8, 2, 'We ate slowly, talked about the week, and finished the cake before she left.'),
    ],
  },
];

export function numberCue(number: number): string {
  const word = NUMBER_WORDS[number] ?? String(number);
  return `Number ${word}.`;
}

export function findReadingSet(setId: string): ReadingSet | undefined {
  return READING_SETS.find((set) => set.id === setId);
}

export function situationLabel(setId: string): string {
  const index = READING_SETS.findIndex((set) => set.id === setId);
  if (index < 0) return 'Situation';
  return `Situation ${String.fromCharCode(65 + index)}`;
}

export function findReadingSentence(setId: string, number: number): ReadingSentence | undefined {
  return findReadingSet(setId)?.sentences.find((sentence) => sentence.number === number);
}
