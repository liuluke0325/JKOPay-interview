import type { Category } from '@prisma/client';

export const SUB_CATEGORIES: Record<Category, readonly string[]> = {
  ORG: ['動物保護', '兒童福利', '環境保護', '醫療援助', '長者照護'],
  CAMPAIGN: ['緊急救援', '長期關懷', '專案募資', '物資募集'],
  MERCHANDISE: ['手作商品', '聯名商品', '愛心義賣', '紀念品'],
};

export function isValidSubCategory(category: Category, value: string): boolean {
  return SUB_CATEGORIES[category].includes(value);
}
