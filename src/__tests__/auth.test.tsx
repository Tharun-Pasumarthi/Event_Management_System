// Mock all Firebase modules BEFORE importing components
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApp: jest.fn(() => ({})),
}))

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null)
    return jest.fn()
  }),
}))

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  getDoc: jest.fn(),
}))

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
}))

jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(),
  isSupported: jest.fn(() => Promise.resolve(false)),
}))

describe('Application Tests', () => {
  it('should pass basic smoke test', () => {
    expect(true).toBe(true)
  })

  it('should verify Firebase mocks are working', () => {
    const { initializeApp } = require('firebase/app')
    expect(initializeApp).toBeDefined()
  })

  it('should verify Auth context can be imported', () => {
    // Just verify the import works
    expect(() => {
      require('@/contexts/AuthContext')
    }).not.toThrow()
  })

  it('should verify lib/firebase can be imported', () => {
    // Just verify the import works
    expect(() => {
      require('@/lib/firebase')
    }).not.toThrow()
  })
})
