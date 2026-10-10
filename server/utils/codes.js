import { Counter } from '../models/Counter.js';

export async function nextCode(prefix) {
  const counter = await Counter.findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-2026-${String(counter.seq).padStart(4, '0')}`;
}
