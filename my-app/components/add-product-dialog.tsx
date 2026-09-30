import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";
import { useCollectionActions } from "@/hooks/useCollectionActions";
import { useProductActions } from "@/hooks/useProductActions";
import { createProductSchema } from "@/lib/schemas";
import { ProductOptionsEditor } from "@/components/edit-product-dialog";

type ProductFormValues = z.infer<typeof createProductSchema>;

const defaultValues: Partial<ProductFormValues> = {
  name: "",
  description: "",
  price: 0,
  image_url: "",
  status: "active",
};

type Collection = {
  id: number;
  name: string;
  status: string;
  order: number;
};

export function AddProductButton() {
  const [open, setOpen] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const { useCollections } = useCollectionActions();
  const { data: collections = [] } = useCollections();

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isImageUploading) return;
    setOpen(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Add Product
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:max-w-[720px] sm:p-6 [&>button]:min-h-12 [&>button]:min-w-12"
        onEscapeKeyDown={(event) => {
          if (isImageUploading) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isImageUploading) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new product. Required fields are
            marked with an asterisk (*).
          </DialogDescription>
        </DialogHeader>
        <AddProductForm
          onClose={() => setOpen(false)}
          collections={collections}
          isImageUploading={isImageUploading}
          onImageUploadingChange={setIsImageUploading}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddProductForm({
  onClose,
  collections,
  isImageUploading,
  onImageUploadingChange,
}: {
  onClose: () => void;
  collections: Collection[];
  isImageUploading: boolean;
  onImageUploadingChange: (uploading: boolean) => void;
}) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues,
  });
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedOptionTypeIds, setSelectedOptionTypeIds] = useState<string[]>(
    []
  );
  const { createProduct, editProductOptions } = useProductActions();

  async function onSubmit(data: ProductFormValues) {
    setStatusMessage("Adding product...");
    try {
      const result = await createProduct.mutateAsync(data);
      const productId = result.product?.id;

      if (productId && selectedOptionTypeIds.length > 0) {
        await editProductOptions.mutateAsync({
          productId,
          optionTypeIds: selectedOptionTypeIds,
        });
      }

      form.reset();
      setSelectedOptionTypeIds([]);
      setStatusMessage("Product is being added");
      // Refresh the page and close the dialog after a short delay
      setTimeout(() => {
        router.refresh();
        onClose();
        setStatusMessage("");
      }, 2000);
    } catch (error) {
      console.error(error);
      setStatusMessage("Error: Unable to add product.");
    }
  }

  return (
    <Form {...form}>
      {statusMessage && (
        <p className="mb-4 text-sm text-green-600">{statusMessage}</p>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Product name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price *</FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Product description"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Provide a detailed description of your product.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="image_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Image *</FormLabel>
                <FileUpload
                  onUpload={(url) => {
                    field.onChange(url);
                  }}
                  onUploadingChange={onImageUploadingChange}
                />
                <FormDescription>
                  Upload an image of the product.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Set the product visibility status.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="collection_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Collection *</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(Number(value))}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a collection" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {collections.map((collection) => (
                      <SelectItem
                        key={collection.id}
                        value={collection.id.toString()}
                      >
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the collection for this product
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <ProductOptionsEditor
          selectedOptionTypeIds={selectedOptionTypeIds}
          setSelectedOptionTypeIds={setSelectedOptionTypeIds}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isImageUploading}
            className="min-h-12"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isImageUploading || createProduct.isPending}
            className="min-h-12"
          >
            {isImageUploading ? "Uploading image..." : "Create Product"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
