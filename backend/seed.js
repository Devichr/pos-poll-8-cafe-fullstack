const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function main() {
  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: { name: 'Kopi' }
    }),
    prisma.category.create({
      data: { name: 'Makanan' }
    }),
    prisma.category.create({
      data: { name: 'Minuman' }
    }),
    prisma.category.create({
      data: { name: 'Dessert' }
    })
  ]);

  console.log('Categories created:', categories);

  // Create products
  const products = await Promise.all([
    // Kopi
    prisma.product.create({
      data: {
        name: 'Espresso',
        description: 'Kopi espresso klasik dengan rasa yang kuat',
        price: 25000,
        categoryId: categories[0].id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Cappuccino',
        description: 'Espresso dengan steamed milk dan foam',
        price: 35000,
        categoryId: categories[0].id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Latte',
        description: 'Espresso dengan steamed milk yang creamy',
        price: 38000,
        categoryId: categories[0].id
      }
    }),
    
    // Makanan
    prisma.product.create({
      data: {
        name: 'Nasi Goreng Spesial',
        description: 'Nasi goreng dengan telur, ayam, dan sayuran',
        price: 45000,
        categoryId: categories[1].id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Mie Ayam',
        description: 'Mie dengan potongan ayam dan pangsit',
        price: 35000,
        categoryId: categories[1].id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Sandwich Club',
        description: 'Sandwich dengan ayam, bacon, dan sayuran',
        price: 42000,
        categoryId: categories[1].id
      }
    }),
    
    // Minuman
    prisma.product.create({
      data: {
        name: 'Jus Jeruk',
        description: 'Jus jeruk segar tanpa gula tambahan',
        price: 20000,
        categoryId: categories[2].id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Es Teh Manis',
        description: 'Teh manis dingin yang menyegarkan',
        price: 15000,
        categoryId: categories[2].id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Smoothie Mangga',
        description: 'Smoothie mangga dengan yogurt',
        price: 28000,
        categoryId: categories[2].id
      }
    }),
    
    // Dessert
    prisma.product.create({
      data: {
        name: 'Tiramisu',
        description: 'Dessert Italia dengan kopi dan mascarpone',
        price: 35000,
        categoryId: categories[3].id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Cheesecake',
        description: 'Cheesecake New York dengan berry sauce',
        price: 32000,
        categoryId: categories[3].id
      }
    }),
    prisma.product.create({
      data: {
        name: 'Ice Cream Sundae',
        description: 'Es krim vanilla dengan topping coklat',
        price: 25000,
        categoryId: categories[3].id
      }
    })
  ]);

  console.log('Products created:', products.length);

  // Create pool tables
  const poolTables = await Promise.all([
    prisma.poolTables.create({
      data: {
        name: 'Meja 1',
        light_pin: 'PIN_1',
        hourly_rate: 50000,
        status: 'Available'
      }
    }),
    prisma.poolTables.create({
      data: {
        name: 'Meja 2',
        light_pin: 'PIN_2',
        hourly_rate: 50000,
        status: 'Available'
      }
    }),
    prisma.poolTables.create({
      data: {
        name: 'Meja 3',
        light_pin: 'PIN_3',
        hourly_rate: 60000,
        status: 'Available'
      }
    }),
    prisma.poolTables.create({
      data: {
        name: 'Meja VIP',
        light_pin: 'PIN_VIP',
        hourly_rate: 80000,
        status: 'Available'
      }
    })
  ]);

  console.log('Pool tables created:', poolTables);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

