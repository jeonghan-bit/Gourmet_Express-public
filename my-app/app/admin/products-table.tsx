"use client";

import {
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  Table,
  TableCell,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Product } from "./product";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectProductWithCollection } from "@/lib/types";

export function ProductsTable({
  products,
  offset,
  totalProducts,
}: {
  products: SelectProductWithCollection[];
  offset: number;
  totalProducts: number;
}) {
  const searchParams = useSearchParams();
  const productsPerPage = 15;

  function prevPage() {
    const newOffset = Math.max(0, offset - productsPerPage);
    const params = new URLSearchParams(searchParams.toString());
    params.set("offset", newOffset.toString());
    params.delete("status");
    window.history.pushState(null, "", `/admin/products?${params.toString()}`);
  }

  function nextPage() {
    const newOffset = offset + productsPerPage;
    const params = new URLSearchParams(searchParams.toString());
    params.set("offset", newOffset.toString());
    params.delete("status");
    window.history.pushState(null, "", `/admin/products?${params.toString()}`);
  }

  const startIndex = products.length > 0 ? offset + 1 : 0; // 1-based
  const endIndex = offset + products.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Products</CardTitle>
        <CardDescription>
          Manage your products and view their sales performance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead className="hidden sm:table-cell">Name</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Price</TableHead>
              <TableHead className="hidden md:table-cell">Collection</TableHead>
              {/* <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead> */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No Product Found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <Product key={product.id} product={product} />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="flex justify-between items-center mt-4 px-4">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <strong>
              {startIndex}-{endIndex}
            </strong>{" "}
            of <strong>{totalProducts}</strong> products
          </div>
          <div className="flex gap-2">
            <Button
              onClick={prevPage}
              variant="ghost"
              size="sm"
              type="button"
              disabled={offset === 0}
              className="min-h-12"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Prev
            </Button>
            <Button
              onClick={nextPage}
              variant="ghost"
              size="sm"
              type="button"
              disabled={offset + products.length >= totalProducts}
              className="min-h-12"
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
