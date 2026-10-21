import type { Difficulty } from '../types';

export type SentenceBuild = {
  id: string;
  difficulty: Difficulty;
  /** Playback order. Intentionally not a grammatical sentence. */
  chunks: [string, string, string];
  acceptableSentences: string[];
};

/**
 * Original sentence builds. The three chunks use the same words as each
 * acceptable sentence, with none added or left out.
 */
export const BUILDS: SentenceBuild[] = [
  {
    id: 'd01',
    difficulty: 'easy',
    chunks: ['quietly', 'the door', 'please close'],
    acceptableSentences: ['Please close the door quietly.'],
  },
  {
    id: 'd02',
    difficulty: 'easy',
    chunks: ['his phone', 'at home', 'he forgot'],
    acceptableSentences: ['He forgot his phone at home.', 'At home he forgot his phone.'],
  },
  {
    id: 'd03',
    difficulty: 'easy',
    chunks: ['two red apples', 'she bought', 'yesterday'],
    acceptableSentences: ['She bought two red apples yesterday.', 'Yesterday she bought two red apples.'],
  },
  {
    id: 'd04',
    difficulty: 'easy',
    chunks: ['a short break', 'the team', 'needs'],
    acceptableSentences: ['The team needs a short break.'],
  },
  {
    id: 'd05',
    difficulty: 'medium',
    chunks: ['her keys', 'on the table', 'she left'],
    acceptableSentences: ['She left her keys on the table.'],
  },
  {
    id: 'd06',
    difficulty: 'medium',
    chunks: ['a window seat', 'asked for', 'the passenger'],
    acceptableSentences: ['The passenger asked for a window seat.'],
  },
  {
    id: 'd07',
    difficulty: 'medium',
    chunks: ['before lunch', 'this report', 'we should finish'],
    acceptableSentences: ['We should finish this report before lunch.', 'Before lunch we should finish this report.'],
  },
  {
    id: 'd08',
    difficulty: 'medium',
    chunks: ['to the station', 'the morning bus', 'goes'],
    acceptableSentences: ['The morning bus goes to the station.'],
  },
  {
    id: 'd09',
    difficulty: 'medium',
    chunks: ['after the rain', 'were still wet', 'the streets'],
    acceptableSentences: ['The streets were still wet after the rain.', 'After the rain the streets were still wet.'],
  },
  {
    id: 'd10',
    difficulty: 'hard',
    chunks: ['before the store closes', 'some bread', 'I need to buy'],
    acceptableSentences: [
      'I need to buy some bread before the store closes.',
      'Before the store closes I need to buy some bread.',
    ],
  },
  {
    id: 'd11',
    difficulty: 'easy',
    chunks: ['now', 'the window', 'please open'],
    acceptableSentences: ['Please open the window now.'],
  },
  {
    id: 'd12',
    difficulty: 'easy',
    chunks: ['every morning', 'she drinks', 'coffee'],
    acceptableSentences: ['She drinks coffee every morning.', 'Every morning she drinks coffee.'],
  },
  {
    id: 'd13',
    difficulty: 'easy',
    chunks: ['today', 'at the station', 'we meet'],
    acceptableSentences: ['We meet at the station today.', 'Today we meet at the station.'],
  },
  {
    id: 'd14',
    difficulty: 'easy',
    chunks: ['after dinner', 'the dishes', 'he washed'],
    acceptableSentences: ['He washed the dishes after dinner.', 'After dinner he washed the dishes.'],
  },
  {
    id: 'd15',
    difficulty: 'medium',
    chunks: ['on the train', 'my bag', 'I left'],
    acceptableSentences: ['I left my bag on the train.'],
  },
  {
    id: 'd16',
    difficulty: 'medium',
    chunks: ['after the meeting', 'she called', 'me'],
    acceptableSentences: ['She called me after the meeting.', 'After the meeting she called me.'],
  },
  {
    id: 'd17',
    difficulty: 'medium',
    chunks: ['we waited', 'because the train', 'was late'],
    acceptableSentences: ['We waited because the train was late.'],
  },
  {
    id: 'd18',
    difficulty: 'hard',
    chunks: ['I turned off', 'the alarm and', 'fell asleep again'],
    acceptableSentences: ['I turned off the alarm and fell asleep again.'],
  },
  {
    id: 'd19',
    difficulty: 'hard',
    chunks: ['after lunch', 'to call her', 'she asked me'],
    acceptableSentences: ['She asked me to call her after lunch.', 'After lunch she asked me to call her.'],
  },
  {
    id: 'd20',
    difficulty: 'hard',
    chunks: ['if it rains', 'we should take', 'a taxi'],
    acceptableSentences: ['If it rains we should take a taxi.', 'We should take a taxi if it rains.'],
  },
  {
    id: 'd21',
    difficulty: 'hard',
    chunks: ['before I left', 'my keys', 'I could not find'],
    acceptableSentences: ['I could not find my keys before I left.', 'Before I left I could not find my keys.'],
  },
  {
    id: 'd22',
    difficulty: 'hard',
    chunks: ['so please check your mail', 'the meeting', 'was moved'],
    acceptableSentences: ['The meeting was moved so please check your mail.'],
  },
  {
    id: 'd23',
    difficulty: 'hard',
    chunks: ['because ours was taken', 'another room', 'I booked'],
    acceptableSentences: ['I booked another room because ours was taken.'],
  },
  {
    id: 'd24',
    difficulty: 'hard',
    chunks: ['that I will be late', 'please tell her', 'tonight'],
    acceptableSentences: ['Please tell her that I will be late tonight.', 'Please tell her tonight that I will be late.'],
  },
];

export function findBuild(id: string): SentenceBuild | undefined {
  return BUILDS.find((build) => build.id === id);
}
