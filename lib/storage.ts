import fs from 'fs';
import path from 'path';
import { Proposal } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'data', 'proposals.json');

function readData(): Proposal[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw) as Proposal[];
}

function writeData(proposals: Proposal[]): void {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(proposals, null, 2), 'utf-8');
}

export async function getAllProposals(): Promise<Proposal[]> {
  return readData().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getProposalById(id: string): Promise<Proposal | null> {
  return readData().find((p) => p.id === id) ?? null;
}

export async function createProposal(proposal: Proposal): Promise<Proposal> {
  const proposals = readData();
  proposals.push(proposal);
  writeData(proposals);
  return proposal;
}

export async function updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal> {
  const proposals = readData();
  const index = proposals.findIndex((p) => p.id === id);
  if (index === -1) throw new Error('Proposal not found');
  proposals[index] = { ...proposals[index], ...updates, updatedAt: new Date().toISOString() };
  writeData(proposals);
  return proposals[index];
}

export async function deleteProposal(id: string): Promise<void> {
  const proposals = readData().filter((p) => p.id !== id);
  writeData(proposals);
}
