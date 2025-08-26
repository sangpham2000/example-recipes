import McqProcessor from "../../../processors/mcq.processor.js";
import BaseProcessor from "../../../processors/base.processor.js";
import { data6 } from "../data/igs_lcms_li_bank_mcq1.js";

describe("Mcq Worker 6", () => {
  before(async () => {
    const base = new BaseProcessor();
    await base.login();
    console.log("✅ Login successful for Question Worker");
  });
  it("should process all question items", async function () {
    const questionIds = data6;

    const questionWorker = new McqProcessor(questionIds);
    const questionResults = await questionWorker.processAllItems();

    expect(questionResults.failed.length).toBe(
      0,
      `Question test failed with ${questionResults.failed.length} items.`
    );
    console.log("🎉 Mcq worker 6 completed successfully!");
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
