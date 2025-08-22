/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const genres = ['Rock','Pop','Trap','Hip Hop','R&B','EDM','House','Techno','Jazz','Indie','Reggaetón','Folklore','Clásica'];
  await Promise.all(genres.map((name) =>
    prisma.genre.upsert({ where: { name }, update: {}, create: { name } })
  ));

  const musician = await prisma.user.upsert({
    where: { email: 'musico@soundsy.test' },
    update: {},
    create: {
      email: 'musico@soundsy.test',
      passwordHash: 'dev-only', // temporal, luego usamos bcrypt en Auth
      role: 'MUSICIAN',
      profile: { create: { displayName: 'Demo Musician', bio: 'Sesionista' } },
    },
  });

  const rock = await prisma.genre.findUnique({ where: { name: 'Rock' } });
  const pop  = await prisma.genre.findUnique({ where: { name: 'Pop' } });

  await prisma.service.create({
    data: {
      ownerId: musician.id,
      title: 'Voz Lead Pro',
      description: 'Grabación vocal con 2 revisiones',
      basePrice: 5000, currency: 'USD', deliveryDays: 3,
      tags: ['voz','melodic','tuning'],
      genres: { connect: [{ id: rock.id }, { id: pop.id }] },
      samples: { create: [{ url: 'https://example.com/voice.mp3', kind: 'audio' }] },
    },
  });

  await prisma.service.create({
    data: {
      ownerId: musician.id,
      title: 'Guitarras eléctricas',
      description: 'Ritmo + lead, alta calidad',
      basePrice: 7000, currency: 'USD', deliveryDays: 4,
      tags: ['guitarra','rock','funk'],
      genres: { connect: [{ id: rock.id }] },
      samples: { create: [{ url: 'https://example.com/guitar.mp3', kind: 'audio' }] },
    },
  });
}

main()
  .then(() => console.log('Seed OK'))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
