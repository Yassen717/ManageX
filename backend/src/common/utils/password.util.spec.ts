import { PasswordUtil } from './password.util';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('PasswordUtil', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hash', () => {
    it('should hash password with correct salt rounds', async () => {
      const password = 'testPassword';
      const hashedPassword = 'hashedPassword';
      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await PasswordUtil.hash(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });
  });

  describe('compare', () => {
    it('should compare passwords correctly', async () => {
      const password = 'testPassword';
      const hashedPassword = 'hashedPassword';
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await PasswordUtil.compare(password, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const strongPassword = 'StrongPass123!';

      const result = PasswordUtil.validatePasswordStrength(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const shortPassword = 'Short1!';

      const result = PasswordUtil.validatePasswordStrength(shortPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without lowercase letter', () => {
      const password = 'PASSWORD123!';

      const result = PasswordUtil.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase letter', () => {
      const password = 'password123!';

      const result = PasswordUtil.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const password = 'Password!';

      const result = PasswordUtil.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const password = 'Password123';

      const result = PasswordUtil.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character (@$!%*?&)');
    });

    it('should return multiple errors for weak password', () => {
      const weakPassword = 'weak';

      const result = PasswordUtil.validatePasswordStrength(weakPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});