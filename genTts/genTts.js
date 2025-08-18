describe("Question Bank Automation Test - FINAL", () => {
  const CONFIG = {
    baseUrl: "https://lcms-test.ivyglobalschool.org",
    credentials: {
      username: "sang.pham",
      password: "22222222",
    },
    timeouts: {
      pageLoad: 10000,
      elementWait: 10000,
      saveOperation: 2000,
      betweenOperations: 200,
      retryDelay: 2000,
    },
    retry: {
      maxAttempts: 3,
      backoffMultiplier: 1.5,
    },
  };

  const questionIds = [5104, 5105, 5106, 5107, 5108, 5109];

  class QuestionProcessor {
    constructor() {
      this.processedCount = 0;
      this.failedItems = [];
      this.startTime = Date.now();
    }

    async login() {
      try {
        console.log("🔐 Starting login process...");
        await browser.url(CONFIG.baseUrl);
        await browser.waitUntil(
          async () =>
            (await browser.getTitle()).includes("LCMS") ||
            (await $('[placeholder="Username"]').isExisting()),
          {
            timeout: CONFIG.timeouts.pageLoad,
            timeoutMsg: "Login page did not load",
          }
        );
        const usernameInput = await $('[placeholder="Username"]');
        await usernameInput.waitForDisplayed({
          timeout: CONFIG.timeouts.elementWait,
        });
        await usernameInput.setValue(CONFIG.credentials.username);
        await browser.keys("Tab");
        const passwordInput = await $('[placeholder="8+ character"]');
        await passwordInput.setValue(CONFIG.credentials.password);
        const loginBtn = await $("button=Log In");
        await loginBtn.click();
        try {
          const gotItBtn = await $("button=Got it");
          await gotItBtn.waitForDisplayed({ timeout: 3000 });
          await gotItBtn.click();
        } catch (e) {
          /* No "Got it" dialog, continue */
        }
        await browser.waitUntil(
          async () => !(await browser.getUrl()).includes("/login"),
          {
            timeout: CONFIG.timeouts.pageLoad,
            timeoutMsg: "Login did not complete successfully",
          }
        );
        console.log("✅ Login successful");
      } catch (error) {
        throw new Error(`Login failed: ${error.message}`);
      }
    }

    async waitForSaveCompletion(questionId) {
      console.log(
        `  ⏳ Waiting for save confirmation for question ${questionId}...`
      );
      const initialUrl = await browser.getUrl();
      try {
        await browser.waitUntil(
          async () => {
            const successNotification = await $('[class*="success"]');
            if (await successNotification.isDisplayed()) return true;
            if ((await browser.getUrl()) !== initialUrl) return true;
            try {
              return !(await (await $("button=Save")).isEnabled());
            } catch (error) {
              return true;
            }
          },
          {
            timeout: CONFIG.timeouts.saveOperation,
            timeoutMsg: `Save operation did not confirm for question ${questionId}`,
            interval: 500,
          }
        );
      } catch (error) {
        console.warn(
          `  ⚠️ Save confirmation not detected for ${questionId}, proceeding with caution.`
        );
        await browser.pause(500);
      }
    }

    async processQuestion(questionId, attemptNumber = 1) {
      const maxAttempts = CONFIG.retry.maxAttempts;
      try {
        console.log(
          `📝 Processing question ${questionId} (attempt ${attemptNumber}/${maxAttempts})`
        );
        const editUrl = `${CONFIG.baseUrl}/question-bank/mcq-edit?id=${questionId}`;
        await browser.url(editUrl);
        const saveBtn = await $("button=Save");
        await saveBtn.waitForEnabled({
          timeout: CONFIG.timeouts.pageLoad,
          timeoutMsg: `Save button not ready for question ${questionId}`,
        });
        await browser.pause(500);
        await saveBtn.click();
        const yesBtn = await $("button=yes");
        await yesBtn.waitForDisplayed({ timeout: CONFIG.timeouts.elementWait });
        await yesBtn.click();
        await this.waitForSaveCompletion(questionId);
        this.processedCount++;
        console.log(
          `✅ Question ${questionId} processed successfully (${this.processedCount}/${questionIds.length})`
        );
        return { success: true, questionId, attemptNumber };
      } catch (error) {
        console.error(
          `❌ Error processing question ${questionId} (attempt ${attemptNumber}): ${error.message}`
        );
        if (attemptNumber < maxAttempts) {
          const delayMs =
            CONFIG.timeouts.retryDelay *
            Math.pow(CONFIG.retry.backoffMultiplier, attemptNumber - 1);
          console.log(`⏳ Retrying question ${questionId} in ${delayMs}ms...`);
          await browser.pause(delayMs);
          return await this.processQuestion(questionId, attemptNumber + 1);
        } else {
          this.failedItems.push({
            questionId,
            error: error.message,
            finalAttempt: attemptNumber,
          });
          throw error;
        }
      }
    }

    async processAllQuestions() {
      console.log(`🚀 Starting to process ${questionIds.length} questions...`);
      const results = {
        successful: [],
        failed: [],
        totalTime: 0,
        averageTimePerQuestion: 0,
      };
      for (const questionId of questionIds) {
        const questionStartTime = Date.now();
        try {
          const result = await this.processQuestion(questionId);
          results.successful.push({
            ...result,
            processingTime: Date.now() - questionStartTime,
          });
        } catch (error) {
          results.failed.push({
            questionId,
            error: error.message,
            processingTime: Date.now() - questionStartTime,
          });
        }
        if (questionIds.indexOf(questionId) < questionIds.length - 1) {
          console.log(
            `⏳ Waiting ${CONFIG.timeouts.betweenOperations}ms before next question...`
          );
          await browser.pause(CONFIG.timeouts.betweenOperations);
        }
      }
      results.totalTime = Date.now() - this.startTime;
      if (questionIds.length > 0) {
        results.averageTimePerQuestion = results.totalTime / questionIds.length;
      }
      return results;
    }

    printSummary(results) {
      console.log("\n" + "=".repeat(60));
      console.log("📊 PROCESSING SUMMARY REPORT");
      console.log("=".repeat(60));
      console.log(`📈 Total Questions: ${questionIds.length}`);
      console.log(`✅ Successful: ${results.successful.length}`);
      console.log(`❌ Failed: ${results.failed.length}`);
      console.log(`⏱️  Total Time: ${(results.totalTime / 1000).toFixed(2)}s`);
      if (results.averageTimePerQuestion > 0) {
        console.log(
          `📊 Average Time per Question: ${(
            results.averageTimePerQuestion / 1000
          ).toFixed(2)}s`
        );
      }
      const successRate =
        questionIds.length > 0
          ? (results.successful.length / questionIds.length) * 100
          : 0;
      console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);
      if (results.failed.length > 0) {
        console.log("\n❌ FAILED QUESTIONS:");
        results.failed.forEach((item) =>
          console.log(`  - Question ${item.questionId}: ${item.error}`)
        );
      }
      if (results.successful.length > 0) {
        console.log("\n✅ SUCCESSFUL QUESTIONS:");
        results.successful.forEach((item) =>
          console.log(
            `  - Question ${item.questionId} (${(
              item.processingTime / 1000
            ).toFixed(2)}s)`
          )
        );
      }
      console.log("=".repeat(60) + "\n");
    }
  }

  it("should process all questions optimally", async function () {
    this.timeout(360000);

    const processor = new QuestionProcessor();
    try {
      await processor.login();
      const results = await processor.processAllQuestions();
      processor.printSummary(results);
      expect(results.failed.length).toBe(
        0,
        `Test failed with ${results.failed.length} failed items.`
      );
      console.log(`🎉 Test completed successfully with 100.0% success rate!`);
    } catch (error) {
      console.error("🚨 Test execution failed:", error.message);
      throw error;
    }
  });

  afterEach(async function () {
    if (this.currentTest.state === "failed") {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const screenshotPath = `./screenshots/failed_${timestamp}.png`;
        await browser.saveScreenshot(screenshotPath);
        console.log(
          `📸 Screenshot saved to ${screenshotPath} due to test failure.`
        );
      } catch (e) {
        console.error("Failed to save screenshot:", e);
      }
    }
  });
});
