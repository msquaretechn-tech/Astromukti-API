import { startCallSessionReaper, stopCallSessionReaper } from './callSessionReaper.js';

const tasks = [];

export function registerJobs() {
  tasks.push(startCallSessionReaper());
}

export function stopJobs() {
  try {
    stopCallSessionReaper();
  } catch (e) {
    // ignore
  }
}
