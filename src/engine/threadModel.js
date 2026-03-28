// src/engine/threadModel.js
// Logic for deriving kernel thread count & user->kernel mappings

/**
 * Returns the number of kernel threads based on user thread count and model.
 */
export function getKernelCount(model, userCount) {
  if (model === 'Many-to-One') return 1;
  if (model === 'One-to-One') return userCount;
  // Many-to-Many: roughly half, at least 1, at most userCount
  return Math.max(1, Math.ceil(userCount / 2));
}

/**
 * Builds a mapping from user thread ID -> kernel thread ID based on the model.
 * @param {string} model
 * @param {Array<{id:string}>} userThreads
 * @param {Array<{id:string}>} kernelThreads
 * @returns {Object<string,string>} { userThreadId: kernelThreadId }
 */
export function buildMappings(model, userThreads, kernelThreads) {
  const mapping = {};
  if (model === 'Many-to-One') {
    const k = kernelThreads[0]?.id;
    for (const u of userThreads) mapping[u.id] = k;
  } else if (model === 'One-to-One') {
    for (let i = 0; i < userThreads.length; i++) {
      mapping[userThreads[i].id] = kernelThreads[i]?.id;
    }
  } else {
    // Many-to-Many: distribute round-robin
    for (let i = 0; i < userThreads.length; i++) {
      mapping[userThreads[i].id] = kernelThreads[i % kernelThreads.length]?.id;
    }
  }
  return mapping;
}
