import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findAll(options?: {
    isActive?: boolean;
    role?: UserRole;
  }): Promise<User[]> {
    const where: FindOptionsWhere<User> = {};
    
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    
    if (options?.role) {
      where.role = options.role;
    }

    return this.repository.find({ where });
  }

  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async deactivate(id: string): Promise<User | null> {
    return this.update(id, { isActive: false });
  }

  async activate(id: string): Promise<User | null> {
    return this.update(id, { isActive: true });
  }

  async count(options?: {
    isActive?: boolean;
    role?: UserRole;
  }): Promise<number> {
    const where: FindOptionsWhere<User> = {};
    
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    
    if (options?.role) {
      where.role = options.role;
    }

    return this.repository.count({ where });
  }
}