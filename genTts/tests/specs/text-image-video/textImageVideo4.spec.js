import TextImageVideoProcessor from "../../../processors/textImageVideo.processor.js";
import BaseProcessor from "../../../processors/base.processor.js";
import { data4 } from "../data/igs_lcms_li_bank_text_image_video.js";

describe("Text Image Video Worker 4", () => {
  before(async () => {
    const base = new BaseProcessor();
    await base.login();
  });
  it("should process all question items", async function () {
    const questionIds = data4;

    const questionWorker = new TextImageVideoProcessor(questionIds);
    const questionResults = await questionWorker.processAllItems();

    expect(questionResults.failed.length).toBe(
      0,
      `Question test failed with ${questionResults.failed.length} items.`
    );
    console.log("🎉 Text Image Video worker processed successfully!");
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
