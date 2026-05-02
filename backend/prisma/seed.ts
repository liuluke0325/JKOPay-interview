import { PrismaClient, Category, type Prisma } from '@prisma/client';
import { SUB_CATEGORIES } from '../src/lib/sub-categories.js';

const prisma = new PrismaClient();

const LOGOS = [
  '/logos/heart-red.svg',
  '/logos/heart-orange.svg',
  '/logos/heart-pink.svg',
  '/logos/paw.svg',
  '/logos/leaf.svg',
  '/logos/hand.svg',
  '/logos/star.svg',
];

const PLACEHOLDER_LOGO = '/logos/placeholder.svg';

function pickLogo(seed: number): string {
  // ~60% real-ish logos, ~40% placeholder. Deterministic by seed for stable seeds.
  if (seed % 5 < 3) return LOGOS[seed % LOGOS.length]!;
  return PLACEHOLDER_LOGO;
}

const ORG_NAMES: Record<string, string[]> = {
  動物保護: [
    '財團法人流浪動物之家基金會',
    '台灣動物保護協進會',
    '中華民國保護動物協會',
    '台灣愛狗人協會',
    '社團法人台灣愛貓協會',
    '台灣野生動物保育協會',
  ],
  兒童福利: [
    '財團法人兒童福利聯盟文教基金會',
    '社團法人台灣兒童權益聯盟',
    '家扶基金會',
    '世界展望會台灣分會',
    '台灣兒少關懷協會',
    '陽光兒童基金會',
  ],
  環境保護: [
    '財團法人環境品質文教基金會',
    '荒野保護協會',
    '台灣環境資訊協會',
    '看守台灣協會',
    '綠色和平台灣分會',
    '台灣生態學會',
  ],
  醫療援助: [
    '財團法人罕見疾病基金會',
    '社團法人中華民國紅十字會',
    '台灣醫療援助基金會',
    '無國界醫生台灣辦事處',
    '台灣骨髓捐贈基金會',
    '癌症希望基金會',
  ],
  長者照護: [
    '財團法人弘道老人福利基金會',
    '老五老基金會',
    '中華民國老人福利推動聯盟',
    '台灣失智症協會',
    '銀髮族文教基金會',
    '長青關懷協會',
  ],
};

const CAMPAIGN_NAMES: Record<string, string[]> = {
  緊急救援: [
    '土耳其震災緊急救援',
    '東部水災急難救助',
    '台東林火重建計畫',
    '尼泊爾地震援助行動',
    '南部豪雨災民安置',
    '海外天災緊急醫療',
    '颱風受災戶緊急物資',
    '冬季寒流弱勢家庭關懷',
  ],
  長期關懷: [
    '偏鄉學童課後輔導計畫',
    '弱勢家庭長期陪伴方案',
    '街友自立支持計畫',
    '受暴婦女庇護所',
    '單親媽媽就業培力',
    '更生人重返社會輔導',
    '中輟生陪伴計畫',
    '部落老人送餐服務',
  ],
  專案募資: [
    '原住民文化保存紀錄片',
    '海洋保育研究專案',
    '弱勢學童電腦設備募集',
    '社區共讀站建置計畫',
    '視障者點字書出版',
    '聽障兒童助聽器補助',
    '罕病藥物進口支援',
    '療癒犬訓練專案',
  ],
  物資募集: [
    '冬季衣物捐贈活動',
    '新學期文具用品募集',
    '尿布奶粉物資援助',
    '災區飲用水運送',
    '寒冬送暖棉被募集',
    '中秋月餅愛心送長輩',
  ],
};

const MERCH_NAMES: Record<string, string[]> = {
  手作商品: [
    '身障朋友手作香皂',
    '原民編織零錢包',
    '手工皂禮盒組',
    '愛心手作蠟燭',
    '陶藝家手拉胚馬克杯',
    '部落手織圍巾',
    '手繪明信片組',
    '木工職人鑰匙圈',
  ],
  聯名商品: [
    '插畫家聯名T恤',
    '在地咖啡廳聯名豆',
    '本土設計師聯名托特包',
    '台灣品牌聯名筆記本',
    '攝影師聯名月曆',
    '藝人聯名愛心徽章',
  ],
  愛心義賣: [
    '愛心年菜禮盒',
    '公益餅乾大集合',
    '在地小農蔬果箱',
    '友善農場有機米',
    '原鄉好茶禮盒',
    '南部水果義賣箱',
    '海邊小漁村魚乾',
    '高山部落咖啡',
  ],
  紀念品: [
    '基金會20週年紀念T恤',
    '愛心領養紀念馬克杯',
    '志工服務紀念徽章',
    '環保杯袋紀念組',
    '公益跑紀念毛巾',
    '感恩募款紀念明信片',
    '光與愛紀念燭台',
    '希望樹紀念吊飾',
  ],
};

function generateOrgItems(): Prisma.ItemCreateManyInput[] {
  const items: Prisma.ItemCreateManyInput[] = [];
  let seed = 0;
  for (const subCategory of SUB_CATEGORIES.ORG) {
    const names = ORG_NAMES[subCategory] ?? [];
    for (const title of names) {
      items.push({
        category: Category.ORG,
        subCategory,
        title,
        description: `${title}長期投入${subCategory}相關工作，致力於改善受助對象的生活品質，需要您的支持與關注。團體以永續經營為目標，每年定期發布財報與成果報告。`,
        logoUrl: pickLogo(seed++),
      });
    }
  }
  return items;
}

function generateCampaignItems(): Prisma.ItemCreateManyInput[] {
  const items: Prisma.ItemCreateManyInput[] = [];
  let seed = 100;
  for (const subCategory of SUB_CATEGORIES.CAMPAIGN) {
    const names = CAMPAIGN_NAMES[subCategory] ?? [];
    for (const title of names) {
      const goal = (Math.floor(seed * 137) % 90 + 10) * 10000;
      const raised = Math.floor(goal * ((seed % 80 + 10) / 100));
      const daysOut = (seed % 90) + 30;
      items.push({
        category: Category.CAMPAIGN,
        subCategory,
        title,
        description: `${title}：本專案旨在支援${subCategory}相關需求，募款將直接用於受助對象，並定期公開款項使用明細。每一份心意都將化為實質幫助。`,
        logoUrl: pickLogo(seed++),
        amountGoal: goal,
        amountRaised: raised,
        deadline: new Date(Date.now() + daysOut * 24 * 60 * 60 * 1000),
      });
    }
  }
  return items;
}

function generateMerchandiseItems(): Prisma.ItemCreateManyInput[] {
  const items: Prisma.ItemCreateManyInput[] = [];
  let seed = 200;
  for (const subCategory of SUB_CATEGORIES.MERCHANDISE) {
    const names = MERCH_NAMES[subCategory] ?? [];
    for (const title of names) {
      const price = ((seed % 18) + 2) * 50;
      const stock = (seed % 50) + 5;
      items.push({
        category: Category.MERCHANDISE,
        subCategory,
        title,
        description: `${title}，由公益團體與在地夥伴共同出品。每件商品的銷售金額將回饋於相關公益用途，購買即支持，讓愛心可以延續。`,
        logoUrl: pickLogo(seed++),
        price,
        stock,
      });
    }
  }
  return items;
}

async function main() {
  const items = [
    ...generateOrgItems(),
    ...generateCampaignItems(),
    ...generateMerchandiseItems(),
  ];

  const byCategory = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Seeding ${items.length} items:`, byCategory);

  // Clear and re-seed for idempotency in dev. Migrations preserve schema;
  // this only resets data.
  await prisma.item.deleteMany();
  await prisma.item.createMany({ data: items });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
