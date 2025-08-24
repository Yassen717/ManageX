import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from './user.repository';
import { User, UserRole } from '../entities/user.entity';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockRepository: jest.Mocked<Repository<User>>;

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
    const mockRepositoryFactory = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepositoryFactory,
        },
      ],
    }).compile();

    userRepository = module.get<UserRepository>(UserRepository);
    mockRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a user', async () => {
      const userData = { email: 'test@example.com', firstName: 'John' };
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await userRepository.create(userData);

      expect(mockRepository.create).toHaveBeenCalledWith(userData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toBe(mockUser);
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await userRepository.findById('1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toBe(mockUser);
    });

    it('should return null if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await userRepository.findById('999');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await userRepository.findByEmail('test@example.com');

      expect(mockRepository.findOne).toHaveBeenCalledWith({ 
        where: { email: 'test@example.com' } 
      });
      expect(result).toBe(mockUser);
    });
  });

  describe('findAll', () => {
    it('should find all users without filters', async () => {
      mockRepository.find.mockResolvedValue([mockUser]);

      const result = await userRepository.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual([mockUser]);
    });

    it('should find users with filters', async () => {
      mockRepository.find.mockResolvedValue([mockUser]);

      const result = await userRepository.findAll({ 
        isActive: true, 
        role: UserRole.MEMBER 
      });

      expect(mockRepository.find).toHaveBeenCalledWith({ 
        where: { isActive: true, role: UserRole.MEMBER } 
      });
      expect(result).toEqual([mockUser]);
    });
  });

  describe('update', () => {
    it('should update user and return updated user', async () => {
      const updateData = { firstName: 'Jane' };
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue({ ...mockUser, ...updateData });

      const result = await userRepository.update('1', updateData);

      expect(mockRepository.update).toHaveBeenCalledWith('1', updateData);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result.firstName).toBe('Jane');
    });
  });

  describe('delete', () => {
    it('should delete user and return true', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await userRepository.delete('1');

      expect(mockRepository.delete).toHaveBeenCalledWith('1');
      expect(result).toBe(true);
    });

    it('should return false if no user was deleted', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 0 } as any);

      const result = await userRepository.delete('999');

      expect(result).toBe(false);
    });
  });

  describe('deactivate', () => {
    it('should deactivate user', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue(deactivatedUser);

      const result = await userRepository.deactivate('1');

      expect(mockRepository.update).toHaveBeenCalledWith('1', { isActive: false });
      expect(result.isActive).toBe(false);
    });
  });

  describe('count', () => {
    it('should count users with filters', async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await userRepository.count({ isActive: true });

      expect(mockRepository.count).toHaveBeenCalledWith({ 
        where: { isActive: true } 
      });
      expect(result).toBe(5);
    });
  });
});