import { ACCOMPLISHMENTS } from './accomplishments';

export async function fetchAccomplishments(): Promise<string> {
  return ACCOMPLISHMENTS;
}
