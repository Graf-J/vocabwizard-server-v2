import { Role } from '../../user/roles.enum';

export interface AuthGuardRequest extends Request {
  user: {
    id: string;
    role: Role;
  };
}
