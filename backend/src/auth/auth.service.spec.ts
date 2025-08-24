import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRepository } from '../users/repositories/user.repository';
import { User, UserRole } from '../users/entities/user.entity';
import { PasswordUtil } from '../common/utils/password.util';

// Mock PasswordUtil
jest.mock('../common/utils/password.util');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.MEMBER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    hashPassword: jest.fn(),
    validatePassword: jest.fn(),
    fullName: 'John Doe',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    // Setup default config values
    configService.get.mockImplementation((key: string) => {
      const config = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '24h',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'StrongPass123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      (PasswordUtil.validatePasswordStrength as jest.Mock).mockReturnValue({
        isValid: true,
        errors: [],
      });
      userRepository.create.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValueOnce('access-token');
      jwtService.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await service.register(registerDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...registerDto,
        role: UserRole.MEMBER,
      });
      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
        },
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for weak password', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      (PasswordUtil.validatePasswordStrength as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
      });

      await expect(service.register(registerDto)).rejects.toThrow(UnauthorizedException);
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      mockUser.validatePassword = jest.fn().mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValueOnce('access-token');
      jwtService.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(mockUser.validatePassword).toHaveBeenCalledWith(loginDto.password);
      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
        },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      userRepository.findByEmail.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      mockUser.validatePassword = jest.fn().mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      mockUser.validatePassword = jest.fn().mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBe(mockUser);
    });

    it('should return null if user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null if user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      userRepository.findByEmail.mockResolvedValue(inactiveUser);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      mockUser.validatePassword = jest.fn().mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';

    it('should refresh token successfully', async () => {
      const payload = { sub: '1', email: 'test@example.com', role: 'member' };
      jwtService.verify.mockReturnValue(payload);
      userRepository.findById.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValueOnce('new-access-token');
      jwtService.signAsync.mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshToken(refreshToken);

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-refresh-secret',
      });
      expect(userRepository.findById).toHaveBeenCalledWith(payload.sub);
      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
        },
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const payload = { sub: '1', email: 'test@example.com', role: 'member' };
      jwtService.verify.mockReturnValue(payload);
      userRepository.findById.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const payload = { sub: '1', email: 'test@example.com', role: 'member' };
      const inactiveUser = { ...mockUser, isActive: false };
      jwtService.verify.mockReturnValue(payload);
      userRepository.findById.mockResolvedValue(inactiveUser);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});