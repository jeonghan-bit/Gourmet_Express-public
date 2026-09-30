import OrderPage from "./OrderPage";
import type {
  SelectCollection,
  SelectProductWithCollection,
} from "@/lib/types";
import { getPublicMenu } from "@/lib/publicMenu";

export const dynamic = "force-dynamic";

async function getInitialMenuData(): Promise<{
  initialCollections?: SelectCollection[];
  initialProducts?: SelectProductWithCollection[];
}> {
  try {
    const publicMenu = await getPublicMenu();

    return {
      initialCollections: publicMenu.collections,
      initialProducts: publicMenu.products,
    };
  } catch (error) {
    console.error("Failed to server-render initial menu data:", error);
    return {};
  }
}

export default async function Page() {
  const initialData = await getInitialMenuData();
  return <OrderPage {...initialData} />;
}
