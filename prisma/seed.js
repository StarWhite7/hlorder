import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const hashPassword = async (password) => bcrypt.hash(password, 12)

const seedClient = async () => {
  const passwordHash = await hashPassword('ClientTest123!')

  await prisma.client.upsert({
    where: { pseudo: 'client_test' },
    update: {
      nomInGame: 'Client',
      prenomInGame: 'Test',
      isActive: true,
      deletedAt: null,
      userAuth: {
        update: {
          role: 'CLIENT',
          password: passwordHash,
          isActive: true,
          deletedAt: null,
        },
      },
    },
    create: {
      pseudo: 'client_test',
      nomInGame: 'Client',
      prenomInGame: 'Test',
      isActive: true,
      userAuth: {
        create: {
          role: 'CLIENT',
          password: passwordHash,
          isActive: true,
        },
      },
    },
  })
}

const seedEntreprise = async () => {
  const passwordHash = await hashPassword('EntrepriseTest123!')

  await prisma.entreprise.upsert({
    where: { nomEntreprise: 'entreprise_test' },
    update: {
      isActive: true,
      deletedAt: null,
      userAuth: {
        update: {
          role: 'ENTREPRISE',
          password: passwordHash,
          isActive: true,
          deletedAt: null,
        },
      },
    },
    create: {
      nomEntreprise: 'entreprise_test',
      isActive: true,
      userAuth: {
        create: {
          role: 'ENTREPRISE',
          password: passwordHash,
          isActive: true,
        },
      },
    },
  })
}

async function main() {
  await seedClient()
  await seedEntreprise()
  console.log('Seed done: client_test and entreprise_test are ready.')
}

main()
  .catch((error) => {
    console.error(error)
    globalThis.process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
