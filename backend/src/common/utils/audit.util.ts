export function diffObjects(before: Record<string, any>, after: Record<string, any>): string {
  const diff: Record<string, { old: any; new: any }> = {};
  
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  for (const key of allKeys) {
    if (before[key] !== after[key]) {
      diff[key] = {
        old: before[key],
        new: after[key],
      };
    }
  }
  
  return JSON.stringify(diff);
}
