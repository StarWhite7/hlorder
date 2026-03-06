import { prisma } from './prisma.js'

export const getEntrepriseByUserAuthId = async (userAuthId) =>
  prisma.entreprise.findFirst({
    where: {
      userAuthId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      nomEntreprise: true,
      userAuthId: true,
    },
  })
