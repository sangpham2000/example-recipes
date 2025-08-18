import Matching3Processor from "../../../processors/macthing3.processor.js";
import BaseProcessor from "../../../processors/base.processor.js";
import { data1 } from "../data/igs_lcms_li_bank_matching3.js";

describe("Matching3 Worker 1", () => {
  before(async () => {
    const base = new BaseProcessor();
    await base.login();
  });
  it("should process all question items", async function () {
    const questionIds = data1;

    const questionWorker = new Matching3Processor(questionIds);
    const questionResults = await questionWorker.processAllItems();

    expect(questionResults.failed.length).toBe(
      0,
      `Question test failed with ${questionResults.failed.length} items.`
    );
    console.log("🎉 Matching3 worker processed successfully!");
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
