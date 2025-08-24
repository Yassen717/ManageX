import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { UserRepository } from '../../users/repositories/user.repository';
import { User, UserRole } from '../../users/entities/user.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<UserRepository>;
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
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get(UserRepository);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const payload: JwtPayload = {
      sub: '1',
      email: 'test@example.com',
      role: 'member',
    };

    it('should return user data for valid payload', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(userRepository.findById).toHaveBeenCalledWith(payload.sub);
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      userRepository.findById.mockResolvedValue(inactiveUser);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});