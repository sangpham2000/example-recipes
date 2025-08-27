import { CONFIG } from "../config.js";
import BaseProcessor from "./base.processor.js";

class PronunciationRecordProcessor extends BaseProcessor {
  constructor(itemIds) {
    super(
      "Content activities - pronunciation-record",
      "/content-activities/pronunciation-record-list",
      itemIds
    );
  }

  async processItem(questionId, attemptNumber) {
    const itemInfo = `${this.name} ID ${questionId} (attempt ${attemptNumber}/${CONFIG.retry.maxAttempts})`;
    console.log(`📝 Processing ${itemInfo}`);

    try {
      const editUrl = `${CONFIG.baseUrl}${this.urlPrefix}?id=${questionId}`;
      await browser.url(editUrl);

      await this.waitForPageLoad(questionId);

      await this.saveItem(questionId);

      this.processedCount++;
      console.log(`✅ ${itemInfo} processed successfully.`);
    } catch (error) {
      console.error(`❌ Failed to process ${itemInfo}:`, error.message);
      throw error;
    }
  }

  /**
   * Wait for page to fully load by checking multiple conditions
   */
  async waitForPageLoad(questionId) {
    console.log("⏳ Waiting for page to load...");
    await browser.waitUntil(
      async () => {
        try {
          const contentNameInput = await $(
            'input[placeholder="Enter the content name"]'
          );
          const value = await contentNameInput.getValue();
          return value.trim() !== "";
        } catch (error) {
          return false;
        }
      },
      {
        timeout: CONFIG.timeouts.pageLoad,
        timeoutMsg: `Content name input was not populated for ID ${questionId}`,
      }
    );
    await this.waitForLoadingComplete(questionId);
    console.log("✔️ Page loading complete.");
  }

  /**
   * Wait for loading spinner to disappear
   */
  async waitForLoadingComplete(questionId) {
    try {
      const loadingSpinner = await $(".q-loading");
      if (await loadingSpinner.isDisplayed()) {
        await loadingSpinner.waitForDisplayed({
          reverse: true,
          timeout: CONFIG.timeouts.pageLoad,
          timeoutMsg: `Loading spinner did not disappear for ID ${questionId}`,
        });
      }
    } catch (error) {
      console.log("Loading spinner not found or already hidden");
    }
  }

  /**
   * Handle the save process with confirmation
   */
  async saveItem(questionId) {
    console.log("💾 Saving item...");
    const saveBtn = await this.waitForSaveButton();
    await saveBtn.click();
    await this.handleConfirmationDialog();
    await this.waitForSaveCompletion(questionId);
  }

  /**
   * Wait for save button to be available and enabled
   */
  async waitForSaveButton() {
    const saveBtn = await $("button=Save");

    await saveBtn.waitForExist({
      timeout: CONFIG.timeouts.pageLoad,
      timeoutMsg: "Save button not found",
    });

    await saveBtn.waitForEnabled({
      timeout: CONFIG.timeouts.pageLoad,
      timeoutMsg: "Save button not enabled",
    });

    await browser.pause(500);
    return saveBtn;
  }

  /**
   * Handle the confirmation dialog after clicking save
   */
  async handleConfirmationDialog() {
    try {
      const confirmationDialog = await $("[role='dialog']");
      await confirmationDialog.waitForDisplayed({
        timeout: CONFIG.timeouts.elementWait,
        timeoutMsg: "Confirmation dialog did not appear after clicking Save",
      });

      const yesBtn = await $("button=yes");
      await yesBtn.waitForDisplayed({
        timeout: CONFIG.timeouts.elementWait,
        timeoutMsg: "Yes button not found in confirmation dialog",
      });
      await yesBtn.click();
    } catch {}
  }
}

export default PronunciationRecordProcessor;
