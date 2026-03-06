import { prisma } from './prisma.js'

export const getEntrepriseByUserAuthId = async (userAuthId) =>
  prisma.entreprise.findUnique({
    where: { userAuthId },
    select: {
      id: true,
      nomEntreprise: true,
      userAuthId: true,
    },
  })
