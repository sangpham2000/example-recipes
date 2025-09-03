export const CONFIG = {
  baseUrl: "https://lcms.ivyglobalschool.org/",
  credentials: {
    username: "bo.teacher1",
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
