import { UserRole } from '../../users/entities/user.entity';

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export class AuthResponseDto {
  access_token: string;
  refresh_token: string;
  user: UserResponseDto;
}