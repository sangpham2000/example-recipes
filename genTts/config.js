export const CONFIG = {
  baseUrl: "https://lcms-stg.ivyglobalschool.org",
  credentials: {
    username: "sang.pham",
    password: "12345678",
  },
  timeouts: {
    pageLoad: 10000,
    elementWait: 5000,
    saveOperation: 3000,
    betweenOperations: 100,
    retryDelay: 2000,
  },
  retry: {
    maxAttempts: 5,
    backoffMultiplier: 1.5,
  },
};
