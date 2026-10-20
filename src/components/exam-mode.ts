import { createContext } from 'react';

export const ExamModeContext = createContext<{
  exam: boolean;
  setExam: (value: boolean) => void;
}>({
  exam: false,
  setExam: () => {},
});
