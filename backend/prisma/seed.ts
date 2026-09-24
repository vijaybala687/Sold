import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('Reading players.json...')
  
  // Adjusted path to find your players.json
  const filePath = path.join(__dirname, '../src/data/players.json')
  
  if (!fs.existsSync(filePath)) {
    console.error('ERROR: Could not find players.json at:', filePath)
    return
  }

  const playersData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  console.log(`Found ${playersData.length} players. Seeding...`)

  // This clears the table so you don't get duplicates if you run it twice
  await prisma.player.deleteMany({})

  for (const p of playersData) {
    await prisma.player.create({
      data: {
        name: p.name,
        category: p.category,
        nationality: p.nationality,
        basePriceLakhs: p.base_price_lakhs,
        imageUrl: p.image_url,
      },
    })
    console.log(`✅ Inserted: ${p.name}`)
  }

  console.log('Done! All players are now in the database.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })