import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'node:url';

const categories = [
  { slug: 'tozalash', name: 'Tozalash vositalari', emoji: '🧴', sortOrder: 1 },
  { slug: 'asboblar', name: 'Asboblar', emoji: '🧰', sortOrder: 2 },
  { slug: 'elektr', name: 'Elektr mollari', emoji: '💡', sortOrder: 3 },
  { slug: 'oshxona', name: 'Oshxona', emoji: '🍳', sortOrder: 4 },
  { slug: 'plastik', name: 'Plastik idishlar', emoji: '🪣', sortOrder: 5 },
  { slug: 'xojalik', name: "Xo'jalik", emoji: '🧹', sortOrder: 6 },
];

const products = [
  { sku: 'HZ-1001', category: 'tozalash', emoji: '🧴', name: 'Idish yuvish geli 900 ml', price: 32000, oldPrice: 38000, unit: 'dona', stock: 40, minStock: 10, description: "Yog'ni tez ketkazadi\nQo'l terisini quritmaydi\nLimon hidli\nHajmi: 900 ml" },
  { sku: 'HZ-1002', category: 'tozalash', emoji: '🧪', name: 'Oqartiruvchi gel 1 L', price: 41000, oldPrice: 47000, unit: 'dona', stock: 25, minStock: 8, description: "Mikroblarni 99.9% yo'q qiladi\nHojatxona va vanna uchun\nXlorli formula\nHajmi: 1 litr" },
  { sku: 'HZ-1003', category: 'tozalash', emoji: '🫧', name: 'Kir yuvish kukuni 3 kg', price: 89000, oldPrice: 99000, unit: 'dona', stock: 18, minStock: 5, description: "Avtomat va qo'lda yuvish uchun\nOq va rangli kiyimlarga mos\n30 martagacha yuvish\nOg'irligi: 3 kg" },
  { sku: 'HZ-1004', category: 'tozalash', emoji: '💧', name: 'Oyna tozalagich sprey 500 ml', price: 21000, oldPrice: null, unit: 'dona', stock: 4, minStock: 6, description: "Iz qoldirmaydi\nOyna, ko'zgu va plastik uchun\nPurkagichli flakon\nHajmi: 500 ml" },
  { sku: 'HZ-1005', category: 'tozalash', emoji: '🧽', name: 'Mikrofibra salfetka (5 dona)', price: 15000, oldPrice: null, unit: "to'plam", stock: 50, minStock: 10, description: "Chang va dog'larni yaxshi yig'adi\nQayta yuvib ishlatiladi\nO'lchami: 30x30 sm\n5 xil rang" },

  { sku: 'HZ-2001', category: 'asboblar', emoji: '🔨', name: "Bolg'a 500 g", price: 45000, oldPrice: null, unit: 'dona', stock: 12, minStock: 3, description: "Po'lat boshcha\nRezina dasta — qo'l toymaydi\nMix sug'urgichli\nOg'irligi: 500 g" },
  { sku: 'HZ-2002', category: 'asboblar', emoji: '🪛', name: "Otvyortka to'plami (6 dona)", price: 68000, oldPrice: 79000, unit: "to'plam", stock: 9, minStock: 3, description: "Tekis va krestsimon uchlar\nMagnitli uchlik\nQulay rezina dasta\n6 xil o'lcham" },
  { sku: 'HZ-2003', category: 'asboblar', emoji: '📏', name: 'Ruletka 5 m', price: 32000, oldPrice: null, unit: 'dona', stock: 20, minStock: 5, description: "Uzunligi: 5 metr\nAvtomatik qulf tugmasi\nZarbaga chidamli korpus\nBelga ilish uchun ilgak" },
  { sku: 'HZ-2004', category: 'asboblar', emoji: '🔧', name: 'Plaskogubs 180 mm', price: 54000, oldPrice: null, unit: 'dona', stock: 2, minStock: 3, description: "Xrom-vanadiy po'lat\nSim kesgichli\nIzolyatsiyalangan dasta\nUzunligi: 180 mm" },
  { sku: 'HZ-2005', category: 'asboblar', emoji: '🛠️', name: 'Elektr drel 650 W', price: 420000, oldPrice: 480000, unit: 'dona', stock: 3, minStock: 2, description: "Quvvati: 650 W\nBeton, yog'och va metall uchun\nZarbli rejim\nKafolat: 12 oy" },

  { sku: 'HZ-3001', category: 'elektr', emoji: '💡', name: 'LED lampa 12 W E27', price: 18000, oldPrice: null, unit: 'dona', stock: 60, minStock: 15, description: "Issiq oq nur (3000K)\nElektrni 85% gacha tejaydi\nXizmat muddati: 25 000 soat\nPatron: E27" },
  { sku: 'HZ-3002', category: 'elektr', emoji: '🔌', name: 'Uzaytirgich 3 m, 5 rozetka', price: 55000, oldPrice: 62000, unit: 'dona', stock: 15, minStock: 4, description: "5 ta yerga ulangan rozetka\nYoqish-o'chirish tugmasi\nKabel uzunligi: 3 m\nMaksimal yuklama: 3500 W" },
  { sku: 'HZ-3003', category: 'elektr', emoji: '🔋', name: 'Batareyka AA (4 dona)', price: 22000, oldPrice: null, unit: "to'plam", stock: 45, minStock: 10, description: "Alkalin batareyka\nPult, soat va o'yinchoqlar uchun\nSaqlash muddati: 7 yil\n4 dona qadoqda" },
  { sku: 'HZ-3004', category: 'elektr', emoji: '🔦', name: 'Akkumulyatorli fonar', price: 75000, oldPrice: null, unit: 'dona', stock: 0, minStock: 3, description: "USB orqali quvvatlanadi\n3 xil yorug'lik rejimi\n8 soatgacha ishlaydi\nSuvga chidamli korpus" },

  { sku: 'HZ-4001', category: 'oshxona', emoji: '🔪', name: "Oshxona pichog'i 20 sm", price: 65000, oldPrice: null, unit: 'dona', stock: 14, minStock: 4, description: "Zanglamaydigan po'lat\nUzoq vaqt o'tkir turadi\nErgonomik dasta\nTig' uzunligi: 20 sm" },
  { sku: 'HZ-4002', category: 'oshxona', emoji: '🍲', name: 'Kastryulka 3 L qopqoqli', price: 135000, oldPrice: 155000, unit: 'dona', stock: 8, minStock: 3, description: "Sir qoplamali\nShisha qopqoq\nBarcha plitalarga mos\nHajmi: 3 litr" },
  { sku: 'HZ-4003', category: 'oshxona', emoji: '🧤', name: "Silikon oshxona qo'lqopi", price: 28000, oldPrice: null, unit: 'juft', stock: 22, minStock: 5, description: "230°C gacha issiqqa chidaydi\nSirpanmaydigan yuza\nIdish yuvishda ham qulay\n1 juft" },
  { sku: 'HZ-4004', category: 'oshxona', emoji: '🪵', name: 'Kesish taxtasi (bambuk)', price: 39000, oldPrice: 45000, unit: 'dona', stock: 16, minStock: 4, description: "Tabiiy bambuk\nPichoqni o'tmaslashtirmaydi\nSharbat uchun ariqchali\nO'lchami: 35x25 sm" },

  { sku: 'HZ-5001', category: 'plastik', emoji: '🪣', name: 'Chelak 12 L qopqoqli', price: 34000, oldPrice: null, unit: 'dona', stock: 25, minStock: 6, description: "Mustahkam plastik\nZich yopiladigan qopqoq\nMetall dasta\nHajmi: 12 litr" },
  { sku: 'HZ-5002', category: 'plastik', emoji: '🥣', name: "Tog'ora 20 L", price: 29000, oldPrice: null, unit: 'dona', stock: 18, minStock: 5, description: "Kir va idish yuvish uchun\nSinmaydigan plastik\nQulay tutqichlar\nHajmi: 20 litr" },
  { sku: 'HZ-5003', category: 'plastik', emoji: '🥡', name: 'Oziq-ovqat konteynerlari (3 dona)', price: 39000, oldPrice: 45000, unit: "to'plam", stock: 16, minStock: 4, description: "Mikroto'lqinli pechga mos\nGermetik qopqoq\nBPA-siz plastik\n0.5 L + 1 L + 1.5 L" },
  { sku: 'HZ-5004', category: 'plastik', emoji: '🧺', name: 'Kir savati 40 L', price: 58000, oldPrice: null, unit: 'dona', stock: 7, minStock: 3, description: "Havo o'tkazuvchi to'rsimon devor\nQopqoqli\nYengil va mustahkam\nHajmi: 40 litr" },

  { sku: 'HZ-6001', category: 'xojalik', emoji: '🧤', name: "Rezina qo'lqop (M)", price: 8000, oldPrice: null, unit: 'juft', stock: 100, minStock: 20, description: "Lateksdan tayyorlangan\nKimyoviy vositalardan himoya\nIchki paxta qoplama\nO'lchami: M" },
  { sku: 'HZ-6002', category: 'xojalik', emoji: '🗑️', name: 'Axlat paketi 30 L (20 dona)', price: 17000, oldPrice: null, unit: 'rulon', stock: 40, minStock: 10, description: "Yirtilmaydigan qalin plyonka\nBog'ich tasmali\nHajmi: 30 litr\nRulonda 20 dona" },
  { sku: 'HZ-6003', category: 'xojalik', emoji: '🧹', name: 'Pol yuvish shvabrasi', price: 72000, oldPrice: 85000, unit: 'dona', stock: 11, minStock: 3, description: "Mikrofibra latta\nSiqish mexanizmi bor\nTeleskopik dasta (130 sm)\nAlmashtiriladigan latta" },
  { sku: 'HZ-6004', category: 'xojalik', emoji: '🧹', name: 'Supurgi va xokandoz', price: 26000, oldPrice: null, unit: "to'plam", stock: 20, minStock: 5, description: "Yumshoq tolali supurgi\nRezina qirrali xokandoz\nIlib qo'yish uchun teshik\nIxcham saqlanadi" },
];

const stories = [
  { sortOrder: 1, emoji: '🔥', color: '#EF4444', title: 'Chegirmalar', subtitle: '20% gacha', text: "Tozalash vositalari, asboblar va oshxona buyumlariga 20% gacha chegirma. Katalogdagi qizil narxlarni qidiring!" },
  { sortOrder: 2, emoji: '🚚', color: '#2563EB', title: 'Bepul yetkazish', subtitle: "200 000 so'mdan", text: "200 000 so'mdan ortiq buyurtmalar uyingizgacha bepul yetkaziladi. Kichik buyurtmalar uchun yetkazish — 10 000 so'm." },
  { sortOrder: 3, emoji: '🧰', color: '#F59E0B', title: 'Yangi kelganlar', subtitle: 'Asboblar', text: "Omborimizga zarbli elektr drellar va magnitli otvyortka to'plamlari keldi. Soni cheklangan!" },
  { sortOrder: 4, emoji: '🛡️', color: '#10B981', title: 'Kafolat', subtitle: 'Sifat nazorati', text: "Barcha elektr mollari va asboblarga rasmiy kafolat beriladi. Nosoz mahsulot 14 kun ichida almashtiriladi." },
  { sortOrder: 5, emoji: '✨', color: '#8B5CF6', title: 'Maslahat', subtitle: 'Tozalik sirlari', text: "Oynani gazeta qog'ozi bilan arting — iz qolmaydi. Yog'li plitani esa idish yuvish geli va issiq suv bilan oson tozalaysiz." },
];

export async function seedIfEmpty(prisma, { log = console.log } = {}) {
  const count = await prisma.product.count();
  if (count > 0) return false;

  log('🌱 Baza bo\'sh — boshlang\'ich ma\'lumotlar yozilmoqda...');

  const categoryIds = {};
  for (const c of categories) {
    const row = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    categoryIds[c.slug] = row.id;
  }

  for (const p of products) {
    const { category, ...data } = p;
    const product = await prisma.product.create({ data: { ...data, categoryId: categoryIds[category] } });
    if (product.stock > 0) {
      await prisma.stockMovement.create({
        data: { productId: product.id, type: 'IN', quantity: product.stock, before: 0, after: product.stock, note: "Boshlang'ich qoldiq" },
      });
    }
  }

  if ((await prisma.story.count()) === 0) {
    await prisma.story.createMany({ data: stories });
  }

  log(`✅ ${categories.length} ta kategoriya, ${products.length} ta mahsulot va ${stories.length} ta story qo'shildi.`);
  return true;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const prisma = new PrismaClient();
  seedIfEmpty(prisma)
    .then((seeded) => {
      if (!seeded) console.log("ℹ️  Bazada mahsulotlar allaqachon bor — seed o'tkazib yuborildi.");
    })
    .catch((err) => {
      console.error('❌ Seed xatosi:', err.message);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
