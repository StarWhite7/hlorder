import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

const BCRYPT_PREFIXES = ['$2a$', '$2b$', '$2y$']

export const isBcryptHash = (value) =>
  typeof value === 'string' &&
  BCRYPT_PREFIXES.some((prefix) => value.startsWith(prefix))

export const hashPassword = async (plainPassword) =>
  bcrypt.hash(plainPassword, SALT_ROUNDS)

export const verifyPassword = async (plainPassword, storedPassword) => {
  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(plainPassword, storedPassword)
  }

  return plainPassword === storedPassword
}
