import type { Problem } from './to-problem.js';

export class ReplayedProblem extends Error {
  constructor(readonly problem: Problem) {
    super(`Replayed ${problem.body.code}`);
    this.name = 'ReplayedProblem';
  }
}
