type StockLike = { stockBottles: number; bottlesPerBox: number };
type EmptyStockLike = { emptyBoxes: number; emptyBottles: number };

export function stockLabel(
  beverage: StockLike | null | undefined,
  t: (k: any) => string,
): string {
  if (!beverage) return "…";
  const boxes = Math.floor(beverage.stockBottles / beverage.bottlesPerBox);
  const bottles = beverage.stockBottles % beverage.bottlesPerBox;
  const parts: string[] = [];
  if (boxes > 0) parts.push(`${boxes} ${t("boxes").toLowerCase()}`);
  if (bottles > 0 || parts.length === 0)
    parts.push(`${bottles} ${t("bottles").toLowerCase()}`);
  return parts.join(" + ");
}

export function emptyStockLabel(
  beverage: EmptyStockLike | null | undefined,
  t: (k: any) => string,
): string {
  if (!beverage) return "…";
  const parts: string[] = [];
  if (beverage.emptyBoxes > 0)
    parts.push(`${beverage.emptyBoxes} ${t("boxes").toLowerCase()}`);
  if (beverage.emptyBottles > 0 || parts.length === 0)
    parts.push(`${beverage.emptyBottles} ${t("bottles").toLowerCase()}`);
  return parts.join(" + ");
}
