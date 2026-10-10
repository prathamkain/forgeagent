/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sampleOrders = [
  {
    id: "ord_cyber_9281a",
    promptSpec: "Cyberpunk Ronin warrior standing on a neon-lit rain-slicked Shibuya crossing, volumetric cyan fog, octane 8k render",
    previewImageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80",
    finalImageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    paypalOrderId: "PAYID-MQ72A8Y28491",
    status: "PAID",
    price: 9.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: "ord_aurora_4820b",
    promptSpec: "Bioluminescent mystical forest with crystal stag drinking from a glowing emerald stream, twilight mood, raytraced fantasy art",
    previewImageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&auto=format&fit=crop&q=80",
    finalImageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
    paypalOrderId: "PAYID-NA84B9103822",
    status: "PAID",
    price: 14.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "ord_stellar_7719c",
    promptSpec: "Deep space nebula observatory station shaped like an origami lotus, iridescent cosmic dust, cinematic widescreen ratio",
    previewImageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150&auto=format&fit=crop&q=80",
    finalImageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80",
    paypalOrderId: null,
    status: "PENDING",
    price: 4.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 92).toISOString(),
  },
  {
    id: "ord_retro_3310d",
    promptSpec: "Retro-futuristic 1980s synthwave sports car speeding into a wireframe digital sunset, chrome grid, vaporwave aesthetic",
    previewImageUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=150&auto=format&fit=crop&q=80",
    finalImageUrl: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80",
    paypalOrderId: "PAYID-KC19E7820144",
    status: "PAID",
    price: 7.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
  },
  {
    id: "ord_arch_8841e",
    promptSpec: "Modern brutalist cantilever cliffside villa overlooking Aegean sea at golden hour, concrete minimalism and olive trees",
    previewImageUrl: null,
    finalImageUrl: null, // Null to test gray placeholder requirement
    paypalOrderId: null,
    status: "PENDING",
    price: 12.50,
    createdAt: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
  },
  {
    id: "ord_mecha_6522f",
    promptSpec: "Giant decommissioned mech overgrown with moss and ancient cherry blossoms, studio ghibli color palette, peaceful post-apocalypse",
    previewImageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=80",
    finalImageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
    paypalOrderId: "PAYID-PL99K2209183",
    status: "PAID",
    price: 19.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 320).toISOString(),
  },
  {
    id: "ord_glass_1190g",
    promptSpec: "Intricate Venetian hand-blown glass hummingbird frozen mid-flight with prismatic liquid gold feathers, macro lens",
    previewImageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80",
    finalImageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80",
    paypalOrderId: "PAYID-ZX44R9018471",
    status: "DELIVERED",
    price: 8.50,
    createdAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
  },
  {
    id: "ord_cosmic_4019h",
    promptSpec: "Surreal dreamscape of floating clock towers inside an hourglass suspended in the vortex of a violet black hole",
    previewImageUrl: null,
    finalImageUrl: null, // Null to test gray placeholder requirement
    paypalOrderId: null,
    status: "PENDING",
    price: 6.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
  },
  {
    id: "ord_cyber_7291j",
    promptSpec: "Neo-Kyoto street ramen stall run by friendly robot chef, warm lanterns, rain reflections, anime aesthetic concept art",
    previewImageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=150&auto=format&fit=crop&q=80",
    finalImageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&auto=format&fit=crop&q=80",
    paypalOrderId: "PAYID-OP33T8810294",
    status: "PAID",
    price: 9.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 750).toISOString(),
  },
  {
    id: "ord_nordic_5582k",
    promptSpec: "Viking longship sailing through foggy Norwegian fjord with colossal sea serpent shadow under crystalline turquoise waters",
    previewImageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=150&auto=format&fit=crop&q=80",
    finalImageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
    paypalOrderId: "PAYID-MN66V7720199",
    status: "PAID",
    price: 15.00,
    createdAt: new Date(Date.now() - 1000 * 60 * 900).toISOString(),
  },
  {
    id: "ord_draft_2201l",
    promptSpec: "Concept sketch for isometric solar-punk greenhouse skyscraper with hanging hydroponic strawberry gardens",
    previewImageUrl: null,
    finalImageUrl: null, // Null to test gray placeholder requirement
    paypalOrderId: null,
    status: "PENDING",
    price: 4.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 1100).toISOString(),
  },
  {
    id: "ord_phoenix_9941m",
    promptSpec: "Mythological solar phoenix rising from volcanic caldera with obsidian feathers glowing like molten lava, epic scale",
    previewImageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=150&auto=format&fit=crop&q=80",
    finalImageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80",
    paypalOrderId: "PAYID-QQ11W4490182",
    status: "PAID",
    price: 11.99,
    createdAt: new Date(Date.now() - 1000 * 60 * 1300).toISOString(),
  },
];

async function seed() {
  console.log("Seeding realistic seller orders into SQLite...");
  // Create or get default session
  const session = await prisma.chatSession.create({
    data: {},
  });

  for (const order of sampleOrders) {
    await prisma.productOrder.upsert({
      where: { id: order.id },
      update: {},
      create: {
        ...order,
        sessionId: session.id,
      },
    });
  }

  const count = await prisma.productOrder.count();
  console.log(`Database seeded successfully! Total orders now: ${count}`);
}

seed()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
