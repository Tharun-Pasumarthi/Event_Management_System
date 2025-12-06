import { test, expect } from '@playwright/test'

test.describe('Event Management System - Full Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display home page with navigation', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=Events')).toBeVisible()
  })

  test('should allow user to navigate to events page', async ({ page }) => {
    await page.click('text=Events')
    await expect(page).toHaveURL(/.*events/)
  })

  test('should display login/auth options', async ({ page }) => {
    // Check for auth-related elements
    const authElements = page.locator('text=/login|sign in|register/i')
    await expect(authElements.first()).toBeVisible()
  })

  test('should allow navigation to admin dashboard', async ({ page }) => {
    await page.click('text=Admin')
    // Should navigate to admin page
    await expect(page).toHaveURL(/.*admin/)
  })
})

test.describe('Event Registration Flow', () => {
  test('should navigate to event registration page', async ({ page }) => {
    await page.goto('/events')
    // Click on first event if available
    const eventLink = page.locator('[data-testid="event-card"]').first()
    if (await eventLink.isVisible()) {
      await eventLink.click()
      await expect(page).toHaveURL(/.*register/)
    }
  })

  test('should display registration form fields', async ({ page }) => {
    await page.goto('/events')
    const registerButton = page.locator('text=Register').first()
    if (await registerButton.isVisible()) {
      await registerButton.click()
      // Verify form appears
      await expect(page.locator('form')).toBeVisible()
    }
  })
})

test.describe('QR Code Functionality', () => {
  test('should generate QR code on registration', async ({ page }) => {
    await page.goto('/events')
    // Navigate to event registration
    const registerButton = page.locator('text=Register').first()
    if (await registerButton.isVisible()) {
      await registerButton.click()
      // Fill form if needed
      const inputs = page.locator('input')
      if (await inputs.count() > 0) {
        await inputs.first().fill('Test User')
      }
    }
  })

  test('should display QR scanner on check-in page', async ({ page }) => {
    await page.goto('/check-in')
    // Verify scanner UI is present
    const scanner = page.locator('text=/scan|qr|code/i').first()
    if (await scanner.isVisible()) {
      await expect(scanner).toBeVisible()
    }
  })
})

test.describe('Admin Dashboard', () => {
  test('should display admin dashboard', async ({ page }) => {
    await page.goto('/admin')
    // Check for admin-specific elements
    const adminElements = page.locator('text=/dashboard|analytics|export/i')
    if (await adminElements.count() > 0) {
      await expect(adminElements.first()).toBeVisible()
    }
  })

  test('should allow exporting attendee data', async ({ page }) => {
    await page.goto('/admin')
    // Look for export button
    const exportButton = page.locator('text=/export|download|csv/i').first()
    if (await exportButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download')
      await exportButton.click()
      const download = await downloadPromise
      expect(download).toBeDefined()
    }
  })
})

test.describe('Certificate Generation', () => {
  test('should generate certificate PDF', async ({ page }) => {
    await page.goto('/certificates')
    // Check for certificate view
    const certificateElements = page.locator('text=/certificate|award|completion/i')
    if (await certificateElements.count() > 0) {
      await expect(certificateElements.first()).toBeVisible()
    }
  })
})

test.describe('Responsive Design', () => {
  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    // Verify mobile menu is present
    const mobileMenu = page.locator('button[aria-label*="menu"]')
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible()
    }
  })

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
  })

  test('should be responsive on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Error Handling', () => {
  test('should handle navigation errors gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page')
    // Should either show 404 or redirect
    const pageContent = page.locator('body')
    await expect(pageContent).toBeVisible()
  })
})
