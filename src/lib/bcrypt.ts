import * as bcrypt from 'bcrypt';

const saltOrRounds = 10;

export const hashPassword = async (password: string): Promise<string> =>
  bcrypt.hash(password, saltOrRounds);

export const matchPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(password, hash);
