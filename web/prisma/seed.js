// Simple seed script to populate future events
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const source = await prisma.source.upsert({
    where: { name: 'Seed' },
    update: {},
    create: { name: 'Seed', url: 'https://example.com' }
  })

  const now = new Date()
  const inDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000)

  const events = [
    {
      title: 'Perseid Meteor Shower Peak',
      type: 'meteor',
      description: 'Annual Perseids peak viewing',
      visibility: 'Northern Hemisphere',
      startAt: inDays(30),
      endAt: inDays(31),
      positionX: -100,
      positionY: 50,
      sourceId: source.id
    },
    {
      title: 'Total Lunar Eclipse',
      type: 'moon',
      description: 'Long totality visible in Americas and Europe',
      visibility: 'Americas, Europe, Africa',
      startAt: inDays(90),
      endAt: inDays(90),
      positionX: 150,
      positionY: 200,
      sourceId: source.id
    },
    {
      title: 'Annular Solar Eclipse',
      type: 'eclipse',
      description: 'Path crosses parts of South America',
      visibility: 'South America',
      startAt: inDays(150),
      endAt: inDays(150),
      positionX: -50,
      positionY: -150,
      sourceId: source.id
    },
    {
      title: 'Artemis II Launch (NET)',
      type: 'launch',
      description: 'Crewed lunar flyby mission (NET)',
      visibility: 'Florida, USA',
      startAt: inDays(240),
      endAt: null,
      positionX: 200,
      positionY: -100,
      sourceId: source.id
    }
  ]

  for (const e of events) {
    await prisma.event.create({ data: e })
  }

  console.log('Seeded events:', events.length)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


