import McqProcessor from "../processors/mcq.processor.js";
import TextImageVideoProcessor from "../processors/textImageVideo.processor.js";
import BaseProcessor from "../processors/base.processor.js";

describe("Mcq Worker", () => {
  before(async () => {
    const base = new BaseProcessor();
    await base.login();
    console.log("✅ Login successful for Question Worker");
  });
  it("should process all items from all workers", async function () {
    const questionIds = [
      5090, 5091, 5092, 5093, 5094, 5095, 5096, 5097, 5098, 5099, 5100, 5101,
      5102, 5103, 5104, 5105, 5106, 5107, 5108, 5109,
    ];
    const learningContentIds = [11402, 11403, 11404];

    let totalFailedItems = 0;

    try {
      // --- Chạy Worker 1: Question Bank ---
      if (questionIds.length > 0) {
        const questionWorker = new McqProcessor(questionIds);
        const questionResults = await questionWorker.processAllItems();
        totalFailedItems += questionResults.failed.length;
      }

      // --- Chạy Worker 2: Learning Content ---
      if (learningContentIds.length > 0) {
        const contentWorker = new TextImageVideoProcessor(learningContentIds);
        const contentResults = await contentWorker.processAllItems();
        totalFailedItems += contentResults.failed.length;
      }

      // --- Kiểm tra kết quả tổng ---
      expect(totalFailedItems).toBe(
        0,
        `Test failed with a total of ${totalFailedItems} failed items across all workers.`
      );
      console.log("🎉 All workers completed successfully!");
    } catch (error) {
      console.error(
        "🚨 A critical error occurred during test execution:",
        error.message
      );
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
