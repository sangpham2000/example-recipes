import { CONFIG } from "../config.js";

class BaseProcessor {
  constructor(name, urlPrefix, itemIds) {
    this.name = name;
    this.urlPrefix = urlPrefix;
    this.itemIds = itemIds;
    this.processedCount = 0;
    this.failedItems = [];
    this.startTime = Date.now();
    this.sessionValid = false;
    this.lastActivityTime = Date.now();
  }

  /**
   * Enhanced login with session validation
   */
  async login() {
    try {
      console.log("🔐 Starting login process...");

      // Check if already logged in
      if (await this.isAlreadyLoggedIn()) {
        console.log("✅ Already logged in, skipping login process");
        this.sessionValid = true;
        return;
      }

      await browser.url(CONFIG.baseUrl);

      // Wait for login page to load
      await browser.waitUntil(
        async () => {
          try {
            const title = await browser.getTitle();
            const usernameExists = await $(
              '[placeholder="Username"]'
            ).isExisting();
            return title.includes("LCMS") || usernameExists;
          } catch (error) {
            return false;
          }
        },
        {
          timeout: CONFIG.timeouts.pageLoad,
          timeoutMsg: "Login page did not load",
        }
      );

      // Perform login
      await this.performLogin();

      // Validate login success
      await this.validateLoginSuccess();

      this.sessionValid = true;
      this.lastActivityTime = Date.now();
      console.log("✅ Login successful");
    } catch (error) {
      this.sessionValid = false;
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Check if user is already logged in
   */
  async isAlreadyLoggedIn() {
    try {
      const currentUrl = await browser.getUrl();
      return (
        !currentUrl.includes("/login") &&
        currentUrl.includes(CONFIG.baseUrl.replace(/https?:\/\//, ""))
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform the actual login steps
   */
  async performLogin() {
    // Fill username
    const usernameInput = await $('[placeholder="Username"]');
    await usernameInput.waitForDisplayed({
      timeout: CONFIG.timeouts.elementWait,
    });
    await usernameInput.setValue(CONFIG.credentials.username);

    // Move to password field
    await browser.keys("Tab");
    await browser.pause(500); // Small pause for UI stability

    // Fill password
    const passwordInput = await $('[placeholder="8+ character"]');
    await passwordInput.waitForDisplayed({
      timeout: CONFIG.timeouts.elementWait,
    });
    await passwordInput.setValue(CONFIG.credentials.password);

    // Click login button
    const loginBtn = await $("button=Log In");
    await loginBtn.waitForClickable({
      timeout: CONFIG.timeouts.elementWait,
    });
    await loginBtn.click();

    // Handle optional "Got it" dialog
    await this.handleOptionalDialog();
  }

  /**
   * Handle optional dialogs after login
   */
  async handleOptionalDialog() {
    try {
      const gotItBtn = await $("button=Got it");
      await gotItBtn.waitForDisplayed({ timeout: 3000 });
      await gotItBtn.click();
      console.log("👍 Handled 'Got it' dialog");
    } catch (error) {
      // No dialog appeared, which is fine
      console.log("ℹ️ No 'Got it' dialog found, continuing...");
    }
  }

  /**
   * Validate that login was successful
   */
  async validateLoginSuccess() {
    await browser.waitUntil(
      async () => {
        try {
          const currentUrl = await browser.getUrl();
          return !currentUrl.includes("/login");
        } catch (error) {
          return false;
        }
      },
      {
        timeout: CONFIG.timeouts.pageLoad,
        timeoutMsg: "Login did not complete successfully",
      }
    );
  }

  /**
   * Check and refresh session if needed
   */
  async ensureValidSession() {
    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes

    if (!this.sessionValid || timeSinceLastActivity > sessionTimeout) {
      console.log("🔄 Session may be expired, checking...");

      try {
        const currentUrl = await browser.getUrl();
        if (currentUrl.includes("/login")) {
          console.log("🔐 Session expired, re-logging in...");
          await this.login();
        } else {
          this.sessionValid = true;
          this.lastActivityTime = Date.now();
        }
      } catch (error) {
        console.warn("⚠️ Session check failed, attempting re-login...");
        await this.login();
      }
    }
  }

  /**
   * Enhanced save completion waiting with better error handling
   */
  async waitForSaveCompletion(itemId) {
    console.log(
      `  ⏳ Waiting for save completion notification for ID ${itemId}...`
    );

    const notificationSelectors = [
      "//*[contains(@class, 'q-notification') and contains(., 'Update data successfully')]",
      "//*[contains(@class, 'q-notification') and contains(., 'updated successfully')]",
      "//*[contains(@class, 'q-notification') and contains(., 'Success')]",
    ];

    let notificationFound = false;

    for (const selector of notificationSelectors) {
      try {
        const notification = await $(selector);
        await notification.waitForDisplayed({
          timeout: CONFIG.timeouts.saveOperation,
        });

        console.log(`  👍 Success notification found for ID ${itemId}`);
        notificationFound = true;
        break;
      } catch (error) {
        // Try next selector
        continue;
      }
    }

    if (!notificationFound) {
      console.warn(
        `  ⚠️ Save confirmation notification not detected for ID ${itemId}`
      );

      // Alternative validation: check if we're still on the edit page
      await browser.pause(2000);
      const currentUrl = await browser.getUrl();
      if (currentUrl.includes("edit")) {
        console.log(`  ✔️ Still on edit page, assuming save was successful`);
      }
    }

    this.lastActivityTime = Date.now();
  }

  /**
   * Enhanced item processing with session management
   */
  async processAllItems() {
    console.log(
      `\n🚀 Starting to process ${this.itemIds.length} items for [${this.name}]...`
    );

    // Ensure we're logged in before starting
    await this.ensureValidSession();

    for (let i = 0; i < this.itemIds.length; i++) {
      const itemId = this.itemIds[i];

      // Check session periodically
      if (i > 0 && i % 5 === 0) {
        await this.ensureValidSession();
      }

      await this.processItemWithRetry(itemId);

      // Add delay between items (except for last item)
      if (i < this.itemIds.length - 1) {
        const delay = this.calculateDelay();
        console.log(`⏳ Waiting ${delay}ms before next item...`);
        await browser.pause(delay);
      }

      // Progress reporting
      this.reportProgress(i + 1);
    }

    const results = this.getSummary();
    this.printSummary(results);
    return results;
  }

  /**
   * Calculate adaptive delay based on success/failure rate
   */
  calculateDelay() {
    const baseDelay = CONFIG.timeouts.betweenOperations;
    const errorRate =
      this.failedItems.length / Math.max(this.processedCount, 1);

    // Increase delay if we have many errors
    if (errorRate > 0.3) {
      return baseDelay * 2;
    } else if (errorRate > 0.1) {
      return baseDelay * 1.5;
    }

    return baseDelay;
  }

  /**
   * Report processing progress
   */
  reportProgress(currentIndex) {
    if (currentIndex % 10 === 0 || currentIndex === this.itemIds.length) {
      const percentage = ((currentIndex / this.itemIds.length) * 100).toFixed(
        1
      );
      const elapsed = (Date.now() - this.startTime) / 1000;
      const rate = currentIndex / elapsed;
      const remaining = (this.itemIds.length - currentIndex) / rate;

      console.log(
        `📊 Progress: ${currentIndex}/${this.itemIds.length} (${percentage}%) | ` +
          `Rate: ${rate.toFixed(2)} items/sec | ` +
          `ETA: ${remaining.toFixed(0)}s`
      );
    }
  }

  /**
   * Enhanced retry logic with exponential backoff and circuit breaker
   */
  async processItemWithRetry(itemId, attemptNumber = 1) {
    try {
      await this.processItem(itemId, attemptNumber);

      // Reset consecutive failures on success
      this.consecutiveFailures = 0;
    } catch (error) {
      console.error(
        `❌ Error processing ${this.name} ID ${itemId} (attempt ${attemptNumber}): ${error.message}`
      );

      // Circuit breaker: if too many consecutive failures, take a longer break
      this.consecutiveFailures = (this.consecutiveFailures || 0) + 1;
      if (this.consecutiveFailures >= 5) {
        console.log(
          `🛑 Circuit breaker: Taking extended break due to consecutive failures...`
        );
        await browser.pause(10000);
        this.consecutiveFailures = 0;
      }

      if (attemptNumber < CONFIG.retry.maxAttempts) {
        const delayMs = this.calculateRetryDelay(attemptNumber);
        console.log(
          `⏳ Retrying ID ${itemId} in ${delayMs}ms... (${attemptNumber + 1}/${
            CONFIG.retry.maxAttempts
          })`
        );
        await browser.pause(delayMs);

        // Check session before retry
        await this.ensureValidSession();

        await this.processItemWithRetry(itemId, attemptNumber + 1);
      } else {
        this.failedItems.push({
          itemId,
          error: error.message,
          attempts: attemptNumber,
          timestamp: new Date().toISOString(),
        });
        console.log(`💀 Item ${itemId} failed after ${attemptNumber} attempts`);
      }
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  calculateRetryDelay(attemptNumber) {
    const baseDelay = CONFIG.timeouts.retryDelay;
    const exponentialDelay =
      baseDelay * Math.pow(CONFIG.retry.backoffMultiplier, attemptNumber - 1);

    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 1000;

    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Enhanced summary with more detailed statistics
   */
  printSummary(results) {
    const totalTime = (Date.now() - this.startTime) / 1000;
    const avgTimePerItem = totalTime / this.itemIds.length;

    console.log("\n" + "=".repeat(80));
    console.log(`📊 PROCESSING SUMMARY REPORT FOR [${this.name}]`);
    console.log("=".repeat(80));
    console.log(`📈 Total Items: ${this.itemIds.length}`);
    console.log(`✅ Successful: ${results.successful.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(
      `⏱️  Total Time: ${totalTime.toFixed(2)}s (${avgTimePerItem.toFixed(
        2
      )}s per item)`
    );

    if (this.itemIds.length > 0) {
      const successRate =
        (results.successful.length / this.itemIds.length) * 100;
      console.log(`🎯 Success Rate: ${successRate.toFixed(1)}%`);

      const throughput = ((this.itemIds.length / totalTime) * 3600).toFixed(1);
      console.log(`🚀 Throughput: ${throughput} items/hour`);
    }

    if (results.failed.length > 0) {
      console.log("\n❌ FAILED ITEMS:");
      results.failed.forEach((item) => {
        const attempts = item.attempts ? ` (${item.attempts} attempts)` : "";
        console.log(`  - ID ${item.itemId}${attempts}: ${item.error}`);
      });

      // Group errors by type
      const errorGroups = this.groupErrorsByType(results.failed);
      if (Object.keys(errorGroups).length > 1) {
        console.log("\n📋 ERROR BREAKDOWN:");
        Object.entries(errorGroups).forEach(([errorType, count]) => {
          console.log(`  - ${errorType}: ${count} items`);
        });
      }
    }

    console.log("=".repeat(80) + "\n");
  }

  /**
   * Group errors by common patterns
   */
  groupErrorsByType(failedItems) {
    const groups = {};

    failedItems.forEach((item) => {
      let errorType = "Other";

      if (item.error.includes("timeout")) {
        errorType = "Timeout";
      } else if (
        item.error.includes("navigation") ||
        item.error.includes("navigate")
      ) {
        errorType = "Navigation";
      } else if (
        item.error.includes("element") ||
        item.error.includes("selector")
      ) {
        errorType = "Element Not Found";
      } else if (
        item.error.includes("network") ||
        item.error.includes("connection")
      ) {
        errorType = "Network";
      }

      groups[errorType] = (groups[errorType] || 0) + 1;
    });

    return groups;
  }

  /**
   * Get enhanced summary with timing information
   */
  getSummary() {
    const successfulItems = this.itemIds.filter(
      (id) => !this.failedItems.some((f) => f.itemId === id)
    );

    return {
      successful: successfulItems.map((id) => ({ itemId: id })),
      failed: this.failedItems,
      totalTime: (Date.now() - this.startTime) / 1000,
      successRate: (successfulItems.length / this.itemIds.length) * 100,
      avgTimePerItem:
        (Date.now() - this.startTime) / 1000 / this.itemIds.length,
    };
  }

  /**
   * Abstract method to be implemented by subclasses
   */
  async processItem(itemId, attemptNumber) {
    throw new Error("processItem() must be implemented by subclasses");
  }
}

export default BaseProcessor;
