import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting OTAKUVERSE database seed...\n');

  // ─── Clean existing data ─────────────────────────────────────────────────
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productAsset360.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.character.deleteMany();
  await prisma.anime.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  // ─── Admin User ──────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.create({
    data: {
      name: 'OTAKUVERSE Admin',
      email: 'admin@otakuverse.in',
      password: adminPassword,
      role: 'ADMIN',
      emailVerified: new Date(),
      profile: { create: {} },
    },
  });
  console.log(`✅ Admin user: ${admin.email} / Admin@123`);

  // ─── Test User ───────────────────────────────────────────────────────────
  const testPassword = await bcrypt.hash('Test@123', 12);
  const testUser = await prisma.user.create({
    data: {
      name: 'Test Collector',
      email: 'test@otakuverse.in',
      password: testPassword,
      role: 'USER',
      emailVerified: new Date(),
      profile: { create: {} },
    },
  });
  console.log(`✅ Test user: ${testUser.email} / Test@123`);

  // ─── Brands ─────────────────────────────────────────────────────────────
  const brands = await Promise.all([
    prisma.brand.create({ data: { name: 'Banpresto', slug: 'banpresto', sortOrder: 1 } }),
    prisma.brand.create({ data: { name: 'S.H.Figuarts', slug: 'sh-figuarts', sortOrder: 2 } }),
    prisma.brand.create({ data: { name: 'Good Smile Company', slug: 'good-smile', sortOrder: 3 } }),
    prisma.brand.create({ data: { name: 'Kotobukiya', slug: 'kotobukiya', sortOrder: 4 } }),
    prisma.brand.create({ data: { name: 'MegaHouse', slug: 'megahouse', sortOrder: 5 } }),
    prisma.brand.create({ data: { name: 'Funko', slug: 'funko', sortOrder: 6 } }),
    prisma.brand.create({ data: { name: 'Bandai', slug: 'bandai', sortOrder: 7 } }),
    prisma.brand.create({ data: { name: 'Tamashii Nations', slug: 'tamashii-nations', sortOrder: 8 } }),
  ]);
  console.log(`✅ Created ${brands.length} brands`);

  // ─── Categories ──────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Action Figures', slug: 'action-figures', sortOrder: 1 } }),
    prisma.category.create({ data: { name: 'Statues', slug: 'statues', sortOrder: 2 } }),
    prisma.category.create({ data: { name: 'PVC Figures', slug: 'pvc-figures', sortOrder: 3 } }),
    prisma.category.create({ data: { name: 'Resin Statues', slug: 'resin-statues', sortOrder: 4 } }),
    prisma.category.create({ data: { name: 'Limited Editions', slug: 'limited-editions', sortOrder: 5 } }),
    prisma.category.create({ data: { name: 'Collectibles', slug: 'collectibles', sortOrder: 6 } }),
    prisma.category.create({ data: { name: 'Manga', slug: 'manga', sortOrder: 7 } }),
    prisma.category.create({ data: { name: 'Gaming Figures', slug: 'gaming-figures', sortOrder: 8 } }),
  ]);
  console.log(`✅ Created ${categories.length} categories`);

  // ─── Anime Franchises ────────────────────────────────────────────────────
  const dragonBall = await prisma.anime.create({
    data: { name: 'Dragon Ball', slug: 'dragon-ball', description: 'Epic battles, transformations, and legendary warriors from the Dragon Ball universe.' },
  });
  const naruto = await prisma.anime.create({
    data: { name: 'Naruto', slug: 'naruto', description: 'The story of Naruto Uzumaki, a young ninja who seeks recognition from his peers and dreams of becoming the Hokage.' },
  });
  const onePiece = await prisma.anime.create({
    data: { name: 'One Piece', slug: 'one-piece', description: 'Follow Monkey D. Luffy and his pirate crew on their quest to find the legendary treasure One Piece.' },
  });
  const demonSlayer = await prisma.anime.create({
    data: { name: 'Demon Slayer', slug: 'demon-slayer', description: 'Tanjiro Kamado joins the Demon Slayer Corps to find a cure for his sister Nezuko who has been turned into a demon.' },
  });
  const jjk = await prisma.anime.create({
    data: { name: 'Jujutsu Kaisen', slug: 'jujutsu-kaisen', description: 'Yuji Itadori joins a secret organization of Jujutsu Sorcerers to eliminate a powerful Curse named Ryomen Sukuna.' },
  });
  const bleach = await prisma.anime.create({
    data: { name: 'Bleach', slug: 'bleach', description: 'Ichigo Kurosaki gains the powers of a Soul Reaper and must defend the human world from evil spirits known as Hollows.' },
  });
  const mha = await prisma.anime.create({
    data: { name: 'My Hero Academia', slug: 'my-hero-academia', description: 'In a world where most people possess superpowers, a boy born without them dreams of becoming a hero.' },
  });
  const chainsawMan = await prisma.anime.create({
    data: { name: 'Chainsaw Man', slug: 'chainsaw-man', description: 'Denji is a young man burdened with debt who becomes a Devil Hunter after merging with his devil dog Pochita.' },
  });
  const aot = await prisma.anime.create({
    data: { name: 'Attack on Titan', slug: 'attack-on-titan', description: 'Humanity lives inside cities surrounded by enormous walls due to the Titans, gigantic humanoid beings who devour humans seemingly without reason.' },
  });
  const popCulture = await prisma.anime.create({
    data: { name: 'Pop Culture', slug: 'pop-culture', description: 'Western movies, gaming, and pop culture figures.' },
  });

  // ─── Characters ──────────────────────────────────────────────────────────
  const goku = await prisma.character.create({ data: { name: 'Goku', slug: 'goku', animeId: dragonBall.id, description: 'Son Goku is the main protagonist of Dragon Ball. A pure-hearted Saiyan warrior who continuously surpasses his limits.' } });
  const vegeta = await prisma.character.create({ data: { name: 'Vegeta', slug: 'vegeta', animeId: dragonBall.id } });
  const gokuBlack = await prisma.character.create({ data: { name: 'Goku Black', slug: 'goku-black', animeId: dragonBall.id } });
  const narutoChar = await prisma.character.create({ data: { name: 'Naruto Uzumaki', slug: 'naruto', animeId: naruto.id } });
  const sasuke = await prisma.character.create({ data: { name: 'Sasuke Uchiha', slug: 'sasuke', animeId: naruto.id } });
  const itachi = await prisma.character.create({ data: { name: 'Itachi Uchiha', slug: 'itachi', animeId: naruto.id } });
  const luffy = await prisma.character.create({ data: { name: 'Monkey D. Luffy', slug: 'luffy', animeId: onePiece.id } });
  const zoro = await prisma.character.create({ data: { name: 'Roronoa Zoro', slug: 'zoro', animeId: onePiece.id } });
  const tanjiro = await prisma.character.create({ data: { name: 'Tanjiro Kamado', slug: 'tanjiro', animeId: demonSlayer.id } });
  const nezuko = await prisma.character.create({ data: { name: 'Nezuko Kamado', slug: 'nezuko', animeId: demonSlayer.id } });
  const zenitsu = await prisma.character.create({ data: { name: 'Zenitsu Agatsuma', slug: 'zenitsu', animeId: demonSlayer.id } });
  const gojo = await prisma.character.create({ data: { name: 'Gojo Satoru', slug: 'gojo', animeId: jjk.id } });
  const sukuna = await prisma.character.create({ data: { name: 'Ryomen Sukuna', slug: 'sukuna', animeId: jjk.id } });
  const ichigo = await prisma.character.create({ data: { name: 'Ichigo Kurosaki', slug: 'ichigo', animeId: bleach.id } });
  const deku = await prisma.character.create({ data: { name: 'Izuku Midoriya (Deku)', slug: 'deku', animeId: mha.id } });
  const bakugo = await prisma.character.create({ data: { name: 'Katsuki Bakugo', slug: 'bakugo', animeId: mha.id } });
  const denji = await prisma.character.create({ data: { name: 'Denji (Chainsaw Man)', slug: 'denji', animeId: chainsawMan.id } });
  const power = await prisma.character.create({ data: { name: 'Power', slug: 'power', animeId: chainsawMan.id } });
  const eren = await prisma.character.create({ data: { name: 'Eren Yeager', slug: 'eren', animeId: aot.id } });
  const levi = await prisma.character.create({ data: { name: 'Levi Ackerman', slug: 'levi', animeId: aot.id } });

  console.log('✅ Created anime franchises and characters');

  // ─── Products ────────────────────────────────────────────────────────────

  const productData = [
    // Dragon Ball
    { name: 'Goku Ultra Instinct Premium Figure', slug: 'goku-ultra-instinct-premium-figure', characterId: goku.id, animeId: dragonBall.id, brandId: brands[0].id, categoryId: categories[0].id, price: 4999, compareAtPrice: 6499, stock: 15, isFeatured: true, isNewArrival: true, height: 28, material: 'PVC + ABS', description: 'Ultra Instinct Goku in his most powerful form. Stunning silver-haired sculpt with dynamic pose and energy effects.', tags: ['goku', 'dragon-ball', 'ultra-instinct'], isBestSeller: true },
    { name: 'Goku Super Saiyan Blue Figure', slug: 'goku-super-saiyan-blue-figure', characterId: goku.id, animeId: dragonBall.id, brandId: brands[1].id, categoryId: categories[0].id, price: 3499, compareAtPrice: 4299, stock: 22, isFeatured: true, height: 25, material: 'PVC', description: 'SSB Goku in iconic battle stance. Blue aura base with ki effect parts included.', tags: ['goku', 'dragon-ball', 'ssb'] },
    { name: 'Vegeta Super Saiyan Elite Figure', slug: 'vegeta-super-saiyan-figure', characterId: vegeta.id, animeId: dragonBall.id, brandId: brands[0].id, categoryId: categories[0].id, price: 3999, compareAtPrice: 4999, stock: 10, isFeatured: true, height: 26, material: 'PVC + ABS', description: 'The Prince of Saiyans in his legendary Super Saiyan transformation. Detailed sculpt with lightning effects.', tags: ['vegeta', 'dragon-ball'], isBestSeller: true },
    { name: 'Goku Black Rose Form Figure', slug: 'goku-black-rose-figure', characterId: gokuBlack.id, animeId: dragonBall.id, brandId: brands[7].id, categoryId: categories[4].id, price: 7999, compareAtPrice: 9999, stock: 5, isLimitedEdition: true, height: 30, material: 'Premium Resin', description: 'Dark, menacing Goku Black in Super Saiyan Rosé form. Limited to 500 units worldwide.', tags: ['goku-black', 'dragon-ball', 'rosé'], isFeatured: true },

    // Naruto
    { name: 'Naruto Hokage Mode Figure', slug: 'naruto-hokage-figure', characterId: narutoChar.id, animeId: naruto.id, brandId: brands[2].id, categoryId: categories[0].id, price: 3799, compareAtPrice: 4599, stock: 20, isFeatured: true, isNewArrival: true, height: 27, material: 'PVC', description: 'Naruto Uzumaki as the Seventh Hokage in his iconic cloak. Wind effects and Sage Mode aura detail.', tags: ['naruto', 'hokage'], isBestSeller: true },
    { name: 'Naruto Sage Mode Battle Figure', slug: 'naruto-sage-mode-figure', characterId: narutoChar.id, animeId: naruto.id, brandId: brands[0].id, categoryId: categories[0].id, price: 2999, stock: 28, height: 24, material: 'PVC', description: 'Naruto in Sage Mode with toad markings and natural energy aura. Rasengan effect part included.', tags: ['naruto', 'sage-mode'] },
    { name: 'Sasuke Uchiha Rinnegan Figure', slug: 'sasuke-rinnegan-figure', characterId: sasuke.id, animeId: naruto.id, brandId: brands[1].id, categoryId: categories[0].id, price: 4299, compareAtPrice: 5499, stock: 12, isFeatured: true, height: 26, material: 'PVC + ABS', description: 'Sasuke with his eternal Mangekyo Sharingan and Rinnegan activated. Cloak with lightning detail.', tags: ['sasuke', 'naruto', 'rinnegan'] },
    { name: 'Itachi Uchiha Anbu Figure', slug: 'itachi-anbu-figure', characterId: itachi.id, animeId: naruto.id, brandId: brands[7].id, categoryId: categories[1].id, price: 5499, compareAtPrice: 6999, stock: 8, isLimitedEdition: true, height: 29, material: 'Premium PVC', description: 'Itachi in Anbu Black Ops uniform. Crow summoning base and Susano eye effect included.', tags: ['itachi', 'naruto', 'anbu'], isBestSeller: true },

    // One Piece
    { name: 'Luffy Gear 5 Sun God Figure', slug: 'luffy-gear-5-figure', characterId: luffy.id, animeId: onePiece.id, brandId: brands[0].id, categoryId: categories[0].id, price: 5999, compareAtPrice: 7499, stock: 18, isFeatured: true, isNewArrival: true, isLimitedEdition: true, height: 31, material: 'PVC + ABS', description: 'Luffy in his legendary Gear 5 Sun God Nika form. White hair, cloud base with lightning effects — a collector\'s dream.', tags: ['luffy', 'one-piece', 'gear-5', 'nika'], isBestSeller: true },
    { name: 'Luffy Wano Kimono Figure', slug: 'luffy-wano-figure', characterId: luffy.id, animeId: onePiece.id, brandId: brands[4].id, categoryId: categories[0].id, price: 3299, stock: 25, height: 25, material: 'PVC', description: 'Monkey D. Luffy in his Wano arc samurai outfit. Detailed kimono with katana prop.', tags: ['luffy', 'one-piece', 'wano'], isFeatured: true },
    { name: 'Roronoa Zoro Three Sword Style Figure', slug: 'zoro-three-sword-style-figure', characterId: zoro.id, animeId: onePiece.id, brandId: brands[1].id, categoryId: categories[0].id, price: 4499, compareAtPrice: 5499, stock: 14, isFeatured: true, height: 28, material: 'PVC + ABS', description: 'Zoro in his iconic Santoryu pose with three swords drawn. Wind effect base with One Piece emblem.', tags: ['zoro', 'one-piece', 'santoryu'], isBestSeller: true },

    // Demon Slayer
    { name: 'Tanjiro Water Breathing Technique Figure', slug: 'tanjiro-water-breathing-figure', characterId: tanjiro.id, animeId: demonSlayer.id, brandId: brands[0].id, categoryId: categories[0].id, price: 2799, compareAtPrice: 3499, stock: 30, isFeatured: true, isNewArrival: true, height: 24, material: 'PVC', description: 'Tanjiro Kamado using Water Breathing with beautiful water wave effects. Hanafuda earrings sculpted in detail.', tags: ['tanjiro', 'demon-slayer', 'water-breathing'] },
    { name: 'Nezuko Demon Form Figure', slug: 'nezuko-demon-form-figure', characterId: nezuko.id, animeId: demonSlayer.id, brandId: brands[2].id, categoryId: categories[0].id, price: 2499, compareAtPrice: 3199, stock: 35, isFeatured: true, isNewArrival: true, height: 22, material: 'PVC', description: 'Nezuko in her demon form with Blood Demon Art flames. Pink sakura base with bamboo muzzle sculpt.', tags: ['nezuko', 'demon-slayer'], isBestSeller: true },
    { name: 'Zenitsu Thunder Breathing Figure', slug: 'zenitsu-thunder-figure', characterId: zenitsu.id, animeId: demonSlayer.id, brandId: brands[0].id, categoryId: categories[0].id, price: 2999, stock: 20, height: 23, material: 'PVC', description: 'Zenitsu Agatsuma in his sleeping thunder breathing pose. Lightning bolt base with yellow energy effects.', tags: ['zenitsu', 'demon-slayer', 'thunder'] },

    // Jujutsu Kaisen
    { name: 'Gojo Satoru Infinity Figure', slug: 'gojo-satoru-infinity-figure', characterId: gojo.id, animeId: jjk.id, brandId: brands[2].id, categoryId: categories[0].id, price: 5499, compareAtPrice: 6999, stock: 12, isFeatured: true, isNewArrival: true, isLimitedEdition: true, height: 30, material: 'Premium PVC', description: 'Gojo Satoru with Infinity activated. Blindfold headband and blue hollow purple energy effect parts included.', tags: ['gojo', 'jujutsu-kaisen', 'infinity'], isBestSeller: true },
    { name: 'Sukuna King of Curses Figure', slug: 'sukuna-figure', characterId: sukuna.id, animeId: jjk.id, brandId: brands[7].id, categoryId: categories[1].id, price: 7499, compareAtPrice: 9499, stock: 6, isFeatured: true, isLimitedEdition: true, height: 32, material: 'Premium Resin', description: 'Ryomen Sukuna in his four-armed form. Cursed Energy flame base with Domain Expansion detail.', tags: ['sukuna', 'jujutsu-kaisen'], isPreOrder: false },

    // Bleach
    { name: 'Ichigo Kurosaki Bankai Figure', slug: 'ichigo-bankai-figure', characterId: ichigo.id, animeId: bleach.id, brandId: brands[1].id, categoryId: categories[0].id, price: 3999, compareAtPrice: 4999, stock: 16, isFeatured: true, height: 27, material: 'PVC + ABS', description: 'Ichigo in full Bankai Tensa Zangetsu mode. Black energy base with Hollow mask variant included.', tags: ['ichigo', 'bleach', 'bankai'], isBestSeller: true },

    // My Hero Academia
    { name: 'Deku One For All Figure', slug: 'deku-one-for-all-figure', characterId: deku.id, animeId: mha.id, brandId: brands[2].id, categoryId: categories[0].id, price: 2799, compareAtPrice: 3499, stock: 22, isNewArrival: true, height: 24, material: 'PVC', description: 'Izuku Midoriya unleashing One For All 100%. Green lightning effects and torn costume detail.', tags: ['deku', 'mha', 'one-for-all'], isFeatured: true },
    { name: 'Bakugo Explosion Attack Figure', slug: 'bakugo-explosion-figure', characterId: bakugo.id, animeId: mha.id, brandId: brands[0].id, categoryId: categories[0].id, price: 2999, stock: 18, height: 25, material: 'PVC', description: 'Katsuki Bakugo in his signature explosion attack pose. Orange explosion effects base with detailed gauntlets.', tags: ['bakugo', 'mha', 'explosion'] },

    // Chainsaw Man
    { name: 'Chainsaw Man Denji Figure', slug: 'chainsaw-man-denji-figure', characterId: denji.id, animeId: chainsawMan.id, brandId: brands[0].id, categoryId: categories[0].id, price: 3299, compareAtPrice: 4199, stock: 14, isFeatured: true, isNewArrival: true, height: 26, material: 'PVC + ABS', description: 'Denji in his Chainsaw Man form with active chainsaw blades. Blood splatter base (for mature collectors).', tags: ['denji', 'chainsaw-man'], isBestSeller: true },
    { name: 'Power Blood Devil Figure', slug: 'power-blood-devil-figure', characterId: power.id, animeId: chainsawMan.id, brandId: brands[2].id, categoryId: categories[0].id, price: 2999, stock: 12, isNewArrival: true, height: 24, material: 'PVC', description: 'Power in her Blood Devil form. Dynamic hair sculpt with blood spear effect.', tags: ['power', 'chainsaw-man', 'blood-devil'] },

    // Attack on Titan
    { name: 'Eren Yeager Titan Shifter Figure', slug: 'eren-titan-shifter-figure', characterId: eren.id, animeId: aot.id, brandId: brands[1].id, categoryId: categories[0].id, price: 4299, compareAtPrice: 5499, stock: 10, isFeatured: true, height: 28, material: 'PVC + ABS', description: 'Eren in his Attack Titan form. Survey Corps scout uniform with thunder spear effects.', tags: ['eren', 'aot', 'titan'] },
    { name: 'Levi Ackerman ODM Gear Figure', slug: 'levi-odm-gear-figure', characterId: levi.id, animeId: aot.id, brandId: brands[7].id, categoryId: categories[1].id, price: 6999, compareAtPrice: 8999, stock: 7, isFeatured: true, isLimitedEdition: true, height: 26, material: 'Premium PVC', description: 'Captain Levi in his iconic ODM gear combat stance. Wire and blade effects with Survey Corps cape.', tags: ['levi', 'aot', 'odm'], isBestSeller: true },

    // Pop Culture
    { name: 'Spider-Man Homecoming Figure', slug: 'spider-man-homecoming-figure', characterId: undefined, animeId: popCulture.id, brandId: brands[5].id, categoryId: categories[0].id, price: 1999, compareAtPrice: 2499, stock: 40, isNewArrival: true, height: 20, material: 'PVC', description: 'Spider-Man in his classic red and blue MCU suit. Web-swinging pose with base included.', tags: ['spider-man', 'marvel', 'mcu'] },
    { name: 'Batman Dark Knight Premium Statue', slug: 'batman-dark-knight-statue', characterId: undefined, animeId: popCulture.id, brandId: brands[3].id, categoryId: categories[1].id, price: 7499, compareAtPrice: 8999, stock: 5, isLimitedEdition: true, height: 35, material: 'Resin', description: 'The Dark Knight in an epic gargoyle perch pose. Premium resin statue with Gotham City base.', tags: ['batman', 'dc', 'dark-knight'] },
    { name: 'Iron Man Mark 85 Endgame Figure', slug: 'iron-man-mark-85-figure', characterId: undefined, animeId: popCulture.id, brandId: brands[5].id, categoryId: categories[0].id, price: 2999, compareAtPrice: 3799, stock: 25, isBestSeller: true, height: 22, material: 'ABS + PVC', description: 'Tony Stark\'s final Iron Man suit from Avengers: Endgame. Repulsor light-up feature base.', tags: ['iron-man', 'marvel', 'endgame'] },
    { name: 'Kratos God of War Statue', slug: 'kratos-god-of-war-statue', characterId: undefined, animeId: popCulture.id, brandId: brands[3].id, categoryId: categories[1].id, price: 9999, compareAtPrice: 12999, stock: 3, isFeatured: true, isLimitedEdition: true, height: 40, material: 'Premium Resin', description: 'Kratos with Leviathan Axe and Guardian Shield. Massive 40cm premium resin collector\'s statue.', tags: ['kratos', 'god-of-war', 'gaming'] },
    { name: 'Gundam RX-78-2 Master Grade Figure', slug: 'gundam-rx78-master-grade', characterId: undefined, animeId: popCulture.id, brandId: brands[6].id, categoryId: categories[7].id, price: 4499, stock: 15, isNewArrival: true, height: 30, material: 'ABS + PVC', description: 'The iconic original Gundam in Master Grade detail. Fully poseable with beam rifle and shield accessories.', tags: ['gundam', 'bandai', 'mecha'] },
    { name: 'Mikasa Ackerman Scout Figure', slug: 'mikasa-scout-figure', characterId: undefined, animeId: aot.id, brandId: brands[0].id, categoryId: categories[0].id, price: 2499, compareAtPrice: 3099, stock: 20, isNewArrival: true, height: 23, material: 'PVC', description: 'Mikasa in Survey Corps uniform with ODM gear drawn. Scarf sculpt detail and dynamic hair.', tags: ['mikasa', 'aot', 'scout'] },
  ];

  let productCount = 0;
  for (const data of productData) {
    const { characterId, ...rest } = data;
    await prisma.product.create({
      data: {
        ...rest,
        characterId: characterId ?? undefined,
        discount: rest.compareAtPrice ? Math.round(((rest.compareAtPrice - rest.price) / rest.compareAtPrice) * 100) : null,
        isSoldOut: rest.stock === 0,
        stockStatus: rest.stock === 0 ? 'OUT_OF_STOCK' : rest.stock <= 5 ? 'LOW_STOCK' : 'IN_STOCK',
        rating: Math.round((3.8 + Math.random() * 1.2) * 10) / 10,
        reviewCount: Math.floor(Math.random() * 50) + 3,
        salesCount: Math.floor(Math.random() * 200) + 10,
        isPublished: true,
        sku: `OTV-${rest.slug.toUpperCase().slice(0, 8)}-${Math.floor(Math.random() * 9000) + 1000}`,
        inventory: {
          create: {
            available: rest.stock,
            reserved: 0,
            sold: Math.floor(Math.random() * 100),
          },
        },
      },
    });
    productCount++;
  }

  console.log(`✅ Created ${productCount} products`);

  // ─── Sample Coupons ──────────────────────────────────────────────────────
  await prisma.coupon.createMany({
    data: [
      { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minOrder: 999, usageLimit: 1000, isActive: true },
      { code: 'COLLECTOR20', type: 'PERCENTAGE', value: 20, minOrder: 2999, maxDiscount: 1000, usageLimit: 500, isActive: true },
      { code: 'FLAT500', type: 'FIXED', value: 500, minOrder: 2999, usageLimit: 200, isActive: true },
      { code: 'ANIME50', type: 'PERCENTAGE', value: 50, minOrder: 5000, maxDiscount: 2000, usageLimit: 100, isActive: true, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    ],
  });
  console.log('✅ Created sample coupons');

  console.log('\n🎌 OTAKUVERSE database seeded successfully!');
  console.log('\n📋 Summary:');
  console.log(`   Admin: admin@otakuverse.in / Admin@123`);
  console.log(`   Test user: test@otakuverse.in / Test@123`);
  console.log(`   Products: ${productCount}`);
  console.log(`   Coupons: WELCOME10, COLLECTOR20, FLAT500, ANIME50`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
