import { createContext, useContext } from 'react';

/** Opens the Learn section that explains a concept card, on top of whatever screen is showing. */
export const OpenCardTopicContext = createContext<((cardId: string) => void) | null>(null);

export function useOpenCardTopic(): (cardId: string) => void {
  const open = useContext(OpenCardTopicContext);
  if (open === null) throw new Error('useOpenCardTopic must be used inside OpenCardTopicContext');
  return open;
}
