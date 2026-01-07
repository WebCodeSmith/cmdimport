import { User } from './user.types';

export interface AuthContextType {
  user: User | null;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

